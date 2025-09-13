import React from 'react';
import { motion } from 'framer-motion';

// Search Input Component
export const SearchInput = ({ 
  value, 
  onChange, 
  placeholder = 'Search...', 
  onClear,
  className = '',
  ...props 
}) => {
  const inputRef = React.useRef(null);

  const handleClear = () => {
    onChange?.({ target: { value: '' } });
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
      </div>
      
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="
          w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 
          rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          bg-white dark:bg-gray-700 text-gray-900 dark:text-white
          placeholder-gray-500 dark:placeholder-gray-400
          transition-colors
        "
        {...props}
      />
      
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <svg className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
};

// Empty State Component
export const EmptyState = ({ 
  icon, 
  title, 
  description, 
  action,
  className = '',
  ...props 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        flex flex-col items-center justify-center p-8 text-center
        ${className}
      `}
      {...props}
    >
      {icon && (
        <div className="mb-4 text-6xl opacity-50">
          {icon}
        </div>
      )}
      
      {title && (
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
      )}
      
      {description && (
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className="
            px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white 
            rounded-lg transition-colors focus:outline-none focus:ring-2 
            focus:ring-blue-500 focus:ring-offset-2
          "
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
};

// Status Indicator Component
export const StatusIndicator = ({ 
  status = 'offline', 
  size = 'medium',
  showText = false,
  className = '',
  ...props 
}) => {
  const statuses = {
    online: { color: 'bg-blue-400', text: 'Online' },
    away: { color: 'bg-yellow-400', text: 'Away' },
    busy: { color: 'bg-red-400', text: 'Busy' },
    offline: { color: 'bg-gray-400', text: 'Offline' },
  };

  const sizes = {
    small: 'w-2 h-2',
    medium: 'w-3 h-3',
    large: 'w-4 h-4',
  };

  const currentStatus = statuses[status] || statuses.offline;

  return (
    <div className={`flex items-center space-x-2 ${className}`} {...props}>
      <span
        className={`
          ${sizes[size]} ${currentStatus.color} rounded-full
          border-2 border-white dark:border-gray-800
        `}
      />
      {showText && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {currentStatus.text}
        </span>
      )}
    </div>
  );
};

// Typing Indicator Component
export const TypingIndicator = ({ 
  users = ['Someone'], 
  className = '',
  ...props 
}) => {
  const formatUsers = () => {
    if (users.length === 1) {
      return `${users[0]} is typing`;
    } else if (users.length === 2) {
      return `${users[0]} and ${users[1]} are typing`;
    } else {
      return `${users[0]} and ${users.length - 1} others are typing`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 p-2
        ${className}
      `}
      {...props}
    >
      <div className="flex space-x-1">
        <motion.div
          className="w-2 h-2 bg-gray-400 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 bg-gray-400 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="w-2 h-2 bg-gray-400 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
        />
      </div>
      <span>{formatUsers()}...</span>
    </motion.div>
  );
};

// Connection Status Component
export const ConnectionStatus = ({ 
  isConnected = true, 
  isReconnecting = false,
  className = '',
  ...props 
}) => {
  if (isConnected && !isReconnecting) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        bg-yellow-100 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800
        px-4 py-2 text-center text-sm text-yellow-800 dark:text-yellow-200
        ${className}
      `}
      {...props}
    >
      {isReconnecting ? (
        <div className="flex items-center justify-center space-x-2">
          <motion.div
            className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <span>Reconnecting...</span>
        </div>
      ) : (
        <span>Connection lost. Attempting to reconnect...</span>
      )}
    </motion.div>
  );
};

// Notification Component
export const Notification = ({ 
  type = 'info', 
  title, 
  message, 
  onClose,
  autoClose = 5000,
  className = '',
  ...props 
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  const types = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: '📘',
    },
    success: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: '✅',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-200',
      icon: '⚠️',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: '❌',
    },
  };

  const currentType = types[type] || types.info;

  React.useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, autoClose);

      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ 
        opacity: isVisible ? 1 : 0, 
        x: isVisible ? 0 : 300 
      }}
      transition={{ duration: 0.3 }}
      className={`
        max-w-sm w-full ${currentType.bg} ${currentType.border} border rounded-lg shadow-lg p-4
        ${className}
      `}
      {...props}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <span className="text-xl">{currentType.icon}</span>
        </div>
        
        <div className="ml-3 w-0 flex-1">
          {title && (
            <p className={`text-sm font-medium ${currentType.text}`}>
              {title}
            </p>
          )}
          {message && (
            <p className={`text-sm ${title ? 'mt-1' : ''} ${currentType.text}`}>
              {message}
            </p>
          )}
        </div>
        
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={handleClose}
            className={`
              inline-flex ${currentType.text} hover:opacity-75 focus:outline-none
            `}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Notification Container Component
export const NotificationContainer = ({ notifications = [], onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          {...notification}
          onClose={() => onClose(notification.id)}
        />
      ))}
    </div>
  );
};

export { SearchInput as default };