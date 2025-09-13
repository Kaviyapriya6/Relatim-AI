import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks
export const fetchAIConversations = createAsyncThunk(
  'ai/fetchConversations',
  async ({ page = 1, limit = 20 }, { rejectWithValue }) => {
    try {
      const response = await api.get('/ai/conversations', {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch AI conversations');
    }
  }
);

export const createAIConversation = createAsyncThunk(
  'ai/createConversation',
  async ({ title, model = 'gemini-pro' }, { rejectWithValue }) => {
    try {
      const response = await api.post('/ai/conversations', { title, model });
      return response.data.conversation;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create AI conversation');
    }
  }
);

export const deleteAIConversation = createAsyncThunk(
  'ai/deleteConversation',
  async ({ conversationId }, { rejectWithValue }) => {
    try {
      await api.delete(`/ai/conversations/${conversationId}`);
      return conversationId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete AI conversation');
    }
  }
);

export const updateAIConversation = createAsyncThunk(
  'ai/updateConversation',
  async ({ conversationId, ...updateData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/ai/conversations/${conversationId}`, updateData);
      return response.data.conversation;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update AI conversation');
    }
  }
);

export const fetchAIMessages = createAsyncThunk(
  'ai/fetchMessages',
  async ({ conversationId, page = 1, limit = 50 }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/ai/conversations/${conversationId}/messages`, {
        params: { page, limit },
      });
      return { ...response.data, conversationId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch AI messages');
    }
  }
);

export const sendAIMessage = createAsyncThunk(
  'ai/sendMessage',
  async ({ conversationId, message, model, temperature = 0.7, maxTokens = 1000 }, { rejectWithValue, dispatch }) => {
    try {
      // Add user message immediately to the conversation
      const userMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        role: 'user',
        content: message,
        created_at: new Date().toISOString(),
        temp: true,
      };
      
      dispatch(addAIMessage(userMessage));
      
      // Add AI thinking indicator
      const thinkingMessage = {
        id: `thinking-${Date.now()}`,
        conversation_id: conversationId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
        thinking: true,
        temp: true,
      };
      
      dispatch(addAIMessage(thinkingMessage));
      
      const response = await api.post(`/ai/conversations/${conversationId}/messages`, {
        message,
        model,
        temperature,
        maxTokens,
      });
      
      // Remove thinking indicator
      dispatch(removeAIMessage({ conversationId, messageId: thinkingMessage.id }));
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send AI message');
    }
  }
);

export const clearAIConversation = createAsyncThunk(
  'ai/clearConversation',
  async ({ conversationId }, { rejectWithValue }) => {
    try {
      await api.delete(`/ai/conversations/${conversationId}/messages`);
      return conversationId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to clear AI conversation');
    }
  }
);

export const getAIModels = createAsyncThunk(
  'ai/getModels',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/ai/models');
      return response.data.models;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch AI models');
    }
  }
);

export const generateAITitle = createAsyncThunk(
  'ai/generateTitle',
  async ({ conversationId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/ai/conversations/${conversationId}/generate-title`);
      return { conversationId, title: response.data.title };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate title');
    }
  }
);

export const exportAIConversation = createAsyncThunk(
  'ai/exportConversation',
  async ({ conversationId, format = 'json' }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/ai/conversations/${conversationId}/export`, {
        params: { format },
        responseType: format === 'pdf' ? 'blob' : 'json',
      });
      
      if (format === 'pdf') {
        // Download PDF file
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `ai-conversation-${conversationId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export conversation');
    }
  }
);

// Initial state
const initialState = {
  conversations: [],
  activeConversation: null,
  messages: {}, // { conversationId: { messages: [], pagination: {}, loading: false } }
  models: [
    { id: 'gemini-pro', name: 'Gemini Pro', description: 'Google\'s most capable AI model' },
    { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', description: 'Multimodal AI with vision capabilities' },
  ],
  activeModel: 'gemini-pro',
  settings: {
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses.',
    streaming: true,
    contextLength: 10, // Number of previous messages to include as context
  },
  loading: false,
  messagesLoading: false,
  error: null,
  messageError: null,
  sendingMessage: false,
  isThinking: false,
  streamingMessage: null,
  conversationStats: {
    totalConversations: 0,
    totalMessages: 0,
    tokensUsed: 0,
    averageResponseTime: 0,
  },
  searchResults: [],
  searchLoading: false,
  searchError: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalConversations: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

// Helper functions
const getConversationMessages = (state, conversationId) => {
  if (!state.messages[conversationId]) {
    state.messages[conversationId] = {
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
  return state.messages[conversationId];
};

// Slice
const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.messageError = null;
      state.searchError = null;
    },
    setActiveConversation: (state, action) => {
      state.activeConversation = action.payload;
    },
    clearActiveConversation: (state) => {
      state.activeConversation = null;
    },
    setActiveModel: (state, action) => {
      state.activeModel = action.payload;
    },
    updateSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    addAIMessage: (state, action) => {
      const message = action.payload;
      const conversationMessages = getConversationMessages(state, message.conversation_id);
      
      // Check if message already exists
      const existingIndex = conversationMessages.messages.findIndex(m => m.id === message.id);
      
      if (existingIndex === -1) {
        // Add message in chronological order
        const insertIndex = conversationMessages.messages.findIndex(m => 
          new Date(m.created_at) > new Date(message.created_at)
        );
        
        if (insertIndex === -1) {
          conversationMessages.messages.push(message);
        } else {
          conversationMessages.messages.splice(insertIndex, 0, message);
        }
      }
    },
    updateAIMessage: (state, action) => {
      const { conversationId, messageId, updates } = action.payload;
      const conversationMessages = state.messages[conversationId];
      
      if (conversationMessages) {
        const messageIndex = conversationMessages.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
          conversationMessages.messages[messageIndex] = {
            ...conversationMessages.messages[messageIndex],
            ...updates,
          };
        }
      }
    },
    removeAIMessage: (state, action) => {
      const { conversationId, messageId } = action.payload;
      const conversationMessages = state.messages[conversationId];
      
      if (conversationMessages) {
        conversationMessages.messages = conversationMessages.messages.filter(m => m.id !== messageId);
      }
    },
    updateStreamingMessage: (state, action) => {
      const { conversationId, content, isComplete = false } = action.payload;
      
      if (isComplete) {
        state.streamingMessage = null;
        state.isThinking = false;
      } else {
        state.streamingMessage = { conversationId, content };
      }
    },
    setThinking: (state, action) => {
      state.isThinking = action.payload;
    },
    updateConversationStats: (state, action) => {
      state.conversationStats = { ...state.conversationStats, ...action.payload };
    },
    updateConversationTitle: (state, action) => {
      const { conversationId, title } = action.payload;
      const conversation = state.conversations.find(c => c.id === conversationId);
      if (conversation) {
        conversation.title = title;
      }
      if (state.activeConversation?.id === conversationId) {
        state.activeConversation.title = title;
      }
    },
    markConversationAsUpdated: (state, action) => {
      const conversationId = action.payload;
      const conversation = state.conversations.find(c => c.id === conversationId);
      if (conversation) {
        conversation.updated_at = new Date().toISOString();
        
        // Move to top of list
        const index = state.conversations.indexOf(conversation);
        state.conversations.splice(index, 1);
        state.conversations.unshift(conversation);
      }
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchError = null;
    },
    resetAIState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch AI Conversations
    builder
      .addCase(fetchAIConversations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAIConversations.fulfilled, (state, action) => {
        state.loading = false;
        const { conversations, pagination, stats } = action.payload;
        
        if (action.meta.arg.page === 1) {
          state.conversations = conversations;
        } else {
          state.conversations.push(...conversations);
        }
        
        state.pagination = pagination;
        if (stats) {
          state.conversationStats = { ...state.conversationStats, ...stats };
        }
        state.error = null;
      })
      .addCase(fetchAIConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create AI Conversation
    builder
      .addCase(createAIConversation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAIConversation.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations.unshift(action.payload);
        state.activeConversation = action.payload;
        state.error = null;
      })
      .addCase(createAIConversation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete AI Conversation
    builder
      .addCase(deleteAIConversation.fulfilled, (state, action) => {
        const conversationId = action.payload;
        state.conversations = state.conversations.filter(c => c.id !== conversationId);
        
        if (state.activeConversation?.id === conversationId) {
          state.activeConversation = null;
        }
        
        // Clear messages for this conversation
        delete state.messages[conversationId];
      });

    // Update AI Conversation
    builder
      .addCase(updateAIConversation.fulfilled, (state, action) => {
        const updatedConversation = action.payload;
        const index = state.conversations.findIndex(c => c.id === updatedConversation.id);
        
        if (index !== -1) {
          state.conversations[index] = updatedConversation;
        }
        
        if (state.activeConversation?.id === updatedConversation.id) {
          state.activeConversation = updatedConversation;
        }
      });

    // Fetch AI Messages
    builder
      .addCase(fetchAIMessages.pending, (state, action) => {
        const conversationId = action.meta.arg.conversationId;
        const conversationMessages = getConversationMessages(state, conversationId);
        conversationMessages.loading = true;
        conversationMessages.error = null;
      })
      .addCase(fetchAIMessages.fulfilled, (state, action) => {
        const { messages, pagination, conversationId } = action.payload;
        const conversationMessages = getConversationMessages(state, conversationId);
        
        conversationMessages.loading = false;
        
        if (action.meta.arg.page === 1) {
          conversationMessages.messages = messages;
        } else {
          conversationMessages.messages = [...messages, ...conversationMessages.messages];
        }
        
        conversationMessages.pagination = pagination;
        conversationMessages.error = null;
      })
      .addCase(fetchAIMessages.rejected, (state, action) => {
        const conversationId = action.meta.arg.conversationId;
        const conversationMessages = getConversationMessages(state, conversationId);
        conversationMessages.loading = false;
        conversationMessages.error = action.payload;
      });

    // Send AI Message
    builder
      .addCase(sendAIMessage.pending, (state) => {
        state.sendingMessage = true;
        state.messageError = null;
      })
      .addCase(sendAIMessage.fulfilled, (state, action) => {
        state.sendingMessage = false;
        const { userMessage, aiMessage, conversationId } = action.payload;
        
        const conversationMessages = getConversationMessages(state, conversationId);
        
        // Remove temporary messages
        conversationMessages.messages = conversationMessages.messages.filter(m => !m.temp);
        
        // Add both user and AI messages
        conversationMessages.messages.push(userMessage);
        conversationMessages.messages.push(aiMessage);
        
        // Update conversation's last message time
        const conversation = state.conversations.find(c => c.id === conversationId);
        if (conversation) {
          conversation.updated_at = aiMessage.created_at;
          
          // Move to top of list
          const index = state.conversations.indexOf(conversation);
          state.conversations.splice(index, 1);
          state.conversations.unshift(conversation);
        }
        
        state.messageError = null;
      })
      .addCase(sendAIMessage.rejected, (state, action) => {
        state.sendingMessage = false;
        state.messageError = action.payload;
        
        // Remove temporary messages on error
        Object.values(state.messages).forEach(conversationMessages => {
          conversationMessages.messages = conversationMessages.messages.filter(m => !m.temp);
        });
      });

    // Clear AI Conversation
    builder
      .addCase(clearAIConversation.fulfilled, (state, action) => {
        const conversationId = action.payload;
        const conversationMessages = state.messages[conversationId];
        
        if (conversationMessages) {
          conversationMessages.messages = [];
        }
        
        // Update conversation timestamp
        const conversation = state.conversations.find(c => c.id === conversationId);
        if (conversation) {
          conversation.updated_at = new Date().toISOString();
        }
      });

    // Get AI Models
    builder
      .addCase(getAIModels.fulfilled, (state, action) => {
        state.models = action.payload;
      });

    // Generate AI Title
    builder
      .addCase(generateAITitle.fulfilled, (state, action) => {
        const { conversationId, title } = action.payload;
        const conversation = state.conversations.find(c => c.id === conversationId);
        
        if (conversation) {
          conversation.title = title;
        }
        
        if (state.activeConversation?.id === conversationId) {
          state.activeConversation.title = title;
        }
      });
  },
});

export const {
  clearError,
  setActiveConversation,
  clearActiveConversation,
  setActiveModel,
  updateSettings,
  addAIMessage,
  updateAIMessage,
  removeAIMessage,
  updateStreamingMessage,
  setThinking,
  updateConversationStats,
  updateConversationTitle,
  markConversationAsUpdated,
  clearSearchResults,
  resetAIState,
} = aiSlice.actions;

export default aiSlice.reducer;