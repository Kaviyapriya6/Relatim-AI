const db = require('../config/database');

class DashboardController {
  // Get comprehensive dashboard stats
  async getDashboardStats(req, res) {
    try {
      const userId = req.user.id;
      const { timeRange = 'week' } = req.query;

      // Calculate date range
      let dateFilter = '';
      switch (timeRange) {
        case 'day':
          dateFilter = "AND created_at >= CURRENT_DATE";
          break;
        case 'week':
          dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case 'month':
          dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '1 month'";
          break;
        case 'year':
          dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '1 year'";
          break;
        default:
          dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
      }

      // Get main stats
      const statsResult = await db.query(
        `SELECT 
           (SELECT COUNT(*) FROM contacts WHERE user_id = $1) as total_contacts,
           (SELECT COUNT(DISTINCT CASE 
             WHEN sender_id = $1 THEN receiver_id 
             ELSE sender_id 
           END) FROM messages WHERE sender_id = $1 OR receiver_id = $1) as total_chats,
           (SELECT COUNT(*) FROM messages WHERE (sender_id = $1 OR receiver_id = $1) ${dateFilter}) as total_messages,
           (SELECT COUNT(*) FROM messages WHERE sender_id = $1 ${dateFilter}) as messages_sent,
           (SELECT COUNT(*) FROM ai_chats WHERE user_id = $1 ${dateFilter}) as ai_conversations,
           (SELECT COUNT(*) FROM users u 
            JOIN contacts c ON c.contact_id = u.id 
            WHERE c.user_id = $1 AND u.is_online = true) as active_contacts`,
        [userId]
      );

      const stats = statsResult.rows[0];

      // Get previous period stats for change calculation
      let previousDateFilter = '';
      switch (timeRange) {
        case 'day':
          previousDateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE";
          break;
        case 'week':
          previousDateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days'";
          break;
        case 'month':
          previousDateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '2 months' AND created_at < CURRENT_DATE - INTERVAL '1 month'";
          break;
        case 'year':
          previousDateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '2 years' AND created_at < CURRENT_DATE - INTERVAL '1 year'";
          break;
        default:
          previousDateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days'";
      }

      const previousStatsResult = await db.query(
        `SELECT 
           (SELECT COUNT(*) FROM messages WHERE (sender_id = $1 OR receiver_id = $1) ${previousDateFilter}) as prev_total_messages,
           (SELECT COUNT(*) FROM messages WHERE sender_id = $1 ${previousDateFilter}) as prev_messages_sent,
           (SELECT COUNT(*) FROM ai_chats WHERE user_id = $1 ${previousDateFilter}) as prev_ai_conversations`,
        [userId]
      );

      const prevStats = previousStatsResult.rows[0];

      // Calculate percentage changes
      const calculateChange = (current, previous) => {
        if (!previous || previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      // Get activity data for charts
      const activityResult = await db.query(
        `SELECT 
           DATE(created_at) as date,
           COUNT(*) as messages,
           EXTRACT(DOW FROM created_at) as day_of_week
         FROM messages 
         WHERE (sender_id = $1 OR receiver_id = $1) ${dateFilter}
         GROUP BY DATE(created_at), EXTRACT(DOW FROM created_at)
         ORDER BY date DESC
         LIMIT 7`,
        [userId]
      );

      // Format activity data
      const activityData = activityResult.rows.map(row => ({
        label: new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' }),
        messages: parseInt(row.messages),
        date: row.date
      }));

      const maxMessages = Math.max(...activityData.map(d => d.messages), 1);

      // Get message type breakdown
      const messageTypesResult = await db.query(
        `SELECT 
           COUNT(CASE WHEN file_url IS NULL THEN 1 END) as text_messages,
           COUNT(CASE WHEN file_type LIKE 'image%' THEN 1 END) as image_messages,
           COUNT(CASE WHEN file_url IS NOT NULL AND file_type NOT LIKE 'image%' THEN 1 END) as file_messages,
           0 as voice_messages
         FROM messages 
         WHERE (sender_id = $1 OR receiver_id = $1) ${dateFilter}`,
        [userId]
      );

      const messageTypes = messageTypesResult.rows[0];

      res.json({
        success: true,
        data: {
          totalChats: parseInt(stats.total_chats) || 0,
          messagesSent: parseInt(stats.messages_sent) || 0,
          activeContacts: parseInt(stats.active_contacts) || 0,
          aiConversations: parseInt(stats.ai_conversations) || 0,
          
          // Changes
          chatsChange: 0, // We don't track historical chat counts
          messagesChange: calculateChange(
            parseInt(stats.total_messages) || 0,
            parseInt(prevStats.prev_total_messages) || 0
          ),
          contactsChange: 0, // We don't track historical contact counts
          aiChange: calculateChange(
            parseInt(stats.ai_conversations) || 0,
            parseInt(prevStats.prev_ai_conversations) || 0
          ),

          // Activity data for charts
          activityData,
          maxMessages,

          // Message type breakdown
          textMessages: parseInt(messageTypes.text_messages) || 0,
          imageMessages: parseInt(messageTypes.image_messages) || 0,
          fileMessages: parseInt(messageTypes.file_messages) || 0,
          aiMessages: parseInt(stats.ai_conversations) || 0,
          totalMessages: parseInt(stats.total_messages) || 0,

          timeRange
        }
      });

    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get recent messages for dashboard
  async getRecentMessages(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 5 } = req.query;

      const messagesResult = await db.query(
        `SELECT 
           m.id,
           m.content,
           CASE 
             WHEN m.file_url IS NOT NULL THEN 'file'
             ELSE 'text'
           END as type,
           m.created_at as timestamp,
           CASE 
             WHEN m.sender_id = $1 THEN CONCAT(u2.first_name, ' ', u2.last_name)
             ELSE CONCAT(u1.first_name, ' ', u1.last_name)
           END as sender_name,
           CASE 
             WHEN m.sender_id = $1 THEN u2.profile_photo 
             ELSE u1.profile_photo 
           END as sender_avatar,
           CASE 
             WHEN m.sender_id = $1 THEN m.receiver_id 
             ELSE m.sender_id 
           END as contact_id
         FROM messages m
         JOIN users u1 ON u1.id = m.sender_id
         JOIN users u2 ON u2.id = m.receiver_id
         WHERE m.sender_id = $1 OR m.receiver_id = $1
         ORDER BY m.created_at DESC
         LIMIT $2`,
        [userId, parseInt(limit)]
      );

      res.json({
        success: true,
        data: messagesResult.rows.map(msg => ({
          id: msg.id,
          content: msg.content,
          type: msg.type,
          timestamp: msg.timestamp,
          senderName: msg.sender_name,
          senderAvatar: msg.sender_avatar,
          contactId: msg.contact_id
        }))
      });

    } catch (error) {
      console.error('Get recent messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get recent messages',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get recent contacts for dashboard
  async getRecentContacts(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 8 } = req.query;

      const contactsResult = await db.query(
        `SELECT DISTINCT
           u.id,
           CONCAT(u.first_name, ' ', u.last_name) as name,
           u.profile_photo as avatar,
           u.is_online,
           MAX(m.created_at) as last_message_time
         FROM contacts c
         JOIN users u ON u.id = c.contact_id
         LEFT JOIN messages m ON (
           (m.sender_id = $1 AND m.receiver_id = u.id) OR 
           (m.sender_id = u.id AND m.receiver_id = $1)
         )
         WHERE c.user_id = $1
         GROUP BY u.id, u.first_name, u.last_name, u.profile_photo, u.is_online
         ORDER BY last_message_time DESC NULLS LAST
         LIMIT $2`,
        [userId, parseInt(limit)]
      );

      res.json({
        success: true,
        data: contactsResult.rows.map(contact => ({
          id: contact.id,
          name: contact.name,
          avatar: contact.avatar,
          isOnline: contact.is_online,
          lastMessageTime: contact.last_message_time
        }))
      });

    } catch (error) {
      console.error('Get recent contacts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get recent contacts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = new DashboardController();