// Protected Route Component - Checks user permissions before rendering
import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useAuth } from '../../utils/authContext';
import UserSelector from './UserSelector';
import AdminLogin from './AdminLogin';
import { isMockMode } from '../../config/apiConfig';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { isAuthenticated, canAccess, loading } = useAuth();
  const [showUserSelector, setShowUserSelector] = useState(false);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  // If not authenticated: API mode = login form, mock mode = user selector
  // In API mode, also require auth_token (JWT) - if user selected via old flow, force re-login
  const hasValidAuth = isAuthenticated() && (isMockMode() || !!localStorage.getItem('auth_token'));
  if (!hasValidAuth) {
    if (!isMockMode()) {
      return <AdminLogin />;
    }
    return (
      <>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h5">Please select a user to continue</Typography>
          <Button variant="contained" onClick={() => setShowUserSelector(true)}>
            Select User
          </Button>
        </Box>
        <UserSelector open={showUserSelector} onClose={() => setShowUserSelector(false)} />
      </>
    );
  }

  // If permission required but user doesn't have it
  if (requiredPermission && !canAccess(requiredPermission)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5" color="error">
          Access Denied
        </Typography>
        <Typography color="text.secondary">
          You don't have permission to access this page.
        </Typography>
      </Box>
    );
  }

  return children;
};

export default ProtectedRoute;

