const db = require('../config/database');

class ContactController {
  async getContacts(req, res) {
    try {
      const userId = req.user.id;
      const { search, limit = 50, offset = 0 } = req.query;

      let query = `
        SELECT 
          c.id as contact_relation_id,
          c.nickname,
          c.created_at as added_at,
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.profile_photo,
          u.is_online,
          u.last_seen,
          (
            SELECT m.content 
            FROM messages m 
            WHERE (m.sender_id = $1 AND m.receiver_id = u.id) 
               OR (m.sender_id = u.id AND m.receiver_id = $1)
            ORDER BY m.created_at DESC 
            LIMIT 1
          ) as last_message,
          (
            SELECT m.created_at 
            FROM messages m 
            WHERE (m.sender_id = $1 AND m.receiver_id = u.id) 
               OR (m.sender_id = u.id AND m.receiver_id = $1)
            ORDER BY m.created_at DESC 
            LIMIT 1
          ) as last_message_time,
          (
            SELECT COUNT(*) 
            FROM messages m 
            WHERE m.sender_id = u.id 
              AND m.receiver_id = $1 
              AND m.status != 'seen'
          ) as unread_count
        FROM contacts c
        JOIN users u ON c.contact_id = u.id
        WHERE c.user_id = $1
      `;

      const queryParams = [userId];
      let paramIndex = 2;

      if (search && search.trim().length > 0) {
        const searchTerm = `%${search.trim().toLowerCase()}%`;
        query += ` AND (
          LOWER(u.first_name) LIKE $${paramIndex} 
          OR LOWER(u.last_name) LIKE $${paramIndex}
          OR LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE $${paramIndex}
          OR LOWER(c.nickname) LIKE $${paramIndex}
          OR u.phone_number LIKE $${paramIndex}
        )`;
        queryParams.push(searchTerm);
        paramIndex++;
      }

      query += ` ORDER BY u.is_online DESC, last_message_time DESC NULLS LAST, u.first_name ASC`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);

      const contacts = result.rows.map(contact => ({
        id: contact.id,
        contact_relation_id: contact.contact_relation_id,
        name: `${contact.first_name} ${contact.last_name}`,
        firstName: contact.first_name,
        lastName: contact.last_name,
        nickname: contact.nickname,
        email: contact.email,
        phone: contact.phone_number,
        profilePhoto: contact.profile_photo,
        isOnline: contact.is_online,
        lastSeen: contact.last_seen,
        lastMessage: contact.last_message,
        lastMessageTime: contact.last_message_time,
        unreadCount: parseInt(contact.unread_count || 0),
        createdAt: contact.added_at
      }));

      res.json({
        success: true,
        data: {
          contacts,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: contacts.length
          }
        }
      });

    } catch (error) {
      console.error('Get contacts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get contacts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async addContact(req, res) {
    try {
      const userId = req.user.id;
      const { contact_id, nickname } = req.body;

      // Check if trying to add self
      if (contact_id === userId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot add yourself as a contact'
        });
      }

      // Check if contact exists
      const contactUserResult = await db.query(
        'SELECT id, first_name, last_name, email, phone_number, profile_photo FROM users WHERE id = $1',
        [contact_id]
      );

      if (contactUserResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if contact relationship already exists
      const existingContact = await db.query(
        'SELECT id FROM contacts WHERE user_id = $1 AND contact_id = $2',
        [userId, contact_id]
      );

      if (existingContact.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Contact already exists'
        });
      }

      // Add contact (create bidirectional relationship)
      const contactResult = await db.query(
        'INSERT INTO contacts (user_id, contact_id, nickname) VALUES ($1, $2, $3) RETURNING *',
        [userId, contact_id, nickname || null]
      );

      // Also add the reverse relationship so both users can see each other
      // Check if reverse relationship already exists first
      const existingReverseContact = await db.query(
        'SELECT id FROM contacts WHERE user_id = $1 AND contact_id = $2',
        [contact_id, userId]
      );

      if (existingReverseContact.rows.length === 0) {
        await db.query(
          'INSERT INTO contacts (user_id, contact_id) VALUES ($1, $2)',
          [contact_id, userId]
        );
      }

      const contact = contactResult.rows[0];
      const contactUser = contactUserResult.rows[0];

      res.status(201).json({
        success: true,
        message: 'Contact added successfully',
        data: {
          contact: {
            id: contactUser.id,
            contact_relation_id: contact.id,
            name: `${contactUser.first_name} ${contactUser.last_name}`,
            firstName: contactUser.first_name,
            lastName: contactUser.last_name,
            nickname: contact.nickname,
            email: contactUser.email,
            phone: contactUser.phone_number,
            profilePhoto: contactUser.profile_photo,
            isOnline: false,
            lastSeen: null,
            createdAt: contact.created_at
          }
        }
      });

    } catch (error) {
      console.error('Add contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add contact',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async updateContact(req, res) {
    try {
      const userId = req.user.id;
      const contactId = req.params.id;
      const { nickname } = req.body;

      // Check if contact exists and belongs to user
      const existingContact = await db.query(
        'SELECT * FROM contacts WHERE id = $1 AND user_id = $2',
        [contactId, userId]
      );

      if (existingContact.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
      }

      // Update contact
      const result = await db.query(
        'UPDATE contacts SET nickname = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
        [nickname || null, contactId, userId]
      );

      const updatedContact = result.rows[0];

      res.json({
        success: true,
        message: 'Contact updated successfully',
        data: { contact: updatedContact }
      });

    } catch (error) {
      console.error('Update contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update contact',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async removeContact(req, res) {
    try {
      const userId = req.user.id;
      const contactId = req.params.id;

      // Check if contact exists and belongs to user
      const existingContact = await db.query(
        'SELECT * FROM contacts WHERE id = $1 AND user_id = $2',
        [contactId, userId]
      );

      if (existingContact.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
      }

      // Remove contact
      await db.query(
        'DELETE FROM contacts WHERE id = $1 AND user_id = $2',
        [contactId, userId]
      );

      res.json({
        success: true,
        message: 'Contact removed successfully'
      });

    } catch (error) {
      console.error('Remove contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove contact',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async getContactDetails(req, res) {
    try {
      const userId = req.user.id;
      const contactUserId = req.params.userId;

      // Get contact details
      const contactResult = await db.query(
        `SELECT 
           c.id as contact_relation_id,
           c.nickname,
           c.created_at as added_at,
           u.id,
           u.first_name,
           u.last_name,
           u.email,
           u.phone_number,
           u.profile_photo,
           u.is_online,
           u.last_seen,
           u.created_at as joined_at
         FROM users u
         LEFT JOIN contacts c ON (c.contact_id = u.id AND c.user_id = $1)
         WHERE u.id = $2`,
        [userId, contactUserId]
      );

      if (contactResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const contact = contactResult.rows[0];

      // Get conversation stats
      const statsResult = await db.query(
        `SELECT 
           COUNT(*) as total_messages,
           COUNT(CASE WHEN sender_id = $1 THEN 1 END) as sent_messages,
           COUNT(CASE WHEN sender_id = $2 THEN 1 END) as received_messages,
           MIN(created_at) as first_message_date,
           MAX(created_at) as last_message_date
         FROM messages 
         WHERE (sender_id = $1 AND receiver_id = $2) 
            OR (sender_id = $2 AND receiver_id = $1)`,
        [userId, contactUserId]
      );

      const stats = statsResult.rows[0];

      res.json({
        success: true,
        data: {
          contact: {
            id: contact.id,
            contact_relation_id: contact.contact_relation_id,
            first_name: contact.first_name,
            last_name: contact.last_name,
            full_name: `${contact.first_name} ${contact.last_name}`,
            nickname: contact.nickname,
            email: contact.email,
            phone_number: contact.phone_number,
            profile_photo: contact.profile_photo,
            is_online: contact.is_online,
            last_seen: contact.last_seen,
            joined_at: contact.joined_at,
            added_at: contact.added_at,
            is_contact: !!contact.contact_relation_id
          },
          stats: {
            total_messages: parseInt(stats.total_messages),
            sent_messages: parseInt(stats.sent_messages),
            received_messages: parseInt(stats.received_messages),
            first_message_date: stats.first_message_date,
            last_message_date: stats.last_message_date
          }
        }
      });

    } catch (error) {
      console.error('Get contact details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get contact details',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async getContactsByPhone(req, res) {
    try {
      const { phone_numbers } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(phone_numbers) || phone_numbers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Phone numbers array is required'
        });
      }

      // Limit to prevent abuse
      if (phone_numbers.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Too many phone numbers. Maximum 100 allowed'
        });
      }

      const placeholders = phone_numbers.map((_, index) => `$${index + 2}`).join(',');
      const query = `
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.phone_number,
          u.profile_photo,
          CASE WHEN c.id IS NOT NULL THEN true ELSE false END as is_contact
        FROM users u
        LEFT JOIN contacts c ON (c.user_id = $1 AND c.contact_id = u.id)
        WHERE u.phone_number IN (${placeholders})
          AND u.id != $1
        ORDER BY is_contact DESC, u.first_name ASC
      `;

      const result = await db.query(query, [userId, ...phone_numbers]);

      const contacts = result.rows.map(user => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: `${user.first_name} ${user.last_name}`,
        phone_number: user.phone_number,
        profile_photo: user.profile_photo,
        is_contact: user.is_contact
      }));

      res.json({
        success: true,
        data: { contacts }
      });

    } catch (error) {
      console.error('Get contacts by phone error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get contacts by phone',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async searchUsers(req, res) {
    try {
      const userId = req.user.id;
      const { q: searchQuery } = req.query;

      if (!searchQuery || searchQuery.trim().length < 2) {
        return res.json({
          success: true,
          data: { users: [] }
        });
      }

      const query = `
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.profile_photo,
          u.is_online,
          CASE 
            WHEN c.id IS NOT NULL THEN true 
            ELSE false 
          END as is_contact
        FROM users u
        LEFT JOIN contacts c ON (c.user_id = $1 AND c.contact_id = u.id)
        WHERE u.id != $1
          AND (
            LOWER(u.first_name) LIKE LOWER($2) 
            OR LOWER(u.last_name) LIKE LOWER($2)
            OR LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE LOWER($2)
            OR u.phone_number LIKE $3
            OR LOWER(u.email) LIKE LOWER($2)
          )
        ORDER BY 
          is_contact DESC,
          u.first_name ASC
        LIMIT 20
      `;

      const searchPattern = `%${searchQuery}%`;
      const phonePattern = `%${searchQuery.replace(/\D/g, '')}%`;
      
      const result = await db.query(query, [
        userId, 
        searchPattern, 
        phonePattern
      ]);

      const users = result.rows.map(user => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone: user.phone_number,
        profilePhoto: user.profile_photo,
        isOnline: user.is_online,
        isContact: user.is_contact
      }));

      res.json({
        success: true,
        data: { users }
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

  async exportContacts(req, res) {
    try {
      const userId = req.user.id;

      const query = `
        SELECT 
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          c.nickname,
          c.created_at as added_at
        FROM contacts c
        JOIN users u ON c.contact_user_id = u.id
        WHERE c.user_id = $1
        ORDER BY u.first_name ASC, u.last_name ASC
      `;

      const result = await db.query(query, [userId]);

      const contacts = result.rows.map(contact => ({
        first_name: contact.first_name,
        last_name: contact.last_name,
        full_name: `${contact.first_name} ${contact.last_name}`,
        email: contact.email,
        phone_number: contact.phone_number,
        nickname: contact.nickname,
        added_at: contact.added_at
      }));

      res.json({
        success: true,
        data: { 
          contacts,
          total: contacts.length,
          exported_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Export contacts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export contacts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = new ContactController();