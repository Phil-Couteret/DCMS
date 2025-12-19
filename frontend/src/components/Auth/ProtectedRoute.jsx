// Protected Route Component - Checks user permissions before rendering
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { useAuth } from '../../utils/authContext';
import UserSelector from './UserSelector';

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

  // If not authenticated, show user selector
  if (!isAuthenticated()) {
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

