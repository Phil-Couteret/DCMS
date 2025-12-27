import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { usePartnerAuth } from '../../utils/partnerAuthContext';

const ProtectedPartnerRoute = ({ children }) => {
  const { isAuthenticated, loading } = usePartnerAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/partner/login" replace />;
  }

  return children;
};

export default ProtectedPartnerRoute;
