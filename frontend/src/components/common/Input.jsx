import React, { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

// Input Component
export const Input = forwardRef(({ 
  label,
  type = 'text',
  placeholder,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = true,
  disabled = false,
  required = false,
  className = '',
  labelClassName = '',
  inputClassName = '',
  value,
  onChange,
  onFocus,
  onBlur,
  ...props 
}, ref) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = (e) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

  const baseInputClasses = `
    w-full px-3 py-2 border rounded-lg transition-all duration-200
    placeholder-gray-400 dark:placeholder-gray-500
    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
    disabled:opacity-50 disabled:cursor-not-allowed
    ${leftIcon ? 'pl-10' : ''}
    ${rightIcon || type === 'password' ? 'pr-10' : ''}
    ${error 
      ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20' 
      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
    }
    ${focused && !error ? 'ring-2 ring-green-500 border-transparent' : ''}
    text-gray-900 dark:text-white
    ${inputClassName}
  `;

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <motion.label
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            block text-sm font-medium mb-2
            ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}
            ${labelClassName}
          `}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </motion.label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className={`${error ? 'text-red-400' : 'text-gray-400'}`}>
              {leftIcon}
            </span>
          </div>
        )}
        
        <input
          ref={ref}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          className={baseInputClasses}
          {...props}
        />
        
        {(rightIcon || type === 'password') && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {type === 'password' ? (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            ) : (
              <span className={`${error ? 'text-red-400' : 'text-gray-400'}`}>
                {rightIcon}
              </span>
            )}
          </div>
        )}
      </div>
      
      <AnimatePresence>
        {(error || helperText) && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mt-2 text-sm ${
              error 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {error || helperText}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

Input.displayName = 'Input';

// Textarea Component
export const Textarea = forwardRef(({ 
  label,
  placeholder,
  error,
  helperText,
  fullWidth = true,
  disabled = false,
  required = false,
  rows = 4,
  maxLength,
  showCharCount = false,
  className = '',
  labelClassName = '',
  textareaClassName = '',
  value,
  onChange,
  onFocus,
  onBlur,
  ...props 
}, ref) => {
  const [focused, setFocused] = useState(false);
  const [charCount, setCharCount] = useState(value?.length || 0);

  const handleFocus = (e) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  const handleChange = (e) => {
    setCharCount(e.target.value.length);
    onChange?.(e);
  };

  const baseTextareaClasses = `
    w-full px-3 py-2 border rounded-lg transition-all duration-200 resize-none
    placeholder-gray-400 dark:placeholder-gray-500
    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
    disabled:opacity-50 disabled:cursor-not-allowed
    ${error 
      ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20' 
      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
    }
    ${focused && !error ? 'ring-2 ring-green-500 border-transparent' : ''}
    text-gray-900 dark:text-white
    ${textareaClassName}
  `;

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <motion.label
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            block text-sm font-medium mb-2
            ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}
            ${labelClassName}
          `}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </motion.label>
      )}
      
      <textarea
        ref={ref}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        required={required}
        rows={rows}
        maxLength={maxLength}
        className={baseTextareaClasses}
        {...props}
      />
      
      <div className="flex justify-between items-center mt-2">
        <AnimatePresence>
          {(error || helperText) && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`text-sm ${
                error 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {error || helperText}
            </motion.p>
          )}
        </AnimatePresence>
        
        {showCharCount && maxLength && (
          <span className={`text-sm ${
            charCount > maxLength * 0.9 
              ? 'text-red-500' 
              : 'text-gray-400 dark:text-gray-500'
          }`}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
});

Textarea.displayName = 'Textarea';

// Select Component
export const Select = forwardRef(({ 
  label,
  options = [],
  placeholder = 'Select an option',
  error,
  helperText,
  fullWidth = true,
  disabled = false,
  required = false,
  className = '',
  labelClassName = '',
  selectClassName = '',
  value,
  onChange,
  ...props 
}, ref) => {
  const baseSelectClasses = `
    w-full px-3 py-2 border rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
    disabled:opacity-50 disabled:cursor-not-allowed
    ${error 
      ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20' 
      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
    }
    text-gray-900 dark:text-white
    ${selectClassName}
  `;

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <motion.label
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            block text-sm font-medium mb-2
            ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}
            ${labelClassName}
          `}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </motion.label>
      )}
      
      <select
        ref={ref}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={baseSelectClasses}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      <AnimatePresence>
        {(error || helperText) && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mt-2 text-sm ${
              error 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {error || helperText}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

Select.displayName = 'Select';

// Checkbox Component
export const Checkbox = ({ 
  label,
  checked = false,
  onChange,
  disabled = false,
  className = '',
  ...props 
}) => {
  return (
    <motion.label
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      className={`
        inline-flex items-center cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="
          w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded
          focus:ring-green-500 focus:ring-2
          dark:bg-gray-700 dark:border-gray-600
        "
        {...props}
      />
      {label && (
        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          {label}
        </span>
      )}
    </motion.label>
  );
};

// Radio Component
export const Radio = ({ 
  label,
  checked = false,
  onChange,
  disabled = false,
  name,
  value,
  className = '',
  ...props 
}) => {
  return (
    <motion.label
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      className={`
        inline-flex items-center cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        name={name}
        value={value}
        className="
          w-4 h-4 text-green-600 bg-gray-100 border-gray-300
          focus:ring-green-500 focus:ring-2
          dark:bg-gray-700 dark:border-gray-600
        "
        {...props}
      />
      {label && (
        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          {label}
        </span>
      )}
    </motion.label>
  );
};

export { Input as default };