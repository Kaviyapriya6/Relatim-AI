import React from 'react';
import { motion } from 'framer-motion';

const FloatingActionButton = ({ onClick, icon, className = '', ...props }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className={`
        fixed bottom-20 right-6 md:bottom-6 md:right-6 z-40
        w-14 h-14 bg-green-600 hover:bg-green-700 text-white
        rounded-full shadow-lg hover:shadow-xl
        flex items-center justify-center
        transition-all duration-200
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {icon || (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )}
    </motion.button>
  );
};

export default FloatingActionButton;