// India timezone utility functions
const INDIA_TIMEZONE = 'Asia/Kolkata';

const getIndiaTime = (date = new Date()) => {
  return new Date(date.toLocaleString('en-US', { timeZone: INDIA_TIMEZONE }));
};

export const formatLastSeen = (lastSeenDate) => {
  if (!lastSeenDate) return 'last seen a while ago';
  
  try {
    const now = getIndiaTime();
    const lastSeen = getIndiaTime(new Date(lastSeenDate));
    
    // Validate dates
    if (isNaN(now.getTime()) || isNaN(lastSeen.getTime())) {
      return 'last seen a while ago';
    }
    
    const diffInMs = now.getTime() - lastSeen.getTime();
    
    // If the date is in the future or invalid, show default
    if (diffInMs < 0) {
      return 'last seen recently';
    }
    
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) {
      return 'last seen just now';
    } else if (diffInMinutes < 60) {
      return `last seen ${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    } else if (diffInHours < 24) {
      return `last seen ${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else if (diffInDays === 1) {
      return 'last seen yesterday';
    } else if (diffInDays < 7) {
      return `last seen ${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    } else {
      // Format as date for older than a week
      return `last seen ${lastSeen.toLocaleDateString('en-IN', { 
        day: '2-digit',
        month: 'short',
        timeZone: INDIA_TIMEZONE
      })}`;
    }
  } catch (error) {
    console.warn('Error formatting last seen time:', error);
    return 'last seen a while ago';
  }
};

export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    const now = getIndiaTime();
    const messageTime = getIndiaTime(new Date(timestamp));
    
    // Validate dates
    if (isNaN(now.getTime()) || isNaN(messageTime.getTime())) {
      return '';
    }
    
    const diffInMs = now.getTime() - messageTime.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInHours < 24) {
      // Same day - show time in India timezone
      return messageTime.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true,
        timeZone: INDIA_TIMEZONE
      });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      // This week - show day name
      return messageTime.toLocaleDateString('en-IN', { 
        weekday: 'long',
        timeZone: INDIA_TIMEZONE
      });
    } else {
      // Older - show date
      return messageTime.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: INDIA_TIMEZONE
      });
    }
  } catch (error) {
    console.warn('Error formatting message time:', error);
    return '';
  }
};

export const isToday = (date) => {
  if (!date) return false;
  const today = getIndiaTime();
  const compareDate = getIndiaTime(new Date(date));
  return today.toDateString() === compareDate.toDateString();
};

export const isYesterday = (date) => {
  if (!date) return false;
  const yesterday = getIndiaTime();
  yesterday.setDate(yesterday.getDate() - 1);
  const compareDate = getIndiaTime(new Date(date));
  return yesterday.toDateString() === compareDate.toDateString();
};

export const getCurrentIndiaTime = () => {
  return getIndiaTime();
};