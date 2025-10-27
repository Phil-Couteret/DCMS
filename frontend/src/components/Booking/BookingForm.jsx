import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  Alert
} from '@mui/material';
import { Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dataService from '../../services/dataService';
import VolumeDiscountCalculator from './VolumeDiscountCalculator';

const BookingForm = ({ bookingId = null }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    customerId: '',
    locationId: '550e8400-e29b-41d4-a716-446655440001', // Caleta de Fuste
    boatId: '',
    diveSiteId: '',
    bookingDate: new Date().toISOString().split('T')[0],
    activityType: 'diving',
    numberOfDives: 1,
    price: 46.00,
    discount: 0,
    totalPrice: 46.00,
    status: 'pending',
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    bonoId: '',
    governmentPayment: 0,
    customerPayment: 0,
    equipmentNeeded: [],
    specialRequirements: '',
    addons: {
      nightDive: false,
      personalInstructor: false
    }
  });

  const [customers, setCustomers] = useState([]);
  const [boats, setBoats] = useState([]);
  const [diveSites, setDiveSites] = useState([]);
  const [bonos, setBonos] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadData();
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  useEffect(() => {
    calculatePrice();
  }, [formData.numberOfDives, formData.addons, formData.bonoId]);

  const loadData = () => {
    setCustomers(dataService.getAll('customers'));
    setBoats(dataService.getAll('boats'));
    setDiveSites(dataService.getAll('diveSites'));
    setBonos(dataService.getAll('governmentBonos'));
  };

  const loadBooking = () => {
    const booking = dataService.getById('bookings', bookingId);
    if (booking) {
      setFormData(booking);
    }
  };

  const calculatePrice = () => {
    const addons = {
      nightDive: formData.addons.nightDive ? 1 : 0,
      personalInstructor: formData.addons.personalInstructor ? 1 : 0
    };
    
    const price = dataService.calculatePrice(formData.numberOfDives, addons);
    let totalPrice = price;
    let discount = 0;
    let governmentPayment = 0;
    let customerPayment = totalPrice;

    // Apply bono discount if selected
    if (formData.bonoId) {
      const bono = bonos.find(b => b.id === formData.bonoId);
      if (bono && bono.type === 'discount_code') {
        discount = (totalPrice * bono.discountPercentage) / 100;
        discount = Math.min(discount, bono.maxAmount);
        governmentPayment = discount;
        customerPayment = totalPrice - discount;
        totalPrice = totalPrice - discount;
      }
    }

    setFormData(prev => ({
      ...prev,
      price,
      discount,
      totalPrice,
      governmentPayment,
      customerPayment
    }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddonChange = (addon, checked) => {
    setFormData(prev => ({
      ...prev,
      addons: {
        ...prev.addons,
        [addon]: checked
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (bookingId) {
      dataService.update('bookings', bookingId, formData);
    } else {
      dataService.create('bookings', formData);
    }
    
    setSaved(true);
    setTimeout(() => {
      navigate('/bookings');
    }, 1500);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {bookingId ? 'Edit Booking' : 'New Booking'}
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Booking saved successfully!
        </Alert>
      )}

      <Paper sx={{ p: 3, mt: 2 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Customer Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Customer</InputLabel>
                <Select
                  value={formData.customerId}
                  onChange={(e) => handleChange('customerId', e.target.value)}
                  required
                >
                  <MenuItem value="">Select Customer</MenuItem>
                  {customers.map(customer => (
                    <MenuItem key={customer.id} value={customer.id}>
                      {customer.firstName} {customer.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Booking Date */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Booking Date"
                type="date"
                fullWidth
                value={formData.bookingDate}
                onChange={(e) => handleChange('bookingDate', e.target.value)}
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Boat Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Boat</InputLabel>
                <Select
                  value={formData.boatId}
                  onChange={(e) => handleChange('boatId', e.target.value)}
                >
                  <MenuItem value="">Select Boat</MenuItem>
                  {boats.map(boat => (
                    <MenuItem key={boat.id} value={boat.id}>
                      {boat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Dive Site */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Dive Site</InputLabel>
                <Select
                  value={formData.diveSiteId}
                  onChange={(e) => handleChange('diveSiteId', e.target.value)}
                >
                  <MenuItem value="">Select Dive Site</MenuItem>
                  {diveSites.map(site => (
                    <MenuItem key={site.id} value={site.id}>
                      {site.name} - {site.difficultyLevel}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Number of Dives */}
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

            {/* Activity Type */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Activity Type</InputLabel>
                <Select
                  value={formData.activityType}
                  onChange={(e) => handleChange('activityType', e.target.value)}
                  required
                >
                  <MenuItem value="diving">Diving</MenuItem>
                  <MenuItem value="snorkeling">Snorkeling</MenuItem>
                  <MenuItem value="try_dive">Try Dive</MenuItem>
                  <MenuItem value="discovery">Discovery</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Divider sx={{ my: 2, width: '100%' }} />

            {/* Addons */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Addons
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.addons.nightDive}
                    onChange={(e) => handleAddonChange('nightDive', e.target.checked)}
                  />
                }
                label="Night Dive (+€20)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.addons.personalInstructor}
                    onChange={(e) => handleAddonChange('personalInstructor', e.target.checked)}
                  />
                }
                label="Personal Instructor (+€100)"
              />
            </Grid>

            <Divider sx={{ my: 2, width: '100%' }} />

            {/* Government Bono */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Government Bono (Canary Islands)</InputLabel>
                <Select
                  value={formData.bonoId}
                  onChange={(e) => handleChange('bonoId', e.target.value)}
                >
                  <MenuItem value="">None</MenuItem>
                  {bonos.map(bono => (
                    <MenuItem key={bono.id} value={bono.id}>
                      {bono.code} - {bono.discountPercentage}% discount
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Payment Method */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={formData.paymentMethod}
                  onChange={(e) => handleChange('paymentMethod', e.target.value)}
                  required
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="stripe">Stripe</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="voucher">Voucher</MenuItem>
                  <MenuItem value="government_bono">Government Bono</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Divider sx={{ my: 2, width: '100%' }} />

            {/* Volume Discount Calculator */}
            <Grid item xs={12}>
              <VolumeDiscountCalculator 
                numberOfDives={formData.numberOfDives}
                addons={formData.addons}
                bono={bonos.find(b => b.id === formData.bonoId)}
              />
            </Grid>

            {/* Total Price Display */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3, bgcolor: 'primary.main', color: 'white' }}>
                <Typography variant="h6" gutterBottom>
                  Total Price Breakdown
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Base Price ({formData.numberOfDives} dives):</Typography>
                  <Typography>€{formData.price.toFixed(2)}</Typography>
                </Box>
                {formData.discount > 0 && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>Bono Discount:</Typography>
                      <Typography>-€{formData.discount.toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>Government Payment:</Typography>
                      <Typography>€{formData.governmentPayment.toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>Customer Payment:</Typography>
                      <Typography>€{formData.customerPayment.toFixed(2)}</Typography>
                    </Box>
                  </>
                )}
                <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">TOTAL:</Typography>
                  <Typography variant="h6">€{formData.totalPrice.toFixed(2)}</Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Actions */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={() => navigate('/bookings')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                >
                  {bookingId ? 'Update' : 'Create'} Booking
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default BookingForm;

