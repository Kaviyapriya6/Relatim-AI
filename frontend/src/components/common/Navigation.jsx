import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

// Dropdown Menu Component
export const Dropdown = ({ 
  trigger, 
  children, 
  position = 'bottom-right',
  className = '',
  usePortal = false,
  ...props 
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [adjustedPosition, setAdjustedPosition] = React.useState(position);
  const [menuPosition, setMenuPosition] = React.useState({ top: 0, left: 0 });
  const dropdownRef = React.useRef(null);
  const menuRef = React.useRef(null);

  const positions = {
    'top-left': 'bottom-full right-0 mb-2',
    'top-right': 'bottom-full left-0 mb-2',
    'bottom-left': 'top-full right-0 mt-2',
    'bottom-right': 'top-full left-0 mt-2',
    'left': 'right-full top-0 mr-2',
    'right': 'left-full top-0 ml-2',
  };

  // Adjust position based on viewport boundaries
  const adjustPosition = React.useCallback(() => {
    if (!dropdownRef.current) return;

    const triggerRect = dropdownRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let newPosition = position;
    let top = 0;
    let left = 0;

    if (usePortal) {
      // Calculate absolute position for portal
      switch (position) {
        case 'bottom-left':
          top = triggerRect.bottom + 8;
          left = triggerRect.right - 200; // Assume menu width of 200px
          break;
        case 'bottom-right':
          top = triggerRect.bottom + 8;
          left = triggerRect.left;
          break;
        case 'top-left':
          top = triggerRect.top - 8;
          left = triggerRect.right - 200;
          break;
        case 'top-right':
          top = triggerRect.top - 8;
          left = triggerRect.left;
          break;
        default:
          top = triggerRect.bottom + 8;
          left = triggerRect.left;
      }

      // Ensure dropdown stays within viewport
      if (left + 200 > viewport.width) {
        left = viewport.width - 200 - 16;
      }
      if (left < 16) {
        left = 16;
      }
      if (top + 300 > viewport.height) {
        top = triggerRect.top - 8 - 300;
      }
      if (top < 16) {
        top = triggerRect.bottom + 8;
      }

      setMenuPosition({ top, left });
    } else {
      // Original relative positioning logic
      const menuRect = menuRef.current?.getBoundingClientRect();
      if (!menuRect) return;

      // Check if dropdown would overflow viewport
      const wouldOverflowRight = triggerRect.left + menuRect.width > viewport.width;
      const wouldOverflowLeft = triggerRect.right - menuRect.width < 0;
      const wouldOverflowBottom = triggerRect.bottom + menuRect.height > viewport.height;
      const wouldOverflowTop = triggerRect.top - menuRect.height < 0;

      // Adjust horizontal position
      if (position.includes('bottom') || position.includes('top')) {
        if (wouldOverflowRight && !wouldOverflowLeft) {
          newPosition = position.replace('left', 'right');
        } else if (wouldOverflowLeft && !wouldOverflowRight) {
          newPosition = position.replace('right', 'left');
        }
      }

      // Adjust vertical position
      if (position.includes('bottom') && wouldOverflowBottom && !wouldOverflowTop) {
        newPosition = newPosition.replace('bottom', 'top');
      } else if (position.includes('top') && wouldOverflowTop && !wouldOverflowBottom) {
        newPosition = newPosition.replace('top', 'bottom');
      }
    }

    setAdjustedPosition(newPosition);
  }, [position, usePortal]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleResize = () => {
      if (isOpen) {
        adjustPosition();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      window.addEventListener('resize', handleResize);
      // Adjust position when dropdown opens
      setTimeout(adjustPosition, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, adjustPosition]);

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef} style={{ zIndex: 'auto' }} {...props}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          usePortal ? createPortal(
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[9999] min-w-[200px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                maxHeight: '80vh',
                overflowY: 'auto'
              }}
            >
              {children}
            </motion.div>,
            document.body
          ) : (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className={`
                absolute z-[9999] min-w-max bg-white dark:bg-gray-800 rounded-lg shadow-lg 
                border border-gray-200 dark:border-gray-700 py-1
                ${positions[adjustedPosition]}
              `}
              style={{
                maxHeight: '80vh',
                overflowY: 'auto'
              }}
            >
              {children}
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
};

// Dropdown Item Component
export const DropdownItem = ({ 
  children, 
  onClick, 
  disabled = false,
  variant = 'default',
  className = '',
  ...props 
}) => {
  const variants = {
    default: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
    danger: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full px-4 py-2 text-left text-sm transition-colors
        ${disabled 
          ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' 
          : variants[variant]
        }
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

// Dropdown Divider Component
export const DropdownDivider = ({ className = '', ...props }) => {
  return (
    <hr
      className={`my-1 border-gray-200 dark:border-gray-700 ${className}`}
      {...props}
    />
  );
};

// Tab Components
export const Tabs = ({ 
  children, 
  defaultValue, 
  value, 
  onValueChange,
  className = '',
  ...props 
}) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue || '');

  const currentValue = value !== undefined ? value : activeTab;

  const handleTabChange = (newValue) => {
    if (value === undefined) {
      setActiveTab(newValue);
    }
    onValueChange?.(newValue);
  };

  const contextValue = {
    value: currentValue,
    onValueChange: handleTabChange,
  };

  return (
    <div className={`w-full ${className}`} {...props}>
      <TabsContext.Provider value={contextValue}>
        {children}
      </TabsContext.Provider>
    </div>
  );
};

const TabsContext = React.createContext();

export const TabsList = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`
        flex border-b border-gray-200 dark:border-gray-700 ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export const TabsTrigger = ({ 
  children, 
  value, 
  disabled = false,
  className = '',
  ...props 
}) => {
  const context = React.useContext(TabsContext);
  const isActive = context?.value === value;

  return (
    <button
      onClick={() => !disabled && context?.onValueChange(value)}
      disabled={disabled}
      className={`
        px-4 py-2 text-sm font-medium transition-colors relative
        ${isActive 
          ? 'text-green-600 dark:text-green-400' 
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }
        ${disabled 
          ? 'cursor-not-allowed opacity-50' 
          : 'cursor-pointer'
        }
        ${className}
      `}
      {...props}
    >
      {children}
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 dark:bg-green-400"
          transition={{ duration: 0.2 }}
        />
      )}
    </button>
  );
};

export const TabsContent = ({ 
  children, 
  value, 
  className = '',
  ...props 
}) => {
  const context = React.useContext(TabsContext);
  const isActive = context?.value === value;

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className={`mt-4 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Accordion Components
export const Accordion = ({ 
  children, 
  type = 'single', // 'single' or 'multiple'
  defaultValue,
  value,
  onValueChange,
  className = '',
  ...props 
}) => {
  const [openItems, setOpenItems] = React.useState(
    type === 'multiple' 
      ? (defaultValue || []) 
      : (defaultValue ? [defaultValue] : [])
  );

  const currentValue = value !== undefined ? value : openItems;

  const handleValueChange = (itemValue) => {
    let newValue;
    
    if (type === 'multiple') {
      newValue = currentValue.includes(itemValue)
        ? currentValue.filter(v => v !== itemValue)
        : [...currentValue, itemValue];
    } else {
      newValue = currentValue.includes(itemValue) ? [] : [itemValue];
    }

    if (value === undefined) {
      setOpenItems(newValue);
    }
    onValueChange?.(newValue);
  };

  const contextValue = {
    openItems: currentValue,
    onValueChange: handleValueChange,
  };

  return (
    <div className={`w-full ${className}`} {...props}>
      <AccordionContext.Provider value={contextValue}>
        {children}
      </AccordionContext.Provider>
    </div>
  );
};

const AccordionContext = React.createContext();

export const AccordionItem = ({ 
  children, 
  value, 
  className = '',
  ...props 
}) => {
  const contextValue = { value };

  return (
    <div
      className={`border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${className}`}
      {...props}
    >
      <AccordionItemContext.Provider value={contextValue}>
        {children}
      </AccordionItemContext.Provider>
    </div>
  );
};

const AccordionItemContext = React.createContext();

export const AccordionTrigger = ({ 
  children, 
  className = '',
  ...props 
}) => {
  const accordionContext = React.useContext(AccordionContext);
  const itemContext = React.useContext(AccordionItemContext);
  
  const isOpen = accordionContext?.openItems?.includes(itemContext?.value);

  const handleClick = () => {
    accordionContext?.onValueChange(itemContext?.value);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        w-full px-4 py-3 text-left flex items-center justify-between
        hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
        ${className}
      `}
      {...props}
    >
      <span>{children}</span>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </motion.div>
    </button>
  );
};

export const AccordionContent = ({ 
  children, 
  className = '',
  ...props 
}) => {
  const accordionContext = React.useContext(AccordionContext);
  const itemContext = React.useContext(AccordionItemContext);
  
  const isOpen = accordionContext?.openItems?.includes(itemContext?.value);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className={`px-4 pb-3 ${className}`} {...props}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { Dropdown as default };