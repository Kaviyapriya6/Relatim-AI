const db = require('../config/database');
const { getFileUrl, getFileType, formatFileSize } = require('../utils/fileUtils');
const { optimizeImage } = require('../utils/imageProcessor');
const pushNotificationService = require('../services/pushNotificationService');
const path = require('path');

class MessageController {
  async getMessages(req, res) {
    try {
      const userId = req.user.id;
      const { contactId } = req.params;
      const { limit = 50, offset = 0, before_date } = req.query;

      let query = `
        SELECT 
          m.*,
          sender.first_name as sender_first_name,
          sender.last_name as sender_last_name,
          sender.profile_photo as sender_profile_photo,
          receiver.first_name as receiver_first_name,
          receiver.last_name as receiver_last_name,
          receiver.profile_photo as receiver_profile_photo,
          reply_msg.content as reply_content,
          reply_msg.file_url as reply_file_url,
          reply_sender.first_name as reply_sender_first_name,
          reply_sender.last_name as reply_sender_last_name
        FROM messages m
        JOIN users sender ON m.sender_id = sender.id
        JOIN users receiver ON m.receiver_id = receiver.id
        LEFT JOIN messages reply_msg ON m.reply_to_message_id = reply_msg.id
        LEFT JOIN users reply_sender ON reply_msg.sender_id = reply_sender.id
        WHERE ((m.sender_id = $1 AND m.receiver_id = $2) 
               OR (m.sender_id = $2 AND m.receiver_id = $1))
          AND NOT (m.is_deleted_for_everyone = true)
          AND NOT (m.sender_id = $1 AND m.is_deleted_for_sender = true)
          AND NOT (m.receiver_id = $1 AND m.is_deleted_for_receiver = true)
      `;

      const queryParams = [userId, contactId];
      let paramIndex = 3;

      if (before_date) {
        query += ` AND m.created_at < $${paramIndex}`;
        queryParams.push(before_date);
        paramIndex++;
      }

      query += ` ORDER BY m.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);

      const messages = result.rows.map(msg => ({
        id: msg.id,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        content: msg.content,
        file_url: msg.file_url,
        file_type: msg.file_type,
        file_name: msg.file_name,
        file_size: msg.file_size,
        status: msg.status,
        is_deleted_for_sender: msg.is_deleted_for_sender,
        is_deleted_for_receiver: msg.is_deleted_for_receiver,
        is_deleted_for_everyone: msg.is_deleted_for_everyone,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        sender: {
          id: msg.sender_id,
          first_name: msg.sender_first_name,
          last_name: msg.sender_last_name,
          full_name: `${msg.sender_first_name} ${msg.sender_last_name}`,
          profile_photo: msg.sender_profile_photo
        },
        receiver: {
          id: msg.receiver_id,
          first_name: msg.receiver_first_name,
          last_name: msg.receiver_last_name,
          full_name: `${msg.receiver_first_name} ${msg.receiver_last_name}`,
          profile_photo: msg.receiver_profile_photo
        },
        reply_to: msg.reply_to_message_id ? {
          message_id: msg.reply_to_message_id,
          content: msg.reply_content,
          file_url: msg.reply_file_url,
          sender: {
            first_name: msg.reply_sender_first_name,
            last_name: msg.reply_sender_last_name,
            full_name: `${msg.reply_sender_first_name} ${msg.reply_sender_last_name}`
          }
        } : null,
        is_own_message: msg.sender_id === userId
      })).reverse(); // Reverse to show oldest first

      // Mark messages as delivered if they're not already
      if (messages.length > 0) {
        const messageIds = messages
          .filter(msg => msg.receiver_id === userId && msg.status === 'sent')
          .map(msg => msg.id);

        if (messageIds.length > 0) {
          await db.query(
            `UPDATE messages 
             SET status = 'delivered' 
             WHERE id = ANY($1) AND status = 'sent'`,
            [messageIds]
          );

          // Update the messages in response
          messages.forEach(msg => {
            if (messageIds.includes(msg.id)) {
              msg.status = 'delivered';
            }
          });
        }
      }

      res.json({
        success: true,
        data: {
          messages,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            has_more: result.rows.length === parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get messages',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async sendMessage(req, res) {
    try {
      const userId = req.user.id;
      const { receiver_id, content, reply_to_message_id } = req.body;

      // Validate receiver exists
      const receiverResult = await db.query(
        'SELECT id, first_name, last_name FROM users WHERE id = $1',
        [receiver_id]
      );

      if (receiverResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Receiver not found'
        });
      }

      // Handle file upload from S3
      let file_url = null;
      let file_type = null;
      let file_name = null;
      let file_size = null;

      if (req.uploadResult) {
        file_url = req.uploadResult.url;
        file_type = getFileType(req.uploadResult.originalName);
        file_name = req.uploadResult.originalName;
        file_size = req.uploadResult.size;
      }

      // Validate reply message if provided
      if (reply_to_message_id) {
        const replyMsgResult = await db.query(
          'SELECT id FROM messages WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2)',
          [reply_to_message_id, userId]
        );

        if (replyMsgResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Reply message not found or not accessible'
          });
        }
      }

      // Create message
      const messageResult = await db.query(
        `INSERT INTO messages (
           sender_id, receiver_id, content, file_url, file_type, 
           file_name, file_size, reply_to_message_id
         ) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [
          userId, receiver_id, content || null, file_url, file_type,
          file_name, file_size, reply_to_message_id || null
        ]
      );

      const message = messageResult.rows[0];

      // Get sender and receiver details for the response
      const senderResult = await db.query(
        'SELECT id, first_name, last_name, profile_photo FROM users WHERE id = $1',
        [userId]
      );

      const sender = senderResult.rows[0];
      const receiver = receiverResult.rows[0];

      // Get reply message details if it exists
      let replyDetails = null;
      if (reply_to_message_id) {
        const replyResult = await db.query(
          `SELECT m.content, m.file_url, u.first_name, u.last_name
           FROM messages m
           JOIN users u ON m.sender_id = u.id
           WHERE m.id = $1`,
          [reply_to_message_id]
        );

        if (replyResult.rows.length > 0) {
          const reply = replyResult.rows[0];
          replyDetails = {
            message_id: reply_to_message_id,
            content: reply.content,
            file_url: reply.file_url,
            sender: {
              first_name: reply.first_name,
              last_name: reply.last_name,
              full_name: `${reply.first_name} ${reply.last_name}`
            }
          };
        }
      }

      const responseMessage = {
        id: message.id,
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
        content: message.content,
        file_url: message.file_url,
        file_type: message.file_type,
        file_name: message.file_name,
        file_size: message.file_size,
        file_size_formatted: message.file_size ? formatFileSize(message.file_size) : null,
        status: message.status,
        created_at: message.created_at,
        sender: {
          id: sender.id,
          first_name: sender.first_name,
          last_name: sender.last_name,
          full_name: `${sender.first_name} ${sender.last_name}`,
          profile_photo: sender.profile_photo
        },
        receiver: {
          id: receiver.id,
          first_name: receiver.first_name,
          last_name: receiver.last_name,
          full_name: `${receiver.first_name} ${receiver.last_name}`
        },
        reply_to: replyDetails,
        is_own_message: true
      };

      // Emit the message via Socket.io (handled in socket service)
      req.app.get('io').to(`user_${receiver_id}`).emit('new_message', responseMessage);
      req.app.get('io').to(`user_${userId}`).emit('message_sent', responseMessage);

      // Send push notification to receiver
      const senderName = `${sender.first_name} ${sender.last_name}`;
      const notificationText = content || (file_type ? `Sent a ${file_type}` : 'Sent a message');
      
      pushNotificationService.sendMessageNotification(
        receiver_id,
        senderName,
        notificationText,
        `${userId}_${receiver_id}`
      ).catch(error => console.error('Failed to send push notification:', error));

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: { message: responseMessage }
      });

    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { messageIds } = req.body;

      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message IDs array is required'
        });
      }

      // Update message status to 'seen' for messages where user is receiver
      const result = await db.query(
        `UPDATE messages 
         SET status = 'seen', updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($1) 
           AND receiver_id = $2 
           AND status IN ('sent', 'delivered')
         RETURNING id, sender_id`,
        [messageIds, userId]
      );

      // Notify senders that their messages were seen
      const updatedMessages = result.rows;
      const senderNotifications = {};

      updatedMessages.forEach(msg => {
        if (!senderNotifications[msg.sender_id]) {
          senderNotifications[msg.sender_id] = [];
        }
        senderNotifications[msg.sender_id].push(msg.id);
      });

      // Emit seen notifications to senders
      Object.keys(senderNotifications).forEach(senderId => {
        req.app.get('io').to(`user_${senderId}`).emit('messages_seen', {
          message_ids: senderNotifications[senderId],
          seen_by: userId
        });
      });

      res.json({
        success: true,
        message: 'Messages marked as read',
        data: {
          updated_count: updatedMessages.length,
          message_ids: updatedMessages.map(msg => msg.id)
        }
      });

    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark messages as read',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async deleteMessage(req, res) {
    try {
      const userId = req.user.id;
      const { messageId } = req.params;
      const { delete_for = 'self' } = req.body; // 'self' or 'everyone'

      // Get message details
      const messageResult = await db.query(
        'SELECT * FROM messages WHERE id = $1',
        [messageId]
      );

      if (messageResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      const message = messageResult.rows[0];

      // Check if user has permission to delete
      if (message.sender_id !== userId && message.receiver_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this message'
        });
      }

      // Check if trying to delete for everyone but not the sender
      if (delete_for === 'everyone' && message.sender_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the sender can delete message for everyone'
        });
      }

      // Check if message is too old to delete for everyone (24 hours limit)
      if (delete_for === 'everyone') {
        const messageAge = Date.now() - new Date(message.created_at).getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (messageAge > twentyFourHours) {
          return res.status(400).json({
            success: false,
            message: 'Messages older than 24 hours cannot be deleted for everyone'
          });
        }
      }

      let updateQuery;
      let updateParams;

      if (delete_for === 'everyone') {
        updateQuery = `
          UPDATE messages 
          SET is_deleted_for_everyone = true, 
              content = null, 
              file_url = null,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING id
        `;
        updateParams = [messageId];
      } else {
        // Delete for self only
        const deleteField = message.sender_id === userId 
          ? 'is_deleted_for_sender' 
          : 'is_deleted_for_receiver';
        
        updateQuery = `
          UPDATE messages 
          SET ${deleteField} = true, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING id
        `;
        updateParams = [messageId];
      }

      await db.query(updateQuery, updateParams);

      // Emit deletion event
      const deletionEvent = {
        message_id: messageId,
        deleted_by: userId,
        delete_for: delete_for
      };

      if (delete_for === 'everyone') {
        // Notify both sender and receiver
        req.app.get('io').to(`user_${message.sender_id}`).emit('message_deleted', deletionEvent);
        req.app.get('io').to(`user_${message.receiver_id}`).emit('message_deleted', deletionEvent);
      } else {
        // Only notify the user who deleted it
        req.app.get('io').to(`user_${userId}`).emit('message_deleted', deletionEvent);
      }

      res.json({
        success: true,
        message: `Message deleted ${delete_for === 'everyone' ? 'for everyone' : 'for you'}`,
        data: { message_id: messageId, delete_for }
      });

    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete message',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async searchMessages(req, res) {
    try {
      const userId = req.user.id;
      const { query, contact_id, limit = 20, offset = 0 } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters long'
        });
      }

      const searchTerm = `%${query.trim().toLowerCase()}%`;

      let searchQuery = `
        SELECT 
          m.*,
          sender.first_name as sender_first_name,
          sender.last_name as sender_last_name,
          sender.profile_photo as sender_profile_photo,
          receiver.first_name as receiver_first_name,
          receiver.last_name as receiver_last_name,
          receiver.profile_photo as receiver_profile_photo
        FROM messages m
        JOIN users sender ON m.sender_id = sender.id
        JOIN users receiver ON m.receiver_id = receiver.id
        WHERE (m.sender_id = $1 OR m.receiver_id = $1)
          AND LOWER(m.content) LIKE $2
          AND NOT (m.is_deleted_for_everyone = true)
          AND NOT (m.sender_id = $1 AND m.is_deleted_for_sender = true)
          AND NOT (m.receiver_id = $1 AND m.is_deleted_for_receiver = true)
      `;

      const queryParams = [userId, searchTerm];
      let paramIndex = 3;

      if (contact_id) {
        searchQuery += ` AND ((m.sender_id = $1 AND m.receiver_id = $${paramIndex}) 
                             OR (m.sender_id = $${paramIndex} AND m.receiver_id = $1))`;
        queryParams.push(contact_id);
        paramIndex++;
      }

      searchQuery += ` ORDER BY m.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await db.query(searchQuery, queryParams);

      const messages = result.rows.map(msg => ({
        id: msg.id,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        content: msg.content,
        file_url: msg.file_url,
        file_type: msg.file_type,
        created_at: msg.created_at,
        sender: {
          id: msg.sender_id,
          first_name: msg.sender_first_name,
          last_name: msg.sender_last_name,
          full_name: `${msg.sender_first_name} ${msg.sender_last_name}`,
          profile_photo: msg.sender_profile_photo
        },
        receiver: {
          id: msg.receiver_id,
          first_name: msg.receiver_first_name,
          last_name: msg.receiver_last_name,
          full_name: `${msg.receiver_first_name} ${msg.receiver_last_name}`,
          profile_photo: msg.receiver_profile_photo
        },
        is_own_message: msg.sender_id === userId,
        contact_id: msg.sender_id === userId ? msg.receiver_id : msg.sender_id
      }));

      res.json({
        success: true,
        data: {
          messages,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: messages.length
          }
        }
      });

    } catch (error) {
      console.error('Search messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search messages',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async getRecentChats(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 20, offset = 0 } = req.query;

      const result = await db.query(
        `WITH latest_messages AS (
           SELECT DISTINCT ON (
             CASE 
               WHEN sender_id = $1 THEN receiver_id 
               ELSE sender_id 
             END
           )
             CASE 
               WHEN sender_id = $1 THEN receiver_id 
               ELSE sender_id 
             END as contact_id,
             m.*
           FROM messages m
           WHERE (sender_id = $1 OR receiver_id = $1)
             AND NOT (is_deleted_for_everyone = true)
             AND NOT (sender_id = $1 AND is_deleted_for_sender = true)
             AND NOT (receiver_id = $1 AND is_deleted_for_receiver = true)
           ORDER BY 
             CASE 
               WHEN sender_id = $1 THEN receiver_id 
               ELSE sender_id 
             END,
             created_at DESC
         )
         SELECT 
           lm.*,
           u.first_name,
           u.last_name,
           u.profile_photo,
           u.is_online,
           u.last_seen,
           c.nickname,
           (
             SELECT COUNT(*) 
             FROM messages unread 
             WHERE unread.sender_id = lm.contact_id 
               AND unread.receiver_id = $1 
               AND unread.status != 'seen'
               AND NOT unread.is_deleted_for_receiver
           ) as unread_count
         FROM latest_messages lm
         JOIN users u ON lm.contact_id = u.id
         LEFT JOIN contacts c ON (c.user_id = $1 AND c.contact_id = u.id)
         ORDER BY lm.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const chats = result.rows.map(row => ({
        contact: {
          id: row.contact_id,
          first_name: row.first_name,
          last_name: row.last_name,
          full_name: `${row.first_name} ${row.last_name}`,
          nickname: row.nickname,
          profile_photo: row.profile_photo,
          is_online: row.is_online,
          last_seen: row.last_seen
        },
        last_message: {
          id: row.id,
          content: row.content,
          file_type: row.file_type,
          sender_id: row.sender_id,
          receiver_id: row.receiver_id,
          created_at: row.created_at,
          is_own_message: row.sender_id === userId
        },
        unread_count: parseInt(row.unread_count)
      }));

      res.json({
        success: true,
        data: {
          chats,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: chats.length
          }
        }
      });

    } catch (error) {
      console.error('Get recent chats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get recent chats',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = new MessageController();