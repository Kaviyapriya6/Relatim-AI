const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateToken } = require('../utils/jwt');
const { optimizeImage } = require('../utils/imageProcessor');
const { getFileUrl } = require('../utils/fileUtils');
const emailService = require('../services/emailService');
const path = require('path');

class AuthController {
  async register(req, res) {
    try {
      const { first_name, last_name, email, phone_number, password } = req.body;

      // Check if user already exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1 OR phone_number = $2',
        [email, phone_number]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'User with this email or phone number already exists'
        });
      }

      // Hash password
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Handle profile photo upload
      let profile_photo = null;
      if (req.file) {
        try {
          const optimizedPath = path.join(
            path.dirname(req.file.path),
            `optimized_${path.basename(req.file.path)}`
          );
          
          await optimizeImage(req.file.path, optimizedPath, {
            width: 400,
            height: 400,
            quality: 85
          });

          profile_photo = getFileUrl(
            `uploads/profiles/${path.basename(optimizedPath)}`,
            `${req.protocol}://${req.get('host')}`
          );
        } catch (imageError) {
          console.error('Profile photo optimization error:', imageError);
          // Continue without profile photo if optimization fails
        }
      }

      // Create user
      const userResult = await db.query(
        `INSERT INTO users (first_name, last_name, email, phone_number, password_hash, profile_photo)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, first_name, last_name, email, phone_number, profile_photo, created_at`,
        [first_name, last_name, email, phone_number, password_hash, profile_photo]
      );

      const user = userResult.rows[0];

      // Create default user settings
      await db.query(
        'INSERT INTO user_settings (user_id) VALUES ($1)',
        [user.id]
      );

      // Generate JWT token
      const token = generateToken(user.id);

      // Set user as online
      await db.query(
        'UPDATE users SET is_online = true, last_seen = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Send welcome email asynchronously
      emailService.sendWelcomeEmail(user.email, `${user.first_name} ${user.last_name}`)
        .catch(error => console.error('Failed to send welcome email:', error));

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone_number: user.phone_number,
            profile_photo: user.profile_photo,
            created_at: user.created_at
          },
          token
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const userResult = await db.query(
        `SELECT u.*, us.dark_mode, us.notifications_enabled, us.message_preview
         FROM users u
         LEFT JOIN user_settings us ON u.id = us.user_id
         WHERE u.email = $1`,
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const user = userResult.rows[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate JWT token
      const token = generateToken(user.id);

      // Update user online status
      await db.query(
        'UPDATE users SET is_online = true, last_seen = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Send login notification email asynchronously
      const loginInfo = {
        timestamp: new Date().toLocaleString(),
        ip: req.ip || req.connection.remoteAddress || 'Unknown',
        userAgent: req.get('User-Agent') || 'Unknown Device'
      };
      
      emailService.sendLoginNotification(
        user.email, 
        `${user.first_name} ${user.last_name}`, 
        loginInfo
      ).catch(error => console.error('Failed to send login notification:', error));

      // Get user statistics
      const statsResult = await db.query(
        `SELECT 
           (SELECT COUNT(*) FROM contacts WHERE user_id = $1) as contacts_count,
           (SELECT COUNT(DISTINCT CASE 
             WHEN sender_id = $1 THEN receiver_id 
             ELSE sender_id 
           END) FROM messages WHERE sender_id = $1 OR receiver_id = $1) as chats_count,
           (SELECT COUNT(*) FROM messages WHERE sender_id = $1 OR receiver_id = $1) as messages_count`,
        [user.id]
      );

      const stats = statsResult.rows[0];

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone_number: user.phone_number,
            profile_photo: user.profile_photo,
            is_online: true,
            last_seen: user.last_seen,
            created_at: user.created_at,
            settings: {
              dark_mode: user.dark_mode || false,
              notifications_enabled: user.notifications_enabled !== false,
              message_preview: user.message_preview !== false
            },
            stats: {
              contacts_count: parseInt(stats.contacts_count),
              chats_count: parseInt(stats.chats_count),
              messages_count: parseInt(stats.messages_count)
            }
          },
          token
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async logout(req, res) {
    try {
      const userId = req.user.id;

      // Update user offline status
      await db.query(
        'UPDATE users SET is_online = false, last_seen = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );

      res.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const userId = req.user.id;

      // Generate new token
      const token = generateToken(userId);

      // Update last seen
      await db.query(
        'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: { token }
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Token refresh failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async verifyToken(req, res) {
    try {
      const user = req.user;

      // Get fresh user data with settings
      const userResult = await db.query(
        `SELECT u.*, us.dark_mode, us.notifications_enabled, us.message_preview
         FROM users u
         LEFT JOIN user_settings us ON u.id = us.user_id
         WHERE u.id = $1`,
        [user.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const userData = userResult.rows[0];

      res.json({
        success: true,
        message: 'Token is valid',
        data: {
          user: {
            id: userData.id,
            first_name: userData.first_name,
            last_name: userData.last_name,
            email: userData.email,
            phone_number: userData.phone_number,
            profile_photo: userData.profile_photo,
            is_online: userData.is_online,
            last_seen: userData.last_seen,
            created_at: userData.created_at,
            settings: {
              dark_mode: userData.dark_mode || false,
              notifications_enabled: userData.notifications_enabled !== false,
              message_preview: userData.message_preview !== false
            }
          }
        }
      });

    } catch (error) {
      console.error('Token verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Token verification failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;
      const userId = req.user.id;

      // Get current password hash
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
      const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const saltRounds = 12;
      const new_password_hash = await bcrypt.hash(new_password, saltRounds);

      // Update password
      await db.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [new_password_hash, userId]
      );

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = new AuthController();