import React, { useState } from 'react';
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
  StepLabel
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const BookDive = () => {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);
  
  const steps = [t('booking.step1'), t('booking.step2'), t('booking.step3')];
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
    specialRequirements: ''
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

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    // Submit booking
    console.log('Booking submitted:', formData);
    alert('Booking submitted! (This is a prototype - backend integration pending)');
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
              <Typography variant="body2" gutterBottom>
                <strong>{t('booking.activity')}</strong> {
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
                <strong>{formData.activityType === 'diving' ? t('booking.numberOfDives') : t('booking.numberOfSessions')}:</strong> {formData.numberOfDives}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>{t('booking.name')}:</strong> {formData.firstName} {formData.lastName}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>{t('booking.email')}:</strong> {formData.email}
              </Typography>
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                {t('common.totalPrice')} €{calculatePrice().toFixed(2)}
              </Typography>
            </Grid>
          </Grid>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            {t('common.back')}
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              startIcon={<SaveIcon />}
            >
              {t('booking.confirmBooking')}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
            >
              {t('common.next')}
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default BookDive;

