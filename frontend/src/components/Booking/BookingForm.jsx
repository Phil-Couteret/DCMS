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
    ownEquipment: false,
    rentedEquipment: {
      completeEquipment: false, // €13 for first 8 dives only
      Suit: false, // €5
      BCD: false, // €5
      Regulator: false, // €5
      Torch: false, // €5
      Computer: false, // €3
      UWCamera: false, // €20
      // Fins, Boots, Masks are free (included in dive price) - but can still be tracked
      Mask: false, // Free
      Fins: false, // Free
      Boots: false // Free
    },
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('BookingForm mounted, bookingId:', bookingId);
    console.log('localStorage keys:', Object.keys(localStorage).filter(key => key.startsWith('dcms_')));
    loadData();
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  useEffect(() => {
    calculatePrice();
  }, [formData.numberOfDives, formData.addons, formData.bonoId, formData.ownEquipment, formData.rentedEquipment]);

  const loadData = () => {
    try {
      const customersData = dataService.getAll('customers');
      const boatsData = dataService.getAll('boats');
      const diveSitesData = dataService.getAll('diveSites');
      const bonosData = dataService.getAll('governmentBonos');
      
      console.log('Loaded data:', {
        customers: customersData.length,
        boats: boatsData.length,
        diveSites: diveSitesData.length,
        bonos: bonosData.length
      });
      
      setCustomers(customersData);
      setBoats(boatsData);
      setDiveSites(diveSitesData);
      setBonos(bonosData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const loadBooking = () => {
    const booking = dataService.getById('bookings', bookingId);
    if (booking) {
      setFormData(booking);
    }
  };

  const calculatePrice = () => {
    const addons = {
      nightDive: formData.addons?.nightDive ? 1 : 0,
      personalInstructor: formData.addons?.personalInstructor ? 1 : 0
    };
    
    const price = dataService.calculatePrice(formData.numberOfDives, addons);
    
    // Calculate equipment rental cost
    let equipmentRental = 0;
    
    if (!formData.ownEquipment && formData.rentedEquipment) {
      // Check if customer has already used 8 dives worth of complete equipment
      let previousCompleteEquipmentDives = 0;
      if (formData.customerId) {
        const customerBookings = dataService.getCustomerBookings(formData.customerId);
        customerBookings.forEach(booking => {
          if (booking.rentedEquipment?.completeEquipment) {
            previousCompleteEquipmentDives += booking.numberOfDives || 0;
          }
        });
      }
      
      const remainingCompleteEquipmentDives = Math.max(0, 8 - previousCompleteEquipmentDives);
      
      // Complete Equipment: €13 for first 8 dives only
      if (formData.rentedEquipment.completeEquipment) {
        const completeEquipmentDives = Math.min(formData.numberOfDives, remainingCompleteEquipmentDives);
        equipmentRental += completeEquipmentDives * 13;
      }
      
      // Individual equipment pricing (Fins, Boots, Masks are free - included in dive price)
      // Note: Individual equipment is only charged if complete equipment is NOT selected
      // UW Camera can be added regardless
      const equipmentPrices = {
        Suit: 5,
        BCD: 5,
        Regulator: 5,
        Torch: 5,
        Computer: 3,
        UWCamera: 20
      };
      
      Object.entries(formData.rentedEquipment).forEach(([equipment, isRented]) => {
        // Skip completeEquipment and free items (Mask, Fins, Boots)
        if (equipment === 'completeEquipment' || equipment === 'Mask' || equipment === 'Fins' || equipment === 'Boots') {
          return;
        }
        // If complete equipment is selected, skip individual equipment (except UW Camera)
        if (formData.rentedEquipment.completeEquipment && equipment !== 'UWCamera') {
          return;
        }
        if (isRented && equipmentPrices[equipment]) {
          equipmentRental += equipmentPrices[equipment] * formData.numberOfDives;
        }
      });
    }
    
    let totalPrice = price + equipmentRental;
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
        ...(prev.addons || {}),
        [addon]: checked
      }
    }));
  };

  const handleEquipmentChange = (equipmentType, checked) => {
    setFormData(prev => ({
      ...prev,
      rentedEquipment: {
        ...(prev.rentedEquipment || {}),
        [equipmentType]: checked
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

      {loading ? (
        <Paper sx={{ p: 3, mt: 2, textAlign: 'center' }}>
          <Typography>Loading booking form...</Typography>
        </Paper>
      ) : (
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

            {/* Boat and Dive Site will be selected after the dive for Spanish regulation compliance */}

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
                    checked={formData.addons?.nightDive || false}
                    onChange={(e) => handleAddonChange('nightDive', e.target.checked)}
                  />
                }
                label="Night Dive (+€20)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.addons?.personalInstructor || false}
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

            {/* Own Equipment */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.ownEquipment}
                    onChange={(e) => handleChange('ownEquipment', e.target.checked)}
                  />
                }
                label="Customer brings own equipment (no equipment rental fee)"
              />
            </Grid>

            {/* Individual Equipment Rental */}
            {!formData.ownEquipment && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Equipment Rental Selection
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Complete equipment: €13 per dive for first 8 dives only, then free. Or select individual equipment.
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {/* Complete Equipment */}
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.rentedEquipment?.completeEquipment || false}
                          onChange={(e) => handleEquipmentChange('completeEquipment', e.target.checked)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            Complete Equipment - €13 per dive (first 8 dives only, then free)
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Includes: Suit, BCD, Regulator, Torch, Computer, Mask, Fins, Boots
                          </Typography>
                        </Box>
                      }
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" fontWeight="medium" gutterBottom>
                      Or select individual equipment:
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.rentedEquipment?.BCD || false}
                          onChange={(e) => handleEquipmentChange('BCD', e.target.checked)}
                          disabled={formData.rentedEquipment?.completeEquipment}
                        />
                      }
                      label="BCD (€5)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.rentedEquipment?.Regulator || false}
                          onChange={(e) => handleEquipmentChange('Regulator', e.target.checked)}
                          disabled={formData.rentedEquipment?.completeEquipment}
                        />
                      }
                      label="Regulator (€5)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.rentedEquipment?.Mask || false}
                          onChange={(e) => handleEquipmentChange('Mask', e.target.checked)}
                          disabled={formData.rentedEquipment?.completeEquipment}
                        />
                      }
                      label="Mask (Free)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.rentedEquipment?.Fins || false}
                          onChange={(e) => handleEquipmentChange('Fins', e.target.checked)}
                          disabled={formData.rentedEquipment?.completeEquipment}
                        />
                      }
                      label="Fins (Free)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.rentedEquipment?.Boots || false}
                          onChange={(e) => handleEquipmentChange('Boots', e.target.checked)}
                          disabled={formData.rentedEquipment?.completeEquipment}
                        />
                      }
                      label="Boots (Free)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.rentedEquipment?.Suit || false}
                          onChange={(e) => handleEquipmentChange('Suit', e.target.checked)}
                          disabled={formData.rentedEquipment?.completeEquipment}
                        />
                      }
                      label="Suit (€5)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.rentedEquipment?.Computer || false}
                          onChange={(e) => handleEquipmentChange('Computer', e.target.checked)}
                          disabled={formData.rentedEquipment?.completeEquipment}
                        />
                      }
                      label="Computer (€3)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.rentedEquipment?.Torch || false}
                          onChange={(e) => handleEquipmentChange('Torch', e.target.checked)}
                          disabled={formData.rentedEquipment?.completeEquipment}
                        />
                      }
                      label="Torch (€5)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.rentedEquipment?.UWCamera || false}
                          onChange={(e) => handleEquipmentChange('UWCamera', e.target.checked)}
                        />
                      }
                      label="UW Camera (€20)"
                    />
                  </Grid>
                </Grid>
              </Grid>
            )}

            <Divider sx={{ my: 2, width: '100%' }} />

            {/* Volume Discount Calculator */}
            <Grid item xs={12}>
              <VolumeDiscountCalculator 
                numberOfDives={formData.numberOfDives}
                addons={formData.addons || {}}
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
      )}
    </Box>
  );
};

export default BookingForm;

