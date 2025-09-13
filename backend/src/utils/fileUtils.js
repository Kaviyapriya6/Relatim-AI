const path = require('path');

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

const isImageFile = (filename) => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  return imageExtensions.includes(getFileExtension(filename));
};

const isVideoFile = (filename) => {
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];
  return videoExtensions.includes(getFileExtension(filename));
};

const isDocumentFile = (filename) => {
  const docExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'];
  return docExtensions.includes(getFileExtension(filename));
};

const getFileType = (filename) => {
  if (isImageFile(filename)) return 'image';
  if (isVideoFile(filename)) return 'video';
  if (isDocumentFile(filename)) return 'document';
  return 'other';
};

const sanitizeFilename = (filename) => {
  // Remove or replace unsafe characters
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
};

const generateUniqueFilename = (originalFilename) => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const extension = getFileExtension(originalFilename);
  const basename = path.basename(originalFilename, extension);
  const sanitizedBasename = sanitizeFilename(basename);
  
  return `${sanitizedBasename}_${timestamp}_${random}${extension}`;
};

const validateFileType = (filename, allowedTypes = []) => {
  const fileType = getFileType(filename);
  const extension = getFileExtension(filename);
  
  if (allowedTypes.length === 0) {
    // Default allowed types
    allowedTypes = ['image', 'document'];
  }
  
  return allowedTypes.includes(fileType);
};

const getFileUrl = (filename, baseUrl = '') => {
  if (!filename) return null;
  
  // If filename is already a full URL, return as is
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  
  // Construct URL
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const cleanFilename = filename.replace(/^\//, '');
  
  return `${cleanBaseUrl}/${cleanFilename}`;
};

module.exports = {
  formatFileSize,
  getFileExtension,
  isImageFile,
  isVideoFile,
  isDocumentFile,
  getFileType,
  sanitizeFilename,
  generateUniqueFilename,
  validateFileType,
  getFileUrl
};