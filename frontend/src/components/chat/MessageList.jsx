import React, { useEffect, useRef, useState } from 'react';
import socketService from '../../services/socket';
import { addMessage, updateMessageStatus, updateTypingStatus } from '../../store/slices/messageSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMessages, markAllMessagesAsSeen } from '../../store/slices/messageSlice';
import MessageBubble from './MessageBubble';

const MessageList = ({ chatId }) => {
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const autoRefreshIntervalRef = useRef(null);
  
  const dispatch = useDispatch();
  const { 
    messagesByChatId, 
    loading, 
    error,
    typingUsers 
  } = useSelector(state => state.messages);
  const { user } = useSelector(state => state.auth);
  
  const messages = messagesByChatId[chatId] || [];
  const chatTypingUsers = typingUsers[chatId] || [];

  useEffect(() => {
    if (chatId) {
      dispatch(fetchMessages({ contactId: chatId }));
      
      // Join the chat room for real-time updates
      if (socketService.isConnectedToServer()) {
        socketService.joinChat(chatId);
        console.log('🔌 Joined chat room:', chatId);
      } else {
        console.warn('🔌 Socket not connected, enabling auto-refresh');
        setAutoRefreshEnabled(true);
      }
    }
    
    return () => {
      // Leave chat room when switching conversations
      if (chatId && socketService.isConnectedToServer()) {
        socketService.leaveChat(chatId);
        console.log('🔌 Left chat room:', chatId);
      }
    };
  }, [dispatch, chatId]);

  // Auto-refresh functionality when socket is not connected
  useEffect(() => {
    if (autoRefreshEnabled && chatId) {
      console.log('🔄 Starting auto-refresh for chat:', chatId);
      autoRefreshIntervalRef.current = setInterval(() => {
        // Check if socket connected, if yes, disable auto-refresh
        if (socketService.isConnectedToServer()) {
          console.log('🔌 Socket connected, disabling auto-refresh');
          setAutoRefreshEnabled(false);
          socketService.joinChat(chatId);
          return;
        }
        
        console.log('🔄 Auto-refreshing messages for chat:', chatId);
        dispatch(fetchMessages({ contactId: chatId }));
      }, 5000); // Refresh every 5 seconds
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [autoRefreshEnabled, chatId, dispatch]);

  useEffect(() => {
    // Listen for real-time new messages
    const handleNewMessage = (message) => {
      console.log('📨 New message received in MessageList:', message);
      
      // Check if message belongs to current chat
      const isCurrentChat = (
        (message.sender_id === user?.id && message.receiver_id === chatId) || 
        (message.sender_id === chatId && message.receiver_id === user?.id)
      );
      
      if (isCurrentChat) {
        const messageToAdd = {
          id: message.id,
          senderId: message.sender_id,
          receiverId: message.receiver_id,
          content: message.content,
          file_url: message.file_url,
          file_type: message.file_type,
          file_name: message.file_name,
          file_size: message.file_size,
          status: message.status,
          created_at: message.created_at,
          timestamp: message.created_at,
          sender: message.sender,
          receiver: message.receiver,
          contact_id: message.sender_id === user?.id ? message.receiver_id : message.sender_id,
          is_sent: message.sender_id === user?.id
        };
        
        dispatch(addMessage(messageToAdd));
        
        // Auto-scroll to bottom for new messages
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    };

    const handleMessageSeen = (data) => {
      console.log('📨 Message seen in MessageList:', data);
      dispatch(updateMessageStatus({ 
        messageId: data.message_id || data.messageId, 
        status: 'seen', 
        timestamp: data.seen_at || data.timestamp || new Date().toISOString() 
      }));
    };

    const handleMessageDelivered = (data) => {
      console.log('📨 Message delivered in MessageList:', data);
      dispatch(updateMessageStatus({ 
        messageId: data.message_id || data.messageId, 
        status: 'delivered', 
        timestamp: data.delivered_at || data.timestamp || new Date().toISOString() 
      }));
    };

    const handleTypingStart = (data) => {
      if (data.contact_id === chatId && data.user_id !== user?.id) {
        dispatch(updateTypingStatus({ 
          contactId: chatId, 
          userId: data.user_id, 
          isTyping: true 
        }));
      }
    };

    const handleTypingStop = (data) => {
      if (data.contact_id === chatId && data.user_id !== user?.id) {
        dispatch(updateTypingStatus({ 
          contactId: chatId, 
          userId: data.user_id, 
          isTyping: false 
        }));
      }
    };

    // Register socket event listeners
    socketService.on('messageReceived', handleNewMessage);
    socketService.on('new_message', handleNewMessage);
    socketService.on('message_sent', handleNewMessage);
    socketService.on('message_seen', handleMessageSeen);
    socketService.on('message_delivered', handleMessageDelivered);
    socketService.on('typing_start', handleTypingStart);
    socketService.on('typing_stop', handleTypingStop);
    
    return () => {
      // Clean up socket event listeners
      socketService.off('messageReceived', handleNewMessage);
      socketService.off('new_message', handleNewMessage);
      socketService.off('message_sent', handleNewMessage);
      socketService.off('message_seen', handleMessageSeen);
      socketService.off('message_delivered', handleMessageDelivered);
      socketService.off('typing_start', handleTypingStart);
      socketService.off('typing_stop', handleTypingStop);
    };
  }, [dispatch, chatId, user?.id]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (isScrolledToBottom && messagesEndRef.current) {
      scrollToBottom();
    }
  }, [messages, isScrolledToBottom]);

  useEffect(() => {
    // Mark messages as seen when they become visible
    if (chatId && messages.length > 0) {
      const unseenMessages = messages.filter(
        msg => msg.senderId !== user.id && msg.status !== 'seen'
      );
      
      if (unseenMessages.length > 0) {
        dispatch(markAllMessagesAsSeen({
          contactId: chatId,
          messageIds: unseenMessages.map(msg => msg.id)
        }));
      }
    }
  }, [dispatch, chatId, messages, user.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
    setIsScrolledToBottom(isAtBottom);
  };

  const formatDateHeader = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentDate = null;
    let currentGroup = [];

    messages.forEach((message, index) => {
      const messageDate = new Date(message.timestamp).toDateString();
      
      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({
            date: currentDate,
            messages: currentGroup
          });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({
        date: currentDate,
        messages: currentGroup
      });
    }

    return groups;
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Failed to load messages
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => dispatch(fetchMessages(chatId))}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No messages yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Start the conversation by sending a message below
          </p>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Messages Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
      >
        {messageGroups.map((group, groupIndex) => (
          <div key={group.date}>
            {/* Date Header */}
            <div className="flex justify-center my-4">
              <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {formatDateHeader(group.date)}
                </span>
              </div>
            </div>

            {/* Messages for this date */}
            {group.messages.map((message, messageIndex) => {
              const previousMessage = messageIndex > 0 ? group.messages[messageIndex - 1] : null;
              const nextMessage = messageIndex < group.messages.length - 1 ? group.messages[messageIndex + 1] : null;
              
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.senderId === user.id}
                  previousMessage={previousMessage}
                  nextMessage={nextMessage}
                  showAvatar={true}
                />
              );
            })}
          </div>
        ))}

        {/* Typing Indicators */}
        <AnimatePresence>
          {chatTypingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex justify-start mb-4"
            >
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {chatTypingUsers.length === 1 
                    ? `${chatTypingUsers[0].name} is typing...`
                    : `${chatTypingUsers.length} people are typing...`
                  }
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading more messages indicator */}
        {loading && messages.length > 0 && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {!isScrolledToBottom && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 112 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Connection Status Indicator */}
      <div className="absolute top-2 right-2 z-50">
        {socketService.isConnectedToServer() ? (
          <div className="flex items-center space-x-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full text-xs">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
        ) : autoRefreshEnabled ? (
          <div className="flex items-center space-x-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded-full text-xs">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span>Auto-refresh</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 px-2 py-1 rounded-full text-xs">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Offline</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageList;