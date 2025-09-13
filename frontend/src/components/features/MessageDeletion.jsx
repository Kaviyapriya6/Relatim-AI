import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Modal } from '../common';
import { useNotification } from '../../contexts/NotificationContext';

const MessageDeletion = ({ 
  isOpen, 
  onClose, 
  message, 
  onDeleteForMe, 
  onDeleteForEveryone, 
  canDeleteForEveryone = false 
}) => {
  const [deleteType, setDeleteType] = useState('for-me');
  const [isDeleting, setIsDeleting] = useState(false);
  const { showNotification } = useNotification();

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      if (deleteType === 'for-me') {
        await onDeleteForMe(message.id);
        showNotification('Message deleted for you', 'success');
      } else {
        await onDeleteForEveryone(message.id);
        showNotification('Message deleted for everyone', 'success');
      }
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
      showNotification('Failed to delete message. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Message"
      size="medium"
    >
      <div className="space-y-6">
        {/* Message Preview */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {message?.senderName?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {message?.senderName || 'Unknown'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTime(message?.timestamp)}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {message?.type === 'text' ? (
                  <p className="break-words">{message.content}</p>
                ) : message?.type === 'image' ? (
                  <div className="flex items-center space-x-2">
                    <span>📷</span>
                    <span>Image: {message.fileName}</span>
                  </div>
                ) : message?.type === 'file' ? (
                  <div className="flex items-center space-x-2">
                    <span>📎</span>
                    <span>File: {message.fileName}</span>
                  </div>
                ) : (
                  <p className="italic">System message</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Delete Options */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Choose delete option:
          </h3>
          
          <div className="space-y-3">
            {/* Delete for Me */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                deleteType === 'for-me'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => setDeleteType('for-me')}
            >
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  checked={deleteType === 'for-me'}
                  onChange={() => setDeleteType('for-me')}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Delete for me
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    The message will be removed from your chat history only. 
                    Other participants will still see the message.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Delete for Everyone */}
            {canDeleteForEveryone && (
              <motion.div
                whileHover={{ scale: 1.01 }}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  deleteType === 'for-everyone'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setDeleteType('for-everyone')}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    checked={deleteType === 'for-everyone'}
                    onChange={() => setDeleteType('for-everyone')}
                    className="mt-1 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Delete for everyone
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      The message will be removed from everyone's chat history. 
                      This action cannot be undone.
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      ⚠️ You can only delete messages sent within the last 24 hours
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Warning for delete for everyone */}
          <AnimatePresence>
            {deleteType === 'for-everyone' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
              >
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Warning: Permanent Action
                    </h4>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                      This will permanently delete the message for all participants. 
                      They will see "This message was deleted" instead of the original content.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant={deleteType === 'for-everyone' ? 'danger' : 'primary'}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </div>
            ) : (
              `Delete ${deleteType === 'for-everyone' ? 'for Everyone' : 'for Me'}`
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default MessageDeletion;