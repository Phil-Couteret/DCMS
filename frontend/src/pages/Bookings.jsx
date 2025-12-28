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
  Paper,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  Add as AddIcon, 
  Event as EventIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  PriceChange as PriceChangeIcon,
  Cancel as CancelIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import BookingForm from '../components/Booking/BookingForm';
import dataService from '../services/dataService';
import { recalculateAllBookingPrices } from '../services/bookingRepricingService';
import { useTranslation } from '../utils/languageContext';

const Bookings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { id } = useParams();
  const location = useLocation();
  
  // Check if we're in "new" mode by looking at the pathname
  const isNewMode = location.pathname === '/bookings/new';
  
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    if (!isNewMode && !id) {
      loadBookings().catch(error => {
        console.error('[Bookings] Error in useEffect loadBookings:', error);
      });
      loadPartners();
    }
  }, [isNewMode, id]);

  // Refresh list when location changes from top tabs or new bookings are created
  useEffect(() => {
    const onLocChange = () => {
      if (!isNewMode && !id) loadBookings();
    };
    const onBookingCreated = (event) => {
      if (!isNewMode && !id) {
        loadBookings();
      }
    };
    const onStorageChange = (event) => {
      if (event.key === 'dcms_bookings' || !event.key) {
        if (!isNewMode && !id) loadBookings();
      }
    };
    
    // Poll for changes every 2 seconds (since different ports = separate localStorage)
    // This is a workaround - in production, use a shared backend API
    const pollInterval = setInterval(async () => {
      if (!isNewMode && !id) {
        try {
          const currentBookings = await dataService.getAll('bookings') || [];
          if (Array.isArray(currentBookings) && currentBookings.length !== bookings.length) {
            loadBookings();
          }
        } catch (error) {
          // Ignore polling errors
        }
      }
    }, 2000);
    
    window.addEventListener('dcms_location_changed', onLocChange);
    window.addEventListener('storage', onStorageChange);
    window.addEventListener('dcms_booking_created', onBookingCreated);
    // Listen for sync events
    const onSync = () => {
      if (!isNewMode && !id) {
        loadBookings();
      }
    };
    window.addEventListener('dcms_bookings_synced', onSync);
    
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('dcms_location_changed', onLocChange);
      window.removeEventListener('storage', onStorageChange);
      window.removeEventListener('dcms_booking_created', onBookingCreated);
      window.removeEventListener('dcms_bookings_synced', onSync);
    };
  }, [isNewMode, id, bookings.length]);

  const loadPartners = async () => {
    try {
      const allPartners = await dataService.getAll('partners');
      setPartners(Array.isArray(allPartners) ? allPartners : []);
    } catch (error) {
      console.error('Error loading partners:', error);
      setPartners([]);
    }
  };
  
  const getPartnerName = (partnerId) => {
    if (!partnerId) return null;
    const partner = partners.find(p => p.id === partnerId);
    if (partner) {
      return partner.name || partner.companyName || partner.company_name || 'Partner';
    }
    return null;
  };

  const loadBookings = async () => {
    try {
      const allBookings = await dataService.getAll('bookings') || [];
      const allCustomers = await dataService.getAll('customers') || [];
      const allLocations = await dataService.getAll('locations') || [];
      
      // Ensure we have arrays
      if (!Array.isArray(allBookings) || !Array.isArray(allCustomers) || !Array.isArray(allLocations)) {
        console.warn('[Bookings] Invalid data format:', { allBookings, allCustomers, allLocations });
        return;
      }
      
      // Get current location from localStorage
      const currentLocationId = localStorage.getItem('dcms_current_location');
      const currentLocation = allLocations.find(l => l.id === currentLocationId);
      const isCurrentLocationBikeRental = currentLocation?.type === 'bike_rental';
      
      // Helper function to determine if a booking is a bike rental
      const isBookingBikeRental = (booking) => {
        // Check equipmentNeeded for bike_rental activity type
        if (booking.equipmentNeeded?.activityType === 'bike_rental') {
          return true;
        }
        // Check if booking's location is a bike rental location
        const bookingLocationId = booking.locationId || booking.location_id;
        const bookingLocation = allLocations.find(l => l.id === bookingLocationId);
        return bookingLocation?.type === 'bike_rental';
      };
      
      // Filter bookings based on current location type AND location ID
      let filteredBookings = allBookings;
      if (currentLocation) {
        const currentLocationId = currentLocation.id;
        if (isCurrentLocationBikeRental) {
          // For bike rental locations: only show bike rental bookings for this location
          filteredBookings = allBookings.filter(booking => {
            const bookingLocationId = booking.locationId || booking.location_id;
            return isBookingBikeRental(booking) && bookingLocationId === currentLocationId;
          });
        } else {
          // For diving locations: only show non-bike-rental bookings for this location
          filteredBookings = allBookings.filter(booking => {
            const bookingLocationId = booking.locationId || booking.location_id;
            return !isBookingBikeRental(booking) && bookingLocationId === currentLocationId;
          });
        }
      }
      // If no current location selected (global view), show all bookings
      
      setBookings(filteredBookings);
      setCustomers(allCustomers);
    } catch (error) {
      console.error('[Bookings] Error loading bookings:', error);
      setBookings([]);
      setCustomers([]);
    }
  };

  const handleRecalculatePrices = () => {
    if (recalculating) return;
    const confirmed = window.confirm('Recalculate all booking prices using the latest customer types and price table?');
    if (!confirmed) return;

    try {
      setRecalculating(true);
      const result = recalculateAllBookingPrices();
      loadBookings();
      setSnackbar({
        open: true,
        severity: 'success',
        message: result.updated > 0
          ? `Recalculated ${result.updated} booking${result.updated === 1 ? '' : 's'}`
          : 'No bookings required price updates'
      });
    } catch (error) {
      console.error('[Admin] Failed to recalculate booking prices:', error);
      setSnackbar({
        open: true,
        severity: 'error',
        message: 'Failed to recalculate prices. Please try again.'
      });
    } finally {
      setRecalculating(false);
    }
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? `${customer.firstName} ${customer.lastName}` : t('customers.unknown') || 'Unknown Customer';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  const isBikeRental = (booking) => {
    return booking.equipmentNeeded?.activityType === 'bike_rental' || 
           booking.activityType === 'specialty' && booking.equipmentNeeded?.activityType === 'bike_rental';
  };

  const getActivityDisplayName = (booking) => {
    if (isBikeRental(booking)) {
      return 'Bike Rental';
    }
    const activityMap = {
      diving: 'Diving',
      snorkeling: 'Snorkeling',
      discover: 'Discovery Dive',
      specialty: 'Specialty'
    };
    return activityMap[booking.activityType] || booking.activityType;
  };

  const handleCancelBooking = async (booking) => {
    if (!window.confirm(`Are you sure you want to cancel this booking?`)) {
      return;
    }
    
    try {
      const updatedBooking = {
        ...booking,
        status: 'cancelled'
      };
      await dataService.update('bookings', booking.id, updatedBooking);
      loadBookings(); // Reload the bookings list
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Error cancelling booking. Please try again.');
    }
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
          {t('bookings.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={loadBookings}
            sx={{ minWidth: 'auto' }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<PriceChangeIcon />}
            onClick={handleRecalculatePrices}
            disabled={recalculating}
            sx={{ minWidth: 'auto' }}
          >
            {recalculating ? 'Repricing…' : 'Reprice Bookings'}
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => navigate('/bookings/new')}
          >
            {t('bookings.new')}
          </Button>
        </Box>
      </Box>

      {bookings.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <EventIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('bookings.noBookings')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('bookings.createFirst')}
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => navigate('/bookings/new')}
          >
            {t('bookings.createFirst')}
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
                      {/* Partner indicator */}
                      {(booking.partnerId || booking.partner_id || booking.source === 'partner') && (
                        <Chip
                          icon={<BusinessIcon />}
                          label={getPartnerName(booking.partnerId || booking.partner_id) || 'Partner'}
                          size="small"
                          color="secondary"
                          variant="filled"
                        />
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(booking.bookingDate)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {getActivityDisplayName(booking)}
                      </Typography>
                      {booking.routeType && (
                        <Chip
                          label={
                            booking.routeType === 'playitas_local' ? 'Playitas Local' :
                            booking.routeType === 'caleta_from_playitas' ? 'Caleta from Playitas' :
                            booking.routeType === 'dive_trip' ? 'Dive Trip' : booking.routeType
                          }
                          size="small"
                          variant="outlined"
                        />
                      )}
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
                        <strong>{t('bookings.details.bookingId') || 'Booking ID'}:</strong> {booking.id.substring(0, 8)}...
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>{t('bookings.details.date') || 'Date'}:</strong> {formatDate(booking.bookingDate)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>{t('bookings.details.activity') || 'Activity'}:</strong> {getActivityDisplayName(booking)}
                      </Typography>
                      {isBikeRental(booking) ? (
                        <>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <strong>Rental Duration:</strong> {booking.equipmentNeeded?.rentalDays || booking.numberOfDives || 2} day{(booking.equipmentNeeded?.rentalDays || booking.numberOfDives || 2) > 1 ? 's' : ''}
                          </Typography>
                          {booking.equipmentNeeded?.bikeType && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              <strong>Bike Type:</strong> {
                                booking.equipmentNeeded.bikeType === 'street_bike' ? 'Street Bike' :
                                booking.equipmentNeeded.bikeType === 'gravel_bike' ? 'Gravel Bike' :
                                booking.equipmentNeeded.bikeType === 'mountain_bike' ? 'Mountain Bike' :
                                booking.equipmentNeeded.bikeType
                              }
                            </Typography>
                          )}
                          {booking.equipmentNeeded?.startDate && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              <strong>Start Date:</strong> {formatDate(booking.equipmentNeeded.startDate)}
                            </Typography>
                          )}
                          {booking.equipmentNeeded?.endDate && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              <strong>End Date:</strong> {formatDate(booking.equipmentNeeded.endDate)}
                            </Typography>
                          )}
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>{t('bookings.details.diveSessions') || 'Dive Sessions'}:</strong> {
                            booking.diveSessions ? 
                              (booking.diveSessions.morning ? t('bookings.details.morning') || 'Morning (9AM)' : '') + 
                              (booking.diveSessions.morning && booking.diveSessions.afternoon ? ', ' : '') +
                              (booking.diveSessions.afternoon ? t('bookings.details.afternoon') || 'Afternoon (12PM)' : '') :
                              `${(booking.numberOfDives || 1)} ${t('bookings.details.dives') || 'dives'}`
                          }
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>{t('common.status') || 'Status'}:</strong> {t(`bookings.status.${booking.status}`) || booking.status}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>{t('bookings.details.paymentMethod') || 'Payment Method'}:</strong> {booking.paymentMethod || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>{t('bookings.details.paymentStatus') || 'Payment Status'}:</strong> {booking.paymentStatus || 'pending'}
                      </Typography>
                      {/* Partner Information */}
                      {(booking.partnerId || booking.partner_id || booking.source === 'partner') && (
                        <Box sx={{ mt: 1, mb: 1 }}>
                          <Chip
                            icon={<BusinessIcon />}
                            label={`Partner: ${getPartnerName(booking.partnerId || booking.partner_id) || 'Unknown Partner'}`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        </Box>
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom>
                        €{(Number(booking.totalPrice) || 0).toFixed(2)}
                      </Typography>
                      {isBikeRental(booking) ? (
                        <>
                          {booking.equipmentNeeded?.bikeEquipment && Object.values(booking.equipmentNeeded.bikeEquipment).some(v => v) && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                <strong>Equipment:</strong>
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 1 }}>
                                {booking.equipmentNeeded.bikeEquipment.click_pedals && (
                                  <Chip label="Click Pedals" size="small" variant="outlined" />
                                )}
                                {booking.equipmentNeeded.bikeEquipment.helmet && (
                                  <Chip label="Helmet" size="small" variant="outlined" />
                                )}
                                {booking.equipmentNeeded.bikeEquipment.gps_computer && (
                                  <Chip label="GPS Computer" size="small" variant="outlined" />
                                )}
                              </Box>
                            </Box>
                          )}
                          {booking.equipmentNeeded?.bikeInsurance && (
                            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                              <strong>Insurance:</strong> {
                                booking.equipmentNeeded.bikeInsurance === 'one_day' ? 'One Day' :
                                booking.equipmentNeeded.bikeInsurance === 'one_week' ? 'One Week' :
                                booking.equipmentNeeded.bikeInsurance === 'one_month' ? 'One Month' :
                                booking.equipmentNeeded.bikeInsurance
                              }
                            </Typography>
                          )}
                        </>
                      ) : (
                        <>
                          {booking.ownEquipment && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              <strong>{t('bookings.details.ownEquipment') || 'Own Equipment'}:</strong> {t('common.yes')}
                            </Typography>
                          )}
                          {booking.rentedEquipment && Object.values(booking.rentedEquipment).some(v => v) && (
                            <Box>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                <strong>{t('bookings.details.rentedEquipment') || 'Rented Equipment'}:</strong>
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
                        </>
                      )}
                      {booking.specialRequirements && (
                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                          <strong>{t('bookings.details.specialRequirements') || 'Special Requirements'}:</strong> {booking.specialRequirements}
                        </Typography>
                      )}
                      {booking.notes && (
                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                          <strong>{t('bookings.details.notes') || 'Notes'}:</strong> {booking.notes}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {isBikeRental(booking) && booking.status !== 'cancelled' && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<CancelIcon />}
                            onClick={() => handleCancelBooking(booking)}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => navigate(`/bookings/${booking.id}`)}
                        >
                          {t('common.edit')}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Paper>
      )}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Bookings;

