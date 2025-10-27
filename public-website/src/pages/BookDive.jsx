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

const steps = ['Select Dive', 'Enter Details', 'Review & Confirm'];

const BookDive = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    location: 'caleta',
    date: '',
    time: '09:00',
    numberOfDives: 1,
    experienceLevel: 'intermediate',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialRequirements: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    const basePrice = formData.numberOfDives === 1 ? 46 : formData.numberOfDives === 2 ? 44 : 42;
    return basePrice * formData.numberOfDives;
  };

  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom>
        Book Your Dive
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
              <TextField
                label="Time"
                type="time"
                fullWidth
                value={formData.time}
                onChange={(e) => handleChange('time', e.target.value)}
                select
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Number of Dives"
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
                Volume discounts apply automatically for multiple dives
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
                <strong>Location:</strong> {formData.location === 'caleta' ? 'Caleta de Fuste' : 'Las Playitas'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Date:</strong> {formData.date}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Number of Dives:</strong> {formData.numberOfDives}
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

