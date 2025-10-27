import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent,
  Grid,
  Chip
} from '@mui/material';
import { Add as AddIcon, Event as EventIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import BookingForm from '../components/Booking/BookingForm';
import dataService from '../services/dataService';

const Bookings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const bookingId = searchParams.get('id');
  
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (!mode && !bookingId) {
      loadBookings();
    }
  }, [mode, bookingId]);

  const loadBookings = () => {
    const allBookings = dataService.getAll('bookings');
    setBookings(allBookings);
  };

  if (mode === 'new' || bookingId) {
    return <BookingForm bookingId={bookingId} />;
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      confirmed: 'info',
      completed: 'success',
      cancelled: 'error',
      no_show: 'default'
    };
    return colors[status] || 'default';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          Bookings
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => navigate('/bookings?mode=new')}
        >
          New Booking
        </Button>
      </Box>

      {bookings.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <EventIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No bookings yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first booking to get started
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => navigate('/bookings?mode=new')}
          >
            Create First Booking
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {bookings.map((booking) => (
            <Grid item xs={12} md={6} key={booking.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">
                      Booking #{booking.id.substring(0, 8)}
                    </Typography>
                    <Chip 
                      label={booking.status}
                      color={getStatusColor(booking.status)}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Date: {booking.bookingDate}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Activity: {booking.activityType}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Number of dives: {booking.numberOfDives}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    €{booking.totalPrice?.toFixed(2) || '0.00'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => navigate(`/bookings?id=${booking.id}`)}
                    >
                      Edit
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Bookings;

