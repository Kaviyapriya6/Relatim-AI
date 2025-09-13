import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Card, 
  Avatar, 
  Badge, 
  LoadingScreen,
  EmptyState 
} from '../components/common';
import { 
  fetchDashboardStats, 
  fetchRecentMessages, 
  fetchRecentContacts 
} from '../store/slices/dashboardSlice';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { 
    totalChats,
    messagesSent, 
    activeContacts,
    aiConversations,
    chatsChange,
    messagesChange,
    contactsChange,
    aiChange,
    activityData,
    maxMessages,
    textMessages,
    imageMessages,
    fileMessages,
    aiMessages,
    totalMessages,
    recentMessages,
    recentContacts,
    loading,
    messagesLoading,
    contactsLoading
  } = useSelector((state) => state.dashboard);
  
  const [selectedTimeRange, setSelectedTimeRange] = useState('week');

  // Derive user display name consistently
  const userName = useMemo(() => {
    if (!user) return 'User';
    
    // Handle different possible user object structures
    const userData = user.user || user; // Handle nested user object
    
    if (userData.first_name && userData.last_name) return userData.first_name;
    if (userData.name) return userData.name.split(' ')[0];
    if (userData.first_name) return userData.first_name;
    if (userData.last_name) return userData.last_name;
    if (userData.email) return userData.email.split('@')[0];
    if (userData.username) return userData.username;
    return 'User';
  }, [user]);

  useEffect(() => {
    dispatch(fetchDashboardStats(selectedTimeRange));
    dispatch(fetchRecentMessages({ limit: 5 }));
    dispatch(fetchRecentContacts({ limit: 8 }));
  }, [dispatch, selectedTimeRange]);

  const isLoading = loading;

  if (isLoading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  const statCards = [
    {
      title: 'Total Chats',
      value: totalChats || 0,
      change: chatsChange || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    {
      title: 'Messages Sent',
      value: messagesSent || 0,
      change: messagesChange || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      ),
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/30',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    {
      title: 'Active Contacts',
      value: activeContacts || 0,
      change: contactsChange || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/30',
      borderColor: 'border-purple-200 dark:border-purple-800',
    },
    {
      title: 'AI Conversations',
      value: aiConversations || 0,
      change: aiChange || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/30',
      borderColor: 'border-orange-200 dark:border-orange-800',
    },
  ];

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return `${Math.floor(diffInMs / (1000 * 60))}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatChange = (change) => {
    if (change === 0) return null;
    const isPositive = change > 0;
    return (
      <span className={`inline-flex items-center text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 13.586V6a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
        {Math.abs(change)}%
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {userName}
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Here's what's happening with your conversations today.
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="block w-full sm:w-48 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${stat.bgColor} border ${stat.borderColor}`}>
                    <div className={stat.color}>
                      {stat.icon}
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </p>
                    <div className="flex items-baseline space-x-2 mt-1">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stat.value.toLocaleString()}
                      </p>
                      {formatChange(stat.change)}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
        
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Message Activity
                </h3>
                <Badge variant="success" size="small" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {selectedTimeRange}
                </Badge>
              </div>
              
              <div className="space-y-5">
                {activityData?.length > 0 ? (
                  <>
                    {/* Chart header */}
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 px-1">
                      <span>Day</span>
                      <span>Messages</span>
                    </div>
                    
                    {activityData.map((day, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400 w-12">
                          {day.label}
                        </span>
                        <div className="flex-1">
                          <div className="relative pt-1">
                            <div className="flex items-center justify-between">
                              <div className="text-right">
                                <span className="text-xs font-semibold inline-block text-gray-600 dark:text-gray-400">
                                  {day.messages}
                                </span>
                              </div>
                            </div>
                            <div className="overflow-hidden h-2 mt-1 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                              <div
                                style={{ width: `${(day.messages / maxMessages) * 100}%` }}
                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <EmptyState
                    title="No activity data"
                    description="Start messaging to see your activity chart"
                    icon="📊"
                    className="py-8"
                  />
                )}
              </div>
            </Card>
          </motion.div>
          
          {/* Message Types */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Message Types
              </h3>
              
              <div className="space-y-5">
                {[
                  { type: 'Text Messages', count: textMessages || 0, color: 'bg-blue-500' },
                  { type: 'Images', count: imageMessages || 0, color: 'bg-green-500' },
                  { type: 'Files', count: fileMessages || 0, color: 'bg-purple-500' },
                  { type: 'AI Responses', count: aiMessages || 0, color: 'bg-orange-500' },
                ].map((item) => {
                  const total = totalMessages || 1;
                  const percentage = (item.count / total) * 100;
                  
                  return (
                    <div key={item.type}>
                      <div className="flex justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${item.color}`} />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {item.type}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.count}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${item.color}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-right mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        </div>
        
        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Messages */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Messages
                </h3>
                <button className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                  View all
                </button>
              </div>
              
              <div className="space-y-5">
                {recentMessages?.length > 0 ? (
                  recentMessages.map((message) => (
                    <div key={message.id} className="flex items-start space-x-3 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                      <Avatar
                        src={message.senderAvatar}
                        alt={message.senderName}
                        size="medium"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {message.senderName}
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div>
                    {messagesLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-3 text-gray-600 dark:text-gray-400">Loading messages...</p>
                      </div>
                    ) : (
                      <EmptyState
                        title="No recent messages"
                        description="Start a conversation to see recent messages here"
                        icon="💬"
                        className="py-8"
                      />
                    )}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
          
          {/* Recent Contacts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Contacts
                </h3>
                <button className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                  View all
                </button>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                {recentContacts?.length > 0 ? (
                  recentContacts.slice(0, 8).map((contact) => (
                    <div key={contact.id} className="text-center">
                      <div className="relative inline-block">
                        <Avatar
                          src={contact.avatar}
                          alt={contact.name}
                          size="large"
                          className="mx-auto mb-2"
                        />
                        {contact.isOnline && (
                          <div className="absolute bottom-2 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                        {contact.name}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-4">
                    {contactsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-3 text-gray-600 dark:text-gray-400">Loading contacts...</p>
                      </div>
                    ) : (
                      <EmptyState
                        title="No contacts yet"
                        description="Add some contacts to start chatting"
                        icon="👥"
                        className="py-8"
                      />
                    )}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;