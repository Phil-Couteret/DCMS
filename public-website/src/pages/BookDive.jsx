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

const steps = ['Select Activity', 'Enter Details', 'Review & Confirm'];

const BookDive = () => {
  const [activeStep, setActiveStep] = useState(0);
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
          { value: '10:00', label: '10:00 AM' },
          { value: '11:00', label: '11:00 AM' },
          { value: '12:00', label: '12:00 PM' },
          { value: '13:00', label: '1:00 PM' },
          { value: '14:00', label: '2:00 PM' }
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

  // Get available times for a specific activity type
  const getAvailableTimesForActivity = (activityType) => {
    switch (activityType) {
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
          { value: '10:00', label: '10:00 AM' },
          { value: '11:00', label: '11:00 AM' },
          { value: '12:00', label: '12:00 PM' },
          { value: '13:00', label: '1:00 PM' },
          { value: '14:00', label: '2:00 PM' }
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
      // Snorkeling pricing: €25 per session
      return 25 * formData.numberOfDives;
    } else if (formData.activityType === 'discover') {
      // Discover Scuba pricing: €65 per session (includes equipment and instructor)
      return 65 * formData.numberOfDives;
    } else {
      // Diving pricing with volume discounts
      const basePrice = formData.numberOfDives === 1 ? 46 : formData.numberOfDives === 2 ? 44 : 42;
      return basePrice * formData.numberOfDives;
    }
  };

  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom>
        Book Your Activity
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
                <InputLabel>Activity Type</InputLabel>
                <Select
                  value={formData.activityType}
                  onChange={(e) => handleChange('activityType', e.target.value)}
                >
                  <MenuItem value="diving">Scuba Diving</MenuItem>
                  <MenuItem value="snorkeling">Snorkeling</MenuItem>
                  <MenuItem value="discover">Discover Scuba</MenuItem>
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
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Time</InputLabel>
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
                label={formData.activityType === 'diving' ? 'Number of Dives' : 'Number of Sessions'}
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
                <InputLabel>Experience Level</InputLabel>
                <Select
                  value={formData.experienceLevel}
                  onChange={(e) => handleChange('experienceLevel', e.target.value)}
                >
                  <MenuItem value="beginner">Beginner</MenuItem>
                  <MenuItem value="intermediate">Intermediate</MenuItem>
                  <MenuItem value="advanced">Advanced</MenuItem>
                  <MenuItem value="expert">Expert</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Estimated Price: €{calculatePrice().toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formData.activityType === 'diving' 
                  ? 'Volume discounts apply automatically for multiple dives'
                  : formData.activityType === 'snorkeling'
                  ? 'Snorkeling equipment included'
                  : 'Discover Scuba includes equipment and instructor'
                }
              </Typography>
            </Grid>
          </Grid>
        )}

        {activeStep === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="First Name"
                fullWidth
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Last Name"
                fullWidth
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
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
                label="Special Requirements or Medical Conditions"
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
                Booking Summary
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Activity:</strong> {
                  formData.activityType === 'diving' ? 'Scuba Diving' : 
                  formData.activityType === 'snorkeling' ? 'Snorkeling' : 
                  'Discover Scuba'
                }
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Location:</strong> {formData.location === 'caleta' ? 'Caleta de Fuste' : 'Las Playitas'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Date:</strong> {formData.date}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Number of {formData.activityType === 'diving' ? 'Dives' : 'Sessions'}:</strong> {formData.numberOfDives}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Name:</strong> {formData.firstName} {formData.lastName}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Email:</strong> {formData.email}
              </Typography>
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                Total Price: €{calculatePrice().toFixed(2)}
              </Typography>
            </Grid>
          </Grid>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Back
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              startIcon={<SaveIcon />}
            >
              Confirm Booking
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
            >
              Next
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default BookDive;

