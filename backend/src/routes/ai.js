const express = require('express');
const router = express.Router();

const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');
const { validateAIMessage } = require('../middleware/validation');
const { aiChatLimiter, apiLimiter } = require('../middleware/rateLimiter');

// Apply authentication to all routes
router.use(authenticateToken);

// Send message to AI
router.post('/message',
  aiChatLimiter,
  validateAIMessage,
  aiController.sendMessage
);

// Stream AI response (Server-Sent Events)
router.post('/stream',
  aiChatLimiter,
  validateAIMessage,
  aiController.streamMessage
);

// Get AI conversation history
router.get('/conversation',
  apiLimiter,
  aiController.getConversation
);

// Clear AI conversation
router.delete('/conversation',
  apiLimiter,
  aiController.clearConversation
);

// Get AI usage statistics
router.get('/stats',
  apiLimiter,
  aiController.getAIStats
);

// AI service health check
router.get('/health',
  aiController.healthCheck
);

module.exports = router;