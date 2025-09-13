import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { addContact, removeContact } from '../../store/slices/contactSlice';
import { Button, Avatar } from '../common';
import { useNotification } from '../../contexts/NotificationContext';

const ContactItem = ({ contact, isSelected, onClick, showActions = true }) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { showNotification } = useNotification();

  const handleRemoveContact = async () => {
    try {
      await dispatch(removeContact(contact.id)).unwrap();
      showNotification(`${contact.name} removed from contacts`, 'success');
      setShowConfirmDelete(false);
    } catch (error) {
      console.error('Error removing contact:', error);
      showNotification('Failed to remove contact', 'error');
    }
  };

  // Use correct field names from backend/Redux
  const isOnline = contact.is_online;
  const lastSeen = contact.last_seen;

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never seen';
    
    const date = new Date(lastSeen);
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {/* Avatar */}
        {/* Avatar with online indicator */}
        <Avatar
          src={contact.profile_photo || contact.avatar}
          alt={`${contact.first_name || contact.name} ${contact.last_name || ''}`}
          fallback={`${contact.first_name || contact.name} ${contact.last_name || ''}`}
          size="large"
          online={isOnline}
        />

        {/* Contact info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {contact.nickname || `${contact.first_name || contact.name} ${contact.last_name || ''}`}
            </h3>
            {contact.unreadCount > 0 && (
              <span className="ml-2 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {contact.lastMessage || 'No messages yet'}
            </p>
            {contact.lastMessageTime && (
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                {formatLastSeen(contact.lastMessageTime)}
              </span>
            )}
          </div>
          
          {contact.email && (
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {contact.email}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center space-x-1 ml-3" onClick={(e) => e.stopPropagation()}>
          {/* Message button */}
          <Button
            variant="ghost"
            size="small"
            className="p-2"
            title="Send message"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </Button>

          {/* Call button */}
          <Button
            variant="ghost"
            size="small"
            className="p-2"
            title="Audio call"
            onClick={(e) => {
              e.stopPropagation();
              // Handle call
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </Button>

          {/* Remove button */}
          <Button
            variant="ghost"
            size="small"
            className="p-2 text-red-600 hover:text-red-700"
            title="Remove contact"
            onClick={(e) => {
              e.stopPropagation();
              setShowConfirmDelete(true);
            }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </Button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={(e) => e.stopPropagation()}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4"
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Remove Contact
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to remove {contact.name} from your contacts? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                size="small"
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="small"
                onClick={handleRemoveContact}
                className="flex-1"
              >
                Remove
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default ContactItem;