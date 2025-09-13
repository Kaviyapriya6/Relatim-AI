import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { updateContact, removeContact } from '../../store/slices/contactSlice';
import { setActiveChat } from '../../store/slices/chatSlice';
import { Button } from '../common';
import { useNotification } from '../../contexts/NotificationContext';
import { formatLastSeen as formatLastSeenTime } from '../../utils/timeUtils';

const ContactProfile = ({ contact, isOpen, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: contact?.name || '',
    email: contact?.email || '',
    phoneNumber: contact?.phoneNumber || '',
    bio: contact?.bio || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const dispatch = useDispatch();
  const { showNotification } = useNotification();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.name) {
      showNotification('Name is required', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      await dispatch(updateContact({
        id: contact.id,
        ...formData
      })).unwrap();
      showNotification('Contact updated successfully', 'success');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating contact:', error);
      showNotification('Failed to update contact', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await dispatch(removeContact(contact.id)).unwrap();
      showNotification(`${contact.name} removed from contacts`, 'success');
      onClose();
    } catch (error) {
      console.error('Error removing contact:', error);
      showNotification('Failed to remove contact', 'error');
    } finally {
      setIsLoading(false);
      setShowConfirmDelete(false);
    }
  };

  const handleStartChat = () => {
    dispatch(setActiveChat({
      id: contact.id,
      type: 'direct',
      name: contact.name,
      avatar: contact.avatar,
      isOnline: contact.isOnline,
      lastSeen: contact.lastSeen
    }));
    onClose();
  };

  const formatLastSeen = (lastSeen) => {
    return formatLastSeenTime(lastSeen) || 'Never seen';
  };

  if (!isOpen || !contact) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Contact Profile
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Edit contact"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6">
          {/* Avatar and basic info */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4">
                {contact.avatar ? (
                  <img 
                    src={contact.avatar} 
                    alt={contact.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">
                      {contact.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
              {contact.isOnline && (
                <div className="absolute bottom-4 right-0 w-6 h-6 bg-blue-500 border-4 border-white dark:border-gray-800 rounded-full"></div>
              )}
            </div>

            {!isEditing ? (
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {contact.name}
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  {contact.isOnline ? 'Online' : `Last seen ${formatLastSeen(contact.lastSeen)}`}
                </p>
              </div>
            ) : (
              <div className="w-full">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Contact name"
                  className="block w-full px-3 py-2 text-center text-xl font-semibold border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* Contact Details */}
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              {!isEditing ? (
                <p className="text-gray-900 dark:text-white">
                  {contact.email || 'Not provided'}
                </p>
              ) : (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email address"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              {!isEditing ? (
                <p className="text-gray-900 dark:text-white">
                  {contact.phoneNumber || 'Not provided'}
                </p>
              ) : (
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="Phone number"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                About
              </label>
              {!isEditing ? (
                <p className="text-gray-900 dark:text-white">
                  {contact.bio || 'No information available'}
                </p>
              ) : (
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="About this contact"
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
            </div>

            {/* Stats */}
            {!isEditing && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {contact.messageCount || 0}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Messages</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {contact.callCount || 0}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Calls</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            {isEditing ? (
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: contact?.name || '',
                      email: contact?.email || '',
                      phoneNumber: contact?.phoneNumber || '',
                      bio: contact?.bio || ''
                    });
                  }}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={isLoading || !formData.name}
                  className="flex-1"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="primary"
                  onClick={handleStartChat}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>Send Message</span>
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>Call</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Video</span>
                  </Button>
                </div>

                <Button
                  variant="danger"
                  onClick={() => setShowConfirmDelete(true)}
                  className="w-full"
                  disabled={isLoading}
                >
                  Remove Contact
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmDelete && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
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
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Removing...' : 'Remove'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ContactProfile;