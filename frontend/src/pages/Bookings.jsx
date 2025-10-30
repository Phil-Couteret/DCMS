import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper
} from '@mui/material';
import { 
  Add as AddIcon, 
  Event as EventIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import BookingForm from '../components/Booking/BookingForm';
import dataService from '../services/dataService';

const Bookings = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  
  // Check if we're in "new" mode by looking at the pathname
  const isNewMode = location.pathname === '/bookings/new';
  
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    if (!isNewMode && !id) {
      loadBookings();
    }
  }, [isNewMode, id]);

  const loadBookings = () => {
    const allBookings = dataService.getAll('bookings');
    const allCustomers = dataService.getAll('customers');
    setBookings(allBookings);
    setCustomers(allCustomers);
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer';
  };

  if (isNewMode || id) {
    return <BookingForm bookingId={id} />;
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
          onClick={() => navigate('/bookings/new')}
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
            onClick={() => navigate('/bookings/new')}
          >
            Create First Booking
          </Button>
        </Box>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {bookings.map((booking) => (
              <Accordion key={booking.id}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body1" fontWeight="medium">
                        {getCustomerName(booking.customerId)}
                      </Typography>
                      <Chip 
                        label={booking.status} 
                        size="small" 
                        color={getStatusColor(booking.status)}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {booking.bookingDate}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {booking.activityType}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        €{booking.totalPrice?.toFixed(2) || '0.00'}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Booking ID:</strong> {booking.id.substring(0, 8)}...
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Date:</strong> {booking.bookingDate}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Activity:</strong> {booking.activityType}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Dive Sessions:</strong> {
                          booking.diveSessions ? 
                            (booking.diveSessions.morning ? 'Morning (9AM)' : '') + 
                            (booking.diveSessions.morning && booking.diveSessions.afternoon ? ', ' : '') +
                            (booking.diveSessions.afternoon ? 'Afternoon (12PM)' : '') :
                            (booking.numberOfDives || 1) + ' dives'
                        }
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Status:</strong> {booking.status}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Payment Method:</strong> {booking.paymentMethod || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Payment Status:</strong> {booking.paymentStatus || 'pending'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom>
                        €{booking.totalPrice?.toFixed(2) || '0.00'}
                      </Typography>
                      {booking.ownEquipment && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Own Equipment:</strong> Yes
                        </Typography>
                      )}
                      {booking.rentedEquipment && Object.values(booking.rentedEquipment).some(v => v) && (
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <strong>Rented Equipment:</strong>
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 1 }}>
                            {Object.entries(booking.rentedEquipment).map(([eq, rented]) => 
                              rented && (
                                <Chip 
                                  key={eq} 
                                  label={eq} 
                                  size="small" 
                                  variant="outlined" 
                                />
                              )
                            )}
                          </Box>
                        </Box>
                      )}
                      {booking.specialRequirements && (
                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                          <strong>Special Requirements:</strong> {booking.specialRequirements}
                        </Typography>
                      )}
                      {booking.notes && (
                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                          <strong>Notes:</strong> {booking.notes}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/bookings/${booking.id}`)}
                      >
                        Edit Booking
                      </Button>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default Bookings;

