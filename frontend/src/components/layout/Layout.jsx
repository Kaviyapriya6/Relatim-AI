import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import Sidebar from './Sidebar';
import { ConnectionStatus, NotificationContainer } from '../common';
import { initializeSocket, disconnectSocket, isSocketConnected } from '../../services/socket';
import { setConnectionStatus } from '../../store/slices/uiSlice';

const Layout = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isConnected, notifications } = useSelector((state) => state.ui);
  const { token, isAuthenticated } = useSelector((state) => state.auth);

  // Initialize socket connection
  useEffect(() => {
    let mounted = true;
    
    if (token && token !== 'null' && token !== 'undefined' && isAuthenticated) {
      // Only initialize if not already connected and component is still mounted
      if (!isSocketConnected() && mounted) {
        try {
          console.log('🔌 Initializing socket connection with valid token');
          initializeSocket(token);
          if (mounted) {
            dispatch(setConnectionStatus(true));
          }
        } catch (error) {
          console.error('Socket initialization failed:', error);
          if (mounted) {
            dispatch(setConnectionStatus(false));
          }
        }
      } else if (isSocketConnected() && mounted) {
        console.log('🔌 Socket already connected, skipping initialization');
        dispatch(setConnectionStatus(true));
      }
    } else {
      // Disconnect if no valid token or not authenticated
      if (isSocketConnected() && mounted) {
        console.log('🔌 Disconnecting socket - no valid authentication');
        disconnectSocket();
        dispatch(setConnectionStatus(false));
      }
    }

    return () => {
      mounted = false;
    };
  }, [token, isAuthenticated, dispatch]); // Removed cleanup function to prevent unnecessary disconnections

  // Cleanup socket on component unmount only (not during StrictMode double mounting)
  useEffect(() => {
    return () => {
      // Add a small delay to avoid disconnecting during React.StrictMode double mounting
      const timeoutId = setTimeout(() => {
        console.log('🔌 Layout unmounting - disconnecting socket');
        disconnectSocket();
        dispatch(setConnectionStatus(false));
      }, 100);

      return () => clearTimeout(timeoutId);
    };
  }, [dispatch]); // Include dispatch in dependency array

  // Handle mobile menu toggle
  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // ESC to close mobile menu
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const layoutVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        duration: 0.3,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div 
      className="flex h-screen bg-gray-50 dark:bg-gray-900"
      variants={layoutVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar isOpen={true} onClose={closeMobileMenu} />
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <Sidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Connection status */}
        <ConnectionStatus 
          isConnected={isConnected} 
          isReconnecting={false} 
        />

        {/* Header */}
        <Header 
          onMenuToggle={handleMobileMenuToggle}
          isMobileMenuOpen={isMobileMenuOpen}
        />

        {/* Page content */}
        <motion.main 
          className="flex-1 relative overflow-y-auto focus:outline-none"
          variants={contentVariants}
        >
          <div className="h-full">
            <Outlet />
          </div>
        </motion.main>
      </div>

      {/* Notifications */}
      <NotificationContainer 
        notifications={notifications}
        onClose={(id) => {
          // Handle notification close
          console.log('Close notification:', id);
        }}
      />
    </motion.div>
  );
};

export default Layout;