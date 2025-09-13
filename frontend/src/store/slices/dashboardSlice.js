import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunk for fetching dashboard stats
export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (timeRange = 'week', { rejectWithValue }) => {
    try {
      const response = await api.get('/dashboard/stats', {
        params: { timeRange }
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard stats');
    }
  }
);

// Async thunk for fetching recent messages
export const fetchRecentMessages = createAsyncThunk(
  'dashboard/fetchRecentMessages',
  async ({ limit = 5 } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/dashboard/recent-messages', {
        params: { limit }
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch recent messages');
    }
  }
);

// Async thunk for fetching recent contacts
export const fetchRecentContacts = createAsyncThunk(
  'dashboard/fetchRecentContacts',
  async ({ limit = 8 } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/dashboard/recent-contacts', {
        params: { limit }
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch recent contacts');
    }
  }
);

const initialState = {
  // Stats data
  totalChats: 0,
  messagesSent: 0,
  activeContacts: 0,
  aiConversations: 0,
  chatsChange: 0,
  messagesChange: 0,
  contactsChange: 0,
  aiChange: 0,
  
  // Chart and activity data
  activityData: [],
  maxMessages: 1,
  
  // Message types
  textMessages: 0,
  imageMessages: 0,
  fileMessages: 0,
  aiMessages: 0,
  totalMessages: 0,
  
  // Recent data
  recentMessages: [],
  recentContacts: [],
  
  // UI state
  loading: false,
  messagesLoading: false,
  contactsLoading: false,
  error: null,
  lastUpdated: null,
  timeRange: 'week'
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addActivity: (state, action) => {
      state.activities.unshift(action.payload);
      // Keep only the latest 20 activities
      state.activities = state.activities.slice(0, 20);
    },
    updateStats: (state, action) => {
      Object.assign(state, action.payload);
      state.lastUpdated = new Date().toISOString();
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch dashboard stats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        Object.assign(state, action.payload);
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch recent messages
      .addCase(fetchRecentMessages.pending, (state) => {
        state.messagesLoading = true;
      })
      .addCase(fetchRecentMessages.fulfilled, (state, action) => {
        state.messagesLoading = false;
        state.recentMessages = action.payload;
      })
      .addCase(fetchRecentMessages.rejected, (state, action) => {
        state.messagesLoading = false;
        state.error = action.payload;
      })

      // Fetch recent contacts
      .addCase(fetchRecentContacts.pending, (state) => {
        state.contactsLoading = true;
      })
      .addCase(fetchRecentContacts.fulfilled, (state, action) => {
        state.contactsLoading = false;
        state.recentContacts = action.payload;
      })
      .addCase(fetchRecentContacts.rejected, (state, action) => {
        state.contactsLoading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, addActivity, updateStats } = dashboardSlice.actions;

export default dashboardSlice.reducer;