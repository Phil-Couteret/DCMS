import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import bookingService, { requiresMedicalCertificate, hasValidMedicalCertificate } from '../services/bookingService';
import { calculateDivePriceWithPacks, getCustomerType } from '../services/pricingService';
import packPurchaseService from '../services/packPurchaseService';

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
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [customerSnapshot, setCustomerSnapshot] = useState(customer);

  const [formData, setFormData] = useState({
    location: 'caleta',
    date: '',
    activityType: 'diving',
    selectedTimes: [], // Array of selected time slots
    numberOfDives: 1,
    withEquipment: false,
    usePackCredits: false
  });
  const [timeAvailability, setTimeAvailability] = useState({}); // Map of time -> availability

  const locationId = formData.location === 'caleta'
    ? '550e8400-e29b-41d4-a716-446655440001'
    : '550e8400-e29b-41d4-a716-446655440002';
  const totalDives = formData.selectedTimes.length * formData.numberOfDives;
  const matchingPack = formData.activityType === 'diving' && totalDives > 0
    ? packPurchaseService.findMatchingPack(
        (customerSnapshot || customer)?.id,
        locationId,
        totalDives,
        formData.withEquipment
      )
    : null;

  // Available time slots for diving (can select multiple)
  const availableTimes = [
    { value: '09:00', label: '9:00 AM' },
    { value: '12:00', label: '12:00 PM' }
  ];

  useEffect(() => {
    setCustomerSnapshot(customer);
  }, [customer]);

  // Check availability for all time slots when date/location changes
  useEffect(() => {
    if (formData.date && formData.location) {
      const checkAllAvailability = async () => {
        const availabilityMap = {};
        for (const time of availableTimes) {
          try {
            const availability = await bookingService.checkAvailability(
              formData.date,
              time.value,
              formData.location,
              formData.activityType
            );
            availabilityMap[time.value] = availability;
          } catch (error) {
            console.warn(`[RegisteredDiverBooking] Failed to check availability for ${time.value}:`, error);
            availabilityMap[time.value] = { available: true }; // Default to available on error
          }
        }
        setTimeAvailability(availabilityMap);
      };
      checkAllAvailability();
    } else {
      setTimeAvailability({});
    }
  }, [formData.date, formData.location, formData.activityType]);

  const refreshCustomerSnapshot = async () => {
    if (!customer?.email) {
      return customer;
    }
    try {
      const latest = await bookingService.getCustomerByEmail(customer.email);
      if (latest) {
        setCustomerSnapshot(latest);
        return latest;
      }
    } catch (error) {
      console.warn('[RegisteredDiverBooking] Failed to refresh customer snapshot:', error);
    }
    return customer;
  };

  const handleOpen = async () => {
    setOpen(true);
    setError(null);
    setSuccess(false);
    setBookingResult(null);
    setFormData({
      location: 'caleta',
      date: '',
      activityType: 'diving',
      selectedTimes: [],
      numberOfDives: 1,
      withEquipment: false,
      usePackCredits: false
    });
    await refreshCustomerSnapshot();
    if (typeof window !== 'undefined' && window.syncService?.syncNow) {
      window.syncService
        .syncNow()
        .then(async () => {
          await refreshCustomerSnapshot();
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
    if (totalDives === 0) return 0;
    if (formData.usePackCredits && matchingPack) return 0;
    const latestCustomer = customerSnapshot || customer;
    const customerType = getCustomerType(latestCustomer);
    const withEquipment = matchingPack ? matchingPack.withEquipment : formData.withEquipment;
    return calculateDivePriceWithPacks(locationId, customerType, totalDives, withEquipment);
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

    // Note: Medical certificate validation is handled in the booking service
    // For registered divers, we assume they can update their profile if needed

    try {
      // Check availability for each selected time
      const unavailableSlots = [];
      for (const time of formData.selectedTimes) {
        const availability = await bookingService.checkAvailability(
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
      const totalDivesToBook = formData.selectedTimes.length * formData.numberOfDives;
      const pricePerDive = totalDivesToBook > 0 ? totalPrice / totalDivesToBook : 0;

      // If using pack credits, deduct from pack first
      let packUsed = null;
      if (formData.usePackCredits && matchingPack && totalDivesToBook > 0) {
        packUsed = packPurchaseService.deductFromPack(matchingPack.id, totalDivesToBook);
        if (!packUsed) {
          setError('Could not use pack credits. The pack may have been updated. Please try again.');
          setLoading(false);
          return;
        }
      }
      
      // Refresh customer data to get latest firstName/lastName from profile
      const latestCustomer = await refreshCustomerSnapshot();
      
      // Ensure we have required customer data
      if (!latestCustomer || !latestCustomer.firstName || !latestCustomer.lastName || !latestCustomer.email) {
        throw new Error('Customer profile information is incomplete. Please update your profile with first name, last name, and email.');
      }

      const isPackBooking = !!packUsed;
      for (const time of formData.selectedTimes) {
        const sessionTotal = pricePerDive * formData.numberOfDives;
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
          price: isPackBooking ? 0 : sessionTotal,
          totalPrice: isPackBooking ? 0 : sessionTotal,
          discount: 0,
          paymentMethod: 'account',
          paymentTransactionId: `ACCOUNT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          hasMedicalCertificate: true,
          isRegisteredDiver: true,
          ...(packUsed && { packPurchaseId: packUsed.id })
        };

        const result = await bookingService.createBooking(bookingData);
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
      >
        {t('myAccount.bookDive')}
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" component="div">{t('myAccount.bookDialog.title')}</Typography>
          <Typography variant="body2" color="text.secondary" component="p">
            {t('myAccount.bookDialog.bookingFor')} {customer.firstName} {customer.lastName} ({customer.email})
          </Typography>
        </DialogTitle>
        <DialogContent>
          {success && bookingResult ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom color="success.main">
                {t('myAccount.bookDialog.bookingConfirmed')}
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
                    Total: {bookingResult.totalPrice === 0 ? t('myAccount.bookDialog.paidWithPackLabel') : `€${bookingResult.totalPrice.toFixed(2)}`}
                  </Typography>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {bookingResult.totalPrice === 0
                      ? t('myAccount.bookDialog.paidWithPack')
                      : t('myAccount.bookDialog.payAtCenter')}
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
                <>
                <Grid item xs={12} md={6}>
                  <TextField
                    label={t('myAccount.bookDialog.numberOfDives')}
                    type="number"
                    fullWidth
                    value={formData.numberOfDives}
                    onChange={(e) => handleChange('numberOfDives', parseInt(e.target.value) || 1)}
                    inputProps={{ min: 1, max: 10 }}
                    required
                  />
                </Grid>
                {!matchingPack && (
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={!!formData.withEquipment}
                          onChange={(e) => handleChange('withEquipment', e.target.checked)}
                        />
                      }
                      label={t('myAccount.bookDialog.includeEquipment')}
                    />
                  </Grid>
                )}
                {matchingPack && (
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={!!formData.usePackCredits}
                          onChange={(e) => handleChange('usePackCredits', e.target.checked)}
                        />
                      }
                      label={t('myAccount.bookDialog.usePackCredits', {
                      remaining: matchingPack.divesRemaining,
                      equipment: matchingPack.withEquipment ? t('myAccount.bookDialog.withEquipment') : t('myAccount.bookDialog.withoutEquipment')
                    })}
                    />
                  </Grid>
                )}
                </>
              )}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  {t('myAccount.bookDialog.selectTimeSlots')}
                </Typography>
                <FormGroup>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {availableTimes.map((time) => {
                      const isSelected = formData.selectedTimes.includes(time.value);
                      const availability = formData.date ? timeAvailability[time.value] : null;
                      const isAvailable = availability === undefined || availability?.available !== false;

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
                                <Chip label={t('myAccount.bookDialog.slotFull')} size="small" color="error" />
                              )}
                              {isSelected && (
                                <Chip label={t('myAccount.bookDialog.slotSelected')} size="small" color="primary" />
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
                        {t('myAccount.bookDialog.estimatedTotal')}
                      </Typography>
                      <Typography variant="h5" color="primary.main">
                        €{calculatePrice().toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('myAccount.bookDialog.sessionsDives', {
                          sessions: formData.selectedTimes.length,
                          dives: formData.numberOfDives,
                          total: formData.selectedTimes.length * formData.numberOfDives
                        })}
                      </Typography>
                      <Alert severity="info" sx={{ mt: 2 }}>
                        {t('myAccount.bookDialog.payAtCenter')}
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
              {t('common.close')}
            </Button>
          ) : (
            <>
              <Button onClick={handleClose} disabled={loading}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSubmit}
                variant="contained"
                disabled={loading || formData.selectedTimes.length === 0}
                startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
              >
                {loading ? t('myAccount.bookDialog.creatingBooking') : t('myAccount.bookDialog.confirmBooking')}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RegisteredDiverBooking;

