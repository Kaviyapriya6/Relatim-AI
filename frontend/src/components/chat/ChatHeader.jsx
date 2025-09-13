import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { Button } from '../common';
import { CallInterface, MessageSearch, ChatExport } from '../features';
import { formatLastSeen } from '../../utils/timeUtils';
import { useNotification } from '../../contexts/NotificationContext';
import ContactProfile from '../contacts/ContactProfile';

const ChatHeader = ({ chatId, contact, onBack }) => {
  const [showCallInterface, setShowCallInterface] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showContactProfile, setShowContactProfile] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const { onlineUsers } = useSelector(state => state.messages);
  const dispatch = useDispatch();
  const { showNotification } = useNotification();
  
  const isOnline = contact && onlineUsers.includes(contact.id);

  const handleCallStart = (callType) => {
    setShowCallInterface(true);
    // In a real app, this would initiate the actual call
  };

  const handleCallEnd = () => {
    setShowCallInterface(false);
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear all messages in this chat? This action cannot be undone.')) {
      // Implement clear chat functionality
      showNotification('Chat cleared successfully', 'success');
      setShowMoreOptions(false);
    }
  };

  const handleBlockContact = () => {
    if (window.confirm(`Are you sure you want to block ${contact.name}? You will no longer receive messages from this contact.`)) {
      // Implement block contact functionality
      showNotification(`${contact.name} has been blocked`, 'success');
      setShowMoreOptions(false);
    }
  };

  const handleContactInfo = () => {
    setShowContactProfile(true);
    setShowMoreOptions(false);
  };

  if (!contact) {
    return (
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="small"
            onClick={onBack}
            className="mr-3 md:hidden"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <div className="animate-pulse flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            <div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 mb-1"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3"
      >
        <div className="flex items-center justify-between">
          {/* Contact Info */}
          <div className="flex items-center flex-1 min-w-0">
            {/* Back button for mobile */}
            <Button
              variant="ghost"
              size="small"
              onClick={onBack}
              className="mr-3 md:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden">
                {contact.avatar ? (
                  <img 
                    src={contact.avatar} 
                    alt={contact.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {contact.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                )}
              </div>
              {/* Online indicator */}
              {isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
              )}
            </div>

            {/* Name and status */}
            <div className="ml-3 flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {contact.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isOnline ? 'Online' : formatLastSeen(contact.lastSeen)}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* Search */}
            <Button
              variant="ghost"
              size="small"
              onClick={() => setShowSearchModal(true)}
              className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="Search messages"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Button>

            {/* Video call */}
            <Button
              variant="ghost"
              size="small"
              onClick={() => handleCallStart('video')}
              className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="Video call"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </Button>

            {/* Audio call */}
            <Button
              variant="ghost"
              size="small"
              onClick={() => handleCallStart('audio')}
              className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="Audio call"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </Button>

            {/* More options */}
            <div className="relative">
              <Button
                variant="ghost"
                size="small"
                onClick={() => setShowMoreOptions(!showMoreOptions)}
                className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center"
                title="More options"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </Button>
              
              {/* Dropdown menu */}
              {showMoreOptions && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-[9999] max-w-xs"
                  style={{
                    position: 'absolute',
                    right: '0',
                    top: '100%',
                    marginTop: '8px',
                    zIndex: 9999
                  }}
                >
                  <div className="py-1">
                    <button
                      onClick={handleContactInfo}
                      className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      <span className="truncate">👤 Contact Info</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowSearchModal(true);
                        setShowMoreOptions(false);
                      }}
                      className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                      <span className="truncate">🔍 Search Messages</span>
                    </button>
                    
                    <button
                      onClick={handleClearChat}
                      className="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
                    >
                      <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 6.707 8.293a1 1 0 00-1.414 1.414L8.586 12l-3.293 3.293a1 1 0 101.414 1.414L9 13.414l2.293 2.293a1 1 0 001.414-1.414L10.414 12l2.293-2.293z" clipRule="evenodd" />
                      </svg>
                      <span className="truncate">🗑️ Clear Chat</span>
                    </button>
                    
                    <button
                      onClick={handleBlockContact}
                      className="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
                    >
                      <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                      </svg>
                      <span className="truncate">🚫 Block Contact</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Call Interface */}
      {showCallInterface && (
        <CallInterface
          contactId={contact.id}
          contactName={contact.name}
          contactAvatar={contact.avatar}
          onEndCall={handleCallEnd}
        />
      )}

      {/* Message Search Modal */}
      <MessageSearch
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSearch={(searchData) => {
          // Handle search logic
          console.log('Search:', searchData);
        }}
        results={[]} // This would come from the search results
        loading={false}
      />

      {/* Contact Profile Modal */}
      <ContactProfile
        contact={contact}
        isOpen={showContactProfile}
        onClose={() => setShowContactProfile(false)}
      />

      {/* Chat Export Modal */}
      <ChatExport
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        chatData={{ messages: [] }} // This would come from the current chat messages
        contactName={contact.name}
      />

      {/* Click outside to close dropdown */}
      {showMoreOptions && (
        <div
          className="fixed inset-0 z-[9998] bg-transparent"
          onClick={() => setShowMoreOptions(false)}
        />
      )}
    </>
  );
};

export default ChatHeader;