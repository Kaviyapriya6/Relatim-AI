import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks
export const fetchMessages = createAsyncThunk(
  'messages/fetchMessages',
  async ({ contactId, page = 1, limit = 50 }, { rejectWithValue }) => {
    try {
      // Validate contactId
      if (!contactId || contactId === 'undefined') {
        return rejectWithValue('Invalid contact ID provided');
      }
      
      const offset = (page - 1) * limit;
      const response = await api.get(`/messages/conversation/${contactId}`, {
        params: { limit, offset },
      });
      return { 
        messages: response.data.data.messages, 
        pagination: response.data.data.pagination, 
        contactId 
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch messages');
    }
  }
);

export const fetchRecentChats = createAsyncThunk(
  'messages/fetchRecentChats',
  async ({ limit = 20, offset = 0 } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get(`/messages/chats?limit=${limit}&offset=${offset}`);
      return response.data.data.chats;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch recent chats');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async ({ contactId, content, type = 'text', file = null }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('receiver_id', contactId);
      
      // Only append content if it's not empty
      if (content && content.trim()) {
        formData.append('content', content.trim());
      }
      
      if (file) {
        formData.append('file', file);
      }
      
      const response = await api.post('/messages', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return { 
        message: response.data.data.message, 
        contactId 
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

export const deleteMessage = createAsyncThunk(
  'messages/deleteMessage',
  async ({ messageId, deleteForEveryone = false }, { rejectWithValue }) => {
    try {
      await api.delete(`/messages/${messageId}`, {
        data: { deleteForEveryone },
      });
      return { messageId, deleteForEveryone };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete message');
    }
  }
);

export const markMessageAsSeen = createAsyncThunk(
  'messages/markAsSeen',
  async ({ messageId }, { rejectWithValue }) => {
    try {
      const response = await api.put('/messages/mark-read', { messageIds: [messageId] });
      return { messageId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark message as seen');
    }
  }
);

export const markAllMessagesAsSeen = createAsyncThunk(
  'messages/markAllAsSeen',
  async ({ contactId, messageIds }, { rejectWithValue }) => {
    try {
      const response = await api.put('/messages/mark-read', { messageIds });
      return { contactId, messageIds, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark messages as seen');
    }
  }
);

export const searchMessages = createAsyncThunk(
  'messages/searchMessages',
  async ({ query, contactId = null, page = 1, limit = 20 }, { rejectWithValue }) => {
    try {
      const offset = (page - 1) * limit;
      const params = { query, limit, offset };
      if (contactId) params.contact_id = contactId;
      
      const response = await api.get('/messages/search', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Search failed');
    }
  }
);

export const getMessageStatistics = createAsyncThunk(
  'messages/getStatistics',
  async ({ contactId = null, period = '7d' }, { rejectWithValue }) => {
    try {
      const response = await api.get('/messages/statistics', {
        params: { contactId, period },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch statistics');
    }
  }
);

export const downloadFile = createAsyncThunk(
  'messages/downloadFile',
  async ({ messageId, fileName }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/messages/${messageId}/download`, {
        responseType: 'blob',
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { messageId, downloaded: true };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Download failed');
    }
  }
);

// Initial state
const initialState = {
  conversations: {}, // { contactId: { messages: [], pagination: {}, loading: false } }
  messagesByChatId: {}, // Mirror for components expecting this structure
  recentChats: [], // Array of recent chat summaries
  activeConversation: null,
  searchResults: [],
  statistics: null,
  typingUsers: {}, // { contactId: [userId1, userId2] }
  onlineUsers: [],
  loading: false,
  chatsLoading: false,
  searchLoading: false,
  error: null,
  searchError: null,
  sendingMessages: {}, // { tempId: { loading: true, error: null } }
  unreadCounts: {}, // { contactId: count }
  totalUnreadCount: 0,
  filters: {
    search: '',
    type: 'all', // all, text, image, file, voice
    dateRange: null,
  },
  draft: {}, // { contactId: 'draft message content' }
  selectedMessages: [], // Array of message IDs for bulk operations
  isSelectionMode: false,
};

// Helper functions
const getConversation = (state, contactId) => {
  if (!state.conversations[contactId]) {
    state.conversations[contactId] = {
      messages: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalMessages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
      loading: false,
      error: null,
    };
  }
  // Keep mirror updated
  state.messagesByChatId[contactId] = state.conversations[contactId].messages;
  return state.conversations[contactId];
};

// Slice
const messageSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.searchError = null;
    },
    setActiveConversation: (state, action) => {
      state.activeConversation = action.payload;
    },
    clearActiveConversation: (state) => {
      state.activeConversation = null;
    },
    addMessage: (state, action) => {
      const raw = action.payload;
      const contactId = raw.contact_id || (raw.sender_id === raw.currentUserId ? raw.receiver_id : raw.sender_id);
      if (!contactId) return;
      const conversation = getConversation(state, contactId);
      const message = {
        id: raw.id,
        contact_id: contactId,
        sender_id: raw.sender_id || raw.senderId,
        receiver_id: raw.receiver_id || raw.receiverId,
        senderId: raw.sender_id || raw.senderId,
        receiverId: raw.receiver_id || raw.receiverId,
        content: raw.content,
        file_url: raw.file_url,
        file_type: raw.file_type,
        file_name: raw.file_name,
        file_size: raw.file_size,
        status: raw.status,
        created_at: raw.created_at || raw.timestamp,
        timestamp: raw.timestamp || raw.created_at,
        delivered_at: raw.delivered_at,
        seen_at: raw.seen_at,
        is_sent: raw.is_sent,
        sender: raw.sender,
        receiver: raw.receiver,
      };

      const existingIndex = conversation.messages.findIndex(m => m.id === message.id);
      if (existingIndex === -1) {
        const insertIndex = conversation.messages.findIndex(m => new Date(m.created_at) > new Date(message.created_at));
        if (insertIndex === -1) {
          conversation.messages.push(message);
        } else {
          conversation.messages.splice(insertIndex, 0, message);
        }
        if (!message.is_sent && !message.seen_at) {
          state.unreadCounts[contactId] = (state.unreadCounts[contactId] || 0) + 1;
          state.totalUnreadCount++;
        }
      }
      state.messagesByChatId[contactId] = conversation.messages;
    },
    updateMessage: (state, action) => {
      const updatedMessage = action.payload;
      const contactId = updatedMessage.contact_id;
      const conversation = state.conversations[contactId];
      
      if (conversation) {
        const index = conversation.messages.findIndex(m => m.id === updatedMessage.id);
        if (index !== -1) {
          conversation.messages[index] = { ...conversation.messages[index], ...updatedMessage };
        }
      }
    },
    removeMessage: (state, action) => {
      const { messageId, contactId } = action.payload;
      const conversation = state.conversations[contactId];
      
      if (conversation) {
        conversation.messages = conversation.messages.filter(m => m.id !== messageId);
        state.messagesByChatId[contactId] = conversation.messages;
      }
      
      // Remove from selected messages if present
      state.selectedMessages = state.selectedMessages.filter(id => id !== messageId);
    },
    updateMessageStatus: (state, action) => {
      const { messageId, status, timestamp } = action.payload;
      
      // Find message in all conversations
      Object.values(state.conversations).forEach(conversation => {
        const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
          const message = conversation.messages[messageIndex];
          
          switch (status) {
            case 'delivered':
              message.delivered_at = timestamp;
              break;
            case 'seen':
              message.seen_at = timestamp;
              // Update unread count
              if (!message.is_sent && state.unreadCounts[message.contact_id] > 0) {
                state.unreadCounts[message.contact_id]--;
                state.totalUnreadCount--;
              }
              break;
            default:
              break;
          }
        }
      });
    },
    updateTypingStatus: (state, action) => {
      const { contactId, userId, isTyping } = action.payload;
      
      if (!state.typingUsers[contactId]) {
        state.typingUsers[contactId] = [];
      }
      
      if (isTyping) {
        if (!state.typingUsers[contactId].includes(userId)) {
          state.typingUsers[contactId].push(userId);
        }
      } else {
        state.typingUsers[contactId] = state.typingUsers[contactId].filter(id => id !== userId);
      }
    },
    updateOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    setUnreadCount: (state, action) => {
      const { contactId, count } = action.payload;
      const oldCount = state.unreadCounts[contactId] || 0;
      state.unreadCounts[contactId] = count;
      state.totalUnreadCount = state.totalUnreadCount - oldCount + count;
    },
    markConversationAsSeen: (state, action) => {
      const contactId = action.payload;
      const conversation = state.conversations[contactId];
      
      if (conversation) {
        const unseenMessages = conversation.messages.filter(m => !m.is_sent && !m.seen_at);
        unseenMessages.forEach(message => {
          message.seen_at = new Date().toISOString();
        });
        
        // Reset unread count
        const oldCount = state.unreadCounts[contactId] || 0;
        state.unreadCounts[contactId] = 0;
        state.totalUnreadCount -= oldCount;
      }
    },
    saveDraft: (state, action) => {
      const { contactId, content } = action.payload;
      if (content.trim()) {
        state.draft[contactId] = content;
      } else {
        delete state.draft[contactId];
      }
    },
    clearDraft: (state, action) => {
      const contactId = action.payload;
      delete state.draft[contactId];
    },
    toggleMessageSelection: (state, action) => {
      const messageId = action.payload;
      const index = state.selectedMessages.indexOf(messageId);
      
      if (index === -1) {
        state.selectedMessages.push(messageId);
      } else {
        state.selectedMessages.splice(index, 1);
      }
      
      state.isSelectionMode = state.selectedMessages.length > 0;
    },
    selectAllMessages: (state, action) => {
      const contactId = action.payload;
      const conversation = state.conversations[contactId];
      
      if (conversation) {
        state.selectedMessages = conversation.messages.map(m => m.id);
        state.isSelectionMode = true;
      }
    },
    clearMessageSelection: (state) => {
      state.selectedMessages = [];
      state.isSelectionMode = false;
    },
    updateFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchError = null;
    },
    addSendingMessage: (state, action) => {
      const { tempId, message } = action.payload;
      state.sendingMessages[tempId] = { loading: true, error: null, message };
    },
    updateSendingMessage: (state, action) => {
      const { tempId, updates } = action.payload;
      if (state.sendingMessages[tempId]) {
        state.sendingMessages[tempId] = { ...state.sendingMessages[tempId], ...updates };
      }
    },
    removeSendingMessage: (state, action) => {
      const tempId = action.payload;
      delete state.sendingMessages[tempId];
    },
    resetMessageState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch Messages
    builder
      .addCase(fetchMessages.pending, (state, action) => {
        const contactId = action.meta.arg.contactId;
        const conversation = getConversation(state, contactId);
        conversation.loading = true;
        conversation.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { messages = [], pagination, contactId } = action.payload;
        const conversation = getConversation(state, contactId);
        
        conversation.loading = false;
        
        if (action.meta.arg.page === 1) {
          conversation.messages = Array.isArray(messages) ? messages : [];
        } else {
          conversation.messages = [
            ...(Array.isArray(messages) ? messages : []), 
            ...(Array.isArray(conversation.messages) ? conversation.messages : [])
          ];
        }
        state.messagesByChatId[contactId] = conversation.messages;
        
        conversation.pagination = pagination;
        conversation.error = null;
        
        // Update unread count
        const unseenMessages = messages.filter(m => !m.is_sent && !m.seen_at);
        state.unreadCounts[contactId] = unseenMessages.length;
        
        // Recalculate total unread count
        state.totalUnreadCount = Object.values(state.unreadCounts).reduce((sum, count) => sum + count, 0);
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        const contactId = action.meta.arg.contactId;
        const conversation = getConversation(state, contactId);
        conversation.loading = false;
        conversation.error = action.payload;
      })
      
    // Fetch Recent Chats
      .addCase(fetchRecentChats.pending, (state) => {
        state.chatsLoading = true;
        state.error = null;
      })
      .addCase(fetchRecentChats.fulfilled, (state, action) => {
        state.chatsLoading = false;
        state.recentChats = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
      })
      .addCase(fetchRecentChats.rejected, (state, action) => {
        state.chatsLoading = false;
        state.error = action.payload;
      });

    // Send Message
    builder
      .addCase(sendMessage.pending, (state, action) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        const { message, contactId } = action.payload;
        
        if (!message || !contactId) return;
        
        const conversation = getConversation(state, contactId);
        
        // Remove any temporary message with same content
        if (Array.isArray(conversation.messages)) {
          conversation.messages = conversation.messages.filter(m => 
            !(m.temp_id && m.content === message.content)
          );
          
          // Add the sent message
          conversation.messages.push(message);
        } else {
          conversation.messages = [message];
        }
        
        // Clear draft
        delete state.draft[contactId];
        
        // Clear draft
        delete state.draft[contactId];
        
        state.error = null;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete Message
    builder
      .addCase(deleteMessage.fulfilled, (state, action) => {
        const { messageId, deleteForEveryone } = action.payload;
        
        // Find and update/remove message in all conversations
        Object.values(state.conversations).forEach(conversation => {
          const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
          if (messageIndex !== -1) {
            if (deleteForEveryone) {
              conversation.messages.splice(messageIndex, 1);
            } else {
              conversation.messages[messageIndex].deleted_for_me = true;
            }
          }
        });
        
        // Remove from selected messages
        state.selectedMessages = state.selectedMessages.filter(id => id !== messageId);
      });

    // Mark Message as Seen
    builder
      .addCase(markMessageAsSeen.fulfilled, (state, action) => {
        const { messageId } = action.meta.arg;
        
        // Update message status in all conversations
        Object.values(state.conversations).forEach(conversation => {
          const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
          if (messageIndex !== -1) {
            const message = conversation.messages[messageIndex];
            message.seen_at = new Date().toISOString();
            
            // Update unread count
            if (!message.is_sent && state.unreadCounts[message.contact_id] > 0) {
              state.unreadCounts[message.contact_id]--;
              state.totalUnreadCount--;
            }
          }
        });
      });

    // Mark All Messages as Seen
    builder
      .addCase(markAllMessagesAsSeen.fulfilled, (state, action) => {
        const { contactId } = action.payload;
        const conversation = state.conversations[contactId];
        
        if (conversation) {
          conversation.messages.forEach(message => {
            if (!message.is_sent && !message.seen_at) {
              message.seen_at = new Date().toISOString();
            }
          });
          
          // Reset unread count
          const oldCount = state.unreadCounts[contactId] || 0;
          state.unreadCounts[contactId] = 0;
          state.totalUnreadCount -= oldCount;
        }
      });

    // Search Messages
    builder
      .addCase(searchMessages.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchMessages.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload.messages || [];
        state.searchError = null;
      })
      .addCase(searchMessages.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload;
      });

    // Get Statistics
    builder
      .addCase(getMessageStatistics.fulfilled, (state, action) => {
        state.statistics = action.payload;
      });

    // Download File
    builder
      .addCase(downloadFile.fulfilled, (state, action) => {
        const { messageId } = action.payload;
        
        // Mark message as downloaded
        Object.values(state.conversations).forEach(conversation => {
          const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
          if (messageIndex !== -1) {
            conversation.messages[messageIndex].downloaded = true;
          }
        });
      });
  },
});

export const {
  clearError,
  setActiveConversation,
  clearActiveConversation,
  addMessage,
  updateMessage,
  removeMessage,
  updateMessageStatus,
  updateTypingStatus,
  updateOnlineUsers,
  setUnreadCount,
  markConversationAsSeen,
  saveDraft,
  clearDraft,
  toggleMessageSelection,
  selectAllMessages,
  clearMessageSelection,
  updateFilters,
  clearSearchResults,
  addSendingMessage,
  updateSendingMessage,
  removeSendingMessage,
  resetMessageState,
} = messageSlice.actions;

// Aliases for compatibility
export const markAsRead = markMessageAsSeen; // Alias for markMessageAsSeen
export const editMessage = updateMessage; // Alias for updateMessage
export const fetchRecentMessages = fetchMessages; // Alias for fetchMessages

export default messageSlice.reducer;