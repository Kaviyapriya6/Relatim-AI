import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks
export const updateUserProfile = createAsyncThunk(
  'user/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await api.put('/users/profile', profileData);
      return response.data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Profile update failed');
    }
  }
);

export const uploadProfilePhoto = createAsyncThunk(
  'user/uploadProfilePhoto',
  async (photoFile, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      
      const response = await api.post('/users/profile-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data.profile_photo;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Photo upload failed');
    }
  }
);

export const updateUserSettings = createAsyncThunk(
  'user/updateSettings',
  async (settings, { rejectWithValue }) => {
    try {
      const response = await api.put('/users/settings', settings);
      return response.data.settings;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Settings update failed');
    }
  }
);

export const getUserSettings = createAsyncThunk(
  'user/getSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/users/settings');
      return response.data.settings;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch settings');
    }
  }
);

export const changePassword = createAsyncThunk(
  'user/changePassword',
  async ({ currentPassword, newPassword }, { rejectWithValue }) => {
    try {
      const response = await api.put('/users/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Password change failed');
    }
  }
);

export const updateOnlineStatus = createAsyncThunk(
  'user/updateOnlineStatus',
  async ({ isOnline }, { rejectWithValue }) => {
    try {
      const response = await api.put('/users/online-status', { isOnline });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Status update failed');
    }
  }
);

export const blockUser = createAsyncThunk(
  'user/blockUser',
  async ({ userId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/users/block/${userId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Block user failed');
    }
  }
);

export const unblockUser = createAsyncThunk(
  'user/unblockUser',
  async ({ userId }, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/users/block/${userId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Unblock user failed');
    }
  }
);

export const getBlockedUsers = createAsyncThunk(
  'user/getBlockedUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/users/blocked');
      return response.data.blockedUsers;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch blocked users');
    }
  }
);

// 2FA operations
export const setup2FA = createAsyncThunk(
  'user/setup2FA',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post('/users/2fa/setup');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '2FA setup failed');
    }
  }
);

export const verify2FA = createAsyncThunk(
  'user/verify2FA',
  async ({ token }, { rejectWithValue }) => {
    try {
      const response = await api.post('/users/2fa/verify', { token });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '2FA verification failed');
    }
  }
);

export const disable2FA = createAsyncThunk(
  'user/disable2FA',
  async ({ password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/users/2fa/disable', { password });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '2FA disable failed');
    }
  }
);

// Danger zone operations
export const deleteAllMessages = createAsyncThunk(
  'user/deleteAllMessages',
  async ({ confirmation }, { rejectWithValue }) => {
    try {
      const response = await api.delete('/users/messages/all', {
        data: { confirmation }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Delete messages failed');
    }
  }
);

export const deleteAccount = createAsyncThunk(
  'user/deleteAccount',
  async ({ confirmation }, { rejectWithValue }) => {
    try {
      const response = await api.delete('/users/account', {
        data: { confirmation }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Account deletion failed');
    }
  }
);

// Initial state
const initialState = {
  profile: null,
  settings: {
    theme: 'light',
    language: 'en',
    notifications: {
      messages: true,
      calls: true,
      groups: true,
      email: false,
    },
    privacy: {
      last_seen: 'everyone',
      profile_photo: 'everyone',
      about: 'everyone',
      read_receipts: true,
      typing_indicators: true,
    },
    security: {
      two_factor_enabled: false,
      login_alerts: true,
    },
  },
  blockedUsers: [],
  onlineStatus: true,
  lastSeen: null,
  loading: false,
  error: null,
  profileUpdateLoading: false,
  photoUploadLoading: false,
  settingsUpdateLoading: false,
  passwordChangeLoading: false,
  accountDeletionLoading: false,
  twoFactorLoading: false,
  twoFactorEnabled: false,
  twoFactorSetup: null,
  backupCodes: [],
  deleteMessagesLoading: false,
};

// Slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateProfileLocally: (state, action) => {
      state.profile = { ...state.profile, ...action.payload };
    },
    updateSettingsLocally: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    setOnlineStatus: (state, action) => {
      state.onlineStatus = action.payload;
    },
    setLastSeen: (state, action) => {
      state.lastSeen = action.payload;
    },
    addBlockedUser: (state, action) => {
      if (!state.blockedUsers.find(user => user.id === action.payload.id)) {
        state.blockedUsers.push(action.payload);
      }
    },
    removeBlockedUser: (state, action) => {
      state.blockedUsers = state.blockedUsers.filter(
        user => user.id !== action.payload
      );
    },
    resetUserState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Update Profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.profileUpdateLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.profileUpdateLoading = false;
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.profileUpdateLoading = false;
        state.error = action.payload;
      });

    // Upload Profile Photo
    builder
      .addCase(uploadProfilePhoto.pending, (state) => {
        state.photoUploadLoading = true;
        state.error = null;
      })
      .addCase(uploadProfilePhoto.fulfilled, (state, action) => {
        state.photoUploadLoading = false;
        if (state.profile) {
          state.profile.profile_photo = action.payload;
        }
        state.error = null;
      })
      .addCase(uploadProfilePhoto.rejected, (state, action) => {
        state.photoUploadLoading = false;
        state.error = action.payload;
      });

    // Update Settings
    builder
      .addCase(updateUserSettings.pending, (state) => {
        state.settingsUpdateLoading = true;
        state.error = null;
      })
      .addCase(updateUserSettings.fulfilled, (state, action) => {
        state.settingsUpdateLoading = false;
        state.settings = { ...state.settings, ...action.payload };
        state.error = null;
      })
      .addCase(updateUserSettings.rejected, (state, action) => {
        state.settingsUpdateLoading = false;
        state.error = action.payload;
      });

    // Get Settings
    builder
      .addCase(getUserSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = { ...state.settings, ...action.payload };
        state.error = null;
      })
      .addCase(getUserSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Change Password
    builder
      .addCase(changePassword.pending, (state) => {
        state.passwordChangeLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.passwordChangeLoading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.passwordChangeLoading = false;
        state.error = action.payload;
      });

    // Update Online Status
    builder
      .addCase(updateOnlineStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateOnlineStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.onlineStatus = action.meta.arg.isOnline;
        state.error = null;
      })
      .addCase(updateOnlineStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Block User
    builder
      .addCase(blockUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(blockUser.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(blockUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Unblock User
    builder
      .addCase(unblockUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(unblockUser.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(unblockUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Get Blocked Users
    builder
      .addCase(getBlockedUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBlockedUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.blockedUsers = action.payload;
        state.error = null;
      })
      .addCase(getBlockedUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // 2FA Setup
    builder
      .addCase(setup2FA.pending, (state) => {
        state.twoFactorLoading = true;
        state.error = null;
      })
      .addCase(setup2FA.fulfilled, (state, action) => {
        state.twoFactorLoading = false;
        state.twoFactorSetup = action.payload;
        state.error = null;
      })
      .addCase(setup2FA.rejected, (state, action) => {
        state.twoFactorLoading = false;
        state.error = action.payload;
      });

    // 2FA Verify
    builder
      .addCase(verify2FA.pending, (state) => {
        state.twoFactorLoading = true;
        state.error = null;
      })
      .addCase(verify2FA.fulfilled, (state, action) => {
        state.twoFactorLoading = false;
        state.twoFactorEnabled = true;
        state.backupCodes = action.payload.backupCodes;
        state.error = null;
      })
      .addCase(verify2FA.rejected, (state, action) => {
        state.twoFactorLoading = false;
        state.error = action.payload;
      });

    // 2FA Disable
    builder
      .addCase(disable2FA.pending, (state) => {
        state.twoFactorLoading = true;
        state.error = null;
      })
      .addCase(disable2FA.fulfilled, (state) => {
        state.twoFactorLoading = false;
        state.twoFactorEnabled = false;
        state.twoFactorSetup = null;
        state.backupCodes = [];
        state.error = null;
      })
      .addCase(disable2FA.rejected, (state, action) => {
        state.twoFactorLoading = false;
        state.error = action.payload;
      });

    // Delete All Messages
    builder
      .addCase(deleteAllMessages.pending, (state) => {
        state.deleteMessagesLoading = true;
        state.error = null;
      })
      .addCase(deleteAllMessages.fulfilled, (state, action) => {
        state.deleteMessagesLoading = false;
        state.error = null;
      })
      .addCase(deleteAllMessages.rejected, (state, action) => {
        state.deleteMessagesLoading = false;
        state.error = action.payload;
      });

    // Delete Account
    builder
      .addCase(deleteAccount.pending, (state) => {
        state.accountDeletionLoading = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, (state) => {
        state.accountDeletionLoading = false;
        state.error = null;
        // Reset entire state as account is deleted
        return initialState;
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.accountDeletionLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  updateProfileLocally,
  updateSettingsLocally,
  setOnlineStatus,
  setLastSeen,
  addBlockedUser,
  removeBlockedUser,
  resetUserState,
} = userSlice.actions;

export default userSlice.reducer;