import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Changed from 'authToken' to 'token'
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Remove Content-Type for FormData to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;
    
    if (response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token'); // Changed from 'authToken' to 'token'
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    } else if (response?.status === 403) {
      toast.error('You do not have permission to perform this action.');
    } else if (response?.status === 429) {
      toast.error('Too many requests. Please slow down.');
    } else if (response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (response?.data?.message) {
      toast.error(response.data.message);
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please check your connection.');
    } else if (!navigator.onLine) {
      toast.error('No internet connection. Please check your network.');
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh-token'),
  verifyToken: () => api.get('/auth/verify-token'),
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
};

// Users API
export const usersAPI = {
  getProfile: (userId) => api.get(userId ? `/users/profile/${userId}` : '/users/profile'),
  updateProfile: (profileData) => api.put('/users/profile', profileData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  searchUsers: (query, limit = 20, offset = 0) => 
    api.get(`/users/search?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`),
  getUserStats: () => api.get('/users/stats'),
  updateSettings: (settings) => api.put('/users/settings', settings),
  deleteAccount: (confirmation) => api.delete('/users/account', { data: { confirmation } }),
};

// Contacts API
export const contactsAPI = {
  getContacts: (search, limit = 50, offset = 0) => {
    let url = `/contacts?limit=${limit}&offset=${offset}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return api.get(url);
  },
  addContact: (contactData) => api.post('/contacts', contactData),
  updateContact: (contactId, contactData) => api.put(`/contacts/${contactId}`, contactData),
  removeContact: (contactId) => api.delete(`/contacts/${contactId}`),
  getContactDetails: (userId) => api.get(`/contacts/user/${userId}`),
  findByPhone: (phoneNumbers) => api.post('/contacts/find-by-phone', { phone_numbers: phoneNumbers }),
};

// Messages API
export const messagesAPI = {
  getMessages: (contactId, limit = 50, offset = 0, beforeDate) => {
    let url = `/messages/conversation/${contactId}?limit=${limit}&offset=${offset}`;
    if (beforeDate) url += `&before_date=${beforeDate}`;
    return api.get(url);
  },
  sendMessage: (messageData) => api.post('/messages', messageData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  markAsRead: (messageIds) => api.put('/messages/mark-read', { messageIds }),
  deleteMessage: (messageId, deleteFor = 'self') => 
    api.delete(`/messages/${messageId}`, { data: { delete_for: deleteFor } }),
  searchMessages: (query, contactId, limit = 20, offset = 0) => {
    let url = `/messages/search?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;
    if (contactId) url += `&contact_id=${contactId}`;
    return api.get(url);
  },
  getRecentChats: (limit = 20, offset = 0) => 
    api.get(`/messages/chats?limit=${limit}&offset=${offset}`),
};

// AI API
export const aiAPI = {
  sendMessage: (prompt) => api.post('/ai/message', { prompt }),
  streamMessage: (prompt) => {
    // Server-Sent Events endpoint
    const token = localStorage.getItem('token'); // Changed from 'authToken' to 'token'
    const baseURL = process.env.REACT_APP_API_URL || '';
    return fetch(`${baseURL}/api/ai/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt }),
    });
  },
  getConversation: (limit = 50, offset = 0) => 
    api.get(`/ai/conversation?limit=${limit}&offset=${offset}`),
  clearConversation: () => api.delete('/ai/conversation'),
  getStats: () => api.get('/ai/stats'),
  healthCheck: () => api.get('/ai/health'),
};

// Upload utilities
export const uploadAPI = {
  uploadProfilePhoto: (file) => {
    if (!file) {
      throw new Error('No file provided');
    }
    
    const formData = new FormData();
    formData.append('profile_photo', file);
    
    return api.post('/users/profile-photo', formData);
  },
  uploadMessageFile: (file, messageData) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(messageData).forEach(key => {
      formData.append(key, messageData[key]);
    });
    return api.post('/messages', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// Network status utility
export const checkNetworkStatus = () => {
  return api.get('/health').then(() => true).catch(() => false);
};

export default api;