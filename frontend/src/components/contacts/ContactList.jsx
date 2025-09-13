import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { fetchContacts, searchContacts } from '../../store/slices/contactSlice';
import { setActiveChat } from '../../store/slices/chatSlice';
import ContactItem from './ContactItem';
import AddContact from './AddContact';
import { Button } from '../common';
import { useSocket } from '../../contexts/SocketContext';

const ContactList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, recent, online
  const [showAddContact, setShowAddContact] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState(null);

  const dispatch = useDispatch();
  const { socket } = useSocket();
  const { contacts, loading, error } = useSelector(state => state.contacts);
  const { user } = useSelector(state => state.auth);
  const { activeChat } = useSelector(state => state.chat);

  useEffect(() => {
    dispatch(fetchContacts());
  }, [dispatch]);

  // Real-time contact updates
  useEffect(() => {
    if (!socket) return;

    const handleContactOnline = (data) => {
      // Update contact online status
      dispatch({
        type: 'contacts/updateContactStatus',
        payload: { 
          contactId: data.user_id || data.userId, 
          is_online: true, 
          last_seen: data.last_seen || null
        }
      });
    };

    const handleContactOffline = (data) => {
      dispatch({
        type: 'contacts/updateContactStatus',
        payload: { 
          contactId: data.user_id || data.userId, 
          is_online: false, 
          last_seen: data.last_seen || null
        }
      });
    };

    const handleNewMessage = (message) => {
      // Update last message for contact - use correct field names from DB
      const contactId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
      dispatch({
        type: 'contacts/updateLastMessage',
        payload: {
          contactId,
          lastMessage: message.content || 'Media',
          lastMessageTime: message.created_at,
          unreadCount: message.sender_id !== user.id ? 1 : 0
        }
      });
    };

    // Listen for real-time online status updates
    const handleContactOnlineStatus = (data) => {
      dispatch({
        type: 'contacts/updateContactOnlineStatus',
        payload: {
          contactId: data.user_id,
          isOnline: data.is_online,
          lastSeen: data.last_seen
        }
      });
    };

    socket.on('contact_online_status', handleContactOnlineStatus);
    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('contact_online_status', handleContactOnlineStatus);
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, dispatch, user.id]);

  // Filter and sort contacts
  const filteredAndSortedContacts = useMemo(() => {
    let filtered = contacts;

    // Filter by search term
    if (searchTerm) {
      filtered = contacts.filter(contact =>
        contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phoneNumber?.includes(searchTerm)
      );
    }

    // Sort contacts
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0);
        case 'online':
          if (a.isOnline && !b.isOnline) return -1;
          if (!a.isOnline && b.isOnline) return 1;
          return a.name?.localeCompare(b.name) || 0;
        case 'name':
        default:
          return a.name?.localeCompare(b.name) || 0;
      }
    });
  }, [contacts, searchTerm, sortBy]);

  const handleContactClick = (contact) => {
    setSelectedContactId(contact.id);
    dispatch(setActiveChat({
      id: contact.id,
      type: 'direct',
      name: contact.name,
      avatar: contact.avatar,
      isOnline: contact.isOnline,
      lastSeen: contact.lastSeen
    }));
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    if (term) {
      dispatch(searchContacts(term));
    }
  };

  if (loading && contacts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Contacts ({contacts.length})
        </h2>
        <Button
          variant="primary"
          size="small"
          onClick={() => setShowAddContact(true)}
          className="flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Add</span>
        </Button>
      </div>

      {/* Search and Sort */}
      <div className="p-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Sort options */}
        <div className="flex space-x-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="recent">Sort by Recent</option>
            <option value="online">Online First</option>
          </select>
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-4 text-center">
            <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
            <Button
              variant="outline"
              size="small"
              onClick={() => dispatch(fetchContacts())}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        {filteredAndSortedContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No contacts found' : 'No contacts yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm 
                ? 'Try searching with a different term'
                : 'Add your first contact to start chatting'
              }
            </p>
            {!searchTerm && (
              <Button
                variant="primary"
                onClick={() => setShowAddContact(true)}
              >
                Add Contact
              </Button>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {filteredAndSortedContacts.map((contact) => (
              <ContactItem
                key={contact.id}
                contact={contact}
                isSelected={selectedContactId === contact.id || activeChat?.id === contact.id}
                onClick={() => handleContactClick(contact)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Add Contact Modal */}
      <AnimatePresence>
        {showAddContact && (
          <AddContact
            isOpen={showAddContact}
            onClose={() => setShowAddContact(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContactList;