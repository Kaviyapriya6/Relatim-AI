import { createSlice } from '@reduxjs/toolkit';

// Initial state
const getInitialTheme = () => {
  // Check localStorage first for manual user preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    return savedTheme;
  }
  
  // Fallback to system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
};

const initialState = {
  theme: getInitialTheme(),
  language: localStorage.getItem('language') || 'en',
  sidebarOpen: true,
  sidebarCollapsed: false,
  chatPanelOpen: true,
  contactsPanelOpen: false,
  aiPanelOpen: false,
  settingsPanelOpen: false,
  profilePanelOpen: false,
  callPanelOpen: false,
  searchPanelOpen: false,
  emojiPickerOpen: false,
  filePreviewOpen: false,
  activeTab: 'chats', // chats, contacts, ai, calls, settings
  activeModal: null, // null, 'profile', 'settings', 'add-contact', 'create-group', etc.
  modalData: null,
  notifications: [],
  toasts: [],
  confirmDialog: {
    open: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
  },
  contextMenu: {
    open: false,
    x: 0,
    y: 0,
    items: [],
  },
  dragState: {
    isDragging: false,
    dragType: null, // 'file', 'contact', etc.
    dragData: null,
  },
  resizeState: {
    isResizing: false,
    resizeType: null, // 'sidebar', 'chat-panel', etc.
  },
  scrollPositions: {}, // Store scroll positions for different components
  viewportSize: {
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024,
  },
  online: navigator.onLine,
  focus: document.hasFocus(),
  visibility: document.visibilityState,
  loading: {
    global: false,
    components: {}, // Component-specific loading states
  },
  errors: {
    global: null,
    components: {}, // Component-specific errors
  },
  preferences: {
    animations: true,
    sounds: true,
    autoDownload: false,
    compactMode: false,
    showTimestamps: true,
    showReadReceipts: true,
    groupMessagesByDate: true,
    enterToSend: true,
    ctrlEnterToSend: false,
    previewLinks: true,
    autoPlayVideos: false,
    fontSize: 'medium', // small, medium, large
    fontFamily: 'system', // system, roboto, inter, etc.
    messageSpacing: 'normal', // compact, normal, comfortable
    bubbleStyle: 'modern', // classic, modern, minimal
    chatWallpaper: null,
    customCss: '',
  },
  keyboard: {
    currentFocus: null,
    tabIndex: 0,
    shortcuts: {
      'ctrl+k': 'search',
      'ctrl+n': 'new-chat',
      'ctrl+shift+a': 'new-ai-chat',
      'escape': 'close-modal',
      'ctrl+,': 'settings',
      'ctrl+/': 'shortcuts-help',
    },
  },
  search: {
    global: '',
    messages: '',
    contacts: '',
    ai: '',
    filters: {},
    results: {},
    history: [],
  },
  clipboard: {
    hasData: false,
    dataType: null, // 'text', 'image', 'file'
    data: null,
  },
  performance: {
    renderCount: 0,
    lastRenderTime: 0,
    avgRenderTime: 0,
    memoryUsage: 0,
  },
};

// Slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme and appearance
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.theme);
    },
    syncThemeWithUserSettings: (state, action) => {
      // Only sync if no manual theme preference is stored
      if (!localStorage.getItem('theme') && action.payload?.dark_mode !== undefined) {
        state.theme = action.payload.dark_mode ? 'dark' : 'light';
      }
    },
    setLanguage: (state, action) => {
      state.language = action.payload;
      localStorage.setItem('language', action.payload);
    },
    updatePreferences: (state, action) => {
      state.preferences = { ...state.preferences, ...action.payload };
      localStorage.setItem('preferences', JSON.stringify(state.preferences));
    },

    // Layout and panels
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    toggleSidebarCollapsed: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = action.payload;
    },
    setChatPanelOpen: (state, action) => {
      state.chatPanelOpen = action.payload;
    },
    setContactsPanelOpen: (state, action) => {
      state.contactsPanelOpen = action.payload;
    },
    setAiPanelOpen: (state, action) => {
      state.aiPanelOpen = action.payload;
    },
    setSettingsPanelOpen: (state, action) => {
      state.settingsPanelOpen = action.payload;
    },
    setProfilePanelOpen: (state, action) => {
      state.profilePanelOpen = action.payload;
    },
    setCallPanelOpen: (state, action) => {
      state.callPanelOpen = action.payload;
    },
    setSearchPanelOpen: (state, action) => {
      state.searchPanelOpen = action.payload;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
      // Close other panels when switching tabs
      state.contactsPanelOpen = false;
      state.aiPanelOpen = false;
      state.settingsPanelOpen = false;
      state.profilePanelOpen = false;
      state.callPanelOpen = false;
    },

    // Modals and dialogs
    openModal: (state, action) => {
      const { modal, data = null } = action.payload;
      state.activeModal = modal;
      state.modalData = data;
    },
    closeModal: (state) => {
      state.activeModal = null;
      state.modalData = null;
    },
    showConfirmDialog: (state, action) => {
      state.confirmDialog = {
        open: true,
        ...action.payload,
      };
    },
    hideConfirmDialog: (state) => {
      state.confirmDialog = {
        open: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null,
      };
    },

    // Context menu
    showContextMenu: (state, action) => {
      const { x, y, items } = action.payload;
      state.contextMenu = {
        open: true,
        x,
        y,
        items,
      };
    },
    hideContextMenu: (state) => {
      state.contextMenu = {
        open: false,
        x: 0,
        y: 0,
        items: [],
      };
    },

    // Drag and drop
    startDrag: (state, action) => {
      const { type, data } = action.payload;
      state.dragState = {
        isDragging: true,
        dragType: type,
        dragData: data,
      };
    },
    endDrag: (state) => {
      state.dragState = {
        isDragging: false,
        dragType: null,
        dragData: null,
      };
    },

    // Resize
    startResize: (state, action) => {
      state.resizeState = {
        isResizing: true,
        resizeType: action.payload,
      };
    },
    endResize: (state) => {
      state.resizeState = {
        isResizing: false,
        resizeType: null,
      };
    },

    // Notifications and toasts
    addNotification: (state, action) => {
      const notification = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        read: false,
        ...action.payload,
      };
      state.notifications.unshift(notification);
      
      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },
    markNotificationAsRead: (state, action) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    addToast: (state, action) => {
      const toast = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        autoHide: true,
        duration: 5000,
        ...action.payload,
      };
      state.toasts.push(toast);
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter(t => t.id !== action.payload);
    },
    clearToasts: (state) => {
      state.toasts = [];
    },

    // Viewport and responsive
    updateViewportSize: (state, action) => {
      const { width, height } = action.payload;
      state.viewportSize = {
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
      };
      
      // Auto-adjust panels for mobile
      if (width < 768) {
        state.sidebarCollapsed = true;
        state.chatPanelOpen = true;
        state.contactsPanelOpen = false;
      }
    },
    setOnlineStatus: (state, action) => {
      state.online = action.payload;
    },
    setFocusStatus: (state, action) => {
      state.focus = action.payload;
    },
    setVisibilityStatus: (state, action) => {
      state.visibility = action.payload;
    },

    // Loading states
    setGlobalLoading: (state, action) => {
      state.loading.global = action.payload;
    },
    setComponentLoading: (state, action) => {
      const { component, loading } = action.payload;
      state.loading.components[component] = loading;
    },

    // Error states
    setGlobalError: (state, action) => {
      state.errors.global = action.payload;
    },
    setComponentError: (state, action) => {
      const { component, error } = action.payload;
      state.errors.components[component] = error;
    },
    clearGlobalError: (state) => {
      state.errors.global = null;
    },
    clearComponentError: (state, action) => {
      const component = action.payload;
      delete state.errors.components[component];
    },

    // Scroll positions
    saveScrollPosition: (state, action) => {
      const { component, position } = action.payload;
      state.scrollPositions[component] = position;
    },
    restoreScrollPosition: (state, action) => {
      const component = action.payload;
      return state.scrollPositions[component] || 0;
    },

    // Keyboard and shortcuts
    setCurrentFocus: (state, action) => {
      state.keyboard.currentFocus = action.payload;
    },
    updateTabIndex: (state, action) => {
      state.keyboard.tabIndex = action.payload;
    },
    updateShortcuts: (state, action) => {
      state.keyboard.shortcuts = { ...state.keyboard.shortcuts, ...action.payload };
    },

    // Search
    updateGlobalSearch: (state, action) => {
      state.search.global = action.payload;
      
      // Add to search history
      if (action.payload && !state.search.history.includes(action.payload)) {
        state.search.history.unshift(action.payload);
        // Keep only last 20 searches
        if (state.search.history.length > 20) {
          state.search.history = state.search.history.slice(0, 20);
        }
      }
    },
    updateComponentSearch: (state, action) => {
      const { component, query } = action.payload;
      state.search[component] = query;
    },
    clearSearch: (state, action) => {
      const component = action.payload;
      if (component) {
        state.search[component] = '';
      } else {
        state.search.global = '';
        state.search.messages = '';
        state.search.contacts = '';
        state.search.ai = '';
      }
    },

    // Clipboard
    updateClipboard: (state, action) => {
      const { type, data } = action.payload;
      state.clipboard = {
        hasData: true,
        dataType: type,
        data,
      };
    },
    clearClipboard: (state) => {
      state.clipboard = {
        hasData: false,
        dataType: null,
        data: null,
      };
    },

    // Performance
    updatePerformanceStats: (state, action) => {
      const { renderTime, memoryUsage } = action.payload;
      state.performance.renderCount++;
      state.performance.lastRenderTime = renderTime;
      state.performance.avgRenderTime = 
        (state.performance.avgRenderTime * (state.performance.renderCount - 1) + renderTime) / 
        state.performance.renderCount;
      if (memoryUsage !== undefined) {
        state.performance.memoryUsage = memoryUsage;
      }
    },

    // Utility actions
    setEmojiPickerOpen: (state, action) => {
      state.emojiPickerOpen = action.payload;
    },
    setFilePreviewOpen: (state, action) => {
      state.filePreviewOpen = action.payload;
    },
    resetUIState: (state) => {
      return {
        ...initialState,
        theme: state.theme,
        language: state.language,
        preferences: state.preferences,
        viewportSize: state.viewportSize,
      };
    },
  },
});

export const {
  // Theme and appearance
  setTheme,
  toggleTheme,
  syncThemeWithUserSettings,
  setLanguage,
  updatePreferences,

  // Layout and panels
  toggleSidebar,
  setSidebarOpen,
  toggleSidebarCollapsed,
  setSidebarCollapsed,
  setChatPanelOpen,
  setContactsPanelOpen,
  setAiPanelOpen,
  setSettingsPanelOpen,
  setProfilePanelOpen,
  setCallPanelOpen,
  setSearchPanelOpen,
  setActiveTab,

  // Modals and dialogs
  openModal,
  closeModal,
  showConfirmDialog,
  hideConfirmDialog,

  // Context menu
  showContextMenu,
  hideContextMenu,

  // Drag and drop
  startDrag,
  endDrag,

  // Resize
  startResize,
  endResize,

  // Notifications and toasts
  addNotification,
  markNotificationAsRead,
  removeNotification,
  clearNotifications,
  addToast,
  removeToast,
  clearToasts,

  // Viewport and responsive
  updateViewportSize,
  setOnlineStatus,
  setFocusStatus,
  setVisibilityStatus,

  // Loading states
  setGlobalLoading,
  setComponentLoading,

  // Error states
  setGlobalError,
  setComponentError,
  clearGlobalError,
  clearComponentError,

  // Scroll positions
  saveScrollPosition,
  restoreScrollPosition,

  // Keyboard and shortcuts
  setCurrentFocus,
  updateTabIndex,
  updateShortcuts,

  // Search
  updateGlobalSearch,
  updateComponentSearch,
  clearSearch,

  // Clipboard
  updateClipboard,
  clearClipboard,

  // Performance
  updatePerformanceStats,

  // Utility actions
  setEmojiPickerOpen,
  setFilePreviewOpen,
  resetUIState,
} = uiSlice.actions;

// Alias for backwards compatibility
export const setConnectionStatus = setOnlineStatus;

export default uiSlice.reducer;