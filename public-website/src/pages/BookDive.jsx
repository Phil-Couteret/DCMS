import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { Save as SaveIcon, CreditCard as CreditCardIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import bookingService from '../services/bookingService';

const BookDive = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  
  const steps = [
    t('booking.step1'), 
    t('booking.step2'), 
    t('booking.step3'), 
    t('booking.step4') || 'Payment',
    t('booking.step5') || 'Confirmation'
  ];
  const [formData, setFormData] = useState({
    location: 'caleta',
    date: '',
    time: '09:00',
    activityType: 'diving',
    numberOfDives: 1,
    experienceLevel: 'intermediate',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialRequirements: '',
    paymentMethod: 'card',
    cardNumber: '',
    cardExpiry: '',
    cardCVC: '',
    cardName: '',
    acceptTerms: false
  });

  // Get available times based on activity type (from official Deep Blue Diving website)
  const getAvailableTimes = () => {
    switch (formData.activityType) {
      case 'diving':
        return [
          { value: '09:00', label: '9:00 AM' },
          { value: '10:15', label: '10:15 AM (Additional)' },
          { value: '12:00', label: '12:00 PM' }
        ];
      case 'snorkeling':
        return [
          { value: '10:00', label: '10:00 AM' },
          { value: '11:00', label: '11:00 AM' },
          { value: '13:00', label: '1:00 PM' },
          { value: '14:00', label: '2:00 PM' }
        ];
      case 'discover':
        return [
          { value: '10:00', label: '10:00 AM' }
        ];
      case 'orientation':
        return [
          { value: '10:00', label: '10:00 AM' }
        ];
      default:
        return [];
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Reset time when activity type changes
      if (field === 'activityType') {
        const availableTimes = getAvailableTimesForActivity(value);
        newData.time = availableTimes[0]?.value || '09:00';
      }
      
      return newData;
    });
  };

  // Get available times for a specific activity type (from official Deep Blue Diving website)
  const getAvailableTimesForActivity = (activityType) => {
    switch (activityType) {
      case 'diving':
        return [
          { value: '09:00', label: '9:00 AM' },
          { value: '10:15', label: '10:15 AM (Additional)' },
          { value: '12:00', label: '12:00 PM' }
        ];
      case 'snorkeling':
        return [
          { value: '10:00', label: '10:00 AM' },
          { value: '11:00', label: '11:00 AM' },
          { value: '13:00', label: '1:00 PM' },
          { value: '14:00', label: '2:00 PM' }
        ];
      case 'discover':
        return [
          { value: '10:00', label: '10:00 AM' }
        ];
      case 'orientation':
        return [
          { value: '10:00', label: '10:00 AM' }
        ];
      default:
        return [];
    }
  };

  // Check availability when date/time/location changes
  useEffect(() => {
    if (formData.date && formData.time && formData.location) {
      const availabilityCheck = bookingService.checkAvailability(
        formData.date,
        formData.time,
        formData.location,
        formData.activityType
      );
      setAvailability(availabilityCheck);
    }
  }, [formData.date, formData.time, formData.location, formData.activityType]);

  const handleNext = () => {
    // Validate current step before proceeding
    if (activeStep === 0) {
      if (!formData.date || !formData.time || !formData.location) {
        setError('Please fill in all required fields');
        return;
      }
      if (availability && !availability.available) {
        setError('This time slot is fully booked. Please select another time.');
        return;
      }
    } else if (activeStep === 1) {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
        setError('Please fill in all required fields');
        return;
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        return;
      }
    } else if (activeStep === 2) {
      // Step 2 is review, no validation needed
    } else if (activeStep === 3) {
      // Payment step validation
      if (formData.paymentMethod === 'card') {
        if (!formData.cardNumber || !formData.cardExpiry || !formData.cardCVC || !formData.cardName) {
          setError('Please fill in all payment details');
          return;
        }
        if (!formData.acceptTerms) {
          setError('Please accept the terms and conditions');
          return;
        }
      }
    }
    
    setError(null);
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep(prev => prev - 1);
  };

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate payment processing (dummy)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate dummy transaction ID
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Calculate final price
      const totalPrice = calculatePrice();
      
      // Create booking
      const result = bookingService.createBooking({
        ...formData,
        price: totalPrice,
        totalPrice: totalPrice,
        discount: 0,
        paymentMethod: formData.paymentMethod,
        paymentTransactionId: transactionId
      });
      
      setBookingResult(result);
      setBookingConfirmed(true);
      setActiveStep(4); // Move to confirmation step
      
    } catch (err) {
      setError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = () => {
    if (formData.activityType === 'snorkeling') {
      // Snorkeling pricing: €38 per session (includes boat trip, suit, mask, snorkel, fins)
      return 38 * formData.numberOfDives;
    } else if (formData.activityType === 'discover') {
      // Discover Scuba pricing: €100 per session (includes equipment and instructor)
      return 100 * formData.numberOfDives;
    } else if (formData.activityType === 'orientation') {
      // Orientation Dives pricing: €32 per session (for certified divers)
      return 32 * formData.numberOfDives;
    } else {
      // Diving pricing with volume discounts (from official 2025 pricelist)
      let basePrice;
      if (formData.numberOfDives <= 2) {
        basePrice = 46;
      } else if (formData.numberOfDives <= 5) {
        basePrice = 44;
      } else if (formData.numberOfDives <= 8) {
        basePrice = 42;
      } else if (formData.numberOfDives <= 12) {
        basePrice = 40;
      } else {
        basePrice = 38;
      }
      return basePrice * formData.numberOfDives;
    }
  };

  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom>
        {t('booking.title')}
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 4 }}>
        {activeStep === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('booking.activityType')}</InputLabel>
                <Select
                  value={formData.activityType}
                  onChange={(e) => handleChange('activityType', e.target.value)}
                >
                  <MenuItem value="diving">{t('booking.activities.diving')}</MenuItem>
                  <MenuItem value="snorkeling">{t('booking.activities.snorkeling')}</MenuItem>
                  <MenuItem value="discover">{t('booking.activities.discover')}</MenuItem>
                  <MenuItem value="orientation">{t('booking.activities.orientation')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('booking.location')}</InputLabel>
                <Select
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                >
                  <MenuItem value="caleta">{t('booking.locations.caleta')}</MenuItem>
                  <MenuItem value="playitas">{t('booking.locations.playitas')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={t('booking.date')}
                type="date"
                fullWidth
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('booking.time')}</InputLabel>
                <Select
                  value={formData.time}
                  onChange={(e) => handleChange('time', e.target.value)}
                >
                  {getAvailableTimes().map((time) => (
                    <MenuItem key={time.value} value={time.value}>
                      {time.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={formData.activityType === 'diving' ? t('booking.numberOfDives') : t('booking.numberOfSessions')}
                type="number"
                fullWidth
                value={formData.numberOfDives}
                onChange={(e) => handleChange('numberOfDives', parseInt(e.target.value) || 1)}
                inputProps={{ min: 1, max: 10 }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('booking.experienceLevel')}</InputLabel>
                <Select
                  value={formData.experienceLevel}
                  onChange={(e) => handleChange('experienceLevel', e.target.value)}
                >
                  <MenuItem value="beginner">{t('booking.experienceLevels.beginner')}</MenuItem>
                  <MenuItem value="intermediate">{t('booking.experienceLevels.intermediate')}</MenuItem>
                  <MenuItem value="advanced">{t('booking.experienceLevels.advanced')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {t('booking.estimatedPrice')} €{calculatePrice().toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formData.activityType === 'diving' 
                  ? t('booking.includesDiving')
                  : formData.activityType === 'snorkeling'
                  ? t('booking.includesSnorkeling')
                  : formData.activityType === 'discover'
                  ? t('booking.includesDiscover')
                  : t('booking.includesOrientation')
                }
              </Typography>
            </Grid>
          </Grid>
        )}

        {activeStep === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label={t('booking.firstName')}
                fullWidth
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={t('booking.lastName')}
                fullWidth
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={t('booking.email')}
                type="email"
                fullWidth
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Phone"
                fullWidth
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={t('booking.specialRequirementsLabel')}
                multiline
                rows={4}
                fullWidth
                value={formData.specialRequirements}
                onChange={(e) => handleChange('specialRequirements', e.target.value)}
              />
            </Grid>
          </Grid>
        )}

        {activeStep === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {t('booking.bookingSummary')}
              </Typography>
              <Card variant="outlined" sx={{ mt: 2, mb: 2 }}>
                <CardContent>
                  <Typography variant="body2" gutterBottom>
                    <strong>{t('booking.activity')}:</strong> {
                      formData.activityType === 'diving' ? t('booking.activities.diving') : 
                      formData.activityType === 'snorkeling' ? t('booking.activities.snorkeling') : 
                      formData.activityType === 'discover' ? t('booking.activities.discover') :
                      t('booking.activities.orientation')
                    }
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>{t('booking.location')}:</strong> {formData.location === 'caleta' ? t('booking.locations.caleta') : t('booking.locations.playitas')}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>{t('booking.date')}:</strong> {formData.date}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>{t('booking.time')}:</strong> {getAvailableTimes().find(t => t.value === formData.time)?.label || formData.time}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>{formData.activityType === 'diving' ? t('booking.numberOfDives') : t('booking.numberOfSessions')}:</strong> {formData.numberOfDives}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>{t('booking.experienceLevel')}:</strong> {t(`booking.experienceLevels.${formData.experienceLevel}`)}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>{t('booking.name')}:</strong> {formData.firstName} {formData.lastName}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>{t('booking.email')}:</strong> {formData.email}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Phone:</strong> {formData.phone}
                  </Typography>
                  {formData.specialRequirements && (
                    <Typography variant="body2" gutterBottom>
                      <strong>Special Requirements:</strong> {formData.specialRequirements}
                    </Typography>
                  )}
                  <Typography variant="h6" sx={{ mt: 3, mb: 1, color: 'primary.main' }}>
                    {t('common.totalPrice')} €{calculatePrice().toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
              {availability && (
                <Alert severity={availability.available ? 'success' : 'warning'} sx={{ mt: 2 }}>
                  {availability.available 
                    ? `Available (${availability.existingBookings} existing bookings)` 
                    : 'This time slot is fully booked'}
                </Alert>
              )}
            </Grid>
          </Grid>
        )}

        {activeStep === 3 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Payment Information
              </Typography>
              <FormControl component="fieldset" sx={{ mb: 3 }}>
                <RadioGroup
                  value={formData.paymentMethod}
                  onChange={(e) => handleChange('paymentMethod', e.target.value)}
                >
                  <FormControlLabel value="card" control={<Radio />} label="Credit/Debit Card" />
                  <FormControlLabel value="paypal" control={<Radio />} label="PayPal (Coming Soon)" disabled />
                  <FormControlLabel value="cash" control={<Radio />} label="Pay at Location" />
                </RadioGroup>
              </FormControl>

              {formData.paymentMethod === 'card' && (
                <>
                  <TextField
                    label="Cardholder Name"
                    fullWidth
                    value={formData.cardName}
                    onChange={(e) => handleChange('cardName', e.target.value)}
                    required
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label="Card Number"
                    fullWidth
                    value={formData.cardNumber}
                    onChange={(e) => handleChange('cardNumber', e.target.value.replace(/\D/g, '').slice(0, 16))}
                    placeholder="1234 5678 9012 3456"
                    required
                    sx={{ mb: 2 }}
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label="Expiry Date"
                        fullWidth
                        value={formData.cardExpiry}
                        onChange={(e) => handleChange('cardExpiry', e.target.value.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d{0,2})/, '$1/$2'))}
                        placeholder="MM/YY"
                        required
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="CVC"
                        fullWidth
                        value={formData.cardCVC}
                        onChange={(e) => handleChange('cardCVC', e.target.value.replace(/\D/g, '').slice(0, 3))}
                        placeholder="123"
                        required
                      />
                    </Grid>
                  </Grid>
                  <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                    This is a demo payment system. No real payment will be processed.
                  </Alert>
                </>
              )}

              {formData.paymentMethod === 'cash' && (
                <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                  You will pay at the dive center location on the day of your booking.
                </Alert>
              )}

              <Box sx={{ mt: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.acceptTerms}
                      onChange={(e) => handleChange('acceptTerms', e.target.checked)}
                    />
                  }
                  label="I accept the terms and conditions and cancellation policy"
                />
              </Box>

              <Card variant="outlined" sx={{ mt: 3, bgcolor: 'grey.50' }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Amount
                  </Typography>
                  <Typography variant="h5" color="primary.main">
                    €{calculatePrice().toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {activeStep === 4 && bookingConfirmed && bookingResult && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                <Typography variant="h4" gutterBottom color="success.main">
                  Booking Confirmed!
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                  Your booking has been successfully confirmed. A confirmation email will be sent to {formData.email}.
                </Typography>
                
                <Card variant="outlined" sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Booking Details
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Booking ID:</strong> {bookingResult.booking.id}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Transaction ID:</strong> {bookingResult.booking.paymentTransactionId}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Activity:</strong> {
                        formData.activityType === 'diving' ? t('booking.activities.diving') : 
                        formData.activityType === 'snorkeling' ? t('booking.activities.snorkeling') : 
                        formData.activityType === 'discover' ? t('booking.activities.discover') :
                        t('booking.activities.orientation')
                      }
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Date:</strong> {formData.date}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Time:</strong> {getAvailableTimes().find(t => t.value === formData.time)?.label || formData.time}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Location:</strong> {formData.location === 'caleta' ? t('booking.locations.caleta') : t('booking.locations.playitas')}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Total Paid:</strong> €{calculatePrice().toFixed(2)}
                    </Typography>
                  </CardContent>
                </Card>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/my-account')}
                  >
                    View My Bookings
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      // Reset form
                      setFormData({
                        location: 'caleta',
                        date: '',
                        time: '09:00',
                        activityType: 'diving',
                        numberOfDives: 1,
                        experienceLevel: 'intermediate',
                        firstName: '',
                        lastName: '',
                        email: '',
                        phone: '',
                        specialRequirements: '',
                        paymentMethod: 'card',
                        cardNumber: '',
                        cardExpiry: '',
                        cardCVC: '',
                        cardName: '',
                        acceptTerms: false
                      });
                      setActiveStep(0);
                      setBookingConfirmed(false);
                      setBookingResult(null);
                    }}
                  >
                    Book Another Dive
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}

        {activeStep < 4 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0 || loading}
              onClick={handleBack}
            >
              {t('common.back')}
            </Button>
            {activeStep === 3 ? (
              <Button
                variant="contained"
                onClick={handlePayment}
                disabled={loading || !formData.acceptTerms}
                startIcon={loading ? <CircularProgress size={20} /> : <CreditCardIcon />}
              >
                {loading ? 'Processing Payment...' : 'Pay & Confirm Booking'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={loading}
              >
                {t('common.next')}
              </Button>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default BookDive;

