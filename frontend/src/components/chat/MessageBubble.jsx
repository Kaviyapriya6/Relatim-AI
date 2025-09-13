import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';
import { updateMessageStatus, deleteMessage } from '../../store/slices/messageSlice';
import { MessageDeletion } from '../features';
import socketService from '../../services/socket';

const MessageBubble = ({ message, isOwn, showAvatar = true, previousMessage, nextMessage }) => {
  const [showActions, setShowActions] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(null);
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  
  const messageRef = useRef(null);

  // Send delivery receipt when message becomes visible
  useEffect(() => {
    if (!isOwn && message.status === 'sent' && socketService.isConnectedToServer()) {
      // Emit delivery receipt for messages sent to this user
      socketService.markMessageDelivered(message.id);
      
      // Update local status (optimistic update)
      dispatch(updateMessageStatus({
        messageId: message.id,
        status: 'delivered',
        timestamp: new Date().toISOString()
      }));
    }
  }, [message.id, message.status, isOwn, dispatch]);

  // Send read receipt when message is seen (component is visible)
  useEffect(() => {
    if (!isOwn && message.status !== 'seen' && socketService.isConnectedToServer()) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Message is visible, mark as seen
              socketService.markMessageSeen(message.id);
              
              // Update local status (optimistic update)
              dispatch(updateMessageStatus({
                messageId: message.id,
                status: 'seen',
                timestamp: new Date().toISOString()
              }));
              
              // Stop observing after marking as seen
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );

      if (messageRef.current) {
        observer.observe(messageRef.current);
      }

      return () => {
        if (messageRef.current) {
          observer.unobserve(messageRef.current);
        }
      };
    }
  }, [message.id, message.status, isOwn, dispatch]);

  // Check if we should show timestamp
  const showTimestamp = !nextMessage || 
    new Date(message.timestamp).getTime() - new Date(nextMessage.timestamp).getTime() > 60000; // 1 minute

  // Check if we should show avatar
  const shouldShowAvatar = showAvatar && !isOwn && 
    (!nextMessage || nextMessage.senderId !== message.senderId);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleReaction = (emoji) => {
    // Handle message reactions
    dispatch(updateMessageStatus({
      messageId: message.id,
      reactions: [...(message.reactions || []), { emoji, userId: user.id }]
    }));
  };

  const handleDeleteForMe = async (messageId) => {
    try {
      await dispatch(deleteMessage({ messageId, deleteType: 'for-me' })).unwrap();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleDeleteForEveryone = async (messageId) => {
    try {
      await dispatch(deleteMessage({ messageId, deleteType: 'for-everyone' })).unwrap();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessage(message.id);
      setTimeout(() => setCopiedMessage(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const handleReplyMessage = () => {
    // Emit reply action to parent component
    const replyData = {
      id: message.id,
      content: message.content,
      senderName: message.senderName,
      type: message.type
    };
    // This would typically be handled by a parent component or context
    window.dispatchEvent(new CustomEvent('replyToMessage', { detail: replyData }));
  };

  const handleForwardMessage = () => {
    // Emit forward action to parent component
    const forwardData = {
      id: message.id,
      content: message.content,
      type: message.type,
      fileUrl: message.fileUrl,
      fileName: message.fileName
    };
    window.dispatchEvent(new CustomEvent('forwardMessage', { detail: forwardData }));
  };

  const handleDownloadMedia = async () => {
    try {
      const response = await fetch(message.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = message.fileName || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const renderMessageContent = () => {
    switch (message.type) {
      case 'text':
        return (
          <p className="whitespace-pre-wrap break-words">
            {message.content}
          </p>
        );
      
      case 'image':
        return (
          <div className="relative">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
              </div>
            )}
            <div className="relative cursor-pointer" onClick={() => setShowImageModal(true)}>
              <img
                src={message.fileUrl}
                alt="Shared image"
                onLoad={() => setImageLoaded(true)}
                className={`max-w-xs max-h-64 rounded object-cover ${!imageLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity hover:opacity-90`}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 3a1 1 0 000 2h.01a1 1 0 100-2H5zm4 0a1 1 0 000 2h6a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            {message.content && (
              <p className="mt-2 whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}
          </div>
        );
      
      case 'file':
        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg max-w-xs">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V6H8l-2-2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {message.fileName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {message.fileSize && `${(message.fileSize / 1024 / 1024).toFixed(2)} MB`}
              </p>
            </div>
            <div className="flex space-x-1">
              <button
                onClick={handleDownloadMedia}
                className="flex-shrink-0 p-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                title="Download file"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                title="Open file"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        );
      
      case 'voice':
        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg max-w-xs">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const audio = new Audio(message.fileUrl);
                    audio.play().catch(err => console.error('Error playing audio:', err));
                  }}
                  className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors"
                  title="Play voice note"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="flex-1">
                  <div className="flex items-center space-x-1">
                    {/* Simple waveform visualization */}
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-green-400 rounded-full"
                        style={{
                          height: `${Math.random() * 20 + 10}px`,
                          opacity: 0.7
                        }}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {message.duration ? `${Math.floor(message.duration / 60)}:${(message.duration % 60).toString().padStart(2, '0')}` : '0:05'}
                </span>
              </div>
            </div>
            <button
              onClick={handleDownloadMedia}
              className="flex-shrink-0 p-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
              title="Download voice note"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        );
      
      case 'system':
        return (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 italic">
            {message.content}
          </p>
        );
      
      default:
        return <p>{message.content}</p>;
    }
  };

  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
          {renderMessageContent()}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={messageRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar for received messages */}
      {shouldShowAvatar && (
        <div className="flex-shrink-0 mr-2">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            {message.senderAvatar ? (
              <img 
                src={message.senderAvatar} 
                alt={message.senderName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-green-500 flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {message.senderName?.charAt(0) || 'U'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message bubble */}
      <div className={`max-w-xs lg:max-w-md ${shouldShowAvatar ? '' : 'ml-10'}`}>
        {/* Sender name for group chats */}
        {!isOwn && showAvatar && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-2">
            {message.senderName}
          </p>
        )}

        <div className="relative">
          <div
            className={`px-4 py-2 rounded-2xl ${
              isOwn
                ? 'bg-green-500 text-white rounded-br-md'
                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-bl-md'
            }`}
          >
            {renderMessageContent()}

            {/* Message status and timestamp */}
            <div className={`flex items-center space-x-1 mt-1 text-xs ${
              isOwn ? 'text-green-100' : 'text-gray-500 dark:text-gray-400'
            }`}>
              <span>{formatTime(message.timestamp)}</span>
              {isOwn && (
                <div className="flex items-center space-x-1">
                  {message.status === 'sent' && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {message.status === 'delivered' && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L8 8.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {message.status === 'seen' && (
                    <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L8 8.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Message reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(
                message.reactions.reduce((acc, reaction) => {
                  acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                  return acc;
                }, {})
              ).map(([emoji, count]) => (
                <span
                  key={emoji}
                  className="inline-flex items-center space-x-1 bg-gray-100 dark:bg-gray-600 rounded-full px-2 py-1 text-xs"
                >
                  <span>{emoji}</span>
                  <span>{count}</span>
                </span>
              ))}
            </div>
          )}

          {/* Quick actions */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`absolute top-0 ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} flex flex-col bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-1 z-[60]`}
              >
                {/* Message actions */}
                <div className="flex items-center space-x-1 border-b border-gray-200 dark:border-gray-600 pb-1 mb-1">
                  {/* Reply */}
                  <button
                    onClick={handleReplyMessage}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
                    title="Reply"
                  >
                    ↩️
                  </button>
                  
                  {/* Forward */}
                  <button
                    onClick={handleForwardMessage}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
                    title="Forward"
                  >
                    ↪️
                  </button>
                  
                  {/* Copy */}
                  {message.type === 'text' && (
                    <button
                      onClick={handleCopyMessage}
                      className={`p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded ${copiedMessage === message.id ? 'text-green-600' : 'text-gray-600 dark:text-gray-300'}`}
                      title={copiedMessage === message.id ? 'Copied!' : 'Copy'}
                    >
                      📋
                    </button>
                  )}
                  
                  {/* Download for media */}
                  {(message.type === 'image' || message.type === 'file') && (
                    <button
                      onClick={handleDownloadMedia}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
                      title="Download"
                    >
                      💾
                    </button>
                  )}
                  
                  {/* Delete button for own messages */}
                  {isOwn && (
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
                      title="Delete message"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                {/* Quick reactions */}
                <div className="flex items-center space-x-1">
                  {['❤️', '👍', '😂', '😮', '😢'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-sm"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Show timestamp if needed */}
        {showTimestamp && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </p>
        )}
      </div>

      {/* Message Deletion Modal */}
      <MessageDeletion
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        message={message}
        onDeleteForMe={handleDeleteForMe}
        onDeleteForEveryone={handleDeleteForEveryone}
        canDeleteForEveryone={isOwn && new Date() - new Date(message.timestamp) < 24 * 60 * 60 * 1000}
      />

      {/* Image Modal */}
      {showImageModal && message.type === 'image' && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70]" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-4xl max-h-4xl p-4">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-2 right-2 text-white hover:text-gray-300 z-10"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <img
              src={message.fileUrl}
              alt="Full size image"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
              <button
                onClick={handleDownloadMedia}
                className="flex items-center space-x-2 hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MessageBubble;