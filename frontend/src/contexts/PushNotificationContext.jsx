import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNotification } from './NotificationContext';

const PushNotificationContext = createContext();

export const usePushNotifications = () => {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error('usePushNotifications must be used within a PushNotificationProvider');
  }
  return context;
};

export const PushNotificationProvider = ({ children }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const { showNotification } = useNotification();

  // VAPID public key (in production, this should come from environment variables)
  const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HEd0-3NjAAsFGGk8T8BZmYV0YaJByqJKNGYCIQXH0zU5KOm8PgXJUVp0Lw';

  useEffect(() => {
    // Check if service workers and push notifications are supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      initializeServiceWorker();
    }
  }, []);

  const initializeServiceWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      setRegistration(reg);

      // Check if already subscribed
      const existingSubscription = await reg.pushManager.getSubscription();
      if (existingSubscription) {
        setSubscription(existingSubscription);
        setIsSubscribed(true);
      }

      // Listen for service worker updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showNotification('App updated! Refresh to use the latest version.', 'info');
          }
        });
      });
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPushNotifications = async () => {
    if (!registration || !isSupported) {
      throw new Error('Push notifications are not supported');
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Subscribe to push notifications
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      setSubscription(sub);
      setIsSubscribed(true);

      // Send subscription to server
      await sendSubscriptionToServer(sub);
      
      showNotification('Push notifications enabled!', 'success');
      return sub;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      showNotification('Failed to enable push notifications', 'error');
      throw error;
    }
  };

  const unsubscribeFromPushNotifications = async () => {
    if (!subscription) {
      return;
    }

    try {
      await subscription.unsubscribe();
      
      // Remove subscription from server
      await removeSubscriptionFromServer(subscription);
      
      setSubscription(null);
      setIsSubscribed(false);
      
      showNotification('Push notifications disabled', 'info');
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      showNotification('Failed to disable push notifications', 'error');
      throw error;
    }
  };

  const sendSubscriptionToServer = async (subscription) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/push-notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription to server');
      }
    } catch (error) {
      console.error('Error sending subscription to server:', error);
      throw error;
    }
  };

  const removeSubscriptionFromServer = async (subscription) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return; // No token, probably logged out
      }

      const response = await fetch('/api/push-notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to remove subscription from server');
      }
    } catch (error) {
      console.error('Error removing subscription from server:', error);
      // Don't throw here as unsubscribe should work locally even if server fails
    }
  };

  const sendTestNotification = async () => {
    if (!isSubscribed) {
      throw new Error('Not subscribed to push notifications');
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/push-notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }

      showNotification('Test notification sent!', 'success');
    } catch (error) {
      console.error('Error sending test notification:', error);
      showNotification('Failed to send test notification', 'error');
      throw error;
    }
  };

  const getNotificationPermission = () => {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  };

  const value = {
    isSupported,
    isSubscribed,
    subscription,
    subscribeToPushNotifications,
    unsubscribeFromPushNotifications,
    sendTestNotification,
    getNotificationPermission
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
};