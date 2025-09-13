const AWS = require('aws-sdk');
const path = require('path');
const { generateUniqueFilename } = require('../utils/fileUtils');

class StorageService {
  constructor() {
    // Configure AWS SDK for Supabase Storage
    this.s3 = new AWS.S3({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      s3ForcePathStyle: true, // Required for Supabase Storage
      signatureVersion: 'v4'
    });

    this.bucketName = process.env.S3_BUCKET_NAME || 'relatim-ai-uploads';
    this.publicUrl = process.env.S3_PUBLIC_URL;
  }

  /**
   * Upload file to S3 storage
   * @param {Buffer} fileBuffer - File buffer from multer
   * @param {string} originalName - Original filename
   * @param {string} mimeType - File MIME type
   * @param {string} folder - Folder path (profiles, messages, documents)
   * @returns {Promise<Object>} Upload result with URL and key
   */
  async uploadFile(fileBuffer, originalName, mimeType, folder = 'documents') {
    try {
      // Generate unique filename
      const uniqueFilename = generateUniqueFilename(originalName);
      const key = `${folder}/${uniqueFilename}`;

      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
        ACL: 'public-read', // Make files publicly accessible
        Metadata: {
          'original-name': originalName,
          'upload-date': new Date().toISOString()
        }
      };

      const result = await this.s3.upload(uploadParams).promise();

      return {
        success: true,
        url: this.getPublicUrl(key),
        key: key,
        originalName: originalName,
        size: fileBuffer.length,
        mimeType: mimeType,
        etag: result.ETag
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Upload profile photo with image optimization
   * @param {Buffer} fileBuffer - Image buffer
   * @param {string} originalName - Original filename
   * @param {string} mimeType - Image MIME type
   * @param {string} userId - User ID for organization
   * @returns {Promise<Object>} Upload result
   */
  async uploadProfilePhoto(fileBuffer, originalName, mimeType, userId) {
    try {
      // For profile photos, we'll use a specific naming convention
      const extension = path.extname(originalName);
      const filename = `profile_${userId}_${Date.now()}${extension}`;
      const key = `profiles/${filename}`;

      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
        ACL: 'public-read',
        Metadata: {
          'user-id': userId.toString(),
          'original-name': originalName,
          'upload-date': new Date().toISOString(),
          'file-type': 'profile-photo'
        }
      };

      const result = await this.s3.upload(uploadParams).promise();

      return {
        success: true,
        url: this.getPublicUrl(key),
        key: key,
        originalName: originalName,
        size: fileBuffer.length,
        mimeType: mimeType,
        etag: result.ETag
      };
    } catch (error) {
      console.error('Profile photo upload error:', error);
      throw new Error(`Failed to upload profile photo: ${error.message}`);
    }
  }

  /**
   * Upload message file attachment
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} originalName - Original filename
   * @param {string} mimeType - File MIME type
   * @param {string} userId - User ID
   * @param {string} messageId - Message ID for organization
   * @returns {Promise<Object>} Upload result
   */
  async uploadMessageFile(fileBuffer, originalName, mimeType, userId, messageId = null) {
    try {
      const uniqueFilename = generateUniqueFilename(originalName);
      const key = `messages/${userId}/${uniqueFilename}`;

      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
        ACL: 'public-read',
        Metadata: {
          'user-id': userId.toString(),
          'message-id': messageId ? messageId.toString() : '',
          'original-name': originalName,
          'upload-date': new Date().toISOString(),
          'file-type': 'message-attachment'
        }
      };

      const result = await this.s3.upload(uploadParams).promise();

      return {
        success: true,
        url: this.getPublicUrl(key),
        key: key,
        originalName: originalName,
        size: fileBuffer.length,
        mimeType: mimeType,
        etag: result.ETag
      };
    } catch (error) {
      console.error('Message file upload error:', error);
      throw new Error(`Failed to upload message file: ${error.message}`);
    }
  }

  /**
   * Delete file from S3 storage
   * @param {string} key - S3 object key
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(key) {
    try {
      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: key
      }).promise();

      return true;
    } catch (error) {
      console.error('S3 delete error:', error);
      return false;
    }
  }

  /**
   * Get public URL for a file
   * @param {string} key - S3 object key
   * @returns {string} Public URL
   */
  getPublicUrl(key) {
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }
    // Fallback to S3 URL construction
    return `https://${this.bucketName}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
  }

  /**
   * Generate signed URL for private file access
   * @param {string} key - S3 object key
   * @param {number} expiresIn - URL expiration in seconds (default: 1 hour)
   * @returns {string} Signed URL
   */
  async getSignedUrl(key, expiresIn = 3600) {
    try {
      const signedUrl = await this.s3.getSignedUrlPromise('getObject', {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn
      });

      return signedUrl;
    } catch (error) {
      console.error('Signed URL generation error:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Check if file exists in S3
   * @param {string} key - S3 object key
   * @returns {Promise<boolean>} Existence status
   */
  async fileExists(key) {
    try {
      await this.s3.headObject({
        Bucket: this.bucketName,
        Key: key
      }).promise();

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file metadata
   * @param {string} key - S3 object key
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(key) {
    try {
      const result = await this.s3.headObject({
        Bucket: this.bucketName,
        Key: key
      }).promise();

      return {
        size: result.ContentLength,
        lastModified: result.LastModified,
        contentType: result.ContentType,
        etag: result.ETag,
        metadata: result.Metadata
      };
    } catch (error) {
      console.error('Get metadata error:', error);
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  /**
   * List files in a folder
   * @param {string} prefix - Folder prefix
   * @param {number} maxKeys - Maximum number of keys to return
   * @returns {Promise<Array>} List of file objects
   */
  async listFiles(prefix = '', maxKeys = 1000) {
    try {
      const result = await this.s3.listObjectsV2({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys
      }).promise();

      return result.Contents.map(obj => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag,
        url: this.getPublicUrl(obj.Key)
      }));
    } catch (error) {
      console.error('List files error:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Initialize bucket (create if doesn't exist)
   * @returns {Promise<boolean>} Success status
   */
  async initializeBucket() {
    try {
      // Check if bucket exists
      await this.s3.headBucket({ Bucket: this.bucketName }).promise();
      console.log(`✅ S3 bucket '${this.bucketName}' is accessible`);
      return true;
    } catch (error) {
      if (error.statusCode === 404) {
        try {
          // Create bucket
          await this.s3.createBucket({
            Bucket: this.bucketName,
            CreateBucketConfiguration: {
              LocationConstraint: process.env.S3_REGION
            }
          }).promise();
          
          console.log(`✅ S3 bucket '${this.bucketName}' created successfully`);
          return true;
        } catch (createError) {
          console.error('Failed to create bucket:', createError);
          return false;
        }
      } else {
        console.error('Bucket access error:', error);
        return false;
      }
    }
  }

  /**
   * Test S3 connection and permissions
   * @returns {Promise<Object>} Test results
   */
  async testConnection() {
    try {
      // Test basic connectivity
      await this.s3.listBuckets().promise();
      
      // Test bucket access
      const bucketExists = await this.initializeBucket();
      
      // Test upload with a small test file
      const testKey = 'test/connection-test.txt';
      const testContent = Buffer.from('Connection test file');
      
      await this.s3.upload({
        Bucket: this.bucketName,
        Key: testKey,
        Body: testContent,
        ContentType: 'text/plain'
      }).promise();

      // Test delete
      await this.deleteFile(testKey);

      return {
        success: true,
        message: 'S3 connection test successful',
        bucket: this.bucketName,
        endpoint: process.env.S3_ENDPOINT
      };
    } catch (error) {
      return {
        success: false,
        message: `S3 connection test failed: ${error.message}`,
        error: error.code || error.name
      };
    }
  }
}

// Create singleton instance
const storageService = new StorageService();

module.exports = storageService;