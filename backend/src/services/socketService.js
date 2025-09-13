const jwt = require('jsonwebtoken');
const db = require('../config/database');

class SocketService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> socketId
    this.userSockets = new Map(); // socketId -> userId
    this.typingUsers = new Map(); // userId -> { contactId, timeout }
    
    this.initializeSocketEvents();
  }

  initializeSocketEvents() {
    this.io.use(this.authenticateSocket.bind(this));
    
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.userId}`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, socket.id);
      this.userSockets.set(socket.id, socket.userId);
      
      // Join user to their personal room
      socket.join(`user_${socket.userId}`);
      
      // Update user online status
      this.updateUserOnlineStatus(socket.userId, true);
      
      // Notify contacts that user is online
      this.notifyContactsOfOnlineStatus(socket.userId, true);
      
      // Socket event handlers
      socket.on('join_chat', this.handleJoinChat.bind(this, socket));
      socket.on('leave_chat', this.handleLeaveChat.bind(this, socket));
      socket.on('typing_start', this.handleTypingStart.bind(this, socket));
      socket.on('typing_stop', this.handleTypingStop.bind(this, socket));
      socket.on('message_delivered', this.handleMessageDelivered.bind(this, socket));
      socket.on('message_seen', this.handleMessageSeen.bind(this, socket));
      socket.on('call_initiate', this.handleCallInitiate.bind(this, socket));
      socket.on('call_accept', this.handleCallAccept.bind(this, socket));
      socket.on('call_reject', this.handleCallReject.bind(this, socket));
      socket.on('call_end', this.handleCallEnd.bind(this, socket));
      
      socket.on('disconnect', this.handleDisconnect.bind(this, socket));
    });
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verify user exists
      const userResult = await db.query(
        'SELECT id, first_name, last_name FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        return next(new Error('User not found'));
      }

      socket.userId = decoded.userId;
      socket.user = userResult.rows[0];
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  }

  async updateUserOnlineStatus(userId, isOnline) {
    try {
      await db.query(
        'UPDATE users SET is_online = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2',
        [isOnline, userId]
      );
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
  }

  async notifyContactsOfOnlineStatus(userId, isOnline) {
    try {
      // Get user's contacts
      const contactsResult = await db.query(
        'SELECT contact_id FROM contacts WHERE user_id = $1',
        [userId]
      );

      // Notify each contact about the user's online status
      contactsResult.rows.forEach(contact => {
        this.io.to(`user_${contact.contact_id}`).emit('contact_online_status', {
          user_id: userId,
          is_online: isOnline,
          last_seen: new Date().toISOString()
        });
      });

      // Also notify users who have this user as a contact
      const reverseContactsResult = await db.query(
        'SELECT user_id FROM contacts WHERE contact_id = $1',
        [userId]
      );

      reverseContactsResult.rows.forEach(contact => {
        this.io.to(`user_${contact.user_id}`).emit('contact_online_status', {
          user_id: userId,
          is_online: isOnline,
          last_seen: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error('Error notifying contacts of online status:', error);
    }
  }

  handleJoinChat(socket, data) {
    const { contactId } = data;
    const chatRoom = this.getChatRoomId(socket.userId, contactId);
    
    socket.join(chatRoom);
    console.log(`User ${socket.userId} joined chat with ${contactId}`);
    
    // Notify the contact that user is in the chat
    this.io.to(`user_${contactId}`).emit('user_joined_chat', {
      user_id: socket.userId,
      chat_room: chatRoom
    });
  }

  handleLeaveChat(socket, data) {
    const { contactId } = data;
    const chatRoom = this.getChatRoomId(socket.userId, contactId);
    
    socket.leave(chatRoom);
    console.log(`User ${socket.userId} left chat with ${contactId}`);
    
    // Stop any typing indicators
    this.handleTypingStop(socket, { contactId });
  }

  async handleTypingStart(socket, data) {
    const { contactId } = data;
    const userId = socket.userId;

    try {
      // Clear existing typing timeout
      if (this.typingUsers.has(userId)) {
        clearTimeout(this.typingUsers.get(userId).timeout);
      }

      // Update typing indicator in database
      await db.query(
        `INSERT INTO typing_indicators (user_id, contact_id, is_typing)
         VALUES ($1, $2, true)
         ON CONFLICT (user_id, contact_id)
         DO UPDATE SET is_typing = true, updated_at = CURRENT_TIMESTAMP`,
        [userId, contactId]
      );

      // Notify the contact
      this.io.to(`user_${contactId}`).emit('typing_start', {
        user_id: userId,
        contact_id: contactId
      });

      // Set auto-stop timeout (10 seconds)
      const timeout = setTimeout(() => {
        this.handleTypingStop(socket, { contactId });
      }, 10000);

      this.typingUsers.set(userId, { contactId, timeout });

    } catch (error) {
      console.error('Error handling typing start:', error);
    }
  }

  async handleTypingStop(socket, data) {
    const { contactId } = data;
    const userId = socket.userId;

    try {
      // Clear timeout
      if (this.typingUsers.has(userId)) {
        clearTimeout(this.typingUsers.get(userId).timeout);
        this.typingUsers.delete(userId);
      }

      // Update typing indicator in database
      await db.query(
        `UPDATE typing_indicators 
         SET is_typing = false, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND contact_id = $2`,
        [userId, contactId]
      );

      // Notify the contact
      this.io.to(`user_${contactId}`).emit('typing_stop', {
        user_id: userId,
        contact_id: contactId
      });

    } catch (error) {
      console.error('Error handling typing stop:', error);
    }
  }

  async handleMessageDelivered(socket, data) {
    const { messageId } = data;

    try {
      // Update message status to delivered
      const result = await db.query(
        `UPDATE messages 
         SET status = 'delivered', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'sent'
         RETURNING sender_id`,
        [messageId]
      );

      if (result.rows.length > 0) {
        const senderId = result.rows[0].sender_id;
        
        // Notify sender
        this.io.to(`user_${senderId}`).emit('message_delivered', {
          message_id: messageId,
          delivered_by: socket.userId,
          delivered_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error handling message delivered:', error);
    }
  }

  async handleMessageSeen(socket, data) {
    const { messageId } = data;

    try {
      // Update message status to seen
      const result = await db.query(
        `UPDATE messages 
         SET status = 'seen', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND receiver_id = $2 AND status IN ('sent', 'delivered')
         RETURNING sender_id`,
        [messageId, socket.userId]
      );

      if (result.rows.length > 0) {
        const senderId = result.rows[0].sender_id;
        
        // Notify sender
        this.io.to(`user_${senderId}`).emit('message_seen', {
          message_id: messageId,
          seen_by: socket.userId,
          seen_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error handling message seen:', error);
    }
  }

  async handleCallInitiate(socket, data) {
    const { contactId, callType, roomId } = data; // callType: 'voice' | 'video'
    const userId = socket.userId;

    try {
      // Create call record
      const callResult = await db.query(
        `INSERT INTO calls (caller_id, receiver_id, call_type, room_id, status)
         VALUES ($1, $2, $3, $4, 'initiated')
         RETURNING *`,
        [userId, contactId, callType, roomId]
      );

      const call = callResult.rows[0];

      // Notify the contact about incoming call
      this.io.to(`user_${contactId}`).emit('incoming_call', {
        call_id: call.id,
        caller_id: userId,
        caller: socket.user,
        call_type: callType,
        room_id: roomId
      });

      // Notify caller that call was initiated
      socket.emit('call_initiated', {
        call_id: call.id,
        contact_id: contactId,
        call_type: callType,
        room_id: roomId
      });

    } catch (error) {
      console.error('Error handling call initiate:', error);
      socket.emit('call_error', { message: 'Failed to initiate call' });
    }
  }

  async handleCallAccept(socket, data) {
    const { callId } = data;

    try {
      // Update call status
      const result = await db.query(
        `UPDATE calls 
         SET status = 'connected', started_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND receiver_id = $2 AND status = 'initiated'
         RETURNING *`,
        [callId, socket.userId]
      );

      if (result.rows.length > 0) {
        const call = result.rows[0];
        
        // Notify caller that call was accepted
        this.io.to(`user_${call.caller_id}`).emit('call_accepted', {
          call_id: callId,
          room_id: call.room_id,
          accepted_by: socket.userId
        });

        // Confirm to receiver
        socket.emit('call_accepted', {
          call_id: callId,
          room_id: call.room_id
        });
      }
    } catch (error) {
      console.error('Error handling call accept:', error);
    }
  }

  async handleCallReject(socket, data) {
    const { callId } = data;

    try {
      // Update call status
      const result = await db.query(
        `UPDATE calls 
         SET status = 'missed', ended_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND receiver_id = $2 AND status = 'initiated'
         RETURNING caller_id`,
        [callId, socket.userId]
      );

      if (result.rows.length > 0) {
        const callerId = result.rows[0].caller_id;
        
        // Notify caller that call was rejected
        this.io.to(`user_${callerId}`).emit('call_rejected', {
          call_id: callId,
          rejected_by: socket.userId
        });
      }
    } catch (error) {
      console.error('Error handling call reject:', error);
    }
  }

  async handleCallEnd(socket, data) {
    const { callId } = data;

    try {
      // Update call status and calculate duration
      const result = await db.query(
        `UPDATE calls 
         SET status = 'ended', 
             ended_at = CURRENT_TIMESTAMP,
             duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::INTEGER
         WHERE id = $1 
           AND (caller_id = $2 OR receiver_id = $2)
           AND status = 'connected'
         RETURNING caller_id, receiver_id, duration`,
        [callId, socket.userId]
      );

      if (result.rows.length > 0) {
        const call = result.rows[0];
        const otherUserId = call.caller_id === socket.userId ? call.receiver_id : call.caller_id;
        
        // Notify the other participant
        this.io.to(`user_${otherUserId}`).emit('call_ended', {
          call_id: callId,
          ended_by: socket.userId,
          duration: call.duration
        });

        // Confirm to the user who ended the call
        socket.emit('call_ended', {
          call_id: callId,
          duration: call.duration
        });
      }
    } catch (error) {
      console.error('Error handling call end:', error);
    }
  }

  async handleDisconnect(socket) {
    const userId = socket.userId;
    
    if (userId) {
      console.log(`User disconnected: ${userId}`);
      
      // Clean up user connections
      this.connectedUsers.delete(userId);
      this.userSockets.delete(socket.id);
      
      // Clear any typing indicators
      if (this.typingUsers.has(userId)) {
        clearTimeout(this.typingUsers.get(userId).timeout);
        this.typingUsers.delete(userId);
      }
      
      // Update user offline status
      this.updateUserOnlineStatus(userId, false);
      
      // Notify contacts that user is offline
      this.notifyContactsOfOnlineStatus(userId, false);
    }
  }

  getChatRoomId(userId1, userId2) {
    // Create consistent room ID regardless of user order
    return `chat_${[userId1, userId2].sort().join('_')}`;
  }

  // Public methods for external use
  emitToUser(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  getUserSocketId(userId) {
    return this.connectedUsers.get(userId);
  }
}

module.exports = SocketService;