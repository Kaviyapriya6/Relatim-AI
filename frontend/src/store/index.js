import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import userSlice from './slices/userSlice';
import contactSlice from './slices/contactSlice';
import messageSlice from './slices/messageSlice';
import aiSlice from './slices/aiSlice';
import callSlice from './slices/callSlice';
import uiSlice from './slices/uiSlice';
import dashboardSlice from './slices/dashboardSlice';

const store = configureStore({
  reducer: {
    auth: authSlice,
    user: userSlice,
    contacts: contactSlice,
    messages: messageSlice,
    ai: aiSlice,
    calls: callSlice,
    ui: uiSlice,
    dashboard: dashboardSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'messages/addMessage',
          'ai/addMessage',
          'calls/updateCall',
        ],
        ignoredActionsPaths: ['payload.timestamp', 'payload.file'],
        ignoredPaths: [
          'messages.messages',
          'ai.conversations',
          'calls.activeCall',
        ],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export { store };
export default store;