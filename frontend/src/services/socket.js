import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Validate token before connecting
    if (!token || token === 'null' || token === 'undefined') {
      console.warn('🔌 Cannot connect socket: No valid authentication token');
      return null;
    }

    const serverUrl = process.env.REACT_APP_SOCKET_URL || window.location.origin;
    
    this.socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 10000,
    });

    this.setupEventListeners();
    return this.socket;
  }

  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Re-register all listeners
      this.listeners.forEach((callback, event) => {
        this.socket.on(event, callback);
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from server:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server disconnected the client, reconnect manually
        this.reconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      this.isConnected = false;
      
      if (error.message.includes('Authentication') || error.message.includes('token')) {
        console.warn('🔌 Authentication failed, clearing invalid token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.error('Authentication failed. Please login again.');
        this.disconnect();
        // Redirect to login after a short delay to allow toast to show
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔌 Reconnected after ${attemptNumber} attempts`);
      toast.success('Connection restored');
    });

    this.socket.on('reconnect_failed', () => {
      console.error('🔌 Failed to reconnect');
      toast.error('Failed to reconnect to server');
    });

    // Message events
    this.socket.on('new_message', (message) => {
      console.log('📨 New message received:', message);
      this.emit('messageReceived', message);
      
      // Show notification if page is not visible
      if (document.visibilityState === 'hidden') {
        this.showNotification('New Message', {
          body: message.content || 'File attachment',
          icon: message.sender.profile_photo || '/logo192.png',
          tag: `message-${message.id}`,
        });
      }
    });

    this.socket.on('message_sent', (message) => {
      console.log('📨 Message sent confirmation:', message);
      this.emit('messageSent', message);
    });

    this.socket.on('message_delivered', (data) => {
      console.log('📨 Message delivered:', data);
      this.emit('messageDelivered', data);
    });

    this.socket.on('message_seen', (data) => {
      console.log('📨 Message seen:', data);
      this.emit('messageSeen', data);
    });

    this.socket.on('messages_seen', (data) => {
      console.log('📨 Messages seen:', data);
      this.emit('messagesSeen', data);
    });

    this.socket.on('message_deleted', (data) => {
      console.log('📨 Message deleted:', data);
      this.emit('messageDeleted', data);
    });

    // Typing events
    this.socket.on('typing_start', (data) => {
      console.log('⌨️ User started typing:', data);
      this.emit('typingStart', data);
    });

    this.socket.on('typing_stop', (data) => {
      console.log('⌨️ User stopped typing:', data);
      this.emit('typingStop', data);
    });

    // Contact events
    this.socket.on('contact_online_status', (data) => {
      console.log('👤 Contact online status:', data);
      this.emit('contactOnlineStatus', data);
    });

    this.socket.on('user_joined_chat', (data) => {
      console.log('👤 User joined chat:', data);
      this.emit('userJoinedChat', data);
    });

    // AI events
    this.socket.on('ai_message', (message) => {
      console.log('🤖 AI message received:', message);
      this.emit('aiMessage', message);
    });

    // Call events
    this.socket.on('incoming_call', (data) => {
      console.log('📞 Incoming call:', data);
      this.emit('incomingCall', data);
      
      // Show call notification
      this.showNotification('Incoming Call', {
        body: `${data.caller.first_name} ${data.caller.last_name} is calling you`,
        icon: data.caller.profile_photo || '/logo192.png',
        tag: `call-${data.call_id}`,
        requireInteraction: true,
      });
    });

    this.socket.on('call_accepted', (data) => {
      console.log('📞 Call accepted:', data);
      this.emit('callAccepted', data);
    });

    this.socket.on('call_rejected', (data) => {
      console.log('📞 Call rejected:', data);
      this.emit('callRejected', data);
    });

    this.socket.on('call_ended', (data) => {
      console.log('📞 Call ended:', data);
      this.emit('callEnded', data);
    });

    this.socket.on('call_error', (data) => {
      console.error('📞 Call error:', data);
      this.emit('callError', data);
      toast.error(data.message || 'Call failed');
    });
  }

  // Event emitter methods
  on(event, callback) {
    this.listeners.set(event, callback);
    if (this.socket?.connected) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    this.listeners.delete(event);
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}: Socket not connected`);
    }
  }

  // Chat methods
  joinChat(contactId) {
    this.emit('join_chat', { contactId });
  }

  leaveChat(contactId) {
    this.emit('leave_chat', { contactId });
  }

  // Typing methods
  startTyping(contactId) {
    this.emit('typing_start', { contactId });
  }

  stopTyping(contactId) {
    this.emit('typing_stop', { contactId });
  }

  // Message status methods
  markMessageDelivered(messageId) {
    this.emit('message_delivered', { messageId });
  }

  markMessageSeen(messageId) {
    this.emit('message_seen', { messageId });
  }

  // Call methods
  initiateCall(contactId, callType, roomId) {
    this.emit('call_initiate', { contactId, callType, roomId });
  }

  acceptCall(callId) {
    this.emit('call_accept', { callId });
  }

  rejectCall(callId) {
    this.emit('call_reject', { callId });
  }

  endCall(callId) {
    this.emit('call_end', { callId });
  }

  // Notification methods
  showNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        ...options,
        badge: '/logo192.png',
        vibrate: [200, 100, 200],
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  }

  // Connection management
  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🔌 Max reconnection attempts reached');
      return;
    }

    // Check if we have a valid token before attempting reconnection
    const token = localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') {
      console.warn('🔌 Cannot reconnect: No valid authentication token');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔌 Reconnection attempt ${this.reconnectAttempts}`);
    
    setTimeout(() => {
      if (this.socket) {
        this.socket.connect();
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.listeners.clear();
  }

  // Utility methods
  isConnectedToServer() {
    return this.isConnected && this.socket?.connected;
  }

  getConnectionId() {
    return this.socket?.id;
  }
}

// Create singleton instance
const socketService = new SocketService();

// Named exports for compatibility
export const initializeSocket = (token) => {
  if (!token || token === 'null' || token === 'undefined') {
    console.warn('🔌 Cannot initialize socket: No valid authentication token');
    return null;
  }
  return socketService.connect(token);
};

export const disconnectSocket = () => socketService.disconnect();

export const isSocketConnected = () => socketService.isConnectedToServer();

// Safe connect function for use in auth flows
export const safeConnectSocket = (token) => {
  try {
    return initializeSocket(token);
  } catch (error) {
    console.warn('🔌 Safe socket connection failed:', error);
    return null;
  }
};

export default socketService;