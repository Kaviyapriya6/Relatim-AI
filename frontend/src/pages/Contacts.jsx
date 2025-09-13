import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Avatar, 
  Button, 
  LoadingScreen, 
  EmptyState,
  Input,
  Modal,
  StatusIndicator
} from '../components/common';
import { 
  fetchContacts, 
  addContact, 
  removeContact, 
  searchUsers
} from '../store/slices/contactSlice';
import socketService from '../services/socket';
import { formatLastSeen as formatLastSeenTime } from '../utils/timeUtils';

const Contacts = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  
  const { 
    contacts, 
    searchResults,
    loading 
  } = useSelector((state) => state.contacts);

  useEffect(() => {
    dispatch(fetchContacts({}));
  }, [dispatch]);

  useEffect(() => {
    // Real-time contact status updates
    const handleContactStatusUpdate = ({ userId, isOnline, lastSeen }) => {
      console.log('Contact status update:', userId, isOnline, lastSeen);
      // Update contact status in real-time
    };

    const handleContactAdded = (contact) => {
      console.log('New contact added:', contact);
      dispatch(fetchContacts({}));
    };

    socketService.on('contactStatusUpdate', handleContactStatusUpdate);
    socketService.on('contactAdded', handleContactAdded);

    return () => {
      socketService.off('contactStatusUpdate', handleContactStatusUpdate);
      socketService.off('contactAdded', handleContactAdded);
    };
  }, [dispatch]);

  const handleSearchUsers = async (query) => {
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      return;
    }

    // Check if it's an email - only search if it has a complete domain
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    const isCompleteEmail = emailRegex.test(trimmedQuery);
    
    // Check if it looks like someone is typing an email (contains @)
    const isPartialEmail = trimmedQuery.includes('@');
    
    // Check if it's a phone number (contains digits and has proper format)
    const phoneRegex = /^\+?[\d\s\-()]{8,}$/;
    const isValidPhone = /\d/.test(trimmedQuery) && phoneRegex.test(trimmedQuery);
    
    // Check if it's a name (at least 4 characters, no @ or digits to avoid partial emails)
    const isValidName = !isPartialEmail && !/\d/.test(trimmedQuery) && trimmedQuery.length >= 4;
    
    // Only search if:
    // 1. It's a complete email (has @domain.extension)
    // 2. It's a phone number with at least 8 digits  
    // 3. It's a name with at least 4 characters (and doesn't contain @ or numbers)
    if (isCompleteEmail || isValidPhone || isValidName) {
      dispatch(searchUsers({ query: trimmedQuery }));
    }
  };

  const handleAddContact = async (userId) => {
    try {
      await dispatch(addContact(userId)).unwrap();
      // Refresh the contacts list to show the newly added contact
      dispatch(fetchContacts({}));
      setShowUserSearch(false);
      setUserSearchQuery('');
    } catch (error) {
      console.error('Failed to add contact:', error);
      // If it's "already exists", just refresh contacts to make sure UI is in sync
      if (error.includes('already exists')) {
        dispatch(fetchContacts({}));
      }
    }
  };

  const handleRemoveContact = async (contactId) => {
    try {
      await dispatch(removeContact(contactId)).unwrap();
      setSelectedContact(null);
    } catch (error) {
      console.error('Failed to remove contact:', error);
    }
  };

  const handleStartChat = (contact) => {
    navigate(`/chat/${contact.id}`);
  };

  const filteredContacts = Array.isArray(contacts) ? contacts.filter(contact =>
    contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact?.phone?.includes(searchQuery)
  ) : [];

  const onlineContacts = filteredContacts.filter(contact => contact?.isOnline);
  const offlineContacts = filteredContacts.filter(contact => !contact?.isOnline);

  const formatLastSeen = (lastSeen) => {
    return formatLastSeenTime(lastSeen) || 'Never';
  };

  if (loading && !contacts.length) {
    return <LoadingScreen message="Loading contacts..." />;
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Contacts ({filteredContacts.length})
          </h1>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="small"
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            >
              {viewMode === 'list' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              )}
            </Button>
            
            <Button
              variant="primary"
              size="small"
              onClick={() => setShowUserSearch(true)}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Contact
            </Button>
          </div>
        </div>

        {/* Search */}
        <Input
          type="text"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
          icon={
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />

        {/* Stats */}
        <div className="flex items-center space-x-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            {onlineContacts.length} online
          </span>
          <span className="flex items-center">
            <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
            {offlineContacts.length} offline
          </span>
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <EmptyState
              title={searchQuery ? "No contacts found" : "No contacts yet"}
              description={searchQuery ? "Try adjusting your search terms" : "Add some contacts to start chatting"}
              icon="👥"
              action={{
                label: 'Add Contact',
                onClick: () => setShowUserSearch(true)
              }}
            />
          </div>
        ) : (
          <div className="p-4">
            {/* Online Contacts */}
            {onlineContacts.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Online ({onlineContacts.length})
                </h3>
                
                {viewMode === 'list' ? (
                  <div className="space-y-2">
                    {onlineContacts.map((contact) => (
                      <ContactListItem 
                        key={contact.id} 
                        contact={contact} 
                        onStartChat={handleStartChat}
                        onViewProfile={setSelectedContact}
                        formatLastSeen={formatLastSeen}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {onlineContacts.map((contact) => (
                      <ContactGridItem 
                        key={contact.id} 
                        contact={contact} 
                        onStartChat={handleStartChat}
                        onViewProfile={setSelectedContact}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Offline Contacts */}
            {offlineContacts.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                  Offline ({offlineContacts.length})
                </h3>
                
                {viewMode === 'list' ? (
                  <div className="space-y-2">
                    {offlineContacts.map((contact) => (
                      <ContactListItem 
                        key={contact.id} 
                        contact={contact} 
                        onStartChat={handleStartChat}
                        onViewProfile={setSelectedContact}
                        formatLastSeen={formatLastSeen}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {offlineContacts.map((contact) => (
                      <ContactGridItem 
                        key={contact.id} 
                        contact={contact} 
                        onStartChat={handleStartChat}
                        onViewProfile={setSelectedContact}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      <Modal
        isOpen={showUserSearch}
        onClose={() => {
          setShowUserSearch(false);
          setUserSearchQuery('');
        }}
        title="Add New Contact"
        size="medium"
      >
        <div className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Search users by name, email, or phone..."
              value={userSearchQuery}
              onChange={(e) => {
                setUserSearchQuery(e.target.value);
                handleSearchUsers(e.target.value);
              }}
              className="w-full"
              icon={
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter a complete email (user@domain.com), phone number (8+ digits), or name (min 4 characters)
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {searchResults.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  {userSearchQuery ? 'No users found' : 'Search for users to add'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar
                        src={user.profilePhoto}
                        alt={user.name}
                        size="medium"
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => handleAddContact(user.id)}
                      disabled={contacts.some(contact => contact.id === user.id)}
                    >
                      {contacts.some(contact => contact.id === user.id) ? 'Already Added' : 'Add Contact'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Contact Profile Modal */}
      {selectedContact && (
        <ContactProfileModal
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onStartChat={handleStartChat}
          onRemoveContact={handleRemoveContact}
          formatLastSeen={formatLastSeen}
        />
      )}
    </div>
  );
};

const ContactListItem = ({ contact, onStartChat, onViewProfile, formatLastSeen }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
      className="p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onViewProfile(contact)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar
            src={contact?.profilePhoto}
            alt={contact?.name || 'Contact'}
            size="medium"
            online={contact?.isOnline}
          />
          
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {contact?.name || 'Unknown Contact'}
            </h3>
            <div className="flex items-center space-x-2">
              <StatusIndicator 
                status={contact?.isOnline ? 'online' : 'offline'} 
                size="small" 
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {contact?.isOnline ? 'online' : `last seen ${formatLastSeen(contact?.lastSeen)}`}
              </span>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex space-x-2"
            >
              <Button
                variant="ghost"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartChat(contact);
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </Button>
              
              <Button
                variant="ghost"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Voice call');
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const ContactGridItem = ({ contact, onStartChat, onViewProfile }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
      onClick={() => onViewProfile(contact)}
    >
      <div className="text-center">
        <Avatar
          src={contact?.profilePhoto}
          alt={contact?.name || 'Contact'}
          size="large"
          online={contact?.isOnline}
          className="mx-auto mb-3"
        />
        
        <h3 className="font-medium text-gray-900 dark:text-white truncate">
          {contact?.name || 'Unknown Contact'}
        </h3>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {contact?.isOnline ? 'online' : 'offline'}
        </p>
        
        <div className="flex space-x-2 mt-3">
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onStartChat(contact);
            }}
            className="flex-1"
          >
            Chat
          </Button>
          
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Voice call');
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

const ContactProfileModal = ({ contact, onClose, onStartChat, onRemoveContact, formatLastSeen }) => {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Contact Profile"
      size="medium"
    >
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="text-center">
          <Avatar
            src={contact?.profilePhoto}
            alt={contact?.name || 'Contact'}
            size="extra-large"
            online={contact?.isOnline}
            className="mx-auto mb-4"
          />
          
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {contact?.name || 'Unknown Contact'}
          </h2>
          
          <div className="flex items-center justify-center space-x-2 mt-2">
            <StatusIndicator 
              status={contact?.isOnline ? 'online' : 'offline'} 
              size="small" 
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {contact?.isOnline ? 'online' : `last seen ${formatLastSeen(contact?.lastSeen)}`}
            </span>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          {contact.email && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <p className="text-gray-900 dark:text-white">{contact.email}</p>
            </div>
          )}
          
          {contact.phone && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <p className="text-gray-900 dark:text-white">{contact.phone}</p>
            </div>
          )}
          
          {contact.bio && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                About
              </label>
              <p className="text-gray-900 dark:text-white">{contact.bio}</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Added on
            </label>
            <p className="text-gray-900 dark:text-white">
              {contact?.createdAt ? new Date(contact.createdAt).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <Button
            variant="primary"
            onClick={() => {
              onStartChat(contact);
              onClose();
            }}
            className="flex-1"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Send Message
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => console.log('Voice call')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => console.log('Video call')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </Button>
        </div>

        {/* Danger Zone */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="danger"
            size="small"
            onClick={() => {
              if (window.confirm('Are you sure you want to remove this contact?')) {
                onRemoveContact(contact.id);
                onClose();
              }
            }}
          >
            Remove Contact
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Contacts;