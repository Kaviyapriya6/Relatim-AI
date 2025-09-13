import React from 'react';
import { motion } from 'framer-motion';
import { Avatar } from './UI';

// Chat List Item Component
export const ChatListItem = ({ 
  chat, 
  isActive = false, 
  onClick,
  showAvatar = true,
  className = '',
  ...props 
}) => {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const truncateMessage = (message, maxLength = 50) => {
    if (!message) return '';
    return message.length > maxLength ? `${message.slice(0, maxLength)}...` : message;
  };

  return (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick?.(chat)}
      className={`
        flex items-center p-3 cursor-pointer transition-all duration-200
        border-l-4 border-transparent
        ${isActive 
          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-blue-500' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        }
        ${className}
      `}
      {...props}
    >
      {showAvatar && (
        <div className="flex-shrink-0 mr-3">
          <Avatar
            src={chat.avatar}
            alt={chat.name || chat.email}
            size="medium"
            online={chat.isOnline}
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {chat.name || chat.email || 'Unknown User'}
          </h3>
          {chat.lastMessageTime && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
              {formatTime(chat.lastMessageTime)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {chat.isTyping ? (
              <span className="text-blue-600 dark:text-blue-400 italic">Typing...</span>
            ) : (
              truncateMessage(chat.lastMessage)
            )}
          </p>
          
          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
            {chat.unreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full min-w-[20px]">
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            )}
            
            {chat.isPinned && (
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 5a1 1 0 011-1h10a1 1 0 011 1v1a1 1 0 01-1 1h-1v8a1 1 0 01-1 1H7a1 1 0 01-1-1V7H5a1 1 0 01-1-1V5z" />
              </svg>
            )}
            
            {chat.isMuted && (
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.846 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.846l3.537-3.816a1 1 0 011.617-.108zM16 8a1 1 0 011 1v2a1 1 0 11-2 0V9a1 1 0 011-1z" clipRule="evenodd" />
                <path d="M17.707 9.293a1 1 0 010 1.414L15.414 13l2.293 2.293a1 1 0 11-1.414 1.414L14 14.414l-2.293 2.293a1 1 0 01-1.414-1.414L12.586 13l-2.293-2.293a1 1 0 111.414-1.414L14 11.586l2.293-2.293a1 1 0 011.414 0z" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Contact List Item Component
export const ContactListItem = ({ 
  contact, 
  isSelected = false, 
  onClick,
  showStatus = true,
  className = '',
  ...props 
}) => {
  return (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick?.(contact)}
      className={`
        flex items-center p-3 cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'bg-blue-50 dark:bg-blue-900/20' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        }
        ${className}
      `}
      {...props}
    >
      <div className="flex-shrink-0 mr-3">
        <Avatar
          src={contact.avatar}
          alt={contact.name || contact.email}
          size="medium"
          online={showStatus && contact.isOnline}
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {contact.name || contact.email || 'Unknown Contact'}
        </h3>
        
        {showStatus && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {contact.isOnline ? 'Online' : `Last seen ${contact.lastSeen || 'recently'}`}
          </p>
        )}
        
        {contact.about && (
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
            {contact.about}
          </p>
        )}
      </div>

      {isSelected && (
        <div className="flex-shrink-0 ml-2">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </motion.div>
  );
};

// Message List Item Component
export const MessageListItem = ({ 
  message, 
  isSent = false,
  showAvatar = false,
  showTime = true,
  className = '',
  ...props 
}) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageStatus = (status) => {
    switch (status) {
      case 'sending':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'sent':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'delivered':
        return (
          <div className="flex">
            <svg className="w-4 h-4 text-gray-400 -mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'read':
        return (
          <div className="flex">
            <svg className="w-4 h-4 text-blue-500 -mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        flex ${isSent ? 'justify-end' : 'justify-start'} mb-4
        ${className}
      `}
      {...props}
    >
      {!isSent && showAvatar && (
        <div className="flex-shrink-0 mr-2">
          <Avatar
            src={message.senderAvatar}
            alt={message.senderName}
            size="small"
          />
        </div>
      )}

      <div className={`
        max-w-xs lg:max-w-md px-4 py-2 rounded-lg
        ${isSent 
          ? 'bg-blue-500 text-white' 
          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
        }
      `}>
        {message.type === 'text' && (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}

        {message.type === 'image' && (
          <div>
            <img
              src={message.content}
              alt="Attachment"
              className="rounded-lg max-w-full h-auto"
            />
            {message.caption && (
              <p className="text-sm mt-2 whitespace-pre-wrap break-words">
                {message.caption}
              </p>
            )}
          </div>
        )}

        {message.type === 'file' && (
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">{message.fileName}</p>
              <p className="text-xs opacity-70">{message.fileSize}</p>
            </div>
          </div>
        )}

        <div className={`
          flex items-center justify-between mt-1
          ${isSent ? 'justify-end' : 'justify-start'}
        `}>
          {showTime && (
            <span className={`
              text-xs opacity-70
              ${isSent ? 'text-white' : 'text-gray-500 dark:text-gray-400'}
            `}>
              {formatTime(message.timestamp)}
            </span>
          )}

          {isSent && message.status && (
            <div className="ml-2">
              {getMessageStatus(message.status)}
            </div>
          )}
        </div>
      </div>

      {isSent && showAvatar && (
        <div className="flex-shrink-0 ml-2">
          <Avatar
            src={message.senderAvatar}
            alt="You"
            size="small"
          />
        </div>
      )}
    </motion.div>
  );
};

export { ChatListItem as default };