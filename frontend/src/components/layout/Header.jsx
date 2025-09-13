import React, { useMemo, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Avatar, Dropdown, DropdownItem, DropdownDivider, StatusIndicator } from '../common';
import { logout } from '../../store/slices/authSlice';
import { toggleTheme } from '../../store/slices/uiSlice';
import { searchMessages, fetchRecentChats } from '../../store/slices/messageSlice';
import { createDisplayName, normalizeUserObject, getProfilePhotoUrl } from '../../utils/userUtils';

const Header = ({ onMenuToggle, isMobileMenuOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { theme } = useSelector((state) => state.ui);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const { searchResults, searchLoading, recentChats } = useSelector((state) => state.messages);

  // Load recent chats for search functionality
  useEffect(() => {
    if (recentChats.length === 0) {
      dispatch(fetchRecentChats({ limit: 50 }));
    }
  }, [dispatch, recentChats.length]);

  // Combine search results from messages and chats
  const combinedSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    
    // Search through recent chats
    const chatResults = Array.isArray(recentChats) ? recentChats.filter(chat => {
      const contactName = chat.contact.nickname || chat.contact.full_name || 
                         `${chat.contact.first_name} ${chat.contact.last_name}`;
      const lastMessage = chat.last_message?.content || '';
      
      return contactName.toLowerCase().includes(query) || 
             lastMessage.toLowerCase().includes(query);
    }).map(chat => ({
      type: 'chat',
      id: chat.contact.id,
      contactId: chat.contact.id,
      contactName: chat.contact.nickname || chat.contact.full_name || 
                  `${chat.contact.first_name} ${chat.contact.last_name}`,
      contactAvatar: getProfilePhotoUrl(chat.contact),
      isOnline: chat.contact.is_online,
      lastMessage: chat.last_message?.content || 'No messages yet'
    })) : [];

    // Add AI chat if it matches search
    if ('relatim ai'.includes(query) || 'ai assistant'.includes(query) || 'ai'.includes(query)) {
      chatResults.unshift({
        type: 'chat',
        id: 'ai-assistant',
        contactId: 'ai-assistant',
        contactName: 'Relatim AI',
        contactAvatar: null,
        isOnline: true,
        lastMessage: 'Ask me anything!'
      });
    }

    // Message search results
    const messageResults = Array.isArray(searchResults) ? searchResults.map(result => ({
      type: 'message',
      ...result
    })) : [];

    return [...chatResults, ...messageResults];
  }, [searchQuery, recentChats, searchResults]);

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleThemeToggle = () => {
    dispatch(toggleTheme());
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim()) {
      setShowSearchResults(true);
      // Debounce search to avoid too many API calls
      clearTimeout(window.searchTimeout);
      window.searchTimeout = setTimeout(() => {
        // Search messages if query is long enough
        if (query.length >= 2) {
          dispatch(searchMessages({ query, limit: 5 }));
        }
      }, 300);
    } else {
      setShowSearchResults(false);
    }
  };

  const handleSearchResultClick = (result) => {
    if (result.type === 'chat') {
      // Navigate to chat
      if (result.contactId === 'ai-assistant') {
        navigate('/ai');
      } else {
        navigate(`/chat/${result.contactId}`);
      }
    } else {
      // Navigate to the conversation with the message
      const contactId = result.sender_id === user?.id ? result.receiver_id : result.sender_id;
      navigate(`/chat/${contactId}`);
    }
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const handleSearchFocus = () => {
    if (searchQuery.trim()) {
      setShowSearchResults(true);
    }
  };

  const handleSearchBlur = () => {
    // Delay hiding results to allow clicking on them
    setTimeout(() => setShowSearchResults(false), 200);
  };

  // Get normalized user with proper display name
  const normalizedUser = useMemo(() => {
    return user ? normalizeUserObject(user) : null;
  }, [user]);

  const displayName = normalizedUser ? createDisplayName(normalizedUser) : 'User';

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Mobile menu toggle & Logo */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu toggle */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <span className="sr-only">Open sidebar</span>
            {isMobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* Logo - visible on mobile */}
          <div className="lg:hidden flex items-center space-x-2">
            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.891 3.296z"/>
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Relatim AI
            </span>
          </div>
        </div>

        {/* Center - Search (hidden on mobile) */}
        <div className="hidden md:flex flex-1 max-w-lg mx-8 relative">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search conversations, contacts..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                {searchLoading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Searching...</p>
                  </div>
                ) : combinedSearchResults?.length > 0 ? (
                  <div className="py-2">
                    {/* Chat Results */}
                    {combinedSearchResults.filter(r => r.type === 'chat').length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                          Conversations ({combinedSearchResults.filter(r => r.type === 'chat').length})
                        </div>
                        {combinedSearchResults.filter(r => r.type === 'chat').map((result) => (
                          <button
                            key={`chat-${result.id}`}
                            onClick={() => handleSearchResultClick(result)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <Avatar
                                src={result.contactAvatar}
                                alt={result.contactName}
                                fallback={result.contactName}
                                size="small"
                                online={result.isOnline}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {result.contactName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {result.lastMessage}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                    
                    {/* Message Results */}
                    {combinedSearchResults.filter(r => r.type === 'message').length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                          Messages ({combinedSearchResults.filter(r => r.type === 'message').length})
                        </div>
                        {combinedSearchResults.filter(r => r.type === 'message').map((result) => (
                          <button
                            key={`message-${result.id}`}
                            onClick={() => handleSearchResultClick(result)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                          >
                            <div className="flex items-start space-x-3">
                              <Avatar
                                src={getProfilePhotoUrl(result.sender)}
                                alt={result.sender?.first_name || result.sender?.email}
                                fallback={result.sender?.first_name || result.sender?.email || 'U'}
                                size="small"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {result.sender?.first_name} {result.sender?.last_name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {result.content || 'File attachment'}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="p-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No results found</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Right side - User menu */}
        <div className="flex items-center space-x-4">
          {/* Mobile Search Button */}
          <button
            onClick={() => setShowMobileSearch(true)}
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Theme toggle */}
          <button
            onClick={handleThemeToggle}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            {theme === 'dark' ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          {/* User dropdown */}
          <Dropdown
            usePortal={true}
            trigger={
              <div className="flex items-center space-x-3 cursor-pointer">
                <div className="relative">
                  <Avatar
                    src={normalizedUser?.profilePhoto}
                    alt={normalizedUser?.name || 'User'}
                    fallback={normalizedUser?.name || 'User'}
                    size="medium"
                    online={normalizedUser?.isOnline}
                  />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{displayName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {normalizedUser?.email || ''}
                  </p>
                </div>
              </div>
            }
            position="bottom-right"
          >
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-3">
                <Avatar
                  src={normalizedUser?.profilePhoto}
                  alt={normalizedUser?.name || 'User'}
                  fallback={normalizedUser?.name || 'User'}
                  size="large"
                  online={normalizedUser?.isOnline}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{displayName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {normalizedUser?.email || ''}
                  </p>
                  {normalizedUser?.bio && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic max-w-48 truncate">
                      {normalizedUser.bio}
                    </p>
                  )}
                  <StatusIndicator status={normalizedUser?.isOnline ? "online" : "offline"} showText size="small" />
                </div>
              </div>
            </div>

            <DropdownItem onClick={() => navigate('/profile')}>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profile</span>
              </div>
            </DropdownItem>

            <DropdownItem onClick={() => navigate('/profile?tab=security')}>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Security</span>
              </div>
            </DropdownItem>

            <DropdownItem onClick={() => navigate('/profile?tab=privacy')}>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Privacy</span>
              </div>
            </DropdownItem>

            <DropdownItem onClick={() => navigate('/settings')}>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </div>
            </DropdownItem>

            <DropdownDivider />

            <DropdownItem variant="danger" onClick={handleLogout}>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign out</span>
              </div>
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* Mobile Search Modal */}
      {showMobileSearch && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowMobileSearch(false)} />
          <div className="relative bg-white dark:bg-gray-800 p-4">
            <div className="flex items-center space-x-3 mb-4">
              <button
                onClick={() => setShowMobileSearch(false)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search conversations, contacts..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  autoFocus
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Mobile Search Results */}
            <div className="max-h-96 overflow-y-auto">
              {searchLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Searching...</p>
                </div>
              ) : searchResults?.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        handleSearchResultClick(result);
                        setShowMobileSearch(false);
                      }}
                      className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <Avatar
                          src={getProfilePhotoUrl(result.sender)}
                          alt={result.sender?.first_name || result.sender?.email}
                          fallback={result.sender?.first_name || result.sender?.email || 'U'}
                          size="small"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {result.sender?.first_name && result.sender?.last_name 
                              ? `${result.sender.first_name} ${result.sender.last_name}`
                              : result.sender?.email || 'Unknown User'
                            }
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {result.content || (result.file_type ? `📎 ${result.file_type}` : 'File attachment')}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(result.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                <div className="p-8 text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No messages found</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try different keywords</p>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Start typing to search</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Search through your conversations and contacts</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;