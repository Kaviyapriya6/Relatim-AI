import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { setActiveChat } from '../../store/slices/chatSlice';

const RecentChats = () => {
  const [recentChats, setRecentChats] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const dispatch = useDispatch();

  useEffect(() => {
    fetchRecentChats();
  }, []);

  const fetchRecentChats = async () => {
    try {
      const response = await fetch('/api/chats/recent', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRecentChats(data);
      } else {
        // No fallback data - show empty state instead
        setRecentChats([]);
      }
    } catch (error) {
      console.error('Error fetching recent chats:', error);
      // No fallback data - show empty state instead
      setRecentChats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChatClick = (chat) => {
    dispatch(setActiveChat({
      id: chat.id,
      type: chat.type,
      name: chat.name,
      avatar: chat.avatar,
      isOnline: chat.isOnline,
      lastSeen: chat.lastSeen
    }));
  };

  const formatLastMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  };

  const getChatIcon = (type) => {
    if (type === 'ai') {
      return (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Chats
          </h3>
          <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 animate-pulse">
              <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Recent Chats
        </h3>
        <button
          onClick={fetchRecentChats}
          className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors"
        >
          View All
        </button>
      </div>
      
      <div className="space-y-3">
        {recentChats.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No recent chats</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Start a conversation to see it here</p>
          </div>
        ) : (
          recentChats.map((chat, index) => (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleChatClick(chat)}
              className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors group"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm">
                  {chat.avatar ? (
                    <img 
                      src={chat.avatar} 
                      alt={chat.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${
                      chat.type === 'ai' 
                        ? 'bg-orange-500' 
                        : 'bg-green-500'
                    }`}>
                      <span className="text-white font-medium text-lg">
                        {chat.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Online indicator */}
                {chat.isOnline && chat.type !== 'ai' && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                )}
                
                {/* AI indicator */}
                {chat.type === 'ai' && (
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-orange-500 border-2 border-white dark:border-gray-800 rounded-full flex items-center justify-center">
                    {getChatIcon(chat.type)}
                  </div>
                )}
              </div>
              
              {/* Chat info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {chat.name}
                  </h4>
                  <div className="flex items-center space-x-2">
                    {chat.unreadCount > 0 && (
                      <span className="bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      {formatLastMessageTime(chat.lastMessageTime)}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                  {chat.lastMessage || 'No messages yet'}
                </p>
                
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {chat.messageCount} messages
                  </span>
                  {chat.type === 'ai' && (
                    <span className="text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-full">
                      AI Chat
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentChats;