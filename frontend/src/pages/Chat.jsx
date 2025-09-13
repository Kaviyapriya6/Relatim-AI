import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Avatar, 
  Button, 
  LoadingScreen, 
  EmptyState,
  StatusIndicator,
  Dropdown,
  DropdownItem
} from '../components/common';
import { 
  fetchMessages, 
  sendMessage, 
  markAllMessagesAsSeen,
  deleteMessage,
  editMessage,
  addMessage
} from '../store/slices/messageSlice';
import { getContact, fetchContacts, updateContactOnlineStatus } from '../store/slices/contactSlice';
import socketService from '../services/socket';
import { formatLastSeen } from '../utils/timeUtils';

const Chat = () => {
  const { contactId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false); // File viewer state
  const [viewingFile, setViewingFile] = useState(null); // Current file being viewed
  const [replyingTo, setReplyingTo] = useState(null); // Message being replied to
  
  const { 
    conversations,
    loading: messagesLoading
  } = useSelector((state) => state.messages);
  const { user } = useSelector((state) => state.auth);
  const { contacts = [], loading: contactsLoading } = useSelector((state) => state.contacts);
  
  // Get messages for this specific contact
  const currentConversation = conversations[contactId] || { messages: [], loading: false, pagination: {} };
  const messages = useMemo(() => currentConversation.messages || [], [currentConversation.messages]);
  const loading = currentConversation.loading || messagesLoading;
  
  // Convert contactId to number for proper matching (in case IDs are stored as numbers)
  const contact = Array.isArray(contacts) ? contacts.find(c => c.id === contactId || c.id === parseInt(contactId)) : null;
  
  // Fetch contacts if not loaded
  useEffect(() => {
    if (!contacts?.length && !contactsLoading) {
      dispatch(fetchContacts({}));
    }
  }, [dispatch, contacts?.length, contactsLoading]);
  
  // Initial fetch when contactId changes
  useEffect(() => {
    if (contactId && contactId !== 'undefined') {
      dispatch(fetchMessages({ contactId, page: 1, limit: 50 }));
      dispatch(getContact(contactId));
    }
  }, [dispatch, contactId]);

  // Mark messages as read when conversation changes (separate effect)
  useEffect(() => {
    if (contactId && contactId !== 'undefined') {
      const conversation = conversations[contactId];
      if (conversation && conversation.messages?.length > 0) {
        const unreadMessageIds = conversation.messages
          .filter(msg => msg.receiver_id === user?.id && msg.status !== 'seen')
          .map(msg => msg.id);
        
        if (unreadMessageIds.length > 0) {
          dispatch(markAllMessagesAsSeen({ contactId, messageIds: unreadMessageIds }));
        }
      }
    }
  }, [dispatch, contactId, user?.id, conversations]);

  // Auto-reload messages every 30 seconds when socket is NOT connected (fallback only)
  useEffect(() => {
    if (!contactId || contactId === 'undefined') return;

    const intervalId = setInterval(() => {
      // Only fetch if socket is NOT connected as a fallback
      if (!socketService.isConnectedToServer()) {
        dispatch(fetchMessages({ contactId, page: 1, limit: 50 }));
      }
    }, 30000); // 30 seconds interval (increased from 2 seconds)

    return () => clearInterval(intervalId);
  }, [dispatch, contactId]);

  useEffect(() => {
    // Scroll to bottom with a small delay to ensure DOM updates
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages]);

  useEffect(() => {
    // Socket event listeners
    const handleNewMessage = (message) => {
      if (contactId && contactId !== 'undefined' && (message.sender_id === contactId || message.receiver_id === contactId)) {
        // Add the new message to the conversation without fetching all messages
        dispatch(addMessage({
          ...message,
          currentUserId: user?.id,
          contact_id: contactId
        }));
        
        if (message.sender_id === contactId) {
          // Mark this specific message as read
          dispatch(markAllMessagesAsSeen({ contactId, messageIds: [message.id] }));
        }
      }
    };

    const handleTyping = ({ userId, isTyping: typing }) => {
      if (userId === contactId) {
        setOtherUserTyping(typing);
      }
    };

    const handleMessageStatus = (data) => {
      // Update message status in store
      console.log('Message status update:', data);
    };

    const handleContactOnlineStatus = ({ user_id, is_online, last_seen }) => {
      if (user_id === contactId) {
        // Update the specific contact's online status in real-time
        dispatch(updateContactOnlineStatus({
          contactId: user_id,
          isOnline: is_online,
          lastSeen: last_seen
        }));
      }
    };

    socketService.on('newMessage', handleNewMessage);
    socketService.on('typing', handleTyping);
    socketService.on('messageStatus', handleMessageStatus);
    socketService.on('contactOnlineStatus', handleContactOnlineStatus);

    return () => {
      socketService.off('newMessage', handleNewMessage);
      socketService.off('typing', handleTyping);
      socketService.off('messageStatus', handleMessageStatus);
      socketService.off('contactOnlineStatus', handleContactOnlineStatus);
    };
  }, [contactId, dispatch, user?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() && !selectedFile) return;

    const messageData = {
      contactId: contactId,
      content: messageInput.trim(),
      type: selectedFile ? 'file' : 'text',
      file: selectedFile,
      replyToId: replyingTo?.id || null
    };

    try {
      await dispatch(sendMessage(messageData)).unwrap();
      setMessageInput('');
      setSelectedFile(null);
      setReplyingTo(null);
      setShowEmojiPicker(false);
      inputRef.current?.focus();
      
      // Scroll to bottom after sending message
      setTimeout(() => {
        scrollToBottom();
      }, 200);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socketService.emit('typing', { userId: contactId, isTyping: true });
      
      setTimeout(() => {
        setIsTyping(false);
        socketService.emit('typing', { userId: contactId, isTyping: false });
      }, 3000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessage) {
        handleEditMessage();
      } else {
        handleSendMessage();
      }
    } else {
      handleTyping();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleEditMessage = async () => {
    if (!messageInput.trim() || !editingMessage) return;

    try {
      await dispatch(editMessage({
        messageId: editingMessage.id,
        content: messageInput.trim()
      })).unwrap();
      setEditingMessage(null);
      setMessageInput('');
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleDeleteMessage = async (messageId, deleteForEveryone = false) => {
    try {
      await dispatch(deleteMessage({ 
        messageId, 
        deleteForEveryone 
      })).unwrap();
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // New message action functions
  const handleReplyToMessage = (message) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  const handleForwardMessage = (message) => {
    // TODO: Implement forward functionality
    console.log('Forwarding message:', message);
    // For now, copy to clipboard
    navigator.clipboard.writeText(message.content || 'File attachment');
    alert('Message copied to clipboard. Forward functionality coming soon!');
  };

  const handleCopyMessage = (message) => {
    const textToCopy = message.content || 'File attachment';
    navigator.clipboard.writeText(textToCopy);
    // You could add a toast notification here
    console.log('Message copied to clipboard');
  };

  const handleViewFile = (fileUrl, fileName, fileType) => {
    setViewingFile({ 
      url: fileUrl, 
      name: fileName || 'File', 
      type: fileType || 'unknown' 
    });
    setFileViewerOpen(true);
  };

  const handleDownloadFile = (fileUrl, fileName) => {
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearReply = () => {
    setReplyingTo(null);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    // Convert UTC to IST by adding 5 hours 30 minutes
    const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    
    return istDate.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    // Convert UTC to IST by adding 5 hours 30 minutes
    const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    const nowIST = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
    
    const yesterday = new Date(nowIST);
    yesterday.setDate(yesterday.getDate() - 1);

    if (istDate.toDateString() === nowIST.toDateString()) {
      return 'Today';
    } else if (istDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return istDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const getMessageStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'delivered':
        return (
          <div className="flex">
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <svg className="w-4 h-4 text-gray-400 -ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'read':
        return (
          <div className="flex">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <svg className="w-4 h-4 text-blue-500 -ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading && !messages?.length) {
    return <LoadingScreen message="Loading chat..." />;
  }

  // Show loading while contacts are being fetched
  if (contactsLoading && !contact) {
    return <LoadingScreen message="Loading contact..." />;
  }

  // Only show "Contact not found" after contacts have been loaded
  if (!contactsLoading && !contact) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          title="Contact not found"
          description="The contact you're looking for doesn't exist"
          icon="👤"
          action={{
            label: 'Go back',
            onClick: () => navigate('/chats')
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/chats')}
            className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <Avatar
            src={contact.avatar}
            alt={contact.name}
            size="medium"
            online={contact.isOnline}
          />
          
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {contact.name}
            </h2>
            <div className="flex items-center space-x-2">
              <StatusIndicator 
                status={contact.isOnline ? 'online' : 'offline'} 
                size="small" 
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {otherUserTyping ? 'typing...' : (
                  contact?.isOnline ? 'online' : formatLastSeen(contact?.lastSeen)
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="small"
            onClick={() => console.log('Voice call')}
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center"
            title="Voice call"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </Button>
          
          <Button
            variant="ghost"
            size="small"
            onClick={() => console.log('Video call')}
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center"
            title="Video call"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </Button>

          <Dropdown
            trigger={
              <Button variant="ghost" size="small" className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </Button>
            }
            usePortal={true}
            position="bottom-right"
          >
            <DropdownItem onClick={() => console.log('Contact info')}>
              👤 Contact Info
            </DropdownItem>
            <DropdownItem onClick={() => console.log('Search')}>
              🔍 Search Messages
            </DropdownItem>
            <DropdownItem onClick={() => console.log('Clear chat')}>
              🗑️ Clear Chat
            </DropdownItem>
            <DropdownItem onClick={() => console.log('Block')} variant="danger">
              🚫 Block Contact
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
        {!Array.isArray(messages) || !messages?.length ? (
          <EmptyState
            title="No messages yet"
            description="Start the conversation with a message"
            icon="💬"
          />
        ) : (
          <>
            {messages.filter(Boolean).map((message, index) => {
              if (!message || !message.id) return null;
              
              const isOwn = message.sender_id === user?.id || message.is_own_message;
              const showDate = index === 0 || 
                formatDate(message.created_at) !== formatDate(messages[index - 1]?.created_at);
              
              return (
                <React.Fragment key={message.id}>
                  {showDate && (
                    <div className="flex justify-center">
                      <span className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                        {formatDate(message.created_at)}
                      </span>
                    </div>
                  )}
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md group ${isOwn ? 'order-2' : 'order-1'}`}>
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          isOwn
                            ? 'bg-green-500 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {!message.file_url && message.content && (
                          <p className="whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        )}
                        
                        {message.file_url && (
                          <div className="space-y-2">
                            {message.file_type?.startsWith('image/') ? (
                              <div 
                                className="cursor-pointer relative group"
                                onClick={() => handleViewFile(message.file_url, message.file_name, message.file_type)}
                              >
                                <img
                                  src={message.file_url}
                                  alt={message.file_name || "Image"}
                                  className="max-w-full h-auto rounded transition-opacity group-hover:opacity-90"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded transition-all duration-200 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                            ) : (
                              <div 
                                className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                onClick={() => handleViewFile(message.file_url, message.file_name, message.file_type)}
                              >
                                <div className="flex-shrink-0">
                                  <svg className="w-8 h-8 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {message.file_name || 'File'}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Click to view • {message.file_type || 'Unknown type'}
                                  </p>
                                </div>
                                <div className="flex-shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadFile(message.file_url, message.file_name);
                                    }}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    title="Download"
                                  >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}
                            {message.content && (
                              <p className="whitespace-pre-wrap break-words mt-2">
                                {message.content}
                              </p>
                            )}
                          </div>
                        )}
                        
                        <div className={`flex items-center justify-between mt-1 ${
                          isOwn ? 'text-green-100' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          <span className="text-xs">
                            {formatTime(message.created_at)}
                          </span>
                          {isOwn && (
                            <div className="flex items-center space-x-1">
                              {message.edited && (
                                <span className="text-xs opacity-70">edited</span>
                              )}
                              {getMessageStatusIcon(message.status)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Message Options */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                        <Dropdown
                          trigger={
                            <button className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                              ⋯
                            </button>
                          }
                        >
                          {isOwn && (
                            <>
                              <DropdownItem 
                                onClick={() => {
                                  setEditingMessage(message);
                                  setMessageInput(message.content);
                                  inputRef.current?.focus();
                                }}
                              >
                                ✏️ Edit
                              </DropdownItem>
                              <DropdownItem 
                                onClick={() => handleDeleteMessage(message.id, false)}
                                variant="danger"
                              >
                                🗑️ Delete for me
                              </DropdownItem>
                              <DropdownItem 
                                onClick={() => handleDeleteMessage(message.id, true)}
                                variant="danger"
                              >
                                🗑️ Delete for everyone
                              </DropdownItem>
                            </>
                          )}
                          <DropdownItem onClick={() => handleReplyToMessage(message)}>
                            ↩️ Reply
                          </DropdownItem>
                          <DropdownItem onClick={() => handleForwardMessage(message)}>
                            ↪️ Forward
                          </DropdownItem>
                          <DropdownItem onClick={() => handleCopyMessage(message)}>
                            📋 Copy
                          </DropdownItem>
                          {message.file_url && (
                            <>
                              <DropdownItem onClick={() => handleViewFile(message.file_url, message.file_name, message.file_type)}>
                                👁️ View File
                              </DropdownItem>
                              <DropdownItem onClick={() => handleDownloadFile(message.file_url, message.file_name)}>
                                � Download
                              </DropdownItem>
                            </>
                          )}
                        </Dropdown>
                      </div>
                    </div>
                  </motion.div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        {editingMessage && (
          <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                Editing message
              </span>
              <button
                onClick={() => {
                  setEditingMessage(null);
                  setMessageInput('');
                }}
                className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {replyingTo && (
          <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <span className="text-sm text-green-800 dark:text-green-200 block">
                  Replying to {replyingTo.sender_id === user?.id ? 'yourself' : contact?.name || 'contact'}
                </span>
                <p className="text-xs text-green-600 dark:text-green-300 mt-1 truncate">
                  {replyingTo.content || (replyingTo.file_url ? 'File attachment' : 'Message')}
                </p>
              </div>
              <button
                onClick={clearReply}
                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {selectedFile && (
          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-blue-800 dark:text-blue-200">
                  {selectedFile.name}
                </span>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end space-x-3">
          <div className="flex space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>

          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
              className="w-full max-h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              rows={1}
              style={{
                minHeight: '44px',
                height: Math.min(messageInput.split('\n').length * 20 + 24, 128) + 'px'
              }}
            />
          </div>

          <Button
            onClick={editingMessage ? handleEditMessage : handleSendMessage}
            disabled={!messageInput.trim() && !selectedFile}
            variant="primary"
            size="medium"
            className="px-4 py-2"
          >
            {editingMessage ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </Button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        />
      </div>

      {/* File Viewer Modal */}
      {fileViewerOpen && viewingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setFileViewerOpen(false)}>
          <div className="max-w-4xl max-h-full w-full h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {viewingFile.name}
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {viewingFile.type}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownloadFile(viewingFile.url, viewingFile.name)}
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  title="Download"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => setFileViewerOpen(false)}
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-gray-100 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
              {viewingFile.type?.startsWith('image/') ? (
                <img
                  src={viewingFile.url}
                  alt={viewingFile.name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : viewingFile.type?.startsWith('video/') ? (
                <video
                  src={viewingFile.url}
                  controls
                  className="max-w-full max-h-full"
                >
                  Your browser does not support the video tag.
                </video>
              ) : viewingFile.type?.startsWith('audio/') ? (
                <div className="w-full max-w-md">
                  <audio
                    src={viewingFile.url}
                    controls
                    className="w-full"
                  >
                    Your browser does not support the audio tag.
                  </audio>
                </div>
              ) : viewingFile.type === 'application/pdf' ? (
                <iframe
                  src={viewingFile.url}
                  className="w-full h-full"
                  title={viewingFile.name}
                />
              ) : (
                <div className="text-center p-8">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">Cannot preview this file type</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">{viewingFile.name}</p>
                  <button
                    onClick={() => handleDownloadFile(viewingFile.url, viewingFile.name)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;