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
import { calculateActivityPrice, calculateDivePrice, getCustomerType } from '../../services/pricingService';
import VolumeDiscountCalculator from './VolumeDiscountCalculator';
import { useAuth } from '../../utils/authContext';

const BookingForm = ({ bookingId = null }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState({
    customerId: '',
    locationId: '550e8400-e29b-41d4-a716-446655440001', // Caleta de Fuste
    routeType: '', // playitas_local | caleta_from_playitas | dive_trip
    boatId: '',
    diveSiteId: '',
    bookingDate: new Date().toISOString().split('T')[0],
    activityType: 'diving',
    numberOfDives: 1, // For non-diving activities
    diveSessions: {
      morning: false,  // 9:00 AM dive
      afternoon: false, // 12:00 PM dive
      night: false     // Night dive (+€20)
    },
    price: 46.00,
    discount: 0,
    totalPrice: 46.00,
    status: 'confirmed', // Admin-created bookings are automatically confirmed
    paymentMethod: 'account', // Known customer - payment handled via account
    paymentStatus: 'paid', // Known customer - payment handled separately
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
  const [locations, setLocations] = useState([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('BookingForm mounted, bookingId:', bookingId);
    console.log('localStorage keys:', Object.keys(localStorage).filter(key => key.startsWith('dcms_')));
    loadData();
    loadSettings();
    // Initialize booking location from current selected location tab
    try {
      const storedLocation = localStorage.getItem('dcms_current_location');
      if (currentUser && Array.isArray(currentUser.locationAccess) && currentUser.locationAccess.length > 0) {
        const defaultLocId = currentUser.locationAccess[0];
        setFormData(prev => ({ ...prev, locationId: defaultLocId }));
        localStorage.setItem('dcms_current_location', defaultLocId);
      } else if (storedLocation) {
        setFormData(prev => ({ ...prev, locationId: storedLocation }));
      }
    } catch (_) {
      // ignore
    }
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  // Load customer preferences when customer is selected
  useEffect(() => {
    if (formData.customerId && !bookingId) {
      const customer = dataService.getById('customers', formData.customerId);
      if (customer) {
        // Load customer's ownEquipment preference
        const customerOwnEquipment = customer.preferences?.ownEquipment || false;
        setFormData(prev => ({
          ...prev,
          ownEquipment: customerOwnEquipment
        }));
      }
    }
  }, [formData.customerId, bookingId]);

  useEffect(() => {
    // Only calculate if settings are loaded
    if (settings) {
      calculatePrice();
    }
  }, [formData.diveSessions, formData.addons, formData.bonoId, formData.ownEquipment, formData.rentedEquipment, formData.numberOfDives, formData.activityType, formData.customerId, formData.locationId, formData.routeType, settings]);

  const loadData = () => {
    try {
      const customersData = dataService.getAll('customers');
      const boatsData = dataService.getAll('boats');
      const diveSitesData = dataService.getAll('diveSites');
      const bonosData = dataService.getAll('governmentBonos');
      const locationsData = dataService.getAll('locations');
      
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
      // Prefer user's accessible location first for local admins
      let ordered = locationsData;
      if (currentUser && Array.isArray(currentUser.locationAccess) && currentUser.locationAccess.length > 0) {
        const accessSet = new Set(currentUser.locationAccess);
        ordered = [
          ...locationsData.filter(l => accessSet.has(l.id)),
          ...locationsData.filter(l => !accessSet.has(l.id))
        ];
        const defaultLocId = currentUser.locationAccess[0];
        setFormData(prev => ({ ...prev, locationId: prev.locationId || defaultLocId }));
        localStorage.setItem('dcms_current_location', defaultLocId);
      }
      setLocations(ordered);
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
      // Normalize activity types: try_dive and discovery should both be "discover"
      const normalizedActivityType = booking.activityType === 'try_dive' || booking.activityType === 'discovery' 
        ? 'discover' 
        : booking.activityType;
      
      const normalizedBooking = {
        ...booking,
        activityType: normalizedActivityType,
        // Ensure numberOfDives is set for non-diving activities
        numberOfDives: normalizedActivityType !== 'diving' 
          ? (booking.numberOfDives || 1)
          : undefined,
        // Ensure diveSessions is properly structured
        diveSessions: booking.diveSessions || {
          morning: false,
          afternoon: false,
          night: false
        }
      };
      setFormData(normalizedBooking);
    }
  };

  const calculatePrice = (dataToUse = null) => {
    // Return early if settings not loaded yet
    if (!settings) {
      return;
    }
    
    // Use provided data or current formData
    const data = dataToUse || formData;
    
    // Get location info
    const allLocations = dataService.getAll('locations') || [];
    const storedLocation = localStorage.getItem('dcms_current_location');
    const effectiveLocationId = formData.locationId || storedLocation || allLocations[0]?.id;
    const location = allLocations.find(l => l.id === effectiveLocationId);
    const locPricing = location?.pricing || {};
    
    // Get customer info for pricing
    let customer = null;
    if (formData.customerId) {
      customer = dataService.getById('customers', formData.customerId);
    }
    const customerType = getCustomerType(customer);
    
    // Handle non-diving activities (snorkeling, discover, orientation)
    if (formData.activityType !== 'diving') {
      // For non-diving activities, use numberOfDives from form or default to 1
      const numberOfDives = formData.numberOfDives || 1;
      
      // Calculate base price using pricing service
      const basePrice = calculateActivityPrice(formData.activityType, numberOfDives, effectiveLocationId);
      
      // Non-diving activities (discover, snorkeling, orientation) don't have:
      // - night dives, equipment rental, or transfer fees
      // - dive insurance (insurance is typically included in the activity price or not required)
      let diveInsurance = 0;
      
      // Apply bono discount to base price only (not insurance)
      let discount = 0;
      let governmentPayment = 0;
      if (formData.bonoId) {
        const bono = bonos.find(b => b.id === formData.bonoId);
        if (bono && bono.type === 'discount_code') {
          discount = (basePrice * bono.discountPercentage) / 100;
          discount = Math.min(discount, bono.maxAmount || Infinity);
          governmentPayment = discount;
        }
      }
      
      // Calculate final prices: discount applies to base price, insurance is added after
      const discountedBasePrice = basePrice - discount;
      const totalPrice = discountedBasePrice + diveInsurance;
      const customerPayment = totalPrice;

      setFormData(prev => ({
        ...prev,
        price: basePrice,
        discount,
        totalPrice,
        governmentPayment,
        customerPayment,
        equipmentRental: 0,
        diveInsurance,
        transferFee: 0,
        cumulativePricing: null
      }));
      return;
    }
    
    // Diving activity pricing (existing logic)
    // Calculate number of dives based on selected sessions
    const numberOfDives = (formData.diveSessions.morning ? 1 : 0) + (formData.diveSessions.afternoon ? 1 : 0) + (formData.diveSessions.night ? 1 : 0);
    
    // Get cumulative pricing for this customer's stay (only for tourist customers)
    let cumulativePricing = null;
    let pricePerDive = 46; // Default price
    
    // For recurrent/local customers, use fixed pricing - no cumulative pricing needed
    if (formData.customerId && (customerType === 'recurrent' || customerType === 'local')) {
      // Use pricing service which handles recurrent/local fixed pricing correctly
      const singleDivePrice = calculateDivePrice(effectiveLocationId, customerType, 1);
      pricePerDive = singleDivePrice;
      // Don't use cumulative pricing for recurrent/local customers
    } else if (formData.customerId && customerType === 'tourist') {
      // Only use cumulative pricing for tourist customers (volume discounts)
      cumulativePricing = stayService.getCumulativeStayPricing(formData.customerId, formData.bookingDate);
      pricePerDive = cumulativePricing.pricePerDive;
    }

    let basePrice = 0;
    // If Playitas location, apply specific rules (but respect customer type pricing)
    if (location && location.name?.toLowerCase().includes('playitas')) {
      const route = formData.routeType;
      
      // For recurrent/local customers, use their fixed pricing regardless of route
      if (customerType === 'recurrent' || customerType === 'local') {
        basePrice = numberOfDives * pricePerDive;
      } else if (route === 'playitas_local') {
        // Playitas local dive - fixed price
        pricePerDive = 35;
        basePrice = numberOfDives * pricePerDive;
      } else if (route === 'dive_trip') {
        // Dive trip - fixed price
        pricePerDive = 45;
        basePrice = numberOfDives * pricePerDive;
      } else if (route === 'caleta_from_playitas') {
        // Caleta from Playitas - tiered pricing for tourist customers only
        const tiers = locPricing.customerTypes?.tourist?.diveTiers || [];
        let previousCaletaDives = 0;
        if (formData.customerId) {
          const customerBookings = dataService.getCustomerBookings(formData.customerId) || [];
          customerBookings.forEach(b => {
            if (b.routeType === 'caleta_from_playitas') {
              previousCaletaDives += (b.diveSessions ? ((b.diveSessions.morning?1:0)+(b.diveSessions.afternoon?1:0)+(b.diveSessions.night?1:0)) : (b.numberOfDives || 0));
            }
          });
        }
        const totalCaletaDives = previousCaletaDives + numberOfDives;
        let tierPrice = 45; // default to first tier
        for (let i = 0; i < tiers.length; i++) {
          const currentTier = tiers[i];
          const nextTier = tiers[i+1];
          if (totalCaletaDives >= currentTier.dives && (!nextTier || totalCaletaDives < nextTier.dives)) {
            tierPrice = currentTier.price;
            break;
          }
        }
        pricePerDive = tierPrice;
        basePrice = numberOfDives * pricePerDive;
      } else {
        // Fallback to cumulative pricing (for tourist customers)
        basePrice = numberOfDives * pricePerDive;
      }
    } else {
      // Use pricing service for diving (handles all customer types correctly)
      basePrice = calculateDivePrice(effectiveLocationId, customerType, numberOfDives);
    }
    
    // Resolve location-specific pricing
    // locPricing already resolved above

    // Calculate night dive surcharge
    let nightDiveSurcharge = 0;
    if (formData.diveSessions.night) {
      nightDiveSurcharge = locPricing.addons?.night_dive ?? 20; // Night dive surcharge
    }
    
    // Calculate other addon prices
    const addons = {
      personalInstructor: formData.addons?.personalInstructor ? 1 : 0
    };
    
    let addonPrice = 0;
    if (addons.personalInstructor) {
      addonPrice += (locPricing.addons?.personal_instructor ?? 100);
    }
    
    // Transfer fee (Caleta from Playitas): €15 per booking day when any dives selected
    let transferFee = 0;
    if (formData.routeType === 'caleta_from_playitas' && numberOfDives > 0) {
      transferFee = 15;
    }

    const price = basePrice + nightDiveSurcharge + addonPrice + transferFee;
    
    // Calculate equipment rental cost
    let equipmentRental = 0;
    
    // If customer brings own equipment, equipment rental is always 0
    if (formData.ownEquipment) {
      equipmentRental = 0;
    } else {
      // Only calculate equipment rental if at least one piece of equipment is rented
      const hasRentedEquipment = formData.rentedEquipment && Object.values(formData.rentedEquipment).some(value => value === true);
      
      if (hasRentedEquipment) {
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
      // Equipment rental prices are global (same across locations)
      const globalEq = settings.prices?.equipment || {};
      const equipmentPrices = {
        Suit: globalEq.Suit ?? 5,
        BCD: globalEq.BCD ?? 5,
        Regulator: globalEq.Regulator ?? 5,
        Torch: globalEq.Torch ?? 5,
        Computer: globalEq.Computer ?? 3,
        UWCamera: globalEq.UWCamera ?? 20
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
    }
    
    // Calculate dive insurance (mandatory for all divers)
    let diveInsurance = 0;
    if (locPricing.diveInsurance || settings.prices.diveInsurance) {
      // For now, we'll use one_day insurance as default
      // In a real implementation, this would be based on the stay duration
      const di = (locPricing.diveInsurance || settings.prices.diveInsurance);
      diveInsurance = di.one_day || 7.00;
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
      transferFee,
      cumulativePricing, // Store cumulative pricing info for display (null for recurrent/local)
      pricePerDive // Store price per dive for display (used for recurrent/local customers)
    }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // When activity type changes, reset dive sessions and numberOfDives appropriately
      if (field === 'activityType') {
        if (value === 'diving') {
          // For diving, reset dive sessions and clear numberOfDives
          updated.diveSessions = {
            morning: false,
            afternoon: false,
            night: false
          };
          updated.numberOfDives = undefined;
        } else {
          // For non-diving activities, clear dive sessions and set numberOfDives to 1
          updated.diveSessions = {
            morning: false,
            afternoon: false,
            night: false
          };
          updated.numberOfDives = prev.numberOfDives || 1;
        }
      }
      
      // When ownEquipment is set to true, clear all rented equipment
      if (field === 'ownEquipment' && value === true) {
        updated.rentedEquipment = {
          completeEquipment: false,
          Suit: false,
          BCD: false,
          Regulator: false,
          Torch: false,
          Computer: false,
          UWCamera: false,
          Mask: false,
          Fins: false,
          Boots: false
        };
      }
      
      return updated;
    });
    
    // Trigger immediate recalculation when ownEquipment changes
    if (field === 'ownEquipment' && settings) {
      setTimeout(() => {
        calculatePrice();
      }, 50);
    }
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
    
    // Validate: For diving, at least one dive session must be selected
    if (formData.activityType === 'diving') {
      if (!formData.diveSessions?.morning && !formData.diveSessions?.afternoon && !formData.diveSessions?.night) {
        alert('Please select at least one dive session for diving activities.');
        return;
      }
    }
    
    // Validate: For non-diving activities, numberOfDives must be at least 1
    if (formData.activityType !== 'diving' && (!formData.numberOfDives || formData.numberOfDives < 1)) {
      alert('Please enter a valid number of sessions (at least 1).');
      return;
    }
    
    // Recalculate price one final time before saving to ensure it's correct
    // This is especially important when ownEquipment changes
    if (settings) {
      calculatePrice();
    }
    
    // Use a small delay to ensure calculatePrice has updated formData
    setTimeout(() => {
      // Prepare booking data with current formData (which should have latest calculated prices)
      const bookingData = { ...formData };
      
      // For non-diving activities, ensure numberOfDives is set
      if (bookingData.activityType !== 'diving') {
        bookingData.numberOfDives = bookingData.numberOfDives || 1;
        // Clear dive sessions for non-diving activities
        bookingData.diveSessions = {
          morning: false,
          afternoon: false,
          night: false
        };
      }
      
      // Ensure equipmentRental is 0 if ownEquipment is true
      if (bookingData.ownEquipment) {
        bookingData.equipmentRental = 0;
        // Recalculate totalPrice without equipment rental
        const basePrice = bookingData.price || 0;
        const diveInsurance = bookingData.diveInsurance || 0;
        const discount = bookingData.discount || 0;
        bookingData.totalPrice = basePrice + 0 + diveInsurance - discount;
        bookingData.customerPayment = bookingData.totalPrice;
      }
      
      if (bookingId) {
        dataService.update('bookings', bookingId, bookingData);
      } else {
        dataService.create('bookings', bookingData);
      }
      
      setSaved(true);
      setTimeout(() => {
        navigate('/bookings');
      }, 1500);
    }, 100);
    
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
            {/* Location Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Location</InputLabel>
                <Select
                  value={formData.locationId}
                  label="Location"
                  onChange={(e) => {
                    const newLoc = e.target.value;
                    setFormData(prev => ({ ...prev, locationId: newLoc, routeType: '' }));
                    localStorage.setItem('dcms_current_location', newLoc);
                  }}
                  required
                >
                  {locations.map(loc => (
                    <MenuItem key={loc.id} value={loc.id}>{loc.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
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

            {/* Dive Sessions (only for diving activity) */}
            {formData.activityType === 'diving' && (
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Dive Sessions
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Select which dive sessions the customer will participate in today:
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="caption">
                    <strong>Maximum 3 dives per day:</strong> Morning (9:00 AM), Afternoon (12:00 PM), and Night dive.
                    Volume discounts apply to <strong>cumulative dives across multiple days</strong> of the customer's stay.
                  </Typography>
                </Alert>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.diveSessions?.morning || false}
                        onChange={(e) => handleDiveSessionChange('morning', e.target.checked)}
                      />
                    }
                    label="Morning Dive (9:00 AM) - 1 dive"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.diveSessions?.afternoon || false}
                        onChange={(e) => handleDiveSessionChange('afternoon', e.target.checked)}
                      />
                    }
                    label="Afternoon Dive (12:00 PM) - 1 dive"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.diveSessions?.night || false}
                        onChange={(e) => handleDiveSessionChange('night', e.target.checked)}
                      />
                    }
                    label="Night Dive (+€20) - 1 dive"
                  />
                </Box>
                {(() => {
                  const selectedCount = (formData.diveSessions?.morning ? 1 : 0) + 
                                       (formData.diveSessions?.afternoon ? 1 : 0) + 
                                       (formData.diveSessions?.night ? 1 : 0);
                  return (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {selectedCount > 0 ? `${selectedCount} dive${selectedCount > 1 ? 's' : ''} selected for today` : 'Please select at least one dive session'}
                    </Typography>
                  );
                })()}
                {!formData.diveSessions?.morning && !formData.diveSessions?.afternoon && !formData.diveSessions?.night && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                    Please select at least one dive session
                  </Typography>
                )}
              </Grid>
            )}

            {/* Number of Sessions (for non-diving activities) */}
            {formData.activityType !== 'diving' && (
              <Grid item xs={12} md={6}>
                <TextField
                  label="Number of Sessions"
                  type="number"
                  fullWidth
                  value={formData.numberOfDives || 1}
                  onChange={(e) => handleChange('numberOfDives', parseInt(e.target.value) || 1)}
                  inputProps={{ min: 1 }}
                  helperText="Enter the number of sessions for this activity"
                />
              </Grid>
            )}

          {/* Route Type for Las Playitas (only for diving) */}
          {formData.activityType === 'diving' && (() => {
            const currentLoc = locations.find(l => l.id === formData.locationId);
            const isPlayitas = currentLoc && currentLoc.name?.toLowerCase().includes('playitas');
            return isPlayitas ? (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Route</InputLabel>
                  <Select
                    value={formData.routeType}
                    onChange={(e) => handleChange('routeType', e.target.value)}
                    label="Route"
                  >
                    <MenuItem value="">Select route</MenuItem>
                    <MenuItem value="playitas_local">Playitas Local Dive (€35)</MenuItem>
                    <MenuItem value="caleta_from_playitas">Caleta Dive from Playitas (tiers + €15 transfer per day)</MenuItem>
                    <MenuItem value="dive_trip">Dive Trip (Gran Tarajal / La Lajita) (€45)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            ) : null;
          })()}

            {/* Pricing Information */}
            {formData.customerId && (() => {
              const customer = dataService.getById('customers', formData.customerId);
              const customerType = getCustomerType(customer);
              const isRecurrent = customerType === 'recurrent';
              const isLocal = customerType === 'local';
              const isTourist = customerType === 'tourist';
              
              // For recurrent/local, use pricePerDive from formData (calculated from pricing service)
              // For tourist, use cumulativePricing if available
              const displayPricePerDive = isRecurrent || isLocal 
                ? formData.pricePerDive || (isRecurrent ? 32.00 : 35.00)
                : (formData.cumulativePricing?.pricePerDive || formData.pricePerDive || 46.00);
              
              const displayTotalDives = formData.cumulativePricing?.totalDives || 0;
              const displayTotalPrice = formData.cumulativePricing?.totalPrice || formData.totalPrice || 0;
              
              // Get base price for comparison (first tier for tourist, fixed price for others)
              let basePrice = 46.00; // Default tourist first tier
              if (isRecurrent) {
                basePrice = 32.00; // Recurrent customer price
              } else if (isLocal) {
                basePrice = 35.00; // Local customer price
              }
              
              const showDiscount = isTourist && formData.cumulativePricing && formData.cumulativePricing.totalDives > 3;
              
              // Calculate current booking dives
              const currentDives = (formData.diveSessions?.morning ? 1 : 0) + 
                                   (formData.diveSessions?.afternoon ? 1 : 0) + 
                                   (formData.diveSessions?.night ? 1 : 0);
              
              return (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
                    <Typography variant="h6" gutterBottom>
                      {isRecurrent || isLocal 
                        ? `${customerType.charAt(0).toUpperCase() + customerType.slice(1)} Customer Pricing` 
                        : 'Cumulative Stay Pricing (Volume Discount Applied)'}
                    </Typography>
                    <Typography variant="body2" gutterBottom sx={{ mb: 1 }}>
                      {isRecurrent || isLocal 
                        ? `${customerType.charAt(0).toUpperCase() + customerType.slice(1)} customers have fixed pricing per dive.`
                        : <>Volume discounts are calculated based on <strong>total dives across all days</strong> of the customer's stay. Maximum 3 dives per day (Morning, Afternoon, Night).</>}
                    </Typography>
                    {isTourist && formData.cumulativePricing && (
                      <Typography variant="body2" gutterBottom>
                        <strong>Total dives in stay:</strong> {displayTotalDives} dives (across multiple days)
                      </Typography>
                    )}
                    {isRecurrent || isLocal ? (
                      <Typography variant="body2" gutterBottom>
                        <strong>Dives in this booking:</strong> {currentDives} dive{currentDives !== 1 ? 's' : ''}
                      </Typography>
                    ) : null}
                    <Typography variant="body2" gutterBottom>
                      <strong>Price per dive:</strong> €{displayPricePerDive.toFixed(2)}
                      {showDiscount && (
                        <span style={{ marginLeft: '8px', opacity: 0.9 }}>
                          (discounted from €{basePrice.toFixed(2)})
                        </span>
                      )}
                      {!showDiscount && (isRecurrent || isLocal) && (
                        <span style={{ marginLeft: '8px', opacity: 0.9 }}>
                          ({customerType} customer rate)
                        </span>
                      )}
                    </Typography>
                    {isTourist && formData.cumulativePricing ? (
                      <Typography variant="body2" gutterBottom>
                        <strong>Total stay price:</strong> €{displayTotalPrice.toFixed(2)}
                      </Typography>
                    ) : null}
                    <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.9 }}>
                      {isRecurrent || isLocal 
                        ? `All dives are priced at the ${customerType} customer rate (€${displayPricePerDive.toFixed(2)} per dive)`
                        : 'All dives in this stay are priced at the same rate based on total volume across all booking days'}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })()}

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
                  <MenuItem value="discover">Discovery / Try Dive</MenuItem>
                  <MenuItem value="orientation">Orientation Dive</MenuItem>
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

            {/* Booking Status */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Booking Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  required
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                  <MenuItem value="no_show">No Show</MenuItem>
                </Select>
              </FormControl>
            </Grid>


            {/* Own Equipment (only for diving) */}
            {formData.activityType === 'diving' && (
              <>
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
              </>
            )}

            <Divider sx={{ my: 2, width: '100%' }} />

            {/* Volume Discount Calculator (only for diving) */}
            {formData.activityType === 'diving' && (
              <Grid item xs={12}>
                <VolumeDiscountCalculator 
                  numberOfDives={(formData.diveSessions?.morning ? 1 : 0) + (formData.diveSessions?.afternoon ? 1 : 0) + (formData.diveSessions?.night ? 1 : 0)}
                  addons={formData.addons || {}}
                  bono={bonos.find(b => b.id === formData.bonoId)}
                />
              </Grid>
            )}


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

