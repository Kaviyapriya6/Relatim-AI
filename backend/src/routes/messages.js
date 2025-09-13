const express = require('express');
const router = express.Router();

const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');
const { uploadMessageFile, handleUploadError } = require('../middleware/upload');
const { validateMessage } = require('../middleware/validation');
const { messageLimiter, apiLimiter } = require('../middleware/rateLimiter');

// Apply authentication to all routes
router.use(authenticateToken);

// Get messages for a conversation
router.get('/conversation/:contactId',
  apiLimiter,
  messageController.getMessages
);

// Send a new message
router.post('/',
  messageLimiter,
  uploadMessageFile,
  handleUploadError,
  validateMessage,
  messageController.sendMessage
);

// Mark messages as read
router.put('/mark-read',
  apiLimiter,
  messageController.markAsRead
);

// Delete a message
router.delete('/:messageId',
  apiLimiter,
  messageController.deleteMessage
);

// Search messages
router.get('/search',
  apiLimiter,
  messageController.searchMessages
);

// Get recent chats
router.get('/chats',
  apiLimiter,
  messageController.getRecentChats
);

module.exports = router;