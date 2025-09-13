import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { LoadingScreen } from '../common';

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading, token } = useSelector((state) => state.auth);

  // Show loading while checking authentication
  if (isLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Redirect to dashboard if already authenticated
  if (isAuthenticated && token) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render children if not authenticated
  return children;
};

export default PublicRoute;