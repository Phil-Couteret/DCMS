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
  Alert,
  Card,
  CardContent
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
    // Bike rental fields
    bikeType: '', // 'street_bike' | 'gravel_bike'
    rentalDays: 2, // Minimum 2 days
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    bikeEquipment: {
      click_pedals: false,
      helmet: false,
      gps_computer: false
    },
    bikeInsurance: '', // 'one_day' | 'one_week' | 'one_month'
    // Surf rental fields
    surfType: '', // 'softboard' | 'performance_softboard' | 'shortboard' | 'midlength' | 'longboard'
    surfEquipment: {
      wetsuit: false,
      shoes: false,
      surf_leash: false,
      auto_rack: false
    },
    // Kite surf rental fields
    kiteType: '', // 'complete_equipment' | 'kite_bar_leash' | 'kiteboard'
    kiteEquipment: {
      harness: false,
      kite_leash: false,
      helmet: false,
      impact_vest: false,
      wetsuit: false
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
    loadData().catch(err => console.error('Error loading data:', err));
    loadSettings().catch(err => console.error('Error loading settings:', err));
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
      loadBooking().catch(err => console.error('Error loading booking:', err));
    }
  }, [bookingId]);

  // Load customer preferences when customer is selected
  useEffect(() => {
    if (formData.customerId && !bookingId) {
      const loadCustomer = async () => {
        try {
          const customer = await dataService.getById('customers', formData.customerId);
          if (customer) {
            // Load customer's ownEquipment preference
            const customerOwnEquipment = customer.preferences?.ownEquipment || false;
            setFormData(prev => ({
              ...prev,
              ownEquipment: customerOwnEquipment
            }));
          }
        } catch (error) {
          console.error('Error loading customer:', error);
        }
      };
      loadCustomer();
    }
  }, [formData.customerId, bookingId]);

  useEffect(() => {
    // Only calculate if settings and locations are loaded
    if (!settings || !locations || locations.length === 0) {
      return;
    }
    
    // Determine if current location is bike rental
    const currentLocation = locations.find(l => l.id === formData.locationId) || locations[0];
    const isBikeRental = currentLocation?.type === 'bike_rental';
    
    // Only calculate price if we have a valid location
    if (currentLocation) {
      calculatePrice().catch(err => console.error('Error calculating price:', err));
    }
  }, [
    // Common fields (always watch)
    formData.locationId,
    formData.customerId,
    settings,
    // Bike rental fields
    formData.bikeType,
    formData.rentalDays,
    formData.bikeEquipment,
    formData.bikeInsurance,
    // Surf rental fields
    formData.surfType,
    formData.surfEquipment,
    // Kite surf rental fields
    formData.kiteType,
    formData.kiteEquipment,
    // Diving fields (only relevant for diving)
    formData.diveSessions,
    formData.addons,
    formData.bonoId,
    formData.ownEquipment,
    formData.rentedEquipment,
    formData.numberOfDives,
    formData.activityType,
    formData.routeType,
    locations // Watch locations to recalculate when they're loaded
  ]);

  const loadData = async () => {
    try {
      const [customersData, boatsData, diveSitesData, bonosData, locationsData] = await Promise.all([
        dataService.getAll('customers') || [],
        dataService.getAll('boats') || [],
        dataService.getAll('diveSites') || [],
        dataService.getAll('governmentBonos').catch(() => []), // Fallback if endpoint doesn't exist
        dataService.getAll('locations') || []
      ]);
      
      setCustomers(Array.isArray(customersData) ? customersData : []);
      setBoats(Array.isArray(boatsData) ? boatsData : []);
      setDiveSites(Array.isArray(diveSitesData) ? diveSitesData : []);
      setBonos(Array.isArray(bonosData) ? bonosData : []);
      
      // Prefer user's accessible location first for local admins
      let ordered = Array.isArray(locationsData) ? locationsData : [];
      if (currentUser && Array.isArray(currentUser.locationAccess) && currentUser.locationAccess.length > 0) {
        const accessSet = new Set(currentUser.locationAccess);
        ordered = [
          ...ordered.filter(l => accessSet.has(l.id)),
          ...ordered.filter(l => !accessSet.has(l.id))
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
      // Set empty arrays on error to prevent map errors
      setCustomers([]);
      setBoats([]);
      setDiveSites([]);
      setBonos([]);
      setLocations([]);
    }
  };

  const loadSettings = async () => {
    try {
      const settingsData = await dataService.getAll('settings');
      if (Array.isArray(settingsData) && settingsData.length > 0) {
        setSettings(settingsData[0]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadBooking = async () => {
    try {
      const booking = await dataService.getById('bookings', bookingId);
      if (booking) {
        // Normalize activity types: try_dive and discovery should both be "discover"
        const normalizedActivityType = booking.activityType === 'try_dive' || booking.activityType === 'discovery' 
          ? 'discover' 
          : booking.activityType;
        
        // Extract data from equipmentNeeded for diving activities
        let diveSessions = booking.diveSessions || {
          morning: false,
          afternoon: false,
          night: false
        };
        let ownEquipment = booking.ownEquipment || false;
        let rentedEquipment = booking.rentedEquipment || {};
        let addons = booking.addons || {};
        
        // For diving activities, check if data is stored in equipmentNeeded
        if (normalizedActivityType === 'diving' && booking.equipmentNeeded && typeof booking.equipmentNeeded === 'object' && !Array.isArray(booking.equipmentNeeded)) {
          const equipmentData = booking.equipmentNeeded;
          
          // Extract dive sessions
          if (equipmentData.morning !== undefined || equipmentData.afternoon !== undefined || equipmentData.night !== undefined || equipmentData.tenFifteen !== undefined || equipmentData['10:15'] !== undefined) {
            diveSessions = {
              morning: equipmentData.morning === true || equipmentData.morning === 1 || equipmentData.morning === 'true',
              afternoon: equipmentData.afternoon === true || equipmentData.afternoon === 1 || equipmentData.afternoon === 'true',
              night: equipmentData.night === true || equipmentData.night === 1 || equipmentData.night === 'true',
              tenFifteen: equipmentData.tenFifteen === true || equipmentData.tenFifteen === 1 || equipmentData.tenFifteen === 'true' || equipmentData['10:15'] === true || equipmentData['10:15'] === 1 || equipmentData['10:15'] === 'true'
            };
          }
          
          // Extract ownEquipment
          if (equipmentData.ownEquipment !== undefined) {
            ownEquipment = equipmentData.ownEquipment === true || equipmentData.ownEquipment === 1 || equipmentData.ownEquipment === 'true';
          }
          
          // Extract rentedEquipment
          if (equipmentData.rentedEquipment && typeof equipmentData.rentedEquipment === 'object') {
            rentedEquipment = equipmentData.rentedEquipment;
          }
          
          // Extract addons
          if (equipmentData.addons && typeof equipmentData.addons === 'object') {
            addons = equipmentData.addons;
          }
        }
        // Extract bike/surf/kite rental data from equipmentNeeded when loading
        let bikeType = booking.bikeType || '';
        let surfType = booking.surfType || '';
        let surfEquipment = booking.surfEquipment || { wetsuit: false, shoes: false, surf_leash: false, auto_rack: false };
        let kiteType = booking.kiteType || '';
        let kiteEquipment = booking.kiteEquipment || { harness: false, kite_leash: false, helmet: false, impact_vest: false, wetsuit: false };
        if (booking.equipmentNeeded && typeof booking.equipmentNeeded === 'object' && !Array.isArray(booking.equipmentNeeded)) {
          const eq = booking.equipmentNeeded;
          if (eq.activityType === 'bike_rental') {
            bikeType = eq.bikeType || '';
          } else if (eq.activityType === 'surf') {
            surfType = eq.surfType || '';
            surfEquipment = eq.surfEquipment || surfEquipment;
          } else if (eq.activityType === 'kite_surf') {
            kiteType = eq.kiteType || '';
            kiteEquipment = eq.kiteEquipment || kiteEquipment;
          }
        }
        
        // Convert numeric fields to numbers (backend may return strings or Decimal types)
        const normalizedBooking = {
          ...booking,
          activityType: normalizedActivityType,
          // Ensure bookingDate is properly formatted (handle both date and datetime strings)
          bookingDate: booking.bookingDate ? (booking.bookingDate.split('T')[0] || booking.bookingDate) : new Date().toISOString().split('T')[0],
          // Ensure numberOfDives is set for non-diving activities
          numberOfDives: normalizedActivityType !== 'diving' 
            ? (Number(booking.numberOfDives) || 1)
            : undefined,
          // Ensure boatId and diveSiteId are strings (not undefined) to avoid MUI Select warnings
          boatId: booking.boatId || '',
          diveSiteId: booking.diveSiteId || '',
          // Convert price fields to numbers
          price: Number(booking.price) || 0,
          discount: Number(booking.discount) || 0,
          totalPrice: Number(booking.totalPrice) || 0,
          equipmentRental: Number(booking.equipmentRental) || 0,
          bikeInsuranceCost: Number(booking.bikeInsuranceCost) || 0,
          rentalDays: Number(booking.rentalDays) || 2,
          // Set extracted values
          diveSessions,
          ownEquipment,
          rentedEquipment,
          addons,
          bikeType,
          surfType,
          surfEquipment,
          kiteType,
          kiteEquipment
        };
        setFormData(normalizedBooking);
      }
    } catch (error) {
      console.error('Error loading booking:', error);
    }
  };

  const calculatePrice = async (dataToUse = null) => {
    // Return early if settings not loaded yet
    if (!settings) {
      return;
    }
    
    // Use provided data or current formData
    const data = dataToUse || formData;
    
    // Get location info from state (already loaded asynchronously)
    const allLocations = Array.isArray(locations) ? locations : [];
    const storedLocation = localStorage.getItem('dcms_current_location');
    const effectiveLocationId = data.locationId || storedLocation || allLocations[0]?.id;
    const location = allLocations.find(l => l.id === effectiveLocationId);
    
    if (!location) {
      console.warn('Location not found in calculatePrice:', effectiveLocationId, 'Available locations:', allLocations.map(l => l.id));
      return;
    }
    
    const locPricing = location?.pricing || {};
    
    // Check if this is a bike rental location
    const isBikeRental = location?.type === 'bike_rental';
    
    // Handle bike rental pricing
    if (isBikeRental) {
      // Ensure minimum 2 days
      const rentalDays = Math.max(2, data.rentalDays || 2);
      
      if (!data.bikeType) {
        // No bike type selected, set price to 0
        setFormData(prev => ({
          ...prev,
          price: 0,
          totalPrice: 0,
          discount: 0,
          governmentPayment: 0,
          customerPayment: 0,
          equipmentRental: 0,
          bikeInsuranceCost: 0
        }));
        return;
      }
      
      // Get bike type pricing
      const bikeTypePricing = locPricing.bikeTypes?.[data.bikeType];
      const rentalTiers = bikeTypePricing?.rentalTiers || [];
      
      // Calculate base rental price based on tiered pricing
      let basePrice = 0;
      
      if (rentalTiers.length > 0) {
        // Sort tiers by days (ascending)
        const sortedTiers = [...rentalTiers].sort((a, b) => a.days - b.days);
        
        // Find the appropriate tier based on rental days
        // Tiers: 2 days (fixed), 3 days (fixed), 4 days (per day), 7 days (per day), 11 days (per day), 14 days (per day)
        
        if (rentalDays === 2) {
          // 2 days: fixed price (80€)
          const tier = sortedTiers.find(t => t.days === 2);
          basePrice = tier ? tier.price : 80.00;
        } else if (rentalDays === 3) {
          // 3 days: fixed price (114€)
          const tier = sortedTiers.find(t => t.days === 3);
          basePrice = tier ? tier.price : 114.00;
        } else if (rentalDays >= 4 && rentalDays <= 6) {
          // 4-6 days: 36€/day
          const tier = sortedTiers.find(t => t.days === 4);
          const pricePerDay = tier ? tier.price : 36.00;
          basePrice = pricePerDay * rentalDays;
        } else if (rentalDays >= 7 && rentalDays <= 10) {
          // 7-10 days: 34€/day
          const tier = sortedTiers.find(t => t.days === 7);
          const pricePerDay = tier ? tier.price : 34.00;
          basePrice = pricePerDay * rentalDays;
        } else if (rentalDays >= 11 && rentalDays <= 13) {
          // 11-13 days: 30€/day
          const tier = sortedTiers.find(t => t.days === 11);
          const pricePerDay = tier ? tier.price : 30.00;
          basePrice = pricePerDay * rentalDays;
        } else if (rentalDays >= 14) {
          // 14+ days: 25€/day
          const tier = sortedTiers.find(t => t.days === 14);
          const pricePerDay = tier ? tier.price : 25.00;
          basePrice = pricePerDay * rentalDays;
        }
      } else {
        // Using fallback pricing if tiers aren't configured
        // Use fallback pricing if tiers aren't configured
        if (rentalDays === 2) {
          basePrice = 80.00;
        } else if (rentalDays === 3) {
          basePrice = 114.00;
        } else if (rentalDays >= 4 && rentalDays <= 6) {
          basePrice = 36.00 * rentalDays;
        } else if (rentalDays >= 7 && rentalDays <= 10) {
          basePrice = 34.00 * rentalDays;
        } else if (rentalDays >= 11 && rentalDays <= 13) {
          basePrice = 30.00 * rentalDays;
        } else if (rentalDays >= 14) {
          basePrice = 25.00 * rentalDays;
        }
      }
      
      // Calculate equipment costs (charged once per rental, not per day)
      let equipmentCost = 0;
      const bikeEquipment = data.bikeEquipment || {};
      const equipmentPricing = locPricing.equipment || {};
      
      if (bikeEquipment.click_pedals) {
        equipmentCost += equipmentPricing.click_pedals || 10.00;
      }
      if (bikeEquipment.helmet) {
        equipmentCost += equipmentPricing.helmet || 10.00;
      }
      if (bikeEquipment.gps_computer) {
        equipmentCost += equipmentPricing.gps_computer || 15.00;
      }
      
      // Calculate insurance costs (if selected)
      let insuranceCost = 0;
      if (data.bikeInsurance) {
        const insurancePricing = locPricing.insurance || {};
        // Use fallback values if pricing not found
        const insuranceDefaults = {
          one_day: 5.00,
          one_week: 15.00,
          one_month: 25.00
        };
        insuranceCost = insurancePricing[data.bikeInsurance] || insuranceDefaults[data.bikeInsurance] || 0;
      }
      
      // Calculate total price
      const totalPrice = basePrice + equipmentCost + insuranceCost;
      
      setFormData(prev => ({
        ...prev,
        price: basePrice,
        totalPrice: totalPrice,
        discount: 0,
        governmentPayment: 0,
        customerPayment: totalPrice,
        equipmentRental: equipmentCost,
        bikeInsuranceCost: insuranceCost, // Store insurance cost separately for display
        rentalDays: rentalDays // Ensure minimum 2 days is applied
      }));
      return;
    }
    
    // Handle surf rental pricing (Point Break style - tiered by days)
    const isSurfRental = location?.type === 'surf';
    if (isSurfRental) {
      const rentalDays = Math.max(1, data.rentalDays || 1);
      if (!data.surfType) {
        setFormData(prev => ({ ...prev, price: 0, totalPrice: 0, equipmentRental: 0 }));
        return;
      }
      const st = locPricing.surfTypes?.[data.surfType];
      const tiers = (st?.rentalTiers || []).sort((a, b) => a.days - b.days);
      let basePrice = 0;
      if (tiers.length > 0) {
        const exactTier = tiers.find(t => t.days === rentalDays);
        if (exactTier) {
          basePrice = exactTier.price;
        } else {
          // Find highest tier where tier.days <= rentalDays, then add extra days
          const applicableTiers = tiers.filter(t => t.days <= rentalDays);
          const baseTier = applicableTiers.length > 0 ? applicableTiers[applicableTiers.length - 1] : tiers[0];
          const extraDays = Math.max(0, rentalDays - baseTier.days);
          basePrice = baseTier.price + (st.extraDayPrice || 0) * extraDays;
        }
      }
      let equipmentCost = 0;
      const surfEq = data.surfEquipment || {};
      const surfEqPrices = locPricing.surfEquipment || {};
      ['wetsuit', 'shoes', 'surf_leash', 'auto_rack'].forEach(k => {
        if (surfEq[k]) equipmentCost += ((surfEqPrices[k] || 0) * rentalDays);
      });
      const totalPrice = basePrice + equipmentCost;
      setFormData(prev => ({
        ...prev,
        price: basePrice,
        totalPrice,
        equipmentRental: equipmentCost,
        rentalDays
      }));
      return;
    }

    // Handle kite surf rental pricing (Point Break style)
    const isKiteSurfRental = location?.type === 'kite_surf';
    if (isKiteSurfRental) {
      const rentalDays = Math.max(1, data.rentalDays || 1);
      if (!data.kiteType) {
        setFormData(prev => ({ ...prev, price: 0, totalPrice: 0, equipmentRental: 0 }));
        return;
      }
      const kt = locPricing.kiteTypes?.[data.kiteType];
      const tiers = (kt?.rentalTiers || []).sort((a, b) => a.days - b.days);
      let basePrice = 0;
      if (tiers.length > 0) {
        const exactTier = tiers.find(t => t.days === rentalDays);
        if (exactTier) {
          basePrice = exactTier.price;
        } else {
          const applicableTiers = tiers.filter(t => t.days <= rentalDays);
          const baseTier = applicableTiers.length > 0 ? applicableTiers[applicableTiers.length - 1] : tiers[0];
          const extraDays = Math.max(0, rentalDays - baseTier.days);
          basePrice = baseTier.price + (kt.extraDayPrice || 0) * extraDays;
        }
      }
      let equipmentCost = 0;
      const kiteEq = data.kiteEquipment || {};
      const kiteEqPrices = locPricing.kiteEquipment || {};
      ['harness', 'kite_leash', 'helmet', 'impact_vest', 'wetsuit'].forEach(k => {
        if (kiteEq[k]) equipmentCost += ((kiteEqPrices[k] || 0) * rentalDays);
      });
      const totalPrice = basePrice + equipmentCost;
      setFormData(prev => ({
        ...prev,
        price: basePrice,
        totalPrice,
        equipmentRental: equipmentCost,
        rentalDays
      }));
      return;
    }
    
    // Get customer info for pricing from state (already loaded asynchronously)
    let customer = null;
    if (data.customerId) {
      customer = customers.find(c => c.id === data.customerId) || null;
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
    // Calculate number of dives based on selected sessions (use data consistently)
    const diveSessionsToUse = data.diveSessions || formData.diveSessions;
    const numberOfDives = (diveSessionsToUse?.morning ? 1 : 0) + (diveSessionsToUse?.afternoon ? 1 : 0) + (diveSessionsToUse?.night ? 1 : 0);
    
    // Get cumulative pricing for this customer's stay (only for tourist customers)
    let cumulativePricing = null;
    let pricePerDive = 46; // Default price
    
    // For recurrent/local customers, use fixed pricing - no cumulative pricing needed
    if (data.customerId && (customerType === 'recurrent' || customerType === 'local')) {
      // Use pricing service which handles recurrent/local fixed pricing correctly
      // calculateDivePrice returns total price, so divide by numberOfDives (which is 1) to get price per dive
      const singleDivePrice = calculateDivePrice(effectiveLocationId, customerType, 1);
      pricePerDive = singleDivePrice; // Since numberOfDives is 1, this is already the price per dive
      // Don't use cumulative pricing for recurrent/local customers
    } else if (data.customerId && customerType === 'tourist') {
      // Only use cumulative pricing for tourist customers (volume discounts)
      // Note: In API mode, this may not have bookings loaded yet, so use try-catch
      try {
        cumulativePricing = await stayService.getCumulativeStayPricing(data.customerId, data.bookingDate);
        pricePerDive = cumulativePricing.pricePerDive || 46.00; // Fallback to default if pricePerDive is undefined
      } catch (e) {
        // If cumulative pricing fails (e.g., bookings not loaded in API mode), use default price
        console.warn('Could not calculate cumulative pricing, using default:', e);
        pricePerDive = 46.00; // Default first tier price
        cumulativePricing = null;
      }
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
        if (data.customerId) {
          // Note: getCustomerBookings is async in API mode, but calculatePrice must be sync
          // This will work in mock mode, but in API mode bookings may not be loaded yet
          // For now, try to get bookings synchronously (works in mock mode)
          try {
            const customerBookings = dataService.getCustomerBookings(data.customerId) || [];
            if (Array.isArray(customerBookings)) {
              customerBookings.forEach(b => {
                if (b.routeType === 'caleta_from_playitas') {
                  previousCaletaDives += (b.diveSessions ? ((b.diveSessions.morning?1:0)+(b.diveSessions.afternoon?1:0)+(b.diveSessions.night?1:0)) : (b.numberOfDives || 0));
                }
              });
            }
          } catch (e) {
            // Ignore errors - bookings may not be loaded in API mode
            console.warn('Could not get customer bookings for pricing calculation:', e);
          }
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
    if (diveSessionsToUse?.night) {
      // Check location pricing first, then settings, then fallback to 20
      nightDiveSurcharge = locPricing.addons?.night_dive ?? settings?.prices?.addons?.night_dive ?? 20; // Night dive surcharge
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
      if (data.customerId) {
        // Note: getCustomerBookings is async in API mode, but calculatePrice must be sync
        // This will work in mock mode, but in API mode bookings may not be loaded yet
        try {
          const customerBookings = dataService.getCustomerBookings(data.customerId) || [];
          if (Array.isArray(customerBookings)) {
            customerBookings.forEach(booking => {
              if (booking.rentedEquipment?.completeEquipment) {
                // Calculate previous dives from old format or new format
                const previousDives = booking.numberOfDives || 
                  ((booking.diveSessions?.morning ? 1 : 0) + (booking.diveSessions?.afternoon ? 1 : 0));
                previousCompleteEquipmentDives += previousDives;
              }
            });
          }
        } catch (e) {
          // Ignore errors - bookings may not be loaded in API mode
          console.warn('Could not get customer bookings for equipment calculation:', e);
        }
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
    
    // Insurance is NOT added per dive - it will be added during checkout/stay creation when calculating the final bill
    // Individual dive bookings should only include the dive price, equipment rental, and other addons
    let diveInsurance = 0; // Always 0 for individual bookings - insurance handled at checkout/stay level
    
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
      nightDiveSurcharge, // Store night dive surcharge for display/debugging
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if this is a bike rental location
    const currentLocation = locations.find(l => l.id === formData.locationId);
    const isBikeRental = currentLocation?.type === 'bike_rental';
    
// Validate rental bookings
      const isSurfRental = currentLocation?.type === 'surf';
      const isKiteSurfRental = currentLocation?.type === 'kite_surf';
      if (isBikeRental) {
        if (!formData.bikeType) {
          alert('Please select a bike type.');
          return;
        }
      } else if (isSurfRental) {
        if (!formData.surfType) {
          alert('Please select a surfboard type.');
          return;
        }
      } else if (isKiteSurfRental) {
        if (!formData.kiteType) {
          alert('Please select a kite surf equipment type.');
          return;
        }
      }
      if ((isBikeRental || isSurfRental || isKiteSurfRental) && (!formData.rentalDays || formData.rentalDays < (isBikeRental ? 2 : 1))) {
        alert(isBikeRental ? 'Please enter a valid rental duration (minimum 2 days).' : 'Please enter a valid rental duration (at least 1 day).');
        return;
      }
      if ((isBikeRental || isSurfRental || isKiteSurfRental) && !formData.startDate) {
        alert('Please select a start date.');
        return;
      }

    if (!isBikeRental && !isSurfRental && !isKiteSurfRental) {
      // Validate diving bookings
      // Validate: For diving, at least one dive session must be selected
      if (formData.activityType === 'diving') {
        if (!formData.diveSessions?.morning && !formData.diveSessions?.afternoon && !formData.diveSessions?.night) {
          alert('Please select at least one dive session for diving activities.');
          return;
        }
        
        // Validate insurance for diving bookings (only for first booking)
        try {
          // Get customer bookings to check if this is the first diving booking
          const customerBookings = await dataService.getCustomerBookings(formData.customerId);
          const existingDivingBookings = Array.isArray(customerBookings) 
            ? customerBookings.filter(b => (b.activityType === 'diving' || b.activity_type === 'diving') && b.id !== bookingId)
            : [];
          
          // If this is the first diving booking, check insurance
          if (existingDivingBookings.length === 0) {
            // Get customer details to check insurance
            const customer = await dataService.getById('customers', formData.customerId);
            if (customer) {
              const insurance = customer.divingInsurance || {};
              const hasInsurance = insurance.hasInsurance;
              let insuranceValid = false;
              
              // Check if yearly insurance exists and is valid
              if (hasInsurance && insurance.expiryDate) {
                const expiryDate = new Date(insurance.expiryDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                insuranceValid = expiryDate >= today;
              }
              
              if (!insuranceValid) {
                const proceed = window.confirm(
                  '⚠️ Insurance Validation Required\n\n' +
                  'This is the customer\'s first diving booking. Insurance is mandatory for all divers.\n\n' +
                  'Customer does not have valid insurance on file.\n\n' +
                  'Please ensure insurance is purchased and added to the stay costs before completing the booking.\n\n' +
                  'Do you want to proceed anyway?'
                );
                if (!proceed) {
                  return; // Stop submission if insurance validation failed
                }
              }
            }
          }
        } catch (error) {
          console.error('Error validating insurance:', error);
          // If validation fails, warn but allow proceeding
          const proceed = window.confirm(
            '⚠️ Could not validate insurance.\n\n' +
            'Please ensure the customer has valid insurance before proceeding.\n\n' +
            'Do you want to continue?'
          );
          if (!proceed) {
            return; // Stop submission if user cancels
          }
        }
      }
      
      // Validate: For non-diving activities, numberOfDives must be at least 1
      if (formData.activityType !== 'diving' && (!formData.numberOfDives || formData.numberOfDives < 1)) {
        alert('Please enter a valid number of sessions (at least 1).');
        return;
      }
    }
    
    // Recalculate price one final time before saving to ensure it's correct
    // This is especially important when ownEquipment changes
    if (settings) {
      calculatePrice();
    }
    
    // Use a small delay to ensure calculatePrice has updated formData
    setTimeout(async () => {
      // Prepare booking data with current formData (which should have latest calculated prices)
      const bookingData = { ...formData };
      
      // Set activityType based on location type
      const isSurfRental = currentLocation?.type === 'surf';
      const isKiteSurfRental = currentLocation?.type === 'kite_surf';
      if (isBikeRental || isSurfRental || isKiteSurfRental) {
        bookingData.activityType = 'specialty'; // Use existing enum value, actual type stored in equipmentNeeded
      }
      
      // For non-diving activities, ensure numberOfDives is set
      if (bookingData.activityType !== 'diving' && !isBikeRental && !isSurfRental && !isKiteSurfRental) {
        bookingData.numberOfDives = bookingData.numberOfDives || 1;
        // Clear dive sessions for non-diving activities
        bookingData.diveSessions = {
          morning: false,
          afternoon: false,
          night: false
        };
      }
      
      // For bike rental, transform data for backend
      if (isBikeRental) {
        // Store bike rental specific data in equipment_needed JSON field
        // Build equipmentNeeded object, only including non-null/non-empty values
        const equipmentNeededData = {
          activityType: 'bike_rental', // Store actual activity type here
          bikeType: bookingData.bikeType,
          rentalDays: bookingData.rentalDays || 2,
          bikeEquipment: bookingData.bikeEquipment || {}
        };
        
        // Only include bikeInsurance if it's not empty
        if (bookingData.bikeInsurance && bookingData.bikeInsurance.trim() !== '') {
          equipmentNeededData.bikeInsurance = bookingData.bikeInsurance;
        }
        
        // Include startDate (use bookingDate as fallback)
        if (bookingData.startDate) {
          equipmentNeededData.startDate = bookingData.startDate;
        } else if (bookingData.bookingDate) {
          equipmentNeededData.startDate = bookingData.bookingDate;
        }
        
        // Only include endDate if it exists
        if (bookingData.endDate) {
          equipmentNeededData.endDate = bookingData.endDate;
        }
        
        bookingData.equipmentNeeded = equipmentNeededData;
        
        // Set numberOfDives to rentalDays for bike rental (backend expects this)
        bookingData.numberOfDives = bookingData.rentalDays || 2;
        
        // Ensure price and totalPrice are valid numbers (not 0 or undefined)
        if (!bookingData.price || bookingData.price === 0) {
          console.error('Bike rental price is 0 or undefined, cannot save booking');
          alert('Error: Booking price is invalid. Please check the pricing calculation.');
          return;
        }
        if (!bookingData.totalPrice || bookingData.totalPrice === 0) {
          bookingData.totalPrice = bookingData.price;
        }
        
        // Clear diving-related fields
        bookingData.diveSessions = {
          morning: false,
          afternoon: false,
          night: false
        };
        bookingData.addons = {};
        delete bookingData.bonoId; // Remove bonoId for bike rentals
        bookingData.ownEquipment = false;
        bookingData.rentedEquipment = {};
        
        // Remove bike rental specific fields that backend doesn't expect
        delete bookingData.bikeType;
        delete bookingData.rentalDays;
        delete bookingData.bikeEquipment;
        delete bookingData.bikeInsurance;
        delete bookingData.startDate;
        delete bookingData.endDate;
        delete bookingData.bikeInsuranceCost;
        
        if (!bookingData.equipmentNeeded) {
          bookingData.equipmentNeeded = { activityType: 'bike_rental', bikeType: '', rentalDays: 2, bikeEquipment: {}, bikeInsurance: '' };
        }
      } else if (isSurfRental) {
        // Surf rental: store in equipmentNeeded
        bookingData.equipmentNeeded = {
          activityType: 'surf',
          surfType: bookingData.surfType,
          rentalDays: bookingData.rentalDays || 1,
          surfEquipment: bookingData.surfEquipment || {},
          startDate: bookingData.startDate || bookingData.bookingDate
        };
        bookingData.numberOfDives = bookingData.rentalDays || 1;
        if (!bookingData.price || bookingData.price === 0) {
          alert('Error: Surf rental price is invalid.');
          return;
        }
        bookingData.totalPrice = bookingData.totalPrice || bookingData.price;
        bookingData.diveSessions = { morning: false, afternoon: false, night: false };
        bookingData.addons = {};
        bookingData.ownEquipment = false;
        bookingData.rentedEquipment = {};
        delete bookingData.surfType;
        delete bookingData.surfEquipment;
        delete bookingData.startDate;
      } else if (isKiteSurfRental) {
        bookingData.equipmentNeeded = {
          activityType: 'kite_surf',
          kiteType: bookingData.kiteType,
          rentalDays: bookingData.rentalDays || 1,
          kiteEquipment: bookingData.kiteEquipment || {},
          startDate: bookingData.startDate || bookingData.bookingDate
        };
        bookingData.numberOfDives = bookingData.rentalDays || 1;
        if (!bookingData.price || bookingData.price === 0) {
          alert('Error: Kite surf rental price is invalid.');
          return;
        }
        bookingData.totalPrice = bookingData.totalPrice || bookingData.price;
        bookingData.diveSessions = { morning: false, afternoon: false, night: false };
        bookingData.addons = {};
        bookingData.ownEquipment = false;
        bookingData.rentedEquipment = {};
        delete bookingData.kiteType;
        delete bookingData.kiteEquipment;
        delete bookingData.startDate;
      } else {
        // For diving activities, store diveSessions, ownEquipment, and rentedEquipment in equipmentNeeded
        const equipmentNeededData = {};
        
        // Store dive sessions if they exist
        if (bookingData.diveSessions && typeof bookingData.diveSessions === 'object') {
          Object.assign(equipmentNeededData, bookingData.diveSessions);
        }
        
        // Store ownEquipment flag
        if (bookingData.ownEquipment !== undefined) {
          equipmentNeededData.ownEquipment = bookingData.ownEquipment;
        }
        
        // Store rentedEquipment if it exists
        if (bookingData.rentedEquipment && typeof bookingData.rentedEquipment === 'object') {
          equipmentNeededData.rentedEquipment = bookingData.rentedEquipment;
        }
        
        // Store addons if they exist
        if (bookingData.addons && typeof bookingData.addons === 'object') {
          equipmentNeededData.addons = bookingData.addons;
        }
        
        // Set equipmentNeeded to the object containing all diving-related data
        bookingData.equipmentNeeded = Object.keys(equipmentNeededData).length > 0 ? equipmentNeededData : {};
      }
      
      // Ensure equipmentRental is 0 if ownEquipment is true (only for diving)
      if (bookingData.ownEquipment && !isBikeRental && !isKiteSurfRental) {
        bookingData.equipmentRental = 0;
        // Recalculate totalPrice without equipment rental
        const basePrice = bookingData.price || 0;
        const diveInsurance = bookingData.diveInsurance || 0;
        const discount = bookingData.discount || 0;
        bookingData.totalPrice = basePrice + 0 + diveInsurance - discount;
        bookingData.customerPayment = bookingData.totalPrice;
      }
      
      // Remove frontend-only fields that backend doesn't expect
      delete bookingData.diveSessions; // Now stored in equipmentNeeded
      delete bookingData.equipmentRental; // Not a backend field, equipment info in equipmentNeeded
      delete bookingData.diveInsurance; // Not a backend field
      delete bookingData.nightDiveSurcharge; // Frontend-only field
      delete bookingData.cumulativePricing; // Frontend-only field
      delete bookingData.pricePerDive; // Frontend-only field
      delete bookingData.transferFee; // Frontend-only field
      delete bookingData.addons; // Now stored in equipmentNeeded
      delete bookingData.ownEquipment; // Now stored in equipmentNeeded
      delete bookingData.rentedEquipment; // Now stored in equipmentNeeded
      
      // Validate required fields before sending
      if (!bookingData.customerId) {
        alert('Please select a customer.');
        return;
      }
      if (!bookingData.locationId) {
        alert('Please select a location.');
        return;
      }
      if (!bookingData.bookingDate) {
        alert('Please select a booking date.');
        return;
      }
      if (!bookingData.activityType) {
        alert('Activity type is required.');
        return;
      }
      if (typeof bookingData.price !== 'number' || bookingData.price <= 0) {
        alert('Invalid booking price. Please check the pricing calculation.');
        return;
      }
      if (typeof bookingData.totalPrice !== 'number' || bookingData.totalPrice <= 0) {
        alert('Invalid total price. Please check the pricing calculation.');
        return;
      }
      
      // Ensure only backend-expected fields are sent (matching CreateBookingDto interface)
      const backendBookingData = {
        customerId: bookingData.customerId,
        locationId: bookingData.locationId,
        bookingDate: bookingData.bookingDate,
        activityType: bookingData.activityType,
        numberOfDives: Math.floor(Number(bookingData.numberOfDives || 1)), // Ensure integer
        price: Number(bookingData.price),
        discount: Number(bookingData.discount || 0),
        totalPrice: Number(bookingData.totalPrice),
        paymentStatus: bookingData.paymentStatus || 'pending',
        status: bookingData.status || 'confirmed',
        equipmentNeeded: bookingData.equipmentNeeded || (isBikeRental || isSurfRental || isKiteSurfRental ? {} : (bookingData.activityType === 'diving' ? {} : [])) // Object for rentals and diving, array for other activities
      };
      
      // Add optional fields only if they have values
      if (bookingData.boatId && String(bookingData.boatId).trim()) {
        backendBookingData.boatId = String(bookingData.boatId).trim();
      }
      if (bookingData.diveSiteId && String(bookingData.diveSiteId).trim()) {
        backendBookingData.diveSiteId = String(bookingData.diveSiteId).trim();
      }
      if (bookingData.staffPrimaryId && String(bookingData.staffPrimaryId).trim()) {
        backendBookingData.staffPrimaryId = String(bookingData.staffPrimaryId).trim();
      }
      if (bookingData.paymentMethod && String(bookingData.paymentMethod).trim()) {
        backendBookingData.paymentMethod = bookingData.paymentMethod;
      }
      if (bookingData.specialRequirements && String(bookingData.specialRequirements).trim()) {
        backendBookingData.specialRequirements = String(bookingData.specialRequirements).trim();
      }
      if (bookingData.bonoId && String(bookingData.bonoId).trim()) {
        backendBookingData.bonoId = String(bookingData.bonoId).trim();
      }
      if (bookingData.stayId && String(bookingData.stayId).trim()) {
        backendBookingData.stayId = String(bookingData.stayId).trim();
      }
      
      try {
        if (bookingId) {
          await dataService.update('bookings', bookingId, backendBookingData);
        } else {
          await dataService.create('bookings', backendBookingData);
        }
        
        setSaved(true);
        setTimeout(() => {
          navigate('/bookings');
        }, 1500);
      } catch (error) {
        console.error('Error saving booking:', error);
        alert(`Error saving booking: ${error.message || 'Unknown error'}. Please check the console for details.`);
        setSaved(false);
      }
      
    }, 100);
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
                  {Array.isArray(locations) && locations.map(loc => (
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

            {/* Check location type - render appropriate form fields */}
            {(() => {
const currentLocation = locations.find(l => l.id === formData.locationId);
              const isBikeRental = currentLocation?.type === 'bike_rental';
              const isSurfRental = currentLocation?.type === 'surf';
              const isKiteSurfRental = currentLocation?.type === 'kite_surf';

              if (isBikeRental) {
                // BIKE RENTAL FORM FIELDS
                return (
                  <>
                    {/* Start Date */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Start Date"
                        type="date"
                        fullWidth
                        value={formData.startDate}
                        onChange={(e) => {
                          const newStartDate = e.target.value;
                          setFormData(prev => ({ 
                            ...prev, 
                            startDate: newStartDate,
                            bookingDate: newStartDate // Also update bookingDate for consistency
                          }));
                        }}
                        required
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    {/* Rental Duration (Days) */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Rental Duration (Days)"
                        type="number"
                        fullWidth
                        value={formData.rentalDays}
                        onChange={(e) => {
                          const days = Math.max(2, parseInt(e.target.value) || 2); // Minimum 2 days
                          setFormData(prev => ({ 
                            ...prev, 
                            rentalDays: days
                          }));
                          calculatePrice();
                        }}
                        inputProps={{ min: 2 }}
                        helperText="Minimum rental period is 2 days"
                        required
                      />
                    </Grid>

                    {/* Bike Type Selection */}
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Bike Type</InputLabel>
                        <Select
                          value={formData.bikeType}
                          label="Bike Type"
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, bikeType: e.target.value }));
                            calculatePrice();
                          }}
                        >
                          <MenuItem value="street_bike">Street Bike</MenuItem>
                          <MenuItem value="gravel_bike">Gravel Bike</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Bike Equipment (charged once per rental) */}
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        Equipment (charged once per rental)
                      </Typography>
                      <Grid container spacing={2}>
                        {Object.entries({
                          click_pedals: 'Click Pedals',
                          helmet: 'Helmet',
                          gps_computer: 'GPS Computer'
                        }).map(([key, label]) => {
                          // Get price from location pricing or use defaults
                          const price = currentLocation?.pricing?.equipment?.[key] || 
                                       (key === 'click_pedals' ? 10.00 : 
                                        key === 'helmet' ? 10.00 : 
                                        key === 'gps_computer' ? 15.00 : 0);
                          return (
                            <Grid item xs={12} sm={4} key={key}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={formData.bikeEquipment?.[key] || false}
                                    onChange={(e) => {
                                      setFormData(prev => ({
                                        ...prev,
                                        bikeEquipment: {
                                          ...prev.bikeEquipment,
                                          [key]: e.target.checked
                                        }
                                      }));
                                      calculatePrice();
                                    }}
                                  />
                                }
                                label={`${label} (€${price.toFixed(2)})`}
                              />
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Grid>

                    {/* Bike Insurance */}
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Insurance (Optional)</InputLabel>
                        <Select
                          value={formData.bikeInsurance}
                          label="Insurance (Optional)"
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, bikeInsurance: e.target.value }));
                            calculatePrice();
                          }}
                        >
                          <MenuItem value="">No Insurance</MenuItem>
                          <MenuItem value="one_day">1 Day (€{currentLocation?.pricing?.insurance?.one_day || 5.00})</MenuItem>
                          <MenuItem value="one_week">1 Week (€{currentLocation?.pricing?.insurance?.one_week || 15.00})</MenuItem>
                          <MenuItem value="one_month">1 Month (€{currentLocation?.pricing?.insurance?.one_month || 25.00})</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Price Display */}
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Rental Price Breakdown
                          </Typography>
                          <Typography>
                            Base Price ({formData.rentalDays} day{formData.rentalDays > 1 ? 's' : ''}): €{(Number(formData.price) || 0).toFixed(2)}
                          </Typography>
                          {formData.equipmentRental > 0 && (
                            <Typography>
                              Equipment: €{(Number(formData.equipmentRental) || 0).toFixed(2)}
                            </Typography>
                          )}
                          {formData.bikeInsurance && (
                            <Typography>
                              Insurance: €{(Number(formData.bikeInsuranceCost) || (currentLocation?.pricing?.insurance?.[formData.bikeInsurance] || 0)).toFixed(2)}
                            </Typography>
                          )}
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="h6">
                            Total: €{(Number(formData.totalPrice) || 0).toFixed(2)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                );
              } else if (isKiteSurfRental) {
                const kiteTypes = currentLocation?.pricing?.kiteTypes || {};
                const kiteTypeKeys = Object.keys(kiteTypes);
                return (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField label="Start Date" type="date" fullWidth value={formData.startDate} onChange={(e) => {
                        const v = e.target.value;
                        setFormData(prev => ({ ...prev, startDate: v, bookingDate: v }));
                      }} required InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Rental Duration (Days)" type="number" fullWidth value={formData.rentalDays} onChange={(e) => {
                        const days = Math.max(1, parseInt(e.target.value) || 1);
                        setFormData(prev => ({ ...prev, rentalDays: days }));
                        calculatePrice();
                      }} inputProps={{ min: 1 }} required />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Equipment Type</InputLabel>
                        <Select value={formData.kiteType} label="Equipment Type" onChange={(e) => {
                          setFormData(prev => ({ ...prev, kiteType: e.target.value }));
                          calculatePrice();
                        }}>
                          {kiteTypeKeys.map(key => (
                            <MenuItem key={key} value={key}>{kiteTypes[key]?.name || key.replace(/_/g, ' ')}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>Accessories</Typography>
                      <Grid container spacing={2}>
                        {[
                          { key: 'harness', label: 'Harness' },
                          { key: 'kite_leash', label: 'Kite Leash' },
                          { key: 'helmet', label: 'Helmet' },
                          { key: 'impact_vest', label: 'Impact Vest' },
                          { key: 'wetsuit', label: 'Wetsuit' }
                        ].map(({ key, label }) => {
                          const price = currentLocation?.pricing?.kiteEquipment?.[key] || 0;
                          return (
                            <Grid item xs={12} sm={4} key={key}>
                              <FormControlLabel
                                control={<Switch checked={formData.kiteEquipment?.[key] || false} onChange={(e) => {
                                  setFormData(prev => ({ ...prev, kiteEquipment: { ...prev.kiteEquipment, [key]: e.target.checked } }));
                                  calculatePrice();
                                }} />}
                                label={`${label} (€${price.toFixed(2)}/day)`}
                              />
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Grid>
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>Rental Price</Typography>
                          <Typography>Base: €{(Number(formData.price) || 0).toFixed(2)}</Typography>
                          {formData.equipmentRental > 0 && <Typography>Accessories: €{(Number(formData.equipmentRental) || 0).toFixed(2)}</Typography>}
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="h6">Total: €{(Number(formData.totalPrice) || 0).toFixed(2)}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                );
              } else if (isSurfRental) {
                // SURF RENTAL FORM FIELDS (Point Break style)
                const surfTypes = currentLocation?.pricing?.surfTypes || {};
                const surfTypeKeys = Object.keys(surfTypes);
                return (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField label="Start Date" type="date" fullWidth value={formData.startDate} onChange={(e) => {
                        const v = e.target.value;
                        setFormData(prev => ({ ...prev, startDate: v, bookingDate: v }));
                      }} required InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Rental Duration (Days)" type="number" fullWidth value={formData.rentalDays} onChange={(e) => {
                        const days = Math.max(1, parseInt(e.target.value) || 1);
                        setFormData(prev => ({ ...prev, rentalDays: days }));
                        calculatePrice();
                      }} inputProps={{ min: 1 }} required />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Surfboard Type</InputLabel>
                        <Select value={formData.surfType} label="Surfboard Type" onChange={(e) => {
                          setFormData(prev => ({ ...prev, surfType: e.target.value }));
                          calculatePrice();
                        }}>
                          {surfTypeKeys.map(key => (
                            <MenuItem key={key} value={key}>{surfTypes[key]?.name || key.replace(/_/g, ' ')}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>Accessories</Typography>
                      <Grid container spacing={2}>
                        {[
                          { key: 'wetsuit', label: 'Wetsuit' },
                          { key: 'shoes', label: 'Shoes' },
                          { key: 'surf_leash', label: 'Surf Leash' },
                          { key: 'auto_rack', label: 'Auto Rack' }
                        ].map(({ key, label }) => {
                          const price = currentLocation?.pricing?.surfEquipment?.[key] || 0;
                          return (
                            <Grid item xs={12} sm={4} key={key}>
                              <FormControlLabel
                                control={<Switch checked={formData.surfEquipment?.[key] || false} onChange={(e) => {
                                  setFormData(prev => ({ ...prev, surfEquipment: { ...prev.surfEquipment, [key]: e.target.checked } }));
                                  calculatePrice();
                                }} />}
                                label={`${label} (€${price.toFixed(2)}/day)`}
                              />
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Grid>
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>Rental Price</Typography>
                          <Typography>Base: €{(Number(formData.price) || 0).toFixed(2)}</Typography>
                          {formData.equipmentRental > 0 && <Typography>Accessories: €{(Number(formData.equipmentRental) || 0).toFixed(2)}</Typography>}
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="h6">Total: €{(Number(formData.totalPrice) || 0).toFixed(2)}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                );
              } else {
                // DIVING FORM FIELDS
                return (
                  <>
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
                  </>
                );
              }
            })()}

            {/* Pricing Information (only for diving) */}
            {(() => {
              const currentLocation = locations.find(l => l.id === formData.locationId);
              const isBikeRental = currentLocation?.type === 'bike_rental';
              const isSurfRental = currentLocation?.type === 'surf';
              const isKiteSurfRental = currentLocation?.type === 'kite_surf';
              if (isBikeRental || isSurfRental || isKiteSurfRental) return null; // Price already shown in rental section
              
              return formData.customerId ? (() => {
                const customer = customers.find(c => c.id === formData.customerId) || null;
              const customerType = getCustomerType(customer);
              const isRecurrent = customerType === 'recurrent';
              const isLocal = customerType === 'local';
              const isTourist = customerType === 'tourist';
              
              // For recurrent/local, use pricePerDive from formData (calculated from pricing service)
              // For tourist, use cumulativePricing if available
              const displayPricePerDive = Number(isRecurrent || isLocal 
                ? formData.pricePerDive || (isRecurrent ? 32.00 : 35.00)
                : (formData.cumulativePricing?.pricePerDive || formData.pricePerDive || 46.00)) || 0;
              
              const displayTotalDives = Number(formData.cumulativePricing?.totalDives) || 0;
              const displayTotalPrice = Number(formData.cumulativePricing?.totalPrice || formData.totalPrice) || 0;
              
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
              })() : null;
            })()}

            {/* Activity Type (only for diving locations) */}
            {(() => {
              const currentLocation = locations.find(l => l.id === formData.locationId);
              const isBikeRental = currentLocation?.type === 'bike_rental';
              const isSurfRental = currentLocation?.type === 'surf';
              const isKiteSurfRental = currentLocation?.type === 'kite_surf';
              if (isBikeRental || isSurfRental || isKiteSurfRental) return null; // Hide activity type for rental locations
              
              return (
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
                    </Select>
                  </FormControl>
                </Grid>
              );
            })()}

            {/* Addons (only for diving) */}
            {(() => {
              const currentLocation = locations.find(l => l.id === formData.locationId);
              const isBikeRental = currentLocation?.type === 'bike_rental';
              const isSurfRental = currentLocation?.type === 'surf';
              const isKiteSurfRental = currentLocation?.type === 'kite_surf';
              if (isBikeRental || isSurfRental || isKiteSurfRental) return null;
              
              return (
                <>
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
                </>
              );
            })()}

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


            {/* Own Equipment (only for diving locations) */}
            {(() => {
              const currentLocation = locations.find(l => l.id === formData.locationId);
              const isBikeRental = currentLocation?.type === 'bike_rental';
              const isSurfRental = currentLocation?.type === 'surf';
              const isKiteSurfRental = currentLocation?.type === 'kite_surf';
              if (isBikeRental || isSurfRental || isKiteSurfRental || formData.activityType !== 'diving') return null;
              
              return (
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
              );
            })()}

            <Divider sx={{ my: 2, width: '100%' }} />

            {/* Volume Discount Calculator (only for diving and tourist customers) */}
            {(() => {
              const currentLocation = locations.find(l => l.id === formData.locationId);
              const isBikeRental = currentLocation?.type === 'bike_rental';
              const isSurfRental = currentLocation?.type === 'surf';
              const isKiteSurfRental = currentLocation?.type === 'kite_surf';
              if (isBikeRental || isSurfRental || isKiteSurfRental || formData.activityType !== 'diving' || !formData.customerId) return null;
              
              const customer = customers.find(c => c.id === formData.customerId) || null;
              const customerType = getCustomerType(customer);
              // Only show volume discount calculator for tourist customers
              const isTourist = customerType === 'tourist';
              return isTourist ? (
                <Grid item xs={12}>
                  <VolumeDiscountCalculator 
                    numberOfDives={(formData.diveSessions?.morning ? 1 : 0) + (formData.diveSessions?.afternoon ? 1 : 0) + (formData.diveSessions?.night ? 1 : 0)}
                    addons={formData.addons || {}}
                    bono={bonos.find(b => b.id === formData.bonoId)}
                  />
                </Grid>
              ) : null;
            })()}


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

