import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { 
  Avatar, 
  Button, 
  LoadingScreen,
  Input,
  Card,
  FileUpload
} from '../components/common';
import { 
  updateProfile, 
  uploadProfilePhoto,
  updateUserSettings,
  fetchUserProfile 
} from '../store/slices/authSlice';
import {
  changePassword
} from '../store/slices/userSlice';
import { toggleTheme } from '../store/slices/uiSlice';
import socketService from '../services/socket';

// Toggle Switch Component
const Toggle = ({ checked, onChange, disabled = false }) => {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${checked 
          ? 'bg-green-600 dark:bg-green-500' 
          : 'bg-gray-200 dark:bg-gray-700'
        }
        ${disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
        }
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
};

const Profile = () => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);
  const { theme } = useSelector((state) => state.ui);
  const location = useLocation();
  
  // Handle URL parameters for direct tab navigation
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(location.search);
    const tab = urlParams.get('tab');
    return ['profile', 'security', 'settings', 'privacy'].includes(tab) ? tab : 'profile';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    status: 'available'
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [settings, setSettings] = useState({
    darkMode: false,
    notifications: true,
    soundEnabled: true,
    readReceipts: true,
    lastSeen: true,
    onlineStatus: true,
    typing: true,
    autoDownload: 'wifi',
    language: 'en',
    fontSize: 'medium'
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch fresh user profile data on component mount
  useEffect(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);

  // Handle URL parameter changes for tab navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tab = urlParams.get('tab');
    if (['profile', 'security', 'settings', 'privacy'].includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.search, activeTab]);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        email: user.email || '',
        phone: user.phone_number || '', // Fixed: use phone_number from backend
        bio: user.bio || '',
        status: user.is_online ? 'available' : 'offline'
      });
      
      // Set settings from user data or defaults
      if (user.settings) {
        setSettings({
          darkMode: theme === 'dark', // Use current UI theme instead of user settings
          notifications: user.settings.notifications_enabled !== false,
          soundEnabled: user.settings.sound_enabled !== false,
          readReceipts: user.settings.read_receipts !== false,
          lastSeen: user.settings.last_seen_enabled !== false,
          onlineStatus: user.settings.online_status_enabled !== false,
          typing: user.settings.typing_indicators !== false,
          autoDownload: user.settings.auto_download || 'wifi',
          language: user.settings.language || 'en',
          fontSize: user.settings.font_size || 'medium'
        });
      }
    }
  }, [user, theme]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Split name into first and last name
      const nameParts = profileData.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const updateData = {
        first_name: firstName,
        last_name: lastName,
        email: profileData.email,
        phone_number: profileData.phone, // Fixed: use phone_number instead of phone
        bio: profileData.bio
      };
      
      console.log('Sending profile update data:', updateData);
      await dispatch(updateProfile(updateData)).unwrap();
      console.log('Profile update successful');
      
      // Emit socket event to notify contacts of profile update
      socketService.emit('userProfileUpdated', {
        userId: user.id,
        updatedData: {
          first_name: firstName,
          last_name: lastName,
          profile_photo: user.profile_photo // current profile photo
        }
      });
      
      // Success feedback would go here
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    
    setIsSaving(true);
    
    try {
      await dispatch(changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })).unwrap();
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      // Success feedback would go here
    } catch (error) {
      console.error('Failed to update password:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (files) => {
    try {
      // Handle both single file and array of files
      const file = Array.isArray(files) ? files[0] : files;
      
      if (!file) {
        console.error('No file provided for upload');
        return;
      }
      
      console.log('Uploading file:', file.name, file.type, file.size);
      const result = await dispatch(uploadProfilePhoto(file)).unwrap();
      
      // Emit socket event to notify contacts of profile photo update
      socketService.emit('userProfileUpdated', {
        userId: user.id,
        updatedData: {
          first_name: user.first_name,
          last_name: user.last_name,
          profile_photo: result // new profile photo URL
        }
      });
      
      // Success feedback would go here
    } catch (error) {
      console.error('Failed to upload photo:', error);
    }
  };

  const handleSettingsUpdate = async () => {
    setIsSaving(true);
    
    try {
      // Convert frontend settings to backend format
      const settingsPayload = {
        dark_mode: settings.darkMode,
        notifications_enabled: settings.notifications,
        sound_enabled: settings.soundEnabled,
        read_receipts: settings.readReceipts,
        last_seen_enabled: settings.lastSeen,
        online_status_enabled: settings.onlineStatus,
        typing_indicators: settings.typing,
        auto_download: settings.autoDownload,
        language: settings.language,
        font_size: settings.fontSize
      };
      
      await dispatch(updateUserSettings(settingsPayload)).unwrap();
      
      // Note: Dark mode DOM changes are handled by the UI slice setTheme action
      
      // Success feedback would go here
    } catch (error) {
      console.error('Failed to update settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const statusOptions = [
    { value: 'available', label: 'Available', color: 'bg-green-500', emoji: '😊' },
    { value: 'busy', label: 'Busy', color: 'bg-red-500', emoji: '😤' },
    { value: 'away', label: 'Away', color: 'bg-yellow-500', emoji: '🌙' },
    { value: 'invisible', label: 'Invisible', color: 'bg-gray-500', emoji: '👻' }
  ];

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'privacy', label: 'Privacy', icon: '🛡️' }
  ];

  if (loading && !user) {
    return <LoadingScreen message="Loading profile..." />;
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Profile & Settings
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Tabs */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-2xl space-y-6"
            >
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Profile Information
                </h2>

                {/* Profile Photo */}
                <div className="flex items-center space-x-6 mb-6">
                  <Avatar
                    src={user?.profile_photo}
                    alt={`${user?.first_name || ''} ${user?.last_name || ''}`.trim()}
                    size="extra-large"
                  />
                  
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      Profile Photo
                    </h3>
                    <FileUpload
                      accept="image/*"
                      onFileSelect={handlePhotoUpload}
                      maxSize={5 * 1024 * 1024} // 5MB in bytes
                    >
                      <Button variant="secondary" size="small">
                        Change Photo
                      </Button>
                    </FileUpload>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      JPG, PNG or GIF. Max size 5MB.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                    
                    <Input
                      label="Email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <Input
                    label="Phone Number"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      About/Bio
                    </label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell people a little about yourself..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                      rows={3}
                      maxLength={150}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {profileData.bio.length}/150 characters
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {statusOptions.map((status) => (
                        <button
                          key={status.value}
                          type="button"
                          onClick={() => setProfileData(prev => ({ ...prev, status: status.value }))}
                          className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                            profileData.status === status.value
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className={`w-3 h-3 rounded-full ${status.color}`} />
                          <span className="text-lg">{status.emoji}</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {status.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-2xl space-y-6"
            >
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Change Password
                </h2>

                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <Input
                    label="Current Password"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    required
                  />

                  <Input
                    label="New Password"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    required
                  />

                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </form>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Two-Factor Authentication
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Add an extra layer of security to your account
                </p>
                {user?.settings?.two_factor_enabled ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-200">2FA Enabled</p>
                          <p className="text-sm text-green-600 dark:text-green-400">Your account is secured with 2FA</p>
                        </div>
                      </div>
                      <Button variant="outline" size="small" onClick={() => console.log('Disable 2FA')}>
                        Disable
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="secondary" onClick={() => console.log('Enable 2FA')}>
                    Enable 2FA
                  </Button>
                )}
              </Card>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-2xl space-y-6"
            >
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  App Settings
                </h2>

                <div className="space-y-6">
                  {/* Theme */}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      Appearance
                    </h3>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Dark Mode</span>
                        <Toggle
                          checked={settings.darkMode}
                          onChange={(checked) => {
                            // Update local state immediately for UI responsiveness
                            setSettings(prev => ({ ...prev, darkMode: checked }));
                            // Dispatch theme toggle to UI slice
                            dispatch(toggleTheme());
                          }}
                        />
                      </label>

                      <div>
                        <label className="block text-gray-700 dark:text-gray-300 mb-2">
                          Font Size
                        </label>
                        <select
                          value={settings.fontSize}
                          onChange={(e) => setSettings(prev => ({ ...prev, fontSize: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Notifications */}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      Notifications
                    </h3>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Push Notifications</span>
                        <Toggle
                          checked={settings.notifications}
                          onChange={(checked) => setSettings(prev => ({ ...prev, notifications: checked }))}
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Sound</span>
                        <Toggle
                          checked={settings.soundEnabled}
                          onChange={(checked) => setSettings(prev => ({ ...prev, soundEnabled: checked }))}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Media */}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      Media
                    </h3>
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 mb-2">
                        Auto-download media
                      </label>
                      <select
                        value={settings.autoDownload}
                        onChange={(e) => setSettings(prev => ({ ...prev, autoDownload: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="never">Never</option>
                        <option value="wifi">WiFi only</option>
                        <option value="always">WiFi and cellular</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSettingsUpdate}
                      variant="primary"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'privacy' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-2xl space-y-6"
            >
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Privacy Settings
                </h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      Who can see my information
                    </h3>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Last seen</span>
                        <Toggle
                          checked={settings.lastSeen}
                          onChange={(checked) => setSettings(prev => ({ ...prev, lastSeen: checked }))}
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Online status</span>
                        <Toggle
                          checked={settings.onlineStatus}
                          onChange={(checked) => setSettings(prev => ({ ...prev, onlineStatus: checked }))}
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Read receipts</span>
                        <Toggle
                          checked={settings.readReceipts}
                          onChange={(checked) => setSettings(prev => ({ ...prev, readReceipts: checked }))}
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Typing indicators</span>
                        <Toggle
                          checked={settings.typing}
                          onChange={(checked) => setSettings(prev => ({ ...prev, typing: checked }))}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSettingsUpdate}
                      variant="primary"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Privacy Settings'}
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Danger Zone
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  These actions cannot be undone. Please be careful.
                </p>
                <div className="space-y-3">
                  <Button 
                    variant="danger" 
                    size="small"
                    onClick={() => {
                      const confirmation = prompt('Type "DELETE_ALL_MESSAGES" to confirm:');
                      if (confirmation === 'DELETE_ALL_MESSAGES') {
                        console.log('Delete all messages confirmed');
                        // dispatch(deleteAllMessages({ confirmation }));
                      }
                    }}
                  >
                    Delete All Messages
                  </Button>
                  <Button 
                    variant="danger" 
                    size="small"
                    onClick={() => {
                      const confirmation = prompt('Type "DELETE_MY_ACCOUNT" to confirm:');
                      if (confirmation === 'DELETE_MY_ACCOUNT') {
                        console.log('Delete account confirmed');
                        // dispatch(deleteAccount({ confirmation }));
                      }
                    }}
                  >
                    Deactivate Account
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;