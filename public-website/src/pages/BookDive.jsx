import React, { useState, useEffect, useRef } from 'react';
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
  Checkbox,
  FormGroup,
  FormLabel
} from '@mui/material';
import { Save as SaveIcon, CreditCard as CreditCardIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import bookingService, { requiresMedicalCertificate, hasValidMedicalCertificate } from '../services/bookingService';
import { calculateDivePriceWithPacks, calculateActivityPrice, getCustomerType } from '../services/pricingService';

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

const getDefaultEquipmentOwnership = () =>
  EQUIPMENT_ITEMS.reduce((acc, item) => {
    acc[item.key] = false;
    return acc;
  }, {});

const getFullEquipmentOwnership = () =>
  EQUIPMENT_ITEMS.reduce((acc, item) => {
    acc[item.key] = true;
    return acc;
  }, {});

const EQUIPMENT_LABEL_MAP = {
  mask: 'Mask',
  fins: 'Fins',
  boots: 'Boots',
  wetsuit: 'Wetsuit',
  bcd: 'BCD',
  regulator: 'Regulator',
  computer: 'Dive Computer',
  torch: 'Torch'
};

const mapOwnershipToEquipmentNeeded = (ownership = {}) => {
  const needed = Object.entries(EQUIPMENT_LABEL_MAP)
    .filter(([key]) => !ownership[key])
    .map(([, label]) => label);
  // Tanks are always provided by the center
  needed.push('Tank');
  return needed;
};

const getDefaultSuitPreferences = () => ({
  style: 'full', // 'shorty' | 'full'
  thickness: '5mm', // '3mm' | '5mm' | '7mm'
  hood: false
});

const BookDive = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [bookingCreated, setBookingCreated] = useState(false);
  
  // Check if user is registered
  const isRegistered = !!localStorage.getItem('dcms_user_email');
  const syncedEmailsRef = useRef(new Set());

  const [formData, setFormData] = useState({
    location: 'caleta',
    date: '',
    time: '09:00',
    activityType: 'diving',
    numberOfDives: 1, // For Scuba, always start with 1
    withEquipment: false,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '', // For new customers
    confirmPassword: '', // For new customers
    specialRequirements: '',
    paymentMethod: 'card',
    cardNumber: '',
    cardExpiry: '',
    cardCVC: '',
    cardName: '',
    acceptTerms: false,
    hasMedicalCertificate: false, // For diving activities
    // Medical certificate details
    medicalCertificateNumber: '',
    medicalCertificateIssuedDate: '',
    medicalCertificateExpirationDate: '',
    medicalCertificateIssuedBy: '',
    // Equipment details (for Scuba only)
    equipmentOwnership: getDefaultEquipmentOwnership(),
    ownEquipment: false,
    tankSize: '12L',
    bcdSize: '',
    finsSize: '',
    bootsSize: '',
    wetsuitSize: '',
    suitPreferences: getDefaultSuitPreferences()
  });

  // Check if customer exists (to determine if password is needed)
  const [existingCustomer, setExistingCustomer] = useState(null);
  
  // Check approval status for logged-in users
  const [approvalStatus, setApprovalStatus] = useState({ checked: false, isApproved: null });
  
  // For Scuba: Step 0 (activity selection), Step 1 (basic info), Step 2 (create booking), Step 3 (equipment details), Step 4 (confirmation)
  // For Discovery/Orientation: Step 0 (activity selection), Step 1 (basic info), Step 2 (create booking), Step 3 (confirmation)
  const getSteps = () => {
    if (formData.activityType === 'diving') {
      return [
        t('booking.step1') || 'Select Activity',
        t('booking.step2') || 'Your Information',
        'Confirm Booking',
        'Equipment Details',
        t('booking.step5') || 'Confirmation'
      ];
    } else {
      return [
        t('booking.step1') || 'Select Activity',
        t('booking.step2') || 'Your Information',
        'Confirm Booking',
        t('booking.step5') || 'Confirmation'
      ];
    }
  };

  useEffect(() => {
    const checkApproval = async () => {
      if (isRegistered && formData.activityType === 'diving') {
        const userEmail = localStorage.getItem('dcms_user_email');
        if (userEmail) {
          const customer = await bookingService.getCustomerByEmail(userEmail);
          setApprovalStatus({ checked: true, isApproved: customer?.isApproved || false });
        }
      } else {
        setApprovalStatus({ checked: false, isApproved: null });
      }
    };
    checkApproval();
  }, [isRegistered, formData.activityType]);

  useEffect(() => {
    const email = formData.email?.trim().toLowerCase();
    if (!email) {
      setExistingCustomer(null);
      return;
    }
    
    // Check if customer exists (async - fetch from server)
    const checkCustomer = async () => {
      const existing = await bookingService.getCustomerByEmail(email);
      setExistingCustomer(existing);
      
      if (!existing || syncedEmailsRef.current.has(email)) {
        return;
      }
      
      // Customer exists - mark as synced (no need for syncNow since we fetch directly from server)
      syncedEmailsRef.current.add(email);
    };
    
    checkCustomer().catch(err => {
      console.warn('[Booking] Failed to check customer:', err);
    });
  }, [formData.email]);

  // Get available times based on activity type
  const getAvailableTimes = () => {
    switch (formData.activityType) {
      case 'diving':
        return [
          { value: '09:00', label: '9:00 AM' },
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
        const availableTimes = getAvailableTimes();
        newData.time = availableTimes[0]?.value || '09:00';
        // For Scuba, reset to 1 dive
        if (value === 'diving') {
          newData.numberOfDives = 1;
        }
      }
      
      return newData;
    });
  };

  // Check availability when date/time/location changes
  useEffect(() => {
    if (formData.date && formData.time && formData.location) {
      const checkAvailability = async () => {
        const availabilityCheck = await bookingService.checkAvailability(
          formData.date,
          formData.time,
          formData.location,
          formData.activityType
        );
        setAvailability(availabilityCheck);
      };
      checkAvailability();
    }
  }, [formData.date, formData.time, formData.location, formData.activityType]);

  const handleNext = async () => {
    setError(null);
    
    // Step 0: Activity selection
    if (activeStep === 0) {
      if (!formData.date || !formData.time || !formData.location) {
        setError('Please fill in all required fields');
        return;
      }
      if (availability && !availability.available) {
        setError('This time slot is fully booked. Please select another time.');
        return;
      }
      
      // For diving activity, check if customer is registered and approved
      if (formData.activityType === 'diving') {
        const userEmail = localStorage.getItem('dcms_user_email');
        if (!userEmail) {
          setError('Scuba diving is only available for registered customers. Please create an account first or log in to your account. Discovery, orientation, and snorkeling are available for everyone.');
          return;
        }
        
        // Check if customer is approved
        const customer = await bookingService.getCustomerByEmail(userEmail);
        if (!customer || !customer.isApproved) {
          setError('Your account is pending approval. The diving center needs to assess your diving level before you can book scuba dives. Discovery, orientation, and snorkeling are available for everyone.');
          return;
        }
      }
      
      setActiveStep(1);
    }
    // Step 1: Basic information
    else if (activeStep === 1) {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
        setError('Please fill in all required fields');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        return;
      }
      
      // If customer doesn't exist, require password (async - fetch from server)
      const email = formData.email?.trim().toLowerCase();
      const customer = await bookingService.getCustomerByEmail(email);
      if (!customer) {
        // New customer - password is required
        if (!formData.password || formData.password.length < 6) {
          setError('Password is required and must be at least 6 characters long');
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
      } else {
        // Existing customer - clear password fields (not needed)
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      }
      
      setActiveStep(2); // Review/Confirm step
    }
    // Step 2: Review and create booking
    else if (activeStep === 2) {
      // Check medical certificate checkbox for diving activities
      if (requiresMedicalCertificate(formData.activityType)) {
        // Only check if checkbox is checked - actual certificate details will be provided later in profile
        if (!formData.hasMedicalCertificate) {
          setError('A valid medical certificate is required for diving activities. Please confirm that you have a valid medical certificate.');
          return;
        }
      }
      await handleCreateBooking();
    }
    // Step 3: Equipment details (Scuba only)
    else if (activeStep === 3) {
      if (formData.activityType === 'diving') {
        // Save equipment details
        handleSaveEquipmentDetails();
      } else {
        // For other activities, go to confirmation
        setActiveStep(4);
      }
    }
  };

  const handleCreateBooking = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const totalPrice = calculatePrice();
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create booking (include password for new customers) - async
      const result = await bookingService.createBooking({
        ...formData,
        password: formData.password || undefined, // Only include if provided (new customers)
        price: totalPrice,
        totalPrice: totalPrice,
        discount: 0,
        paymentMethod: formData.paymentMethod,
        paymentTransactionId: transactionId
      });
      
      setBookingResult(result);
      setBookingCreated(true);
      
      // Note: Booking is already pushed to server via saveAll in createBooking, no need for syncNow
      
      // For Scuba: go to equipment details step
      // For Discovery/Orientation: go directly to confirmation (medical certificate will be added in profile later)
      // For other activities: go to confirmation
      if (formData.activityType === 'diving') {
        setActiveStep(3);
      } else {
        setBookingConfirmed(true);
        setActiveStep(3); // Confirmation step
      }
      
    } catch (err) {
      setError(err.message || 'Booking creation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEquipmentDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Update customer profile with equipment details
      const customer = bookingService.getCustomerByEmail(formData.email);
      if (customer) {
        bookingService.updateCustomerProfile(formData.email, {
          preferences: {
            ...customer.preferences,
            equipmentOwnership: formData.equipmentOwnership,
            ownEquipment: formData.ownEquipment,
            tankSize: formData.tankSize,
            bcdSize: formData.bcdSize,
            finsSize: formData.finsSize,
            bootsSize: formData.bootsSize,
            wetsuitSize: formData.wetsuitSize,
            suitPreferences: formData.suitPreferences
          }
        });
      }

      const equipmentNeeded = mapOwnershipToEquipmentNeeded(formData.equipmentOwnership);
      if (bookingResult?.booking?.id) {
        const updatedBooking = await bookingService.updateBookingEquipmentDetails(bookingResult.booking.id, {
          ownEquipment: formData.ownEquipment,
          equipmentNeeded
        });
        if (updatedBooking) {
          setBookingResult(prev => prev ? { ...prev, booking: updatedBooking } : prev);
        }
      }
      
      setBookingConfirmed(true);
      setActiveStep(4); // Confirmation step
      
    } catch (err) {
      setError(err.message || 'Failed to save equipment details. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const handleBack = () => {
    setError(null);
    if (activeStep > 0) {
    setActiveStep(prev => prev - 1);
    }
  };

  const calculatePrice = () => {
    // Map location name to locationId (UUID)
    const locationId = formData.location === 'caleta' 
      ? '550e8400-e29b-41d4-a716-446655440001' // Caleta de Fuste
      : '550e8400-e29b-41d4-a716-446655440002'; // Las Playitas
    
    // Get customer if they exist (for registered divers)
    let customer = null;
    if (formData.email) {
      customer = bookingService.getCustomerByEmail(formData.email);
    }
    
    const customerType = getCustomerType(customer);
    
    if (formData.activityType === 'diving') {
      return calculateDivePriceWithPacks(locationId, customerType, formData.numberOfDives, formData.withEquipment);
    } else {
      return calculateActivityPrice(formData.activityType, formData.numberOfDives);
    }
  };

  const steps = getSteps();
  const isScuba = formData.activityType === 'diving';
  const isDiscovery = formData.activityType === 'discover';

  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom>
        {t('booking.title')}
      </Typography>

      {isRegistered && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You are logged in. For faster booking, please use the booking feature in <Button href="/my-account" size="small">My Account</Button>
        </Alert>
      )}
      
      {/* Show message for diving activity if user is not approved */}
      {formData.activityType === 'diving' && isRegistered && approvalStatus.checked && !approvalStatus.isApproved && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Your account is pending approval. Scuba diving is only available for approved customers. 
          You can still book discovery, orientation, or snorkeling activities.
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 4 }}>
        {steps.map((label, index) => (
          <Step key={index}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 4 }}>
        {/* Step 0: Activity Selection */}
        {activeStep === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('booking.activityType')}</InputLabel>
                <Select
                  value={formData.activityType}
                  onChange={(e) => handleChange('activityType', e.target.value)}
                >
                  <MenuItem value="diving">
                    {t('booking.activities.diving')} {!isRegistered && t('booking.registeredOnly')}
                  </MenuItem>
                  <MenuItem value="snorkeling">{t('booking.activities.snorkeling')}</MenuItem>
                  <MenuItem value="discover">{t('booking.activities.discover')}</MenuItem>
                  <MenuItem value="orientation">{t('booking.activities.orientation')}</MenuItem>
                </Select>
              </FormControl>
              {formData.activityType === 'diving' && !isRegistered && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Scuba diving is only available for registered customers. Please create an account or log in to book a dive. 
                  Discovery, orientation, and snorkeling are available for everyone.
                </Alert>
              )}
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
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
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
            {isScuba && (
            <>
            <Grid item xs={12} md={6}>
              <TextField
                  label={t('booking.numberOfDives')}
                type="number"
                fullWidth
                value={formData.numberOfDives}
                onChange={(e) => handleChange('numberOfDives', parseInt(e.target.value) || 1)}
                inputProps={{ min: 1, max: 10 }}
                required
                  helperText="For your first booking, we recommend starting with 1 dive"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!formData.withEquipment}
                    onChange={(e) => handleChange('withEquipment', e.target.checked)}
                  />
                }
                label="Include equipment rental"
              />
            </Grid>
            </>
            )}
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

        {/* Step 1: Basic Information */}
        {activeStep === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {isDiscovery 
                  ? 'Please provide your contact information for your Discovery Dive'
                  : 'Please provide your contact information'
                }
              </Typography>
              {isDiscovery && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No prior diving experience needed! Our instructor will guide you through everything.
                </Alert>
              )}
            </Grid>
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
            {/* Password fields for new customers */}
            {!existingCustomer && (
              <>
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Create a password to access your bookings and account later
                  </Alert>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Password"
                    type="password"
                    fullWidth
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    required
                    helperText="At least 6 characters"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Confirm Password"
                    type="password"
                    fullWidth
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    required
                  />
                </Grid>
              </>
            )}
            {existingCustomer && (
              <Grid item xs={12}>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Welcome back, {existingCustomer.firstName}! You're already registered. You can log in later with your email and password.
                </Alert>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                label={t('booking.specialRequirementsLabel')}
                multiline
                rows={4}
                fullWidth
                value={formData.specialRequirements}
                onChange={(e) => handleChange('specialRequirements', e.target.value)}
                placeholder={isDiscovery ? "Any medical conditions or special requirements we should know about?" : ""}
              />
            </Grid>
            {/* Medical Certificate Checkbox for Diving Activities */}
            {(formData.activityType === 'diving' || formData.activityType === 'discover' || formData.activityType === 'orientation') && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  A valid medical certificate is required for diving activities. You can provide the details after booking.
                </Alert>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.hasMedicalCertificate}
                      onChange={(e) => handleChange('hasMedicalCertificate', e.target.checked)}
                      required
                    />
                  }
                  label="I have a valid medical certificate for diving"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, ml: 4 }}>
                  You can provide your medical certificate details in your profile after booking.
                </Typography>
              </Grid>
            )}
          </Grid>
        )}

        {/* Step 2: Review and Confirm Booking */}
        {activeStep === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Review Your Booking
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
                  {isScuba && (
                    <Typography variant="body2" gutterBottom>
                      <strong>{t('booking.numberOfDives')}:</strong> {formData.numberOfDives}
              </Typography>
                  )}
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
              {isScuba && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  After confirming your booking, you'll be asked to provide equipment details (sizes, preferences, etc.)
                </Alert>
              )}
            </Grid>
          </Grid>
        )}

        {/* Step 3: Equipment Details (Scuba only) */}
        {activeStep === 3 && isScuba && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Equipment Details
              </Typography>
              <Alert severity="info" sx={{ mb: 3 }}>
                Please let us know about your equipment preferences. This helps us prepare everything for your dive.
              </Alert>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.ownEquipment}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData(prev => ({
                        ...prev,
                        ownEquipment: checked,
                        equipmentOwnership: checked
                          ? getFullEquipmentOwnership()
                          : getDefaultEquipmentOwnership()
                      }));
                    }}
                  />
                }
                label="I will bring my own equipment (except tank)"
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {formData.ownEquipment
                  ? 'All gear has been marked as provided. Uncheck any items below if you still need us to supply something.'
                  : 'Let us know which items you already have so we can prepare the remaining gear.'}
              </Typography>
              {/* Equipment Ownership */}
              <FormGroup sx={{ mb: 3 }}>
                <FormLabel component="legend" sx={{ mb: 2 }}>Which equipment do you bring?</FormLabel>
                {EQUIPMENT_ITEMS.map((item) => (
                  <FormControlLabel
                    key={item.key}
                    control={
                      <Checkbox
                        checked={formData.equipmentOwnership[item.key] || false}
                        onChange={(e) => {
                          const newOwnership = {
                            ...formData.equipmentOwnership,
                            [item.key]: e.target.checked
                          };
                          const ownsAll = EQUIPMENT_ITEMS.every((equipment) => newOwnership[equipment.key]);
                          setFormData(prev => ({
                            ...prev,
                            equipmentOwnership: newOwnership,
                            ownEquipment: ownsAll
                          }));
                        }}
                      />
                    }
                    label={item.label}
                  />
                ))}
              </FormGroup>

              {/* Tank Size (always provided by center) */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Tank Size</InputLabel>
                    <Select
                      value={formData.tankSize}
                      onChange={(e) => handleChange('tankSize', e.target.value)}
                    >
                      <MenuItem value="10L">10L</MenuItem>
                      <MenuItem value="12L">12L</MenuItem>
                      <MenuItem value="15L">15L</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary">
                    Tank is always provided by the center
                  </Typography>
                </Grid>
              </Grid>

              {/* Equipment Sizes (only if not bringing own) */}
              {!formData.equipmentOwnership.bcd && (
                <Grid item xs={12} sm={6} sx={{ mb: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>BCD Size</InputLabel>
                    <Select
                      value={formData.bcdSize}
                      onChange={(e) => handleChange('bcdSize', e.target.value)}
                    >
                      <MenuItem value="XS">XS</MenuItem>
                      <MenuItem value="S">S</MenuItem>
                      <MenuItem value="M">M</MenuItem>
                      <MenuItem value="L">L</MenuItem>
                      <MenuItem value="XL">XL</MenuItem>
                      <MenuItem value="XXL">XXL</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {!formData.equipmentOwnership.wetsuit && (
                <>
                  <Grid item xs={12} sm={6} sx={{ mb: 2 }}>
                    <FormControl fullWidth>
                      <InputLabel>Wetsuit Size</InputLabel>
                      <Select
                        value={formData.wetsuitSize}
                        onChange={(e) => handleChange('wetsuitSize', e.target.value)}
                      >
                        <MenuItem value="XS">XS</MenuItem>
                        <MenuItem value="S">S</MenuItem>
                        <MenuItem value="M">M</MenuItem>
                        <MenuItem value="L">L</MenuItem>
                        <MenuItem value="XL">XL</MenuItem>
                        <MenuItem value="XXL">XXL</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {/* Suit Preferences (only if renting wetsuit) */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth>
                        <InputLabel>Suit Style</InputLabel>
                        <Select
                          value={formData.suitPreferences.style}
                          onChange={(e) => handleChange('suitPreferences', {
                            ...formData.suitPreferences,
                            style: e.target.value
                          })}
                        >
                          <MenuItem value="shorty">Shorty</MenuItem>
                          <MenuItem value="full">Full</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth>
                        <InputLabel>Thickness</InputLabel>
                        <Select
                          value={formData.suitPreferences.thickness}
                          onChange={(e) => handleChange('suitPreferences', {
                            ...formData.suitPreferences,
                            thickness: e.target.value
                          })}
                        >
                          <MenuItem value="3mm">3mm</MenuItem>
                          <MenuItem value="5mm">5mm</MenuItem>
                          <MenuItem value="7mm">7mm</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.suitPreferences.hood}
                            onChange={(e) => handleChange('suitPreferences', {
                              ...formData.suitPreferences,
                              hood: e.target.checked
                            })}
                          />
                        }
                        label="With Hood"
                      />
                    </Grid>
                  </Grid>
                </>
              )}

              {!formData.equipmentOwnership.fins && (
                <Grid item xs={12} sm={6} sx={{ mb: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Fins Size</InputLabel>
                    <Select
                      value={formData.finsSize}
                      onChange={(e) => handleChange('finsSize', e.target.value)}
                    >
                      <MenuItem value="XS">XS</MenuItem>
                      <MenuItem value="S">S</MenuItem>
                      <MenuItem value="M">M</MenuItem>
                      <MenuItem value="L">L</MenuItem>
                      <MenuItem value="XL">XL</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {!formData.equipmentOwnership.boots && (
                <Grid item xs={12} sm={6} sx={{ mb: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Boots Size</InputLabel>
                    <Select
                      value={formData.bootsSize}
                      onChange={(e) => handleChange('bootsSize', e.target.value)}
                    >
                      <MenuItem value="XS">XS</MenuItem>
                      <MenuItem value="S">S</MenuItem>
                      <MenuItem value="M">M</MenuItem>
                      <MenuItem value="L">L</MenuItem>
                      <MenuItem value="XL">XL</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </Grid>
        )}

        {/* Step 3/4: Confirmation */}
        {(activeStep === 3 && !isScuba) || (activeStep === 4 && isScuba) ? (
          bookingConfirmed && bookingResult ? (
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
                        <strong>{t('booking.location')}:</strong> {formData.location === 'caleta' ? t('booking.locations.caleta') : t('booking.locations.playitas')}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Total:</strong> €{calculatePrice().toFixed(2)}
                      </Typography>
                    </CardContent>
                  </Card>

                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
                    <Button
                      variant="contained"
                      onClick={() => {
                        localStorage.setItem('dcms_user_email', formData.email);
                        navigate('/my-account');
                      }}
                    >
                      View My Bookings
                    </Button>
          <Button
                      variant="outlined"
                      onClick={() => {
                        setFormData({
                          location: 'caleta',
                          date: '',
                          time: '09:00',
                          activityType: 'diving',
                          numberOfDives: 1,
                          withEquipment: false,
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
                          acceptTerms: false,
                          hasMedicalCertificate: false,
                          medicalCertificateNumber: '',
                          medicalCertificateIssuedDate: '',
                          medicalCertificateExpirationDate: '',
                          medicalCertificateIssuedBy: '',
                          equipmentOwnership: getDefaultEquipmentOwnership(),
                          ownEquipment: false,
                          tankSize: '12L',
                          bcdSize: '',
                          finsSize: '',
                          bootsSize: '',
                          wetsuitSize: '',
                          suitPreferences: getDefaultSuitPreferences()
                        });
                        setActiveStep(0);
                        setBookingConfirmed(false);
                        setBookingResult(null);
                        setBookingCreated(false);
                      }}
                    >
                      Book Another Dive
          </Button>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          ) : null
        ) : null}

        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}

        {activeStep < steps.length - 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0 || loading}
              onClick={handleBack}
            >
              {t('common.back')}
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : (activeStep === 2 ? <SaveIcon /> : null)}
            >
              {loading 
                ? 'Processing...' 
                : activeStep === 2 
                  ? 'Confirm Booking' 
                  : activeStep === 3 && isScuba
                    ? 'Save Equipment Details'
                    : t('common.next')
              }
            </Button>
          </Box>
          )}
      </Paper>
    </Container>
  );
};

export default BookDive;
