import React from 'react';
import { motion } from 'framer-motion';

// Avatar Component
export const Avatar = ({ 
  src, 
  alt, 
  size = 'medium', 
  fallback, 
  online = false,
  className = '',
  onClick,
  ...props 
}) => {
  const sizes = {
    small: 'w-8 h-8 text-xs',
    medium: 'w-10 h-10 text-sm',
    large: 'w-12 h-12 text-base',
    xlarge: 'w-16 h-16 text-lg',
    xxlarge: 'w-20 h-20 text-xl',
  };

  const onlineSizes = {
    small: 'w-2 h-2',
    medium: 'w-2.5 h-2.5',
    large: 'w-3 h-3',
    xlarge: 'w-4 h-4',
    xxlarge: 'w-5 h-5',
  };

  // Generate initials from alt text or fallback
  const getInitials = (text) => {
    if (!text) return '?';
    return text
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = getInitials(alt || fallback || '');

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      className={`
        relative inline-flex items-center justify-center rounded-full overflow-hidden
        ${sizes[size]} ${onClick ? 'cursor-pointer' : ''} ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt || 'Avatar'}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      
      {/* Fallback */}
      <div
        className={`
          w-full h-full items-center justify-center font-medium
          bg-gradient-to-br from-blue-400 to-blue-600 text-white
          ${src ? 'hidden' : 'flex'}
        `}
      >
        {initials}
      </div>

      {/* Online indicator */}
      {online && (
        <span
          className={`
            absolute bottom-0 right-0 ${onlineSizes[size]}
            bg-blue-400 border-2 border-white dark:border-gray-800 rounded-full
          `}
        />
      )}
    </motion.div>
  );
};

// Badge Component
export const Badge = ({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  className = '',
  ...props 
}) => {
  const variants = {
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    success: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  };

  const sizes = {
    small: 'text-xs px-2 py-0.5',
    medium: 'text-sm px-2.5 py-0.5',
    large: 'text-base px-3 py-1',
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
};

// Tooltip Component
export const Tooltip = ({ 
  children, 
  content, 
  position = 'top',
  delay = 500,
  className = '',
  ...props 
}) => {
  const [visible, setVisible] = React.useState(false);
  const timeoutRef = React.useRef();

  const positions = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  };

  const arrows = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900',
  };

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  React.useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
      
      {visible && content && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`
            absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded whitespace-nowrap
            ${positions[position]}
          `}
        >
          {content}
          <div
            className={`
              absolute w-0 h-0 border-4 ${arrows[position]}
            `}
          />
        </motion.div>
      )}
    </div>
  );
};

// Divider Component
export const Divider = ({ 
  orientation = 'horizontal', 
  className = '',
  children,
  ...props 
}) => {
  if (orientation === 'vertical') {
    return (
      <div
        className={`
          w-px bg-gray-200 dark:bg-gray-700 ${className}
        `}
        {...props}
      />
    );
  }

  if (children) {
    return (
      <div className={`relative ${className}`} {...props}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
            {children}
          </span>
        </div>
      </div>
    );
  }

  return (
    <hr
      className={`
        border-gray-200 dark:border-gray-700 ${className}
      `}
      {...props}
    />
  );
};

// Card Component
export const Card = ({ 
  children, 
  padding = true,
  shadow = true,
  hover = false,
  className = '',
  ...props 
}) => {
  return (
    <motion.div
      whileHover={hover ? { y: -2 } : {}}
      className={`
        bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
        ${padding ? 'p-6' : ''}
        ${shadow ? 'shadow-sm hover:shadow-md' : ''}
        ${hover ? 'transition-all duration-200' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Alert Component
export const Alert = ({ 
  children, 
  variant = 'info', 
  onClose,
  className = '',
  ...props 
}) => {
  const variants = {
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
    success: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
    danger: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
  };

  const icons = {
    info: '📘',
    success: '✅',
    warning: '⚠️',
    danger: '❌',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        p-4 border rounded-lg flex items-start space-x-3
        ${variants[variant]} ${className}
      `}
      {...props}
    >
      <span className="flex-shrink-0 text-lg">
        {icons[variant]}
      </span>
      
      <div className="flex-1">
        {children}
      </div>
      
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-3 text-current opacity-70 hover:opacity-100 transition-opacity"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </motion.div>
  );
};

// Progress Component
export const Progress = ({ 
  value = 0, 
  max = 100, 
  size = 'medium',
  variant = 'primary',
  showLabel = false,
  className = '',
  ...props 
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizes = {
    small: 'h-1',
    medium: 'h-2',
    large: 'h-3',
  };

  const variants = {
    primary: 'bg-blue-600',
    secondary: 'bg-gray-600',
    success: 'bg-blue-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600',
  };

  return (
    <div className={className} {...props}>
      {showLabel && (
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      
      <div className={`
        w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden
        ${sizes[size]}
      `}>
        <motion.div
          className={`h-full rounded-full ${variants[variant]}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

export { Avatar as default };