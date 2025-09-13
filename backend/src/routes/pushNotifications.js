const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pushNotificationService = require('../services/pushNotificationService');

// Subscribe to push notifications
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    const result = await pushNotificationService.subscribeUser(userId, subscription);
    
    res.json({ 
      message: 'Push subscription saved successfully',
      subscriptionId: result.subscriptionId
    });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ error: 'Failed to save push subscription' });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    await pushNotificationService.unsubscribeUser(userId, subscription.endpoint);

    res.json({ message: 'Push subscription removed successfully' });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(500).json({ error: 'Failed to remove push subscription' });
  }
});

// Send test notification
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pushNotificationService.sendNotification(userId, {
      title: 'Relatim AI Chat',
      body: 'This is a test notification!',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'test-notification'
    });

    if (result.success) {
      res.json({ 
        message: 'Test notification sent successfully',
        stats: {
          successful: result.successful,
          failed: result.failed,
          total: result.total
        }
      });
    } else {
      res.status(404).json({ 
        error: result.reason || 'No push subscriptions found'
      });
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

module.exports = router;