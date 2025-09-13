import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks
export const initiateCall = createAsyncThunk(
  'calls/initiateCall',
  async ({ contactId, callType }, { rejectWithValue }) => {
    try {
      const response = await api.post('/calls/initiate', { contactId, callType });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to initiate call');
    }
  }
);

export const acceptCall = createAsyncThunk(
  'calls/acceptCall',
  async ({ callId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/calls/${callId}/accept`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to accept call');
    }
  }
);

export const rejectCall = createAsyncThunk(
  'calls/rejectCall',
  async ({ callId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/calls/${callId}/reject`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reject call');
    }
  }
);

export const endCall = createAsyncThunk(
  'calls/endCall',
  async ({ callId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/calls/${callId}/end`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to end call');
    }
  }
);

export const fetchCallHistory = createAsyncThunk(
  'calls/fetchHistory',
  async ({ page = 1, limit = 50, type = 'all' }, { rejectWithValue }) => {
    try {
      const response = await api.get('/calls/history', {
        params: { page, limit, type },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch call history');
    }
  }
);

export const getCallStatistics = createAsyncThunk(
  'calls/getStatistics',
  async ({ period = '30d' }, { rejectWithValue }) => {
    try {
      const response = await api.get('/calls/statistics', {
        params: { period },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch call statistics');
    }
  }
);

export const createLiveKitRoom = createAsyncThunk(
  'calls/createLiveKitRoom',
  async ({ callId, participants }, { rejectWithValue }) => {
    try {
      const response = await api.post('/calls/livekit/room', {
        callId,
        participants,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create LiveKit room');
    }
  }
);

export const getLiveKitToken = createAsyncThunk(
  'calls/getLiveKitToken',
  async ({ roomId, participantId }, { rejectWithValue }) => {
    try {
      const response = await api.get('/calls/livekit/token', {
        params: { roomId, participantId },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get LiveKit token');
    }
  }
);

// Initial state
const initialState = {
  activeCall: null,
  incomingCall: null,
  callHistory: [],
  callStatistics: null,
  currentRoom: null,
  liveKitToken: null,
  participants: [],
  localParticipant: null,
  audioEnabled: true,
  videoEnabled: true,
  screenShareEnabled: false,
  isConnecting: false,
  isConnected: false,
  connectionQuality: 'excellent', // excellent, good, poor
  callDuration: 0,
  callStartTime: null,
  callEndTime: null,
  loading: false,
  error: null,
  callError: null,
  historyLoading: false,
  historyError: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalCalls: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
  filters: {
    type: 'all', // all, audio, video, missed, incoming, outgoing
    dateRange: null,
    contact: null,
  },
  settings: {
    autoAcceptCalls: false,
    callNotifications: true,
    callSounds: true,
    preferredQuality: 'auto', // auto, high, medium, low
    audioDevice: 'default',
    videoDevice: 'default',
    speakerDevice: 'default',
  },
  devices: {
    audioInputs: [],
    audioOutputs: [],
    videoInputs: [],
  },
  networkStats: {
    bitrate: 0,
    packetsLost: 0,
    jitter: 0,
    rtt: 0,
  },
};

// Slice
const callSlice = createSlice({
  name: 'calls',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.callError = null;
      state.historyError = null;
    },
    setIncomingCall: (state, action) => {
      state.incomingCall = action.payload;
    },
    clearIncomingCall: (state) => {
      state.incomingCall = null;
    },
    setActiveCall: (state, action) => {
      state.activeCall = action.payload;
      if (action.payload) {
        state.callStartTime = new Date().toISOString();
        state.callDuration = 0;
      } else {
        state.callEndTime = new Date().toISOString();
      }
    },
    updateCallStatus: (state, action) => {
      const { status, timestamp } = action.payload;
      if (state.activeCall) {
        state.activeCall.status = status;
        state.activeCall.updated_at = timestamp || new Date().toISOString();
      }
    },
    addParticipant: (state, action) => {
      const participant = action.payload;
      const existingIndex = state.participants.findIndex(p => p.id === participant.id);
      
      if (existingIndex === -1) {
        state.participants.push(participant);
      } else {
        state.participants[existingIndex] = { ...state.participants[existingIndex], ...participant };
      }
    },
    removeParticipant: (state, action) => {
      const participantId = action.payload;
      state.participants = state.participants.filter(p => p.id !== participantId);
    },
    updateParticipant: (state, action) => {
      const { participantId, updates } = action.payload;
      const index = state.participants.findIndex(p => p.id === participantId);
      
      if (index !== -1) {
        state.participants[index] = { ...state.participants[index], ...updates };
      }
    },
    setLocalParticipant: (state, action) => {
      state.localParticipant = action.payload;
    },
    toggleAudio: (state) => {
      state.audioEnabled = !state.audioEnabled;
    },
    toggleVideo: (state) => {
      state.videoEnabled = !state.videoEnabled;
    },
    toggleScreenShare: (state) => {
      state.screenShareEnabled = !state.screenShareEnabled;
    },
    setAudioEnabled: (state, action) => {
      state.audioEnabled = action.payload;
    },
    setVideoEnabled: (state, action) => {
      state.videoEnabled = action.payload;
    },
    setScreenShareEnabled: (state, action) => {
      state.screenShareEnabled = action.payload;
    },
    setConnectionStatus: (state, action) => {
      const { isConnecting, isConnected } = action.payload;
      state.isConnecting = isConnecting;
      state.isConnected = isConnected;
    },
    setConnectionQuality: (state, action) => {
      state.connectionQuality = action.payload;
    },
    updateCallDuration: (state) => {
      if (state.callStartTime) {
        const startTime = new Date(state.callStartTime);
        const currentTime = new Date();
        state.callDuration = Math.floor((currentTime - startTime) / 1000);
      }
    },
    setCurrentRoom: (state, action) => {
      state.currentRoom = action.payload;
    },
    setLiveKitToken: (state, action) => {
      state.liveKitToken = action.payload;
    },
    updateNetworkStats: (state, action) => {
      state.networkStats = { ...state.networkStats, ...action.payload };
    },
    updateDevices: (state, action) => {
      state.devices = { ...state.devices, ...action.payload };
    },
    updateSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    updateFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    addCallToHistory: (state, action) => {
      const call = action.payload;
      
      // Remove from history if already exists (for updates)
      state.callHistory = state.callHistory.filter(c => c.id !== call.id);
      
      // Add to beginning of history
      state.callHistory.unshift(call);
      
      // Keep history limited to avoid memory issues
      if (state.callHistory.length > 100) {
        state.callHistory = state.callHistory.slice(0, 100);
      }
    },
    markCallAsViewed: (state, action) => {
      const callId = action.payload;
      const call = state.callHistory.find(c => c.id === callId);
      
      if (call) {
        call.viewed = true;
      }
    },
    clearCallHistory: (state) => {
      state.callHistory = [];
    },
    resetCallState: (state) => {
      return {
        ...initialState,
        settings: state.settings,
        devices: state.devices,
      };
    },
    endActiveCall: (state) => {
      state.activeCall = null;
      state.participants = [];
      state.localParticipant = null;
      state.currentRoom = null;
      state.liveKitToken = null;
      state.isConnected = false;
      state.isConnecting = false;
      state.callEndTime = new Date().toISOString();
      state.audioEnabled = true;
      state.videoEnabled = true;
      state.screenShareEnabled = false;
      state.networkStats = {
        bitrate: 0,
        packetsLost: 0,
        jitter: 0,
        rtt: 0,
      };
    },
  },
  extraReducers: (builder) => {
    // Initiate Call
    builder
      .addCase(initiateCall.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initiateCall.fulfilled, (state, action) => {
        state.loading = false;
        state.activeCall = action.payload.call;
        state.currentRoom = action.payload.room;
        state.callStartTime = new Date().toISOString();
        state.error = null;
      })
      .addCase(initiateCall.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Accept Call
    builder
      .addCase(acceptCall.pending, (state) => {
        state.loading = true;
        state.callError = null;
      })
      .addCase(acceptCall.fulfilled, (state, action) => {
        state.loading = false;
        state.activeCall = action.payload.call;
        state.currentRoom = action.payload.room;
        state.incomingCall = null;
        state.callStartTime = new Date().toISOString();
        state.callError = null;
      })
      .addCase(acceptCall.rejected, (state, action) => {
        state.loading = false;
        state.callError = action.payload;
      });

    // Reject Call
    builder
      .addCase(rejectCall.fulfilled, (state) => {
        state.incomingCall = null;
        state.callError = null;
      });

    // End Call
    builder
      .addCase(endCall.fulfilled, (state, action) => {
        const call = action.payload.call;
        
        // Add to call history
        state.callHistory.unshift(call);
        
        // Reset call state
        state.activeCall = null;
        state.participants = [];
        state.localParticipant = null;
        state.currentRoom = null;
        state.liveKitToken = null;
        state.isConnected = false;
        state.isConnecting = false;
        state.callEndTime = new Date().toISOString();
        state.audioEnabled = true;
        state.videoEnabled = true;
        state.screenShareEnabled = false;
      });

    // Fetch Call History
    builder
      .addCase(fetchCallHistory.pending, (state) => {
        state.historyLoading = true;
        state.historyError = null;
      })
      .addCase(fetchCallHistory.fulfilled, (state, action) => {
        state.historyLoading = false;
        const { calls, pagination } = action.payload;
        
        if (action.meta.arg.page === 1) {
          state.callHistory = calls;
        } else {
          state.callHistory.push(...calls);
        }
        
        state.pagination = pagination;
        state.historyError = null;
      })
      .addCase(fetchCallHistory.rejected, (state, action) => {
        state.historyLoading = false;
        state.historyError = action.payload;
      });

    // Get Call Statistics
    builder
      .addCase(getCallStatistics.fulfilled, (state, action) => {
        state.callStatistics = action.payload;
      });

    // Create LiveKit Room
    builder
      .addCase(createLiveKitRoom.fulfilled, (state, action) => {
        state.currentRoom = action.payload.room;
      });

    // Get LiveKit Token
    builder
      .addCase(getLiveKitToken.fulfilled, (state, action) => {
        state.liveKitToken = action.payload.token;
      });
  },
});

export const {
  clearError,
  setIncomingCall,
  clearIncomingCall,
  setActiveCall,
  updateCallStatus,
  addParticipant,
  removeParticipant,
  updateParticipant,
  setLocalParticipant,
  toggleAudio,
  toggleVideo,
  toggleScreenShare,
  setAudioEnabled,
  setVideoEnabled,
  setScreenShareEnabled,
  setConnectionStatus,
  setConnectionQuality,
  updateCallDuration,
  setCurrentRoom,
  setLiveKitToken,
  updateNetworkStats,
  updateDevices,
  updateSettings,
  updateFilters,
  addCallToHistory,
  markCallAsViewed,
  clearCallHistory,
  resetCallState,
  endActiveCall,
} = callSlice.actions;

export default callSlice.reducer;