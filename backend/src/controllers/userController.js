const db = require('../config/database');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class UserController {
  async getProfile(req, res) {
    try {
      const userId = req.params.id || req.user.id;

      const userResult = await db.query(
        `SELECT u.*, 
         us.dark_mode, us.notifications_enabled, us.message_preview,
         us.sound_enabled, us.read_receipts, us.last_seen_enabled,
         us.online_status_enabled, us.typing_indicators, us.auto_download,
         us.language, us.font_size, us.two_factor_enabled
         FROM users u
         LEFT JOIN user_settings us ON u.id = us.user_id
         WHERE u.id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = userResult.rows[0];

      // Don't return password hash
      delete user.password_hash;

      res.json({
        success: true,
        data: {
          user: {
            ...user,
            settings: {
              dark_mode: user.dark_mode || false,
              notifications_enabled: user.notifications_enabled !== false,
              message_preview: user.message_preview !== false,
              sound_enabled: user.sound_enabled !== false,
              read_receipts: user.read_receipts !== false,
              last_seen_enabled: user.last_seen_enabled !== false,
              online_status_enabled: user.online_status_enabled !== false,
              typing_indicators: user.typing_indicators !== false,
              auto_download: user.auto_download || 'wifi',
              language: user.language || 'en',
              font_size: user.font_size || 'medium',
              two_factor_enabled: user.two_factor_enabled || false
            }
          }
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user profile',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { first_name, last_name, phone_number, email, bio } = req.body;

      // Check if phone number is already taken by another user
      if (phone_number) {
        const phoneCheck = await db.query(
          'SELECT id FROM users WHERE phone_number = $1 AND id != $2',
          [phone_number, userId]
        );

        if (phoneCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Phone number is already taken'
          });
        }
      }

      // Check if email is already taken by another user
      if (email) {
        const emailCheck = await db.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, userId]
        );

        if (emailCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Email is already taken'
          });
        }
      }

      // Handle profile photo upload
      let profile_photo = null;
      if (req.uploadResult) {
        profile_photo = req.uploadResult.url;
      }

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (first_name) {
        updates.push(`first_name = $${paramIndex++}`);
        values.push(first_name);
      }

      if (last_name) {
        updates.push(`last_name = $${paramIndex++}`);
        values.push(last_name);
      }

      if (phone_number) {
        updates.push(`phone_number = $${paramIndex++}`);
        values.push(phone_number);
      }

      if (email) {
        updates.push(`email = $${paramIndex++}`);
        values.push(email);
      }

      if (bio !== undefined) {
        updates.push(`bio = $${paramIndex++}`);
        values.push(bio);
      }

      if (profile_photo) {
        updates.push(`profile_photo = $${paramIndex++}`);
        values.push(profile_photo);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(userId);

      const query = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, first_name, last_name, email, phone_number, bio, profile_photo, is_online, last_seen, updated_at
      `;

      const result = await db.query(query, values);
      const updatedUser = result.rows[0];

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async updateProfilePhoto(req, res) {
    try {
      const userId = req.user.id;

      if (!req.uploadResult) {
        return res.status(400).json({
          success: false,
          message: 'No profile photo provided'
        });
      }

      // Get the S3 upload result from middleware
      const { url: profile_photo } = req.uploadResult;

      // Update profile photo in database
      const result = await db.query(
        `UPDATE users 
         SET profile_photo = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, first_name, last_name, email, phone_number, profile_photo, updated_at`,
        [profile_photo, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = result.rows[0];

      res.json({
        success: true,
        message: 'Profile photo updated successfully',
        data: {
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone_number: user.phone_number,
            profile_photo: user.profile_photo,
            updated_at: user.updated_at
          }
        }
      });
    } catch (error) {
      console.error('Update profile photo error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile photo'
      });
    }
  }

  async searchUsers(req, res) {
    try {
      const { query, limit = 20, offset = 0 } = req.query;
      const currentUserId = req.user.id;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters long'
        });
      }

      const searchQuery = `%${query.trim().toLowerCase()}%`;

      const result = await db.query(
        `SELECT 
           u.id, 
           u.first_name, 
           u.last_name, 
           u.email, 
           u.phone_number, 
           u.profile_photo,
           u.is_online,
           u.last_seen,
           CASE WHEN c.id IS NOT NULL THEN true ELSE false END as is_contact
         FROM users u
         LEFT JOIN contacts c ON (c.user_id = $1 AND c.contact_id = u.id)
         WHERE u.id != $1 
           AND (
             LOWER(u.first_name) LIKE $2 
             OR LOWER(u.last_name) LIKE $2 
             OR LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE $2
             OR u.email LIKE $2 
             OR u.phone_number LIKE $2
           )
         ORDER BY 
           is_contact DESC,
           u.first_name ASC, 
           u.last_name ASC
         LIMIT $3 OFFSET $4`,
        [currentUserId, searchQuery, limit, offset]
      );

      const users = result.rows.map(user => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone_number: user.phone_number,
        profile_photo: user.profile_photo,
        is_online: user.is_online,
        last_seen: user.last_seen,
        is_contact: user.is_contact
      }));

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: users.length
          }
        }
      });

    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search users',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async getUserStats(req, res) {
    try {
      const userId = req.user.id;

      const statsResult = await db.query(
        `SELECT 
           (SELECT COUNT(*) FROM contacts WHERE user_id = $1) as contacts_count,
           (SELECT COUNT(DISTINCT CASE 
             WHEN sender_id = $1 THEN receiver_id 
             ELSE sender_id 
           END) FROM messages WHERE sender_id = $1 OR receiver_id = $1) as chats_count,
           (SELECT COUNT(*) FROM messages WHERE sender_id = $1) as sent_messages,
           (SELECT COUNT(*) FROM messages WHERE receiver_id = $1) as received_messages,
           (SELECT COUNT(*) FROM ai_chats WHERE user_id = $1) as ai_messages,
           (SELECT COUNT(*) FROM calls WHERE caller_id = $1 OR receiver_id = $1) as total_calls,
           (SELECT COUNT(*) FROM calls WHERE (caller_id = $1 OR receiver_id = $1) AND status = 'connected') as connected_calls`,
        [userId]
      );

      const stats = statsResult.rows[0];

      // Get recent activity (last 7 days)
      const activityResult = await db.query(
        `SELECT 
           DATE(created_at) as date,
           COUNT(*) as message_count
         FROM messages 
         WHERE (sender_id = $1 OR receiver_id = $1) 
           AND created_at >= CURRENT_DATE - INTERVAL '7 days'
         GROUP BY DATE(created_at)
         ORDER BY date DESC`,
        [userId]
      );

      res.json({
        success: true,
        data: {
          stats: {
            contacts_count: parseInt(stats.contacts_count),
            chats_count: parseInt(stats.chats_count),
            total_messages: parseInt(stats.sent_messages) + parseInt(stats.received_messages),
            sent_messages: parseInt(stats.sent_messages),
            received_messages: parseInt(stats.received_messages),
            ai_messages: parseInt(stats.ai_messages),
            total_calls: parseInt(stats.total_calls),
            connected_calls: parseInt(stats.connected_calls)
          },
          activity: activityResult.rows
        }
      });

    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async updateSettings(req, res) {
    try {
      const userId = req.user.id;
      const { 
        dark_mode, 
        notifications_enabled, 
        message_preview,
        sound_enabled,
        read_receipts,
        last_seen_enabled,
        online_status_enabled,
        typing_indicators,
        auto_download,
        language,
        font_size,
        two_factor_enabled
      } = req.body;

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (typeof dark_mode === 'boolean') {
        updates.push(`dark_mode = $${paramIndex++}`);
        values.push(dark_mode);
      }

      if (typeof notifications_enabled === 'boolean') {
        updates.push(`notifications_enabled = $${paramIndex++}`);
        values.push(notifications_enabled);
      }

      if (typeof message_preview === 'boolean') {
        updates.push(`message_preview = $${paramIndex++}`);
        values.push(message_preview);
      }

      if (typeof sound_enabled === 'boolean') {
        updates.push(`sound_enabled = $${paramIndex++}`);
        values.push(sound_enabled);
      }

      if (typeof read_receipts === 'boolean') {
        updates.push(`read_receipts = $${paramIndex++}`);
        values.push(read_receipts);
      }

      if (typeof last_seen_enabled === 'boolean') {
        updates.push(`last_seen_enabled = $${paramIndex++}`);
        values.push(last_seen_enabled);
      }

      if (typeof online_status_enabled === 'boolean') {
        updates.push(`online_status_enabled = $${paramIndex++}`);
        values.push(online_status_enabled);
      }

      if (typeof typing_indicators === 'boolean') {
        updates.push(`typing_indicators = $${paramIndex++}`);
        values.push(typing_indicators);
      }

      if (auto_download && ['never', 'wifi', 'always'].includes(auto_download)) {
        updates.push(`auto_download = $${paramIndex++}`);
        values.push(auto_download);
      }

      if (language && typeof language === 'string') {
        updates.push(`language = $${paramIndex++}`);
        values.push(language);
      }

      if (font_size && ['small', 'medium', 'large'].includes(font_size)) {
        updates.push(`font_size = $${paramIndex++}`);
        values.push(font_size);
      }

      if (typeof two_factor_enabled === 'boolean') {
        updates.push(`two_factor_enabled = $${paramIndex++}`);
        values.push(two_factor_enabled);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid settings to update'
        });
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(userId);

      const query = `
        UPDATE user_settings 
        SET ${updates.join(', ')}
        WHERE user_id = $${paramIndex}
        RETURNING *
      `;

      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        // Create settings with defaults if they don't exist
        await db.query(`
          INSERT INTO user_settings (
            user_id, dark_mode, notifications_enabled, message_preview,
            sound_enabled, read_receipts, last_seen_enabled, online_status_enabled,
            typing_indicators, auto_download, language, font_size, two_factor_enabled
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          userId, 
          dark_mode || false, 
          notifications_enabled !== false, 
          message_preview !== false,
          sound_enabled !== false,
          read_receipts !== false,
          last_seen_enabled !== false,
          online_status_enabled !== false,
          typing_indicators !== false,
          auto_download || 'wifi',
          language || 'en',
          font_size || 'medium',
          two_factor_enabled || false
        ]);

        const newResult = await db.query(
          'SELECT * FROM user_settings WHERE user_id = $1',
          [userId]
        );

        const settings = newResult.rows[0];
        return res.json({
          success: true,
          message: 'Settings updated successfully',
          data: { settings }
        });
      }

      const settings = result.rows[0];

      res.json({
        success: true,
        message: 'Settings updated successfully',
        data: { settings }
      });

    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update settings',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async updatePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }

      // Get current user password
      const userResult = await db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = userResult.rows[0];

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password in database
      await db.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, userId]
      );

      res.json({
        success: true,
        message: 'Password updated successfully'
      });

    } catch (error) {
      console.error('Update password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update password',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async setup2FA(req, res) {
    try {
      const userId = req.user.id;

      // Generate a new secret
      const secret = speakeasy.generateSecret({
        name: `Relatim AI (${req.user.email})`,
        issuer: 'Relatim AI'
      });

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url);

      // Store the temporary secret (don't enable 2FA yet)
      await db.query(
        'UPDATE user_settings SET two_factor_secret = $1 WHERE user_id = $2',
        [secret.base32, userId]
      );

      res.json({
        success: true,
        data: {
          secret: secret.base32,
          qrCode: qrCode,
          manualEntryKey: secret.base32
        }
      });

    } catch (error) {
      console.error('Setup 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to setup 2FA',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async verify2FA(req, res) {
    try {
      const userId = req.user.id;
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: '2FA token is required'
        });
      }

      // Get the user's 2FA secret
      const settingsResult = await db.query(
        'SELECT two_factor_secret FROM user_settings WHERE user_id = $1',
        [userId]
      );

      if (settingsResult.rows.length === 0 || !settingsResult.rows[0].two_factor_secret) {
        return res.status(400).json({
          success: false,
          message: '2FA is not set up for this user'
        });
      }

      const secret = settingsResult.rows[0].two_factor_secret;

      // Verify the token
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow some time drift
      });

      if (!verified) {
        return res.status(400).json({
          success: false,
          message: 'Invalid 2FA token'
        });
      }

      // Generate backup codes
      const backupCodes = [];
      for (let i = 0; i < 10; i++) {
        backupCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
      }

      // Enable 2FA and store backup codes
      await db.query(
        'UPDATE user_settings SET two_factor_enabled = true, backup_codes = $1 WHERE user_id = $2',
        [backupCodes, userId]
      );

      res.json({
        success: true,
        message: '2FA enabled successfully',
        data: {
          backupCodes: backupCodes
        }
      });

    } catch (error) {
      console.error('Verify 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify 2FA',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async disable2FA(req, res) {
    try {
      const userId = req.user.id;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required to disable 2FA'
        });
      }

      // Verify password
      const userResult = await db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const isPasswordValid = await bcrypt.compare(password, userResult.rows[0].password_hash);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Incorrect password'
        });
      }

      // Disable 2FA and clear secrets
      await db.query(
        'UPDATE user_settings SET two_factor_enabled = false, two_factor_secret = NULL, backup_codes = NULL WHERE user_id = $1',
        [userId]
      );

      res.json({
        success: true,
        message: '2FA disabled successfully'
      });

    } catch (error) {
      console.error('Disable 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disable 2FA',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async deleteAllMessages(req, res) {
    try {
      const userId = req.user.id;
      const { confirmation } = req.body;

      if (confirmation !== 'DELETE_ALL_MESSAGES') {
        return res.status(400).json({
          success: false,
          message: 'Invalid confirmation. Please type "DELETE_ALL_MESSAGES" to confirm'
        });
      }

      // Start transaction
      await db.query('BEGIN');

      try {
        // Delete message read status first (foreign key constraint)
        await db.query(
          'DELETE FROM message_read_status WHERE message_id IN (SELECT id FROM messages WHERE sender_id = $1 OR receiver_id = $1)',
          [userId]
        );

        // Delete all messages where user is sender or receiver
        const result = await db.query(
          'DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1',
          [userId]
        );

        // Delete AI chat history
        await db.query('DELETE FROM ai_chats WHERE user_id = $1', [userId]);

        await db.query('COMMIT');

        res.json({
          success: true,
          message: `${result.rowCount} messages deleted successfully`
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Delete all messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete messages',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async deleteAccount(req, res) {
    try {
      const userId = req.user.id;
      const { confirmation } = req.body;

      if (confirmation !== 'DELETE_MY_ACCOUNT') {
        return res.status(400).json({
          success: false,
          message: 'Invalid confirmation. Please type "DELETE_MY_ACCOUNT" to confirm'
        });
      }

      // Start transaction
      await db.query('BEGIN');

      try {
        // Delete user data in correct order (respecting foreign key constraints)
        await db.query('DELETE FROM typing_indicators WHERE user_id = $1 OR contact_id = $1', [userId]);
        await db.query('DELETE FROM message_read_status WHERE user_id = $1', [userId]);
        await db.query('DELETE FROM calls WHERE caller_id = $1 OR receiver_id = $1', [userId]);
        await db.query('DELETE FROM ai_chats WHERE user_id = $1', [userId]);
        await db.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [userId]);
        await db.query('DELETE FROM contacts WHERE user_id = $1 OR contact_id = $1', [userId]);
        await db.query('DELETE FROM user_settings WHERE user_id = $1', [userId]);
        await db.query('DELETE FROM users WHERE id = $1', [userId]);

        await db.query('COMMIT');

        res.json({
          success: true,
          message: 'Account deleted successfully'
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete account',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = new UserController();