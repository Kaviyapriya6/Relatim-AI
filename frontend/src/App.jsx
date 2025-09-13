import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ErrorBoundary } from './components/common';
import { 
  Login, 
  Register, 
  ForgotPassword, 
  ProtectedRoute, 
  PublicRoute 
} from './components/auth';
import { Layout } from './components/layout';
import { Dashboard, Chat, ChatList, AIChat, Contacts, Profile, Help } from './pages';
import { checkAuthStatus } from './store/slices/authSlice';
import { syncThemeWithUserSettings } from './store/slices/uiSlice';

// Remaining features
const Calls = () => <div className="p-6"><h1 className="text-2xl font-bold">Calls Page</h1></div>;

function App() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { theme } = useSelector((state) => state.ui);

  useEffect(() => {
    // Check authentication status on app load
    dispatch(checkAuthStatus());
  }, [dispatch]);

  useEffect(() => {
    // Sync theme with user settings when user loads
    if (user?.settings) {
      dispatch(syncThemeWithUserSettings(user.settings));
    }
  }, [user, dispatch]);

  useEffect(() => {
    // Apply theme from Redux state to DOM
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ErrorBoundary>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          <Route path="/forgot-password" element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          } />
          
          {/* Protected Routes with Layout */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="chats" element={<ChatList />} />
            <Route path="chat/:contactId" element={<Chat />} />
            <Route path="ai" element={<AIChat />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Profile />} />
            <Route path="help" element={<Help />} />
            <Route path="calls" element={<Calls />} />
          </Route>
          
          {/* Fallback routes */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;