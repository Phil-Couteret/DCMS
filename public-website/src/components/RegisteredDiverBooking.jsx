import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  Chip
} from '@mui/material';
import { Add as AddIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import bookingService from '../services/bookingService';
import { calculateDivePrice, getCustomerType } from '../services/pricingService';

const EQUIPMENT_ITEMS = [
  { key: 'mask', label: 'Mask' },
  { key: 'fins', label: 'Fins' },
  { key: 'boots', label: 'Boots' },
  { key: 'wetsuit', label: 'Wetsuit' },
  { key: 'bcd', label: 'BCD' },
  { key: 'regulator', label: 'Regulator' },
  { key: 'computer', label: 'Dive Computer' },
  { key: 'torch', label: 'Torch' }
];

const RegisteredDiverBooking = ({ customer, onBookingCreated }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [customerSnapshot, setCustomerSnapshot] = useState(customer);

  useEffect(() => {
    setCustomerSnapshot(customer);
  }, [customer]);

  const refreshCustomerSnapshot = () => {
    if (!customer?.email) {
      return customer;
    }
    const latest = bookingService.getCustomerByEmail(customer.email);
    if (latest) {
      setCustomerSnapshot(latest);
      return latest;
    }
    return customer;
  };

  const [formData, setFormData] = useState({
    location: 'caleta',
    date: '',
    activityType: 'diving',
    selectedTimes: [], // Array of selected time slots
    numberOfDives: 1
  });

  // Available time slots for diving (can select multiple)
  const availableTimes = [
    { value: '09:00', label: '9:00 AM' },
    { value: '10:15', label: '10:15 AM (Additional)' },
    { value: '12:00', label: '12:00 PM' }
  ];

  const handleOpen = () => {
    setOpen(true);
    setError(null);
    setSuccess(false);
    setBookingResult(null);
    setFormData({
      location: 'caleta',
      date: '',
      activityType: 'diving',
      selectedTimes: [],
      numberOfDives: 1
    });
    refreshCustomerSnapshot();
    if (typeof window !== 'undefined' && window.syncService?.syncNow) {
      window.syncService
        .syncNow()
        .then(() => {
          refreshCustomerSnapshot();
        })
        .catch((err) => console.warn('[RegisteredBooking] Sync before booking failed:', err));
    }
  };

  const handleClose = () => {
    if (!loading) {
      setOpen(false);
      setError(null);
      setSuccess(false);
      if (bookingResult && onBookingCreated) {
        onBookingCreated();
      }
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTimeToggle = (timeValue) => {
    setFormData(prev => {
      const times = prev.selectedTimes.includes(timeValue)
        ? prev.selectedTimes.filter(t => t !== timeValue)
        : [...prev.selectedTimes, timeValue];
      return { ...prev, selectedTimes: times };
    });
  };

  const calculatePrice = () => {
    const totalDives = formData.selectedTimes.length * formData.numberOfDives;
    if (totalDives === 0) return 0;
    
    // Map location name to locationId (UUID)
    const locationId = formData.location === 'caleta' 
      ? '550e8400-e29b-41d4-a716-446655440001' // Caleta de Fuste
      : '550e8400-e29b-41d4-a716-446655440002'; // Las Playitas
    
    const latestCustomer = customerSnapshot || customer;
    const customerType = getCustomerType(latestCustomer);
    
    return calculateDivePrice(locationId, customerType, totalDives);
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    // Validation
    if (!formData.date) {
      setError('Please select a date');
      setLoading(false);
      return;
    }

    if (formData.selectedTimes.length === 0) {
      setError('Please select at least one time slot');
      setLoading(false);
      return;
    }

    if (formData.activityType === 'diving' && formData.numberOfDives < 1) {
      setError('Please enter number of dives');
      setLoading(false);
      return;
    }

    try {
      // Check availability for each selected time
      const unavailableSlots = [];
      for (const time of formData.selectedTimes) {
        const availability = bookingService.checkAvailability(
          formData.date,
          time,
          formData.location,
          formData.activityType
        );
        if (!availability.available) {
          unavailableSlots.push(time);
        }
      }

      if (unavailableSlots.length > 0) {
        setError(`Some time slots are fully booked: ${unavailableSlots.join(', ')}`);
        setLoading(false);
        return;
      }

      // Create bookings for each selected time slot
      const bookings = [];
      const totalPrice = calculatePrice();
      const pricePerDive = totalPrice / (formData.selectedTimes.length * formData.numberOfDives);
      const latestCustomer = refreshCustomerSnapshot() || customer;

      for (const time of formData.selectedTimes) {
        const bookingData = {
          location: formData.location,
          date: formData.date,
          time: time,
          activityType: formData.activityType,
          numberOfDives: formData.numberOfDives,
          firstName: latestCustomer.firstName,
          lastName: latestCustomer.lastName,
          email: latestCustomer.email,
          phone: latestCustomer.phone || '',
          specialRequirements: '',
          price: pricePerDive * formData.numberOfDives,
          totalPrice: pricePerDive * formData.numberOfDives,
          discount: 0,
          paymentMethod: 'account', // Registered divers don't pay upfront
          paymentTransactionId: `ACCOUNT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };

        const result = bookingService.createBooking(bookingData);
        bookings.push(result);
      }

      // Force immediate sync so admin portal receives the new bookings without waiting
      if (typeof window !== 'undefined' && window.syncService) {
        window.syncService.syncNow?.().catch(err => {
          console.warn('[RegisteredBooking] Failed to sync bookings immediately:', err);
        });
      }

      setBookingResult({ bookings, totalPrice });
      setSuccess(true);

    } catch (err) {
      setError(err.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!customer) {
    return null;
  }

  return (
    <>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleOpen}
        sx={{ mb: 2 }}
      >
        Book a Dive
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" component="div">Book a Dive</Typography>
          <Typography variant="body2" color="text.secondary" component="p">
            Booking for: {customer.firstName} {customer.lastName} ({customer.email})
          </Typography>
        </DialogTitle>
        <DialogContent>
          {success && bookingResult ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom color="success.main">
                Booking Confirmed!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {bookingResult.bookings.length} booking(s) created successfully.
              </Typography>
              
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Booking Summary
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Date:</strong> {formData.date}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Time(s):</strong> {formData.selectedTimes.map(t => 
                      availableTimes.find(at => at.value === t)?.label || t
                    ).join(', ')}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Location:</strong> {formData.location === 'caleta' ? 'Caleta de Fuste' : 'Las Playitas'}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Total Dives:</strong> {formData.selectedTimes.length * formData.numberOfDives}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 2, color: 'primary.main' }}>
                    Total: €{bookingResult.totalPrice.toFixed(2)}
                  </Typography>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Payment will be processed at the dive center. No payment required now.
                  </Alert>
                </CardContent>
              </Card>
            </Box>
          ) : (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Activity Type</InputLabel>
                  <Select
                    value={formData.activityType}
                    onChange={(e) => handleChange('activityType', e.target.value)}
                  >
                    <MenuItem value="diving">Scuba Diving</MenuItem>
                    <MenuItem value="snorkeling">Snorkeling</MenuItem>
                    <MenuItem value="discover">Discovery Dive</MenuItem>
                    <MenuItem value="orientation">Orientation Dive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Location</InputLabel>
                  <Select
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                  >
                    <MenuItem value="caleta">Caleta de Fuste</MenuItem>
                    <MenuItem value="playitas">Las Playitas</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Date"
                  type="date"
                  fullWidth
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: new Date().toISOString().split('T')[0] }}
                  required
                />
              </Grid>
              {formData.activityType === 'diving' && (
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Number of Dives per Session"
                    type="number"
                    fullWidth
                    value={formData.numberOfDives}
                    onChange={(e) => handleChange('numberOfDives', parseInt(e.target.value) || 1)}
                    inputProps={{ min: 1, max: 10 }}
                    required
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Select Time Slot(s) - You can dive multiple times per day
                </Typography>
                <FormGroup>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {availableTimes.map((time) => {
                      const isSelected = formData.selectedTimes.includes(time.value);
                      const availability = formData.date
                        ? bookingService.checkAvailability(
                            formData.date,
                            time.value,
                            formData.location,
                            formData.activityType
                          )
                        : null;
                      const isAvailable = !availability || availability.available;

                      return (
                        <FormControlLabel
                          key={time.value}
                          control={
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleTimeToggle(time.value)}
                              disabled={!isAvailable}
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography>{time.label}</Typography>
                              {!isAvailable && (
                                <Chip label="Full" size="small" color="error" />
                              )}
                              {isSelected && (
                                <Chip label="Selected" size="small" color="primary" />
                              )}
                            </Box>
                          }
                        />
                      );
                    })}
                  </Box>
                </FormGroup>
              </Grid>
              {formData.selectedTimes.length > 0 && (
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Estimated Total
                      </Typography>
                      <Typography variant="h5" color="primary.main">
                        €{calculatePrice().toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formData.selectedTimes.length} session(s) × {formData.numberOfDives} dive(s) = {formData.selectedTimes.length * formData.numberOfDives} total dive(s)
                      </Typography>
                      <Alert severity="info" sx={{ mt: 2 }}>
                        Payment will be processed at the dive center. No payment required now.
                      </Alert>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          {success ? (
            <Button onClick={handleClose} variant="contained">
              Close
            </Button>
          ) : (
            <>
              <Button onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                variant="contained"
                disabled={loading || formData.selectedTimes.length === 0}
                startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
              >
                {loading ? 'Creating Booking...' : 'Confirm Booking'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RegisteredDiverBooking;

