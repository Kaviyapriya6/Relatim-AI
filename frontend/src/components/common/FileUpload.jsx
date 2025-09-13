import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';

const FileUpload = ({ 
  onFileSelect,
  onUpload,
  accept = "*/*",
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 5,
  showPreview = true,
  allowedTypes = [],
  className = '',
  children,
  disabled = false,
  dragActiveClassName = 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
  ...props 
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState([]);
  
  const fileInputRef = useRef();

  // Validate file
  const validateFile = useCallback((file) => {
    const errors = [];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File "${file.name}" is too large. Maximum size is ${formatFileSize(maxSize)}.`);
    }

    // Check file type
    if (allowedTypes.length > 0) {
      const fileType = file.type || '';
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      
      const isTypeAllowed = allowedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExtension === type.slice(1);
        }
        return fileType.startsWith(type) || fileType === type;
      });

      if (!isTypeAllowed) {
        errors.push(`File "${file.name}" type is not allowed. Allowed types: ${allowedTypes.join(', ')}.`);
      }
    }

    return errors;
  }, [maxSize, allowedTypes]);

  // Process files
  const processFiles = useCallback((fileList) => {
    const newFiles = Array.from(fileList);
    const allErrors = [];

    // Check max files limit
    if (!multiple && newFiles.length > 1) {
      allErrors.push('Only one file is allowed.');
      setErrors(allErrors);
      return;
    }

    if (files.length + newFiles.length > maxFiles) {
      allErrors.push(`Maximum ${maxFiles} files allowed.`);
      setErrors(allErrors);
      return;
    }

    // Validate each file
    const validFiles = [];
    newFiles.forEach(file => {
      const fileErrors = validateFile(file);
      if (fileErrors.length === 0) {
        validFiles.push({
          file,
          id: Date.now() + Math.random(),
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
          progress: 0,
          uploaded: false,
          error: null,
        });
      } else {
        allErrors.push(...fileErrors);
      }
    });

    setErrors(allErrors);
    
    if (validFiles.length > 0) {
      const updatedFiles = multiple ? [...files, ...validFiles] : validFiles;
      setFiles(updatedFiles);
      onFileSelect?.(validFiles.map(f => f.file));
    }
  }, [files, multiple, maxFiles, validateFile, onFileSelect]);

  // Drag handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragActive(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragActive(false);
    }
  }, [disabled]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    setIsDragActive(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [disabled, processFiles]);

  // File input change
  const handleFileInputChange = useCallback((e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
  }, [processFiles]);

  // Upload files
  const handleUpload = async () => {
    if (!onUpload || uploading) return;

    setUploading(true);
    const filesToUpload = files.filter(f => !f.uploaded);

    try {
      for (const fileData of filesToUpload) {
        const { file, id } = fileData;
        
        // Simulate upload progress
        const uploadFile = async () => {
          return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const progress = Math.round((e.loaded / e.total) * 100);
                
                // Update file progress
                setFiles(prev => prev.map(f => 
                  f.id === id ? { ...f, progress } : f
                ));
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status === 200) {
                setFiles(prev => prev.map(f => 
                  f.id === id ? { ...f, uploaded: true, progress: 100 } : f
                ));
                resolve(xhr.response);
              } else {
                reject(new Error(`Upload failed: ${xhr.statusText}`));
              }
            });

            xhr.addEventListener('error', () => {
              reject(new Error('Upload failed'));
            });

            onUpload(formData, xhr);
          });
        };

        await uploadFile();
      }
    } catch (error) {
      console.error('Upload error:', error);
      setErrors(prev => [...prev, error.message]);
    } finally {
      setUploading(false);
    }
  };

  // Remove file
  const removeFile = useCallback((fileId) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon
  const getFileIcon = (file) => {
    const type = file.type || '';
    
    if (type.startsWith('image/')) {
      return '🖼️';
    } else if (type.startsWith('video/')) {
      return '🎥';
    } else if (type.startsWith('audio/')) {
      return '🎵';
    } else if (type.includes('pdf')) {
      return '📄';
    } else if (type.includes('word') || type.includes('document')) {
      return '📝';
    } else if (type.includes('excel') || type.includes('spreadsheet')) {
      return '📊';
    } else if (type.includes('zip') || type.includes('rar')) {
      return '📦';
    }
    return '📎';
  };

  return (
    <div className={`file-upload ${className}`} {...props}>
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 cursor-pointer
          ${isDragActive 
            ? dragActiveClassName 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />

        {children || (
          <div className="text-center">
            <CloudArrowUpIcon className={`
              mx-auto h-12 w-12 mb-4
              ${isDragActive ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}
            `} />
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              {isDragActive 
                ? 'Drop files here...' 
                : 'Click to upload or drag and drop'
              }
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {allowedTypes.length > 0 && `Allowed: ${allowedTypes.join(', ')} • `}
              Max size: {formatFileSize(maxSize)}
              {multiple && ` • Max ${maxFiles} files`}
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && showPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4"
          >
            <div className="space-y-2">
              {files.map((fileData) => (
                <motion.div
                  key={fileData.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  {/* Preview */}
                  <div className="flex-shrink-0 w-10 h-10 mr-3">
                    {fileData.preview ? (
                      <img
                        src={fileData.preview}
                        alt={fileData.file.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded text-lg">
                        {getFileIcon(fileData.file)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {fileData.file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(fileData.file.size)}
                    </p>
                    
                    {/* Progress Bar */}
                    {fileData.progress > 0 && fileData.progress < 100 && (
                      <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                        <motion.div
                          className="bg-blue-600 h-1 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${fileData.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0 ml-3">
                    {fileData.uploaded ? (
                      <span className="text-blue-500">✓</span>
                    ) : fileData.progress > 0 ? (
                      <span className="text-xs text-gray-500">{fileData.progress}%</span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(fileData.id);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Upload Button */}
            {onUpload && files.some(f => !f.uploaded) && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleUpload}
                disabled={uploading}
                className="
                  mt-3 w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                "
              >
                {uploading ? 'Uploading...' : `Upload ${files.filter(f => !f.uploaded).length} file(s)`}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Errors */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            {errors.map((error, index) => (
              <p key={index} className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            ))}
            <button
              onClick={() => setErrors([])}
              className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;