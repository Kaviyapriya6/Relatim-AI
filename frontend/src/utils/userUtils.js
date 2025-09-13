/**
 * Utility functions for user object normalization and manipulation
 */

/**
 * Creates a display name from user object
 * @param {Object} user - User object
 * @returns {string} - Display name
 */
export const createDisplayName = (user) => {
  if (!user) return 'User';
  
  // If there's already a name field, use it
  if (user.name) return user.name;
  
  // Combine first and last name
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`.trim();
  }
  
  if (firstName) return firstName;
  if (lastName) return lastName;
  
  // Fallback to email local part
  if (user.email) {
    const emailParts = user.email.split('@');
    if (emailParts[0]) return emailParts[0];
  }
  
  return 'User';
};

/**
 * Normalizes user object by adding computed fields for backward compatibility
 * @param {Object} user - User object from API
 * @returns {Object} - Normalized user object
 */
export const normalizeUserObject = (user) => {
  if (!user) return null;
  
  const normalized = {
    ...user,
    // Add display name for backward compatibility
    name: createDisplayName(user),
    // Ensure consistent boolean fields
    isOnline: user.is_online || user.isOnline || false,
    // Normalize date fields
    lastSeen: user.last_seen || user.lastSeen || null,
    createdAt: user.created_at || user.createdAt || null,
    updatedAt: user.updated_at || user.updatedAt || null
  };
  
  // Normalize profile photo field names and ensure proper URL
  const profilePhotoUrl = getProfilePhotoUrl(user);
  normalized.profilePhoto = profilePhotoUrl;
  normalized.profile_photo = profilePhotoUrl;
  
  return normalized;
};

/**
 * Normalizes contact object similar to user object
 * @param {Object} contact - Contact object from API
 * @returns {Object} - Normalized contact object
 */
export const normalizeContactObject = (contact) => {
  if (!contact) return null;
  
  const normalized = {
    ...contact,
    // Create display name from available fields
    name: contact.nickname || 
          contact.full_name || 
          createDisplayName(contact) ||
          (contact.first_name && contact.last_name ? `${contact.first_name} ${contact.last_name}` : null) ||
          contact.email ||
          'Unknown Contact',
    // Normalize status fields
    isOnline: contact.is_online || contact.isOnline || false,
    lastSeen: contact.last_seen || contact.lastSeen || null,
    // Normalize other fields
    createdAt: contact.created_at || contact.createdAt || null,
    updatedAt: contact.updated_at || contact.updatedAt || null
  };
  
  // Normalize profile photo
  const profilePhotoUrl = getProfilePhotoUrl(contact);
  normalized.profilePhoto = profilePhotoUrl;
  normalized.profile_photo = profilePhotoUrl;
  
  return normalized;
};

/**
 * Gets the profile photo URL with proper fallback
 * @param {Object} user - User object
 * @param {string} baseUrl - Base URL for API
 * @returns {string|null} - Profile photo URL or null
 */
export const getProfilePhotoUrl = (user, baseUrl = '/api') => {
  if (!user) return null;
  
  const photoPath = user.profile_photo || user.profilePhoto;
  if (!photoPath) return null;
  
  // If it's already a full URL, return as is
  if (photoPath.startsWith('http')) return photoPath;
  
  // If it starts with /uploads, prepend the base URL
  if (photoPath.startsWith('/uploads')) {
    return `${baseUrl}${photoPath}`;
  }
  
  // If it's a relative path starting with uploads/, add proper prefix
  if (photoPath.startsWith('uploads/')) {
    return `${baseUrl}/${photoPath}`;
  }
  
  // For any other case, assume it's a filename in profiles directory
  return `${baseUrl}/uploads/profiles/${photoPath}`;
};

/**
 * Updates user in localStorage with normalized data
 * @param {Object} user - User object to store
 */
export const updateUserInStorage = (user) => {
  if (!user) {
    localStorage.removeItem('user');
    return;
  }
  
  const normalizedUser = normalizeUserObject(user);
  localStorage.setItem('user', JSON.stringify(normalizedUser));
};