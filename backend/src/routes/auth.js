const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { uploadProfilePhoto, handleUploadError } = require('../middleware/upload');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');
const { authenticateToken } = require('../middleware/auth');

// Auth routes (with rate limiting)
router.post('/register', 
  authLimiter,
  uploadProfilePhoto,
  handleUploadError,
  validateRegistration,
  authController.register
);

router.post('/login',
  authLimiter,
  validateLogin,
  authController.login
);

router.post('/logout',
  authenticateToken,
  authController.logout
);

router.post('/refresh-token',
  authenticateToken,
  authController.refreshToken
);

router.get('/verify-token',
  authenticateToken,
  authController.verifyToken
);

router.put('/change-password',
  authenticateToken,
  authLimiter,
  authController.changePassword
);

module.exports = router;