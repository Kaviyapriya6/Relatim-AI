import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Avatar, 
  Button, 
  LoadingScreen, 
  EmptyState,
  StatusIndicator,
  Input,
  Badge
} from '../components/common';
import { fetchRecentChats } from '../store/slices/messageSlice';
import socketService from '../services/socket';

const ChatList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const { 
    recentChats,
    chatsLoading
  } = useSelector((state) => state.messages);

  // Format recent chats for display
  const activeConversations = Array.isArray(recentChats) ? recentChats.map(chat => {
    let lastMessage = 'No messages yet';
    
    if (chat.last_message) {
      if (chat.last_message.content) {
        // Text message
        lastMessage = chat.last_message.content;
      } else if (chat.last_message.file_type) {
        // File message - show file type
        if (chat.last_message.file_type.startsWith('image/')) {
          lastMessage = '📸 Photo';
        } else if (chat.last_message.file_type.startsWith('video/')) {
          lastMessage = '🎥 Video';
        } else if (chat.last_message.file_type.startsWith('audio/')) {
          lastMessage = '🎵 Audio';
        } else if (chat.last_message.file_type.includes('pdf')) {
          lastMessage = '📄 PDF';
        } else {
          lastMessage = '📎 File';
        }
      } else if (chat.last_message.file_name) {
        lastMessage = `📎 ${chat.last_message.file_name}`;
      }
    }
    
    return {
      id: chat.contact.id,
      contactId: chat.contact.id,
      contactName: chat.contact.nickname || chat.contact.full_name || `${chat.contact.first_name} ${chat.contact.last_name}`,
      contactAvatar: chat.contact.profile_photo,
      lastMessage,
      lastMessageTime: chat.last_message?.created_at,
      unreadCount: chat.unread_count || 0,
      isOnline: chat.contact.is_online || false,
      isPinned: false, // TODO: Implement pinned logic
      type: 'user',
      lastSeen: chat.contact.last_seen,
      messageType: chat.last_message?.file_type || 'text'
    };
  }) : [];

  // Add AI Assistant conversation
  const aiConversation = {
    id: 'ai-assistant',
    contactId: 'ai-assistant', 
    contactName: 'Relatim AI',
    contactAvatar: null,
    lastMessage: 'Ask me anything!',
    lastMessageTime: new Date().toISOString(),
    unreadCount: 0,
    isOnline: true,
    isPinned: true,
    type: 'ai',
    lastSeen: null
  };

  const allConversations = [aiConversation, ...activeConversations];

  useEffect(() => {
    // Fetch recent chats on component mount
    dispatch(fetchRecentChats({ limit: 50 }));
  }, [dispatch]);

  useEffect(() => {
    // Socket event listeners for real-time updates
    const handleNewMessage = (message) => {
      // Refresh chat list when new message arrives
      console.log('📨 New message received in ChatList:', message);
      dispatch(fetchRecentChats({ limit: 50 }));
    };

    const handleMessageSent = (message) => {
      // Refresh chat list when message is sent
      console.log('📨 Message sent in ChatList:', message);
      dispatch(fetchRecentChats({ limit: 50 }));
    };

    const handleTyping = ({ userId, isTyping: typing }) => {
      console.log('⌨️ Typing indicator:', userId, typing);
    };

    const handleContactAdded = () => {
      // Refresh chat list when new contact is added
      dispatch(fetchRecentChats({ limit: 50 }));
    };

    // Register socket event listeners
    socketService.on('messageReceived', handleNewMessage);
    socketService.on('new_message', handleNewMessage);
    socketService.on('message_sent', handleMessageSent);
    socketService.on('typing', handleTyping);
    socketService.on('contactAdded', handleContactAdded);

    return () => {
      // Clean up socket event listeners
      socketService.off('messageReceived', handleNewMessage);
      socketService.off('new_message', handleNewMessage);
      socketService.off('message_sent', handleMessageSent);
      socketService.off('typing', handleTyping);
      socketService.off('contactAdded', handleContactAdded);
    };
  }, [dispatch]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '';
      }
      
      const now = new Date();
      const diffInMs = now - date;
      const diffInHours = diffInMs / (1000 * 60 * 60);
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
      
      // Handle future dates (shouldn't happen but just in case)
      if (diffInMs < 0) {
        return 'now';
      }
      
      if (diffInHours < 1) {
        const minutes = Math.floor(diffInMs / (1000 * 60));
        return minutes === 0 ? 'now' : `${minutes}m`;
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h`;
      } else if (diffInDays < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch (error) {
      console.warn('Error formatting time:', error);
      return '';
    }
  };

  const truncateMessage = (message, maxLength = 40) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const filteredConversations = Array.isArray(allConversations) ? allConversations.filter(conv =>
    conv.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const pinnedConversations = filteredConversations.filter(conv => conv.isPinned);
  const regularConversations = filteredConversations.filter(conv => !conv.isPinned);

  if (chatsLoading) {
    return <LoadingScreen message="Loading conversations..." />;
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Chats
          </h1>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="small"
              onClick={() => console.log('Search messages')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Button>
            
            <Button
              variant="ghost"
              size="small"
              onClick={() => navigate('/contacts')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Search */}
        <Input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
          icon={
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <EmptyState
              title={searchQuery ? "No conversations found" : "No conversations yet"}
              description={searchQuery ? "Try adjusting your search terms" : "Start a new conversation to get chatting"}
              icon="💬"
              action={{
                label: 'New Chat',
                onClick: () => navigate('/contacts')
              }}
            />
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {/* Pinned Conversations */}
            {pinnedConversations.length > 0 && (
              <>
                <div className="flex items-center px-3 py-2">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Pinned
                  </span>
                </div>
                
                {pinnedConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    formatTime={formatTime}
                    truncateMessage={truncateMessage}
                    onNavigate={navigate}
                  />
                ))}
                
                <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
              </>
            )}

            {/* Regular Conversations */}
            {regularConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                formatTime={formatTime}
                truncateMessage={truncateMessage}
                onNavigate={navigate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ConversationItem = ({ conversation, formatTime, truncateMessage, onNavigate }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (conversation.type === 'ai') {
      onNavigate('/ai');
    } else {
      onNavigate(`/chat/${conversation.contactId}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
      className={`p-3 rounded-lg cursor-pointer transition-colors ${
        conversation.unreadCount > 0 
          ? 'bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        <div className="relative">
          <Avatar
            src={conversation.contactAvatar}
            alt={conversation.contactName}
            size="medium"
            online={conversation.isOnline}
          />
          
          {conversation.type === 'ai' && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          )}
          
          {conversation.isPinned && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5z" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={`font-medium truncate ${
              conversation.unreadCount > 0 
                ? 'text-gray-900 dark:text-white' 
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {conversation.contactName}
              {conversation.type === 'ai' && (
                <Badge variant="warning" size="small" className="ml-2">
                  AI
                </Badge>
              )}
            </h3>
            
            <div className="flex items-center space-x-2 ml-2">
              <span className={`text-xs ${
                conversation.unreadCount > 0 
                  ? 'text-blue-600 dark:text-blue-400 font-medium' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {formatTime(conversation.lastMessageTime)}
              </span>
              
              {conversation.unreadCount > 0 && (
                <Badge variant="success" size="small">
                  {conversation.unreadCount}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-1">
            <p className={`text-sm truncate ${
              conversation.unreadCount > 0 
                ? 'text-gray-700 dark:text-gray-300' 
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {truncateMessage(conversation.lastMessage)}
            </p>

            <div className="flex items-center space-x-1 ml-2">
              {!conversation.isOnline && conversation.lastSeen && (
                <StatusIndicator status="offline" size="small" />
              )}
              
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex space-x-1"
                  >
                    <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                    
                    <button className="p-1 text-gray-400 hover:text-red-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatList;