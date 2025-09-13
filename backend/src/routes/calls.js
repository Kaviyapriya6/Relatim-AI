const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');
const videoCallService = require('../services/videoCallService');
const pushNotificationService = require('../services/pushNotificationService');

// Get call history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, offset = 0, filter = 'all' } = req.query;

    let whereClause = 'WHERE (caller_id = $1 OR receiver_id = $1)';
    let queryParams = [userId];

    // Apply filters
    if (filter === 'missed') {
      whereClause += ' AND status = $2';
      queryParams.push('missed');
    } else if (filter === 'outgoing') {
      whereClause += ' AND caller_id = $1';
    } else if (filter === 'incoming') {
      whereClause += ' AND receiver_id = $1';
    }

    const query = `
      SELECT 
        c.*,
        CASE 
          WHEN c.caller_id = $1 THEN ru.username 
          ELSE cu.username 
        END as contact_name,
        CASE 
          WHEN c.caller_id = $1 THEN ru.profile_photo 
          ELSE cu.profile_photo 
        END as contact_avatar,
        CASE 
          WHEN c.caller_id = $1 THEN 'outgoing'
          ELSE 'incoming'
        END as direction,
        CASE 
          WHEN c.caller_id = $1 THEN c.receiver_id
          ELSE c.caller_id
        END as contact_id
      FROM calls c
      LEFT JOIN users cu ON c.caller_id = cu.id
      LEFT JOIN users ru ON c.receiver_id = ru.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);

    const calls = result.rows.map(call => ({
      id: call.id,
      contactId: call.contact_id,
      contactName: call.contact_name,
      contactAvatar: call.contact_avatar,
      type: call.type,
      direction: call.direction,
      status: call.status,
      duration: call.duration || 0,
      timestamp: call.created_at
    }));

    res.json({ calls });
  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json({ error: 'Failed to fetch call history' });
  }
});

// Initiate a call
router.post('/initiate', authenticateToken, async (req, res) => {
  try {
    const callerId = req.user.userId;
    const { contactId, type = 'audio' } = req.body;

    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID is required' });
    }

    // Validate contact exists and is in user's contacts
    const contactCheck = await db.query(
      'SELECT u.id, u.username FROM users u INNER JOIN contacts c ON u.id = c.contact_id WHERE c.user_id = $1 AND u.id = $2',
      [callerId, contactId]
    );

    if (contactCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Create call record
    const result = await db.query(
      'INSERT INTO calls (caller_id, receiver_id, type, status, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [callerId, contactId, type, 'initiated']
    );

    const call = result.rows[0];

    // In a real app, you would integrate with LiveKit here to create a room
    // For now, we'll just return the call data
    const callData = {
      id: call.id,
      roomToken: null, // In production, integrate with your video call service
      roomName: `call_${call.id}`,
      type: call.type,
      status: call.status
    };

    // You would also send a real-time notification to the receiver via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${contactId}`).emit('incoming_call', {
        callId: call.id,
        callerId: callerId,
        callerName: req.user.username,
        type: call.type
      });
    }

    res.json({ call: callData });
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

// Accept a call
router.post('/accept', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { callId } = req.body;

    if (!callId) {
      return res.status(400).json({ error: 'Call ID is required' });
    }

    // Update call status to accepted
    const result = await db.query(
      'UPDATE calls SET status = $1, started_at = NOW() WHERE id = $2 AND receiver_id = $3 AND status = $4 RETURNING *',
      ['accepted', callId, userId, 'initiated']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found or already processed' });
    }

    const call = result.rows[0];

    // Generate LiveKit token for the call
    const callData = {
      id: call.id,
      roomToken: null, // In production, integrate with your video call service
      roomName: `call_${call.id}`,
      type: call.type,
      status: call.status
    };

    // Notify the caller that the call was accepted
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${call.caller_id}`).emit('call_accepted', {
        callId: call.id,
        roomToken: callData.roomToken
      });
    }

    res.json({ call: callData });
  } catch (error) {
    console.error('Error accepting call:', error);
    res.status(500).json({ error: 'Failed to accept call' });
  }
});

// Decline a call
router.post('/decline', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { callId } = req.body;

    if (!callId) {
      return res.status(400).json({ error: 'Call ID is required' });
    }

    // Update call status to declined
    const result = await db.query(
      'UPDATE calls SET status = $1, ended_at = NOW() WHERE id = $2 AND receiver_id = $3 AND status = $4 RETURNING *',
      ['declined', callId, userId, 'initiated']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found or already processed' });
    }

    const call = result.rows[0];

    // Notify the caller that the call was declined
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${call.caller_id}`).emit('call_declined', {
        callId: call.id
      });
    }

    res.json({ message: 'Call declined' });
  } catch (error) {
    console.error('Error declining call:', error);
    res.status(500).json({ error: 'Failed to decline call' });
  }
});

// End a call
router.post('/end', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { callId, duration = 0 } = req.body;

    if (!callId) {
      return res.status(400).json({ error: 'Call ID is required' });
    }

    // Update call status to ended
    const result = await db.query(
      'UPDATE calls SET status = $1, duration = $2, ended_at = NOW() WHERE id = $3 AND (caller_id = $4 OR receiver_id = $4) RETURNING *',
      ['completed', duration, callId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found' });
    }

    const call = result.rows[0];

    // Notify the other participant that the call ended
    const io = req.app.get('io');
    if (io) {
      const otherUserId = call.caller_id === userId ? call.receiver_id : call.caller_id;
      io.to(`user_${otherUserId}`).emit('call_ended', {
        callId: call.id,
        duration: duration
      });
    }

    res.json({ message: 'Call ended' });
  } catch (error) {
    console.error('Error ending call:', error);
    res.status(500).json({ error: 'Failed to end call' });
  }
});

// Delete a call from history
router.delete('/:callId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { callId } = req.params;

    const result = await db.query(
      'DELETE FROM calls WHERE id = $1 AND (caller_id = $2 OR receiver_id = $2) RETURNING *',
      [callId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json({ message: 'Call deleted from history' });
  } catch (error) {
    console.error('Error deleting call:', error);
    res.status(500).json({ error: 'Failed to delete call' });
  }
});

// Clear all call history
router.delete('/clear-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    await db.query(
      'DELETE FROM calls WHERE caller_id = $1 OR receiver_id = $1',
      [userId]
    );

    res.json({ message: 'Call history cleared' });
  } catch (error) {
    console.error('Error clearing call history:', error);
    res.status(500).json({ error: 'Failed to clear call history' });
  }
});

module.exports = router;
