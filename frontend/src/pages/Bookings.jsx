import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const Bookings = ({ mode }) => {
  if (mode === 'new') {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          New Booking
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Booking form coming soon...
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          Bookings
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
        >
          New Booking
        </Button>
      </Box>
      <Typography variant="body1" color="text.secondary">
        Bookings list coming soon...
      </Typography>
    </Box>
  );
};

export default Bookings;

