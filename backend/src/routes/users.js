const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { uploadProfilePhoto, handleUploadError } = require('../middleware/upload');
const { validateProfileUpdate, validateSettings } = require('../middleware/validation');
const { apiLimiter } = require('../middleware/rateLimiter');

// Apply authentication and rate limiting to all routes
router.use(authenticateToken);
router.use(apiLimiter);

// User profile routes
router.get('/profile/:id?', userController.getProfile);

router.put('/profile',
  uploadProfilePhoto,
  handleUploadError,
  validateProfileUpdate,
  userController.updateProfile
);

// Dedicated profile photo upload endpoint
router.put('/profile-photo',
  uploadProfilePhoto,
  handleUploadError,
  userController.updateProfilePhoto
);

// Alternative POST route for profile photo upload (for frontend compatibility)
router.post('/profile-photo',
  uploadProfilePhoto,
  handleUploadError,
  userController.updateProfilePhoto
);

// User search and discovery
router.get('/search', userController.searchUsers);

// User statistics
router.get('/stats', userController.getUserStats);

// User settings
router.put('/settings',
  validateSettings,
  userController.updateSettings
);

// Password change
router.put('/change-password',
  userController.updatePassword
);

// 2FA routes
router.post('/2fa/setup',
  userController.setup2FA
);

router.post('/2fa/verify',
  userController.verify2FA
);

router.post('/2fa/disable',
  userController.disable2FA
);

// Account management
router.delete('/messages/all',
  userController.deleteAllMessages
);

router.delete('/account',
  userController.deleteAccount
);

module.exports = router;