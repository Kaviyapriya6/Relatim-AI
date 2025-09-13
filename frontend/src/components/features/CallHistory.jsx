import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Modal } from '../common';
import { useNotification } from '../../contexts/NotificationContext';

const CallHistory = ({ isOpen, onClose, onInitiateCall }) => {
  const [calls, setCalls] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'missed', 'outgoing', 'incoming'
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (isOpen) {
      fetchCallHistory();
    }
  }, [isOpen]);

  const fetchCallHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/calls/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCalls(data.calls || []);
      } else {
        throw new Error('Failed to fetch call history');
      }
    } catch (error) {
      console.error('Error fetching call history:', error);
      showNotification('Failed to load call history', 'error');
      setCalls([]); // Show empty state instead of mock data
    } finally {
      setLoading(false);
    }
  };

  const filteredCalls = calls.filter(call => {
    if (filter === 'all') return true;
    if (filter === 'missed') return call.status === 'missed';
    return call.direction === filter;
  });

  const formatDuration = (seconds) => {
    if (seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getCallIcon = (call) => {
    const isVideo = call.type === 'video';
    const isMissed = call.status === 'missed';
    const isOutgoing = call.direction === 'outgoing';
    
    let colorClass = isMissed ? 'text-red-500' : 'text-blue-500';
    
    if (isVideo) {
      return (
        <svg className={`w-5 h-5 ${colorClass}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
      );
    } else {
      return (
        <svg className={`w-5 h-5 ${colorClass}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
        </svg>
      );
    }
  };

  const getDirectionIcon = (direction) => {
    if (direction === 'outgoing') {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  const handleCallContact = (call, callType) => {
    onInitiateCall?.(call.contactId, callType);
    onClose();
  };

  const deleteCall = async (callId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/calls/${callId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setCalls(prev => prev.filter(call => call.id !== callId));
        showNotification('Call deleted from history', 'success');
      } else {
        throw new Error('Failed to delete call');
      }
    } catch (error) {
      console.error('Error deleting call:', error);
      showNotification('Failed to delete call', 'error');
    }
  };

  const clearAllHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/calls/clear-history', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setCalls([]);
        showNotification('Call history cleared', 'success');
      } else {
        throw new Error('Failed to clear call history');
      }
    } catch (error) {
      console.error('Error clearing call history:', error);
      showNotification('Failed to clear call history', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Call History"
      size="large"
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All Calls' },
            { value: 'missed', label: 'Missed' },
            { value: 'outgoing', label: 'Outgoing' },
            { value: 'incoming', label: 'Incoming' }
          ].map((filterOption) => (
            <Button
              key={filterOption.value}
              variant={filter === filterOption.value ? 'primary' : 'outline'}
              size="small"
              onClick={() => setFilter(filterOption.value)}
            >
              {filterOption.label}
            </Button>
          ))}
        </div>

        {/* Clear History Button */}
        {calls.length > 0 && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="small"
              onClick={clearAllHistory}
              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            >
              Clear All History
            </Button>
          </div>
        )}

        {/* Call List */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading calls...</span>
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No calls found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {filter === 'all' ? 'Start making calls to see them here' : `No ${filter} calls found`}
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-1">
              <AnimatePresence>
                {filteredCalls.map((call, index) => (
                  <motion.div
                    key={call.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {/* Contact Avatar */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          {call.contactAvatar ? (
                            <img 
                              src={call.contactAvatar} 
                              alt={call.contactName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {call.contactName?.charAt(0) || 'U'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Call Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {call.contactName}
                          </p>
                          {getDirectionIcon(call.direction)}
                          {getCallIcon(call)}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatTime(call.timestamp)}</span>
                          {call.status === 'completed' && (
                            <>
                              <span>•</span>
                              <span>{formatDuration(call.duration)}</span>
                            </>
                          )}
                          {call.status === 'missed' && (
                            <>
                              <span>•</span>
                              <span className="text-red-500">Missed</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      {/* Audio Call */}
                      <Button
                        onClick={() => handleCallContact(call, 'audio')}
                        variant="ghost"
                        size="small"
                        className="p-2"
                        title="Audio call"
                      >
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                      </Button>

                      {/* Video Call */}
                      <Button
                        onClick={() => handleCallContact(call, 'video')}
                        variant="ghost"
                        size="small"
                        className="p-2"
                        title="Video call"
                      >
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                      </Button>

                      {/* Delete Call */}
                      <Button
                        onClick={() => deleteCall(call.id)}
                        variant="ghost"
                        size="small"
                        className="p-2 text-red-600 hover:text-red-700"
                        title="Delete call"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CallHistory;