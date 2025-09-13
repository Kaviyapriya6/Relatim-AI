const webpush = require('web-push');
const db = require('../config/database');

class PushNotificationService {
  constructor() {
    // Configure VAPID keys for push notifications
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:' + process.env.EMAIL_USER,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      console.log('✅ Push notification service initialized with VAPID keys');
    } else {
      console.warn('⚠️ VAPID keys not configured. Push notifications will use demo mode.');
    }
  }

  async subscribeUser(userId, subscription) {
    try {
      // Store the subscription in the database
      const query = `
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (user_id, endpoint) 
        DO UPDATE SET 
          p256dh_key = EXCLUDED.p256dh_key,
          auth_key = EXCLUDED.auth_key,
          updated_at = NOW()
        RETURNING id
      `;

      const result = await db.query(query, [
        userId,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth
      ]);

      console.log(`📱 User ${userId} subscribed to push notifications`);
      return { success: true, subscriptionId: result.rows[0].id };
    } catch (error) {
      console.error('Failed to store push subscription:', error);
      throw error;
    }
  }

  async unsubscribeUser(userId, endpoint) {
    try {
      await db.query(
        'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
        [userId, endpoint]
      );

      console.log(`📱 User ${userId} unsubscribed from push notifications`);
      return { success: true };
    } catch (error) {
      console.error('Failed to remove push subscription:', error);
      throw error;
    }
  }

  async getUserSubscriptions(userId) {
    try {
      const result = await db.query(
        'SELECT endpoint, p256dh_key, auth_key FROM push_subscriptions WHERE user_id = $1',
        [userId]
      );

      return result.rows.map(row => ({
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh_key,
          auth: row.auth_key
        }
      }));
    } catch (error) {
      console.error('Failed to get user subscriptions:', error);
      return [];
    }
  }

  async sendNotification(userId, notification) {
    try {
      const subscriptions = await this.getUserSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        console.log(`No push subscriptions found for user ${userId}`);
        return { success: false, reason: 'No subscriptions' };
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/badge-72x72.png',
        tag: notification.tag || 'default',
        data: notification.data || {},
        timestamp: Date.now(),
        requireInteraction: notification.requireInteraction || false,
        actions: notification.actions || []
      });

      const results = await Promise.allSettled(
        subscriptions.map(subscription => 
          webpush.sendNotification(subscription, payload)
        )
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      // Remove invalid subscriptions
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'rejected') {
          const error = result.reason;
          if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription is no longer valid, remove it
            await this.unsubscribeUser(userId, subscriptions[i].endpoint);
          }
        }
      }

      console.log(`📤 Push notification sent to user ${userId}: ${successful} successful, ${failed} failed`);
      return { 
        success: successful > 0, 
        successful, 
        failed,
        total: subscriptions.length 
      };
    } catch (error) {
      console.error('Failed to send push notification:', error);
      throw error;
    }
  }

  async sendMessageNotification(receiverId, senderName, messageText, chatId) {
    const notification = {
      title: `New message from ${senderName}`,
      body: messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText,
      icon: '/icons/message-icon.png',
      badge: '/icons/badge-72x72.png',
      tag: `message-${chatId}`,
      requireInteraction: true,
      data: {
        type: 'message',
        chatId,
        senderId: receiverId,
        url: `/chat/${chatId}`
      },
      actions: [
        {
          action: 'reply',
          title: 'Reply',
          icon: '/icons/reply-icon.png'
        },
        {
          action: 'view',
          title: 'View',
          icon: '/icons/view-icon.png'
        }
      ]
    };

    return this.sendNotification(receiverId, notification);
  }

  async sendCallNotification(receiverId, callerName, callType) {
    const notification = {
      title: `Incoming ${callType} call`,
      body: `${callerName} is calling you`,
      icon: '/icons/call-icon.png',
      badge: '/icons/badge-72x72.png',
      tag: 'incoming-call',
      requireInteraction: true,
      data: {
        type: 'call',
        callType,
        callerName,
        url: '/calls'
      },
      actions: [
        {
          action: 'answer',
          title: 'Answer',
          icon: '/icons/answer-icon.png'
        },
        {
          action: 'decline',
          title: 'Decline',
          icon: '/icons/decline-icon.png'
        }
      ]
    };

    return this.sendNotification(receiverId, notification);
  }

  async sendContactRequestNotification(receiverId, requesterName) {
    const notification = {
      title: 'New Contact Request',
      body: `${requesterName} wants to add you as a contact`,
      icon: '/icons/contact-icon.png',
      badge: '/icons/badge-72x72.png',
      tag: 'contact-request',
      data: {
        type: 'contact-request',
        requesterName,
        url: '/contacts'
      },
      actions: [
        {
          action: 'accept',
          title: 'Accept',
          icon: '/icons/accept-icon.png'
        },
        {
          action: 'view',
          title: 'View',
          icon: '/icons/view-icon.png'
        }
      ]
    };

    return this.sendNotification(receiverId, notification);
  }

  async sendGroupNotification(userIds, title, body, data = {}) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendNotification(userId, {
        title,
        body,
        icon: '/icons/group-icon.png',
        badge: '/icons/badge-72x72.png',
        tag: 'group-notification',
        data: {
          type: 'group',
          ...data
        }
      }))
    );

    const successful = results.filter(result => result.status === 'fulfilled').length;
    return { success: successful > 0, successful, total: userIds.length };
  }

  async sendSystemNotification(userId, title, body, data = {}) {
    const notification = {
      title,
      body,
      icon: '/icons/system-icon.png',
      badge: '/icons/badge-72x72.png',
      tag: 'system-notification',
      data: {
        type: 'system',
        ...data
      }
    };

    return this.sendNotification(userId, notification);
  }

  // Utility method to create push subscription table if it doesn't exist
  async initializeDatabase() {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          endpoint TEXT NOT NULL,
          p256dh_key TEXT NOT NULL,
          auth_key TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, endpoint)
        );
        
        CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
      `;

      await db.query(createTableQuery);
      console.log('✅ Push subscriptions table initialized');
    } catch (error) {
      console.error('Failed to initialize push subscriptions table:', error);
    }
  }
}

module.exports = new PushNotificationService();