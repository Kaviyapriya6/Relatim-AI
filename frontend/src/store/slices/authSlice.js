import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { uploadAPI } from '../../services/api';
import socketService, { safeConnectSocket } from '../../services/socket';

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { data, success, message } = response.data;
      
      if (!success) {
        throw new Error(message || 'Login failed');
      }
      
      const { user, token } = data;
      
      // Validate token before storing and connecting
      if (!token || typeof token !== 'string' || token.trim() === '') {
        throw new Error('Invalid token received from server');
      }
      
      // Store token in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Connect to socket with validated token
      try {
        safeConnectSocket(token);
      } catch (socketError) {
        console.warn('Socket connection failed during login:', socketError);
        // Don't fail the login if socket connection fails
      }
      
      return { user, token, success: true };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { data, success, message } = response.data;
      
      if (!success) {
        throw new Error(message || 'Registration failed');
      }
      
      const { user, token } = data;
      
      // Validate token before storing and connecting
      if (!token || typeof token !== 'string' || token.trim() === '') {
        throw new Error('Invalid token received from server');
      }
      
      // Store token in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Connect to socket with validated token
      try {
        safeConnectSocket(token);
      } catch (socketError) {
        console.warn('Socket connection failed during registration:', socketError);
        // Don't fail the registration if socket connection fails
      }
      
      return { user, token, success: true };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Registration failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/auth/logout');
      
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Disconnect socket
      socketService.disconnect();
      
      return null;
    } catch (error) {
      // Still logout locally even if server request fails
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      socketService.disconnect();
      
      return null;
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/refresh');
      const { token } = response.data;
      
      localStorage.setItem('token', token);
      
      return { token };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Token refresh failed');
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send reset email');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/reset-password', { token, password });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Password reset failed');
    }
  }
);

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async ({ token }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/verify-email', { token });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Email verification failed');
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async (_, { rejectWithValue, getState }) => {
    try {
      const token = localStorage.getItem('token');
      const userString = localStorage.getItem('user');
      
      if (!token || !userString) {
        // This is normal for new users, don't reject
        return null;
      }
      
      // Parse user data for validation
      const localUser = JSON.parse(userString);
      
      // If we already have user data, try to verify token
      // If verification fails, we'll fall back to local user data
      try {
        // Verify token with server
        const response = await api.get('/auth/verify-token', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Connect to socket if valid
        try {
          safeConnectSocket(token);
        } catch (socketError) {
          console.warn('Socket connection failed during token verification:', socketError);
        }
        
        return { user: response.data.user, token };
      } catch (verifyError) {
        console.warn('Token verification failed, using local user data:', verifyError);
        // Return local user data instead of null
        return { user: localUser, token };
      }
    } catch (error) {
      // Clear invalid data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return rejectWithValue('Authentication failed');
    }
  }
);

export const fetchUserProfile = createAsyncThunk(
  'auth/fetchUserProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/users/profile');
      return response.data.data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await api.put('/users/profile', profileData);
      console.log('Update profile response:', response.data);
      // Backend returns: { success: true, data: { user: updatedUser } }
      return response.data.data.user;
    } catch (error) {
      console.error('Update profile error:', error);
      return rejectWithValue(error.response?.data?.message || 'Profile update failed');
    }
  }
);

// Additional thunks for compatibility
export const requestPasswordReset = forgotPassword; // Alias for forgotPassword
export const updatePassword = resetPassword; // Alias for resetPassword

export const uploadProfilePhoto = createAsyncThunk(
  'auth/uploadProfilePhoto',
  async (photoFile, { rejectWithValue }) => {
    try {
      const response = await uploadAPI.uploadProfilePhoto(photoFile);
      // Backend returns: { success: true, data: { user: {...}, profile_photo: "url" } }
      return response.data.data.profile_photo;
    } catch (error) {
      console.error('Profile photo upload error:', error);
      return rejectWithValue(error.response?.data?.message || 'Photo upload failed');
    }
  }
);

export const updateUserSettings = createAsyncThunk(
  'auth/updateUserSettings',
  async (settings, { rejectWithValue }) => {
    try {
      const response = await api.put('/users/settings', settings);
      return response.data.settings;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Settings update failed');
    }
  }
);

// Add logout function export for compatibility
export const logout = logoutUser;

// Initial state
const initialState = {
  user: (() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr && userStr !== 'undefined' && userStr !== 'null') {
        return JSON.parse(userStr);
      }
      return null;
    } catch (error) {
      console.warn('Failed to parse user from localStorage:', error);
      localStorage.removeItem('user');
      return null;
    }
  })(),
  token: (() => {
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null') {
      return token;
    }
    localStorage.removeItem('token');
    return null;
  })(),
  isAuthenticated: (() => {
    const token = localStorage.getItem('token');
    return !!(token && token !== 'undefined' && token !== 'null');
  })(),
  loading: false,
  error: null,
  isVerifyingEmail: false,
  emailVerificationSent: false,
  passwordResetSent: false,
  isResettingPassword: false,
  lastLoginTime: null,
  sessionExpiry: null,
};

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.emailVerificationSent = false;
      state.passwordResetSent = false;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('user', JSON.stringify(state.user));
    },
    setSessionExpiry: (state, action) => {
      state.sessionExpiry = action.payload;
    },
    clearSession: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.sessionExpiry = null;
      state.lastLoginTime = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      socketService.disconnect();
    },
    initializeAuth: (state) => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (token && token !== 'null' && token !== 'undefined' && userStr && userStr !== 'null' && userStr !== 'undefined') {
        try {
          state.token = token;
          state.user = JSON.parse(userStr);
          state.isAuthenticated = true;
          // Connect to socket if not already connected
          if (!socketService.isConnectedToServer()) {
            try {
              safeConnectSocket(token);
            } catch (socketError) {
              console.warn('Socket connection failed during auth initialization:', socketError);
            }
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          // Clear invalid data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          state.token = null;
          state.user = null;
          state.isAuthenticated = false;
        }
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.lastLoginTime = new Date().toISOString();
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      });

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.lastLoginTime = new Date().toISOString();
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
        state.lastLoginTime = null;
        state.sessionExpiry = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
        state.lastLoginTime = null;
        state.sessionExpiry = null;
      });

    // Refresh Token
    builder
      .addCase(refreshToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        // Clear auth state on refresh failure
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        socketService.disconnect();
      });

    // Forgot Password
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.passwordResetSent = false;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
        state.passwordResetSent = true;
        state.error = null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.passwordResetSent = false;
      });

    // Reset Password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.isResettingPassword = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isResettingPassword = false;
        state.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isResettingPassword = false;
        state.error = action.payload;
      });

    // Verify Email
    builder
      .addCase(verifyEmail.pending, (state) => {
        state.isVerifyingEmail = true;
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, (state) => {
        state.isVerifyingEmail = false;
        state.emailVerificationSent = true;
        state.error = null;
        if (state.user) {
          state.user.email_verified = true;
          localStorage.setItem('user', JSON.stringify(state.user));
        }
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.isVerifyingEmail = false;
        state.error = action.payload;
      });

    // Check Auth Status
    builder
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          // User has valid auth data
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isAuthenticated = true;
        } else {
          // No auth data found (new user) - this is normal
          state.user = null;
          state.token = null;
          state.isAuthenticated = false;
        }
        state.error = null;
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });

    // Fetch User Profile
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        localStorage.setItem('user', JSON.stringify(action.payload));
        state.error = null;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        localStorage.setItem('user', JSON.stringify(action.payload));
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Upload Profile Photo
    builder
      .addCase(uploadProfilePhoto.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadProfilePhoto.fulfilled, (state, action) => {
        state.loading = false;
        if (state.user) {
          state.user.profile_photo = action.payload;
          localStorage.setItem('user', JSON.stringify(state.user));
        }
        state.error = null;
      })
      .addCase(uploadProfilePhoto.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update User Settings
    builder
      .addCase(updateUserSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserSettings.fulfilled, (state, action) => {
        state.loading = false;
        if (state.user) {
          state.user.settings = action.payload;
          localStorage.setItem('user', JSON.stringify(state.user));
        }
        state.error = null;
      })
      .addCase(updateUserSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  clearSuccess,
  updateUser,
  setSessionExpiry,
  clearSession,
  initializeAuth,
} = authSlice.actions;

export default authSlice.reducer;