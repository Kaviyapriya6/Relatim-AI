const rateLimit = require('express-rate-limit');

// General API rate limiting
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for development
      return process.env.NODE_ENV === 'development';
    }
  });
};

// Auth endpoints rate limiting
const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests per window
  'Too many authentication attempts, please try again later'
);

// General API rate limiting
const apiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many API requests, please try again later'
);

// Message sending rate limiting
const messageLimiter = createRateLimit(
  60 * 1000, // 1 minute
  30, // 30 messages per minute
  'Too many messages sent, please slow down'
);

// File upload rate limiting
const uploadLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // 10 uploads per window
  'Too many file uploads, please try again later'
);

// AI chat rate limiting
const aiChatLimiter = createRateLimit(
  60 * 1000, // 1 minute
  10, // 10 AI messages per minute
  'Too many AI requests, please wait before sending another message'
);

module.exports = {
  authLimiter,
  apiLimiter,
  messageLimiter,
  uploadLimiter,
  aiChatLimiter
};