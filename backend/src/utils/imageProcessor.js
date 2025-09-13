const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

const optimizeImage = async (inputPath, outputPath, options = {}) => {
  try {
    const {
      width = 800,
      height = 800,
      quality = 80,
      format = 'jpeg'
    } = options;

    await sharp(inputPath)
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality })
      .toFile(outputPath);

    // Delete original file if different from output
    if (inputPath !== outputPath) {
      await fs.unlink(inputPath);
    }

    return outputPath;
  } catch (error) {
    console.error('Image optimization error:', error);
    throw new Error('Failed to optimize image');
  }
};

const generateThumbnail = async (inputPath, outputPath, size = 150) => {
  try {
    await sharp(inputPath)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 70 })
      .toFile(outputPath);

    return outputPath;
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    throw new Error('Failed to generate thumbnail');
  }
};

const getImageInfo = async (imagePath) => {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size
    };
  } catch (error) {
    console.error('Get image info error:', error);
    throw new Error('Failed to get image information');
  }
};

const validateImageFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('Invalid image type. Only JPEG, PNG, and GIF are allowed');
  }

  if (file.size > maxSize) {
    throw new Error('Image too large. Maximum size is 5MB');
  }

  return true;
};

module.exports = {
  optimizeImage,
  generateThumbnail,
  getImageInfo,
  validateImageFile
};