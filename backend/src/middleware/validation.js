const { body, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User registration validation
const validateRegistration = [
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phone_number')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number with country code'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  handleValidationErrors
];

// User login validation
const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Message validation
const validateMessage = [
  body('receiver_id')
    .notEmpty()
    .withMessage('Receiver ID is required')
    .isUUID()
    .withMessage('Invalid receiver ID format'),
  
  body('content')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Message content cannot exceed 5000 characters'),
  
  body('reply_to_message_id')
    .optional()
    .isUUID()
    .withMessage('Invalid reply message ID format'),
  
  // Ensure either content or file is provided
  (req, res, next) => {
    if (!req.body.content && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Either message content or file is required'
      });
    }
    next();
  },
  
  handleValidationErrors
];

// Contact validation
const validateContact = [
  body('contact_id')
    .notEmpty()
    .withMessage('Contact ID is required')
    .isUUID()
    .withMessage('Invalid contact ID format'),
  
  body('nickname')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Nickname cannot exceed 100 characters'),
  
  handleValidationErrors
];

// AI message validation
const validateAIMessage = [
  body('prompt')
    .trim()
    .notEmpty()
    .withMessage('Prompt is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Prompt must be between 1 and 2000 characters'),
  
  handleValidationErrors
];

// Profile update validation
const validateProfileUpdate = [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  body('phone_number')
    .optional()
    .trim()
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number with country code'),
  
  handleValidationErrors
];

// Settings validation
const validateSettings = [
  body('dark_mode')
    .optional()
    .isBoolean()
    .withMessage('Dark mode must be a boolean value'),
  
  body('notifications_enabled')
    .optional()
    .isBoolean()
    .withMessage('Notifications enabled must be a boolean value'),
  
  body('message_preview')
    .optional()
    .isBoolean()
    .withMessage('Message preview must be a boolean value'),
  
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateMessage,
  validateContact,
  validateAIMessage,
  validateProfileUpdate,
  validateSettings,
  handleValidationErrors
};