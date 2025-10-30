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
import stayService from '../../services/stayService';
import VolumeDiscountCalculator from './VolumeDiscountCalculator';

const BookingForm = ({ bookingId = null }) => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState({
    customerId: '',
    locationId: '550e8400-e29b-41d4-a716-446655440001', // Caleta de Fuste
    boatId: '',
    diveSiteId: '',
    bookingDate: new Date().toISOString().split('T')[0],
    activityType: 'diving',
    diveSessions: {
      morning: false,  // 9:00 AM dive
      afternoon: false, // 12:00 PM dive
      night: false     // Night dive (+€20)
    },
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
    loadSettings();
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  useEffect(() => {
    calculatePrice();
  }, [formData.diveSessions, formData.addons, formData.bonoId, formData.ownEquipment, formData.rentedEquipment, settings]);

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

  const loadSettings = () => {
    try {
      const settingsData = dataService.getAll('settings')[0];
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadBooking = () => {
    const booking = dataService.getById('bookings', bookingId);
    if (booking) {
      setFormData(booking);
    }
  };

  const calculatePrice = () => {
    // Return early if settings not loaded yet
    if (!settings) {
      return;
    }
    
    // Calculate number of dives based on selected sessions
    const numberOfDives = (formData.diveSessions.morning ? 1 : 0) + (formData.diveSessions.afternoon ? 1 : 0) + (formData.diveSessions.night ? 1 : 0);
    
    // Get cumulative pricing for this customer's stay
    let cumulativePricing = null;
    let pricePerDive = 46; // Default price
    
    if (formData.customerId) {
      cumulativePricing = stayService.getCumulativeStayPricing(formData.customerId, formData.bookingDate);
      pricePerDive = cumulativePricing.pricePerDive;
    }
    
    // Calculate base price using cumulative pricing
    const basePrice = numberOfDives * pricePerDive;
    
    // Calculate night dive surcharge
    let nightDiveSurcharge = 0;
    if (formData.diveSessions.night) {
      nightDiveSurcharge = 20; // Night dive surcharge
    }
    
    // Calculate other addon prices
    const addons = {
      personalInstructor: formData.addons?.personalInstructor ? 1 : 0
    };
    
    let addonPrice = 0;
    if (addons.personalInstructor) {
      addonPrice += 100; // Personal instructor addon
    }
    
    const price = basePrice + nightDiveSurcharge + addonPrice;
    
    // Calculate equipment rental cost
    let equipmentRental = 0;
    
    if (!formData.ownEquipment && formData.rentedEquipment) {
      // Check if customer has already used 8 dives worth of complete equipment
      let previousCompleteEquipmentDives = 0;
      if (formData.customerId) {
        const customerBookings = dataService.getCustomerBookings(formData.customerId);
        customerBookings.forEach(booking => {
          if (booking.rentedEquipment?.completeEquipment) {
            // Calculate previous dives from old format or new format
            const previousDives = booking.numberOfDives || 
              ((booking.diveSessions?.morning ? 1 : 0) + (booking.diveSessions?.afternoon ? 1 : 0));
            previousCompleteEquipmentDives += previousDives;
          }
        });
      }
      
      const remainingCompleteEquipmentDives = Math.max(0, 8 - previousCompleteEquipmentDives);
      
      // Complete Equipment: €13 for first 8 dives only
      if (formData.rentedEquipment.completeEquipment) {
        const completeEquipmentDives = Math.min(numberOfDives, remainingCompleteEquipmentDives);
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
          equipmentRental += equipmentPrices[equipment] * numberOfDives;
        }
      });
    }
    
    // Calculate dive insurance (mandatory for all divers)
    let diveInsurance = 0;
    if (settings.prices.diveInsurance) {
      // For now, we'll use one_day insurance as default
      // In a real implementation, this would be based on the stay duration
      diveInsurance = settings.prices.diveInsurance.one_day || 7.00;
    }
    
    let totalPrice = price + equipmentRental + diveInsurance;
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
      customerPayment,
      equipmentRental,
      diveInsurance,
      cumulativePricing // Store cumulative pricing info for display
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

  const handleDiveSessionChange = (session, checked) => {
    setFormData(prev => ({
      ...prev,
      diveSessions: {
        ...(prev.diveSessions || {}),
        [session]: checked
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

            {/* Dive Sessions */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Dive Sessions
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Select which dive sessions the customer will participate in:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.diveSessions?.morning || false}
                      onChange={(e) => handleDiveSessionChange('morning', e.target.checked)}
                    />
                  }
                  label="Morning Dive (9:00 AM)"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.diveSessions?.afternoon || false}
                      onChange={(e) => handleDiveSessionChange('afternoon', e.target.checked)}
                    />
                  }
                  label="Afternoon Dive (12:00 PM)"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.diveSessions?.night || false}
                      onChange={(e) => handleDiveSessionChange('night', e.target.checked)}
                    />
                  }
                  label="Night Dive (+€20)"
                />
              </Box>
              {!formData.diveSessions?.morning && !formData.diveSessions?.afternoon && !formData.diveSessions?.night && (
                <Typography variant="caption" color="error">
                  Please select at least one dive session
                </Typography>
              )}
            </Grid>

            {/* Cumulative Pricing Information */}
            {formData.customerId && formData.cumulativePricing && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
                  <Typography variant="h6" gutterBottom>
                    Cumulative Stay Pricing
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Total dives in stay:</strong> {formData.cumulativePricing.totalDives} dives
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Price per dive:</strong> €{formData.cumulativePricing.pricePerDive.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Total stay price:</strong> €{formData.cumulativePricing.totalPrice.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    All dives in this stay are priced at the same rate based on total volume
                  </Typography>
                </Paper>
              </Grid>
            )}

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
                numberOfDives={(formData.diveSessions?.morning ? 1 : 0) + (formData.diveSessions?.afternoon ? 1 : 0) + (formData.diveSessions?.night ? 1 : 0)}
                addons={formData.addons || {}}
                bono={bonos.find(b => b.id === formData.bonoId)}
              />
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

