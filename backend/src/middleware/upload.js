const multer = require('multer');
const storageService = require('../services/storageService');

// Use memory storage for S3 uploads
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Create multer instances
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 1
  },
  fileFilter: fileFilter
});

// Profile photo upload middleware
const uploadProfilePhoto = (req, res, next) => {
  upload.single('profile_photo')(req, res, async (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }

    if (!req.file) {
      return next();
    }

    try {
      // Upload to S3
      const uploadResult = await storageService.uploadProfilePhoto(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        req.user.id
      );

      // Attach upload result to request
      req.uploadResult = uploadResult;
      next();
    } catch (error) {
      console.error('Profile photo upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload profile photo'
      });
    }
  });
};

// Message file upload middleware
const uploadMessageFile = (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }

    if (!req.file) {
      return next();
    }

    try {
      // Upload to S3
      const uploadResult = await storageService.uploadMessageFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        req.user.id
      );

      // Attach upload result to request
      req.uploadResult = uploadResult;
      next();
    } catch (error) {
      console.error('Message file upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload file'
      });
    }
  });
};

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only one file allowed'
      });
    }
  }
  
  if (err.message.includes('File type') && err.message.includes('not allowed')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next(err);
};

module.exports = {
  uploadProfilePhoto,
  uploadMessageFile,
  handleUploadError
};