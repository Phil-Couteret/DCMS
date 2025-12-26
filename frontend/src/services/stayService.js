// Stay Service - Manages customer stays and cumulative pricing
// This service tracks all dives for a customer during their stay and applies cumulative pricing

import dataService from './dataService';

// Get all bookings for a customer during their stay
export const getCustomerStayBookings = async (customerId, stayStartDate = null) => {
  const allBookings = await dataService.getAll('bookings');
  
  // Guard: if getAll returns a non-array, return empty array
  if (!Array.isArray(allBookings)) {
    return [];
  }
  
  // Filter bookings for this customer
  let customerBookings = allBookings.filter(booking => {
    const bid = booking.customerId || booking.customer_id;
    return bid === customerId;
  });
  
  // If stayStartDate is provided, filter by date range (within 30 days of stay start)
  if (stayStartDate) {
    const stayStart = new Date(stayStartDate);
    const stayEnd = new Date(stayStart);
    stayEnd.setDate(stayEnd.getDate() + 30); // 30-day stay window
    
    customerBookings = customerBookings.filter(booking => {
      const bookingDate = new Date(booking.bookingDate || booking.booking_date);
      return bookingDate >= stayStart && bookingDate <= stayEnd;
    });
  }
  
  // Sort by booking date
  return customerBookings.sort((a, b) => {
    const dateA = new Date(a.bookingDate || a.booking_date);
    const dateB = new Date(b.bookingDate || b.booking_date);
    return dateA - dateB;
  });
};

// Calculate total dives for a customer during their stay
export const getCustomerStayDiveCount = async (customerId, stayStartDate = null) => {
  const stayBookings = await getCustomerStayBookings(customerId, stayStartDate);
  
  let totalDives = 0;
  stayBookings.forEach(booking => {
    if (booking.diveSessions) {
      // New format: count sessions
      totalDives += (booking.diveSessions.morning ? 1 : 0) + (booking.diveSessions.afternoon ? 1 : 0) + (booking.diveSessions.night ? 1 : 0);
    } else if (booking.numberOfDives || booking.number_of_dives) {
      // Old format: use numberOfDives
      totalDives += booking.numberOfDives || booking.number_of_dives || 0;
    }
  });
  
  return totalDives;
};

// Get cumulative pricing for a customer's stay
export const getCumulativeStayPricing = async (customerId, stayStartDate = null) => {
  const stayBookings = await getCustomerStayBookings(customerId, stayStartDate);
  const totalDives = await getCustomerStayDiveCount(customerId, stayStartDate);
  
  // Get customer info to determine customer type
  let customerType = 'tourist';
  try {
    const customer = await dataService.getById('customers', customerId);
    if (customer && typeof customer === 'object' && 'customerType' in customer) {
      customerType = customer.customerType || 'tourist';
    }
  } catch (e) {
    // Ignore errors - customer may not be available
    console.warn('Could not get customer type, defaulting to tourist:', e);
  }
  
  // Determine location-specific pricing (use first booking's location)
  const locationsData = await dataService.getAll('locations');
  const locations = Array.isArray(locationsData) ? locationsData : [];
  const stayLocationId = stayBookings[0]?.locationId || stayBookings[0]?.location_id;
  const location = locations.find(l => l.id === stayLocationId);
  const locationPricing = location?.pricing?.customerTypes;
  let customerPricing = null;
  if (locationPricing) {
    const lp = locationPricing[customerType];
    if (lp?.pricing === 'tiered' && Array.isArray(lp.diveTiers)) {
      customerPricing = { tiers: lp.diveTiers.map(t => ({ dives: t.dives, price: t.price })) };
    } else if (lp?.pricing === 'fixed') {
      customerPricing = { pricePerDive: lp.pricePerDive };
    }
  }
  
  // Use fallback pricing if location pricing not found
  let pricePerDive;
  if (!customerPricing) {
    console.warn(`Pricing config not found for customer type: ${customerType} at location, using fallback pricing`);
    // Use fallback pricing based on customer type
    if (customerType === 'recurrent') {
      pricePerDive = 32.00; // Recurrent customer fallback
    } else if (customerType === 'local') {
      pricePerDive = 35.00; // Local customer fallback
    } else {
      // Tourist - use tiered fallback
      let tierPrice = 46.00;
      if (totalDives >= 13) tierPrice = 38.00;
      else if (totalDives >= 9) tierPrice = 40.00;
      else if (totalDives >= 6) tierPrice = 42.00;
      else if (totalDives >= 3) tierPrice = 44.00;
      pricePerDive = tierPrice;
    }
  } else if (customerPricing.tiers) {
    // Tourist pricing - use tiered system
    // Find the appropriate tier based on total dives
    let tier = null;
    for (let i = 0; i < customerPricing.tiers.length; i++) {
      const currentTier = customerPricing.tiers[i];
      const nextTier = customerPricing.tiers[i + 1];
      
      if (totalDives >= currentTier.dives && (!nextTier || totalDives < nextTier.dives)) {
        tier = currentTier;
        break;
      }
    }
    
    // If no tier found, use the last tier (highest range)
    if (!tier) {
      tier = customerPricing.tiers[customerPricing.tiers.length - 1];
    }
    
    pricePerDive = tier.price;
  } else {
    // Local/Recurrent pricing - use fixed price
    pricePerDive = customerPricing.pricePerDive;
  }
  
  const totalPrice = totalDives * pricePerDive;
  
  // Compute route-based pricing for Playitas specifics
  let caletaDivesCount = 0;
  const isPlayitas = !!location && location.name?.toLowerCase().includes('playitas');
  if (isPlayitas) {
    stayBookings.forEach(b => {
      const d = b.diveSessions ? ((b.diveSessions.morning?1:0)+(b.diveSessions.afternoon?1:0)+(b.diveSessions.night?1:0)) : (b.numberOfDives || 0);
      if (b.routeType === 'caleta_from_playitas') caletaDivesCount += d;
    });
  }

  // Determine tier price for Caleta from Playitas if applicable
  let playitasCaletaTierPrice = null;
  if (isPlayitas && caletaDivesCount > 0) {
    const tiers = locationPricing?.tourist?.diveTiers || [];
    for (let i = 0; i < tiers.length; i++) {
      const currentTier = tiers[i];
      const nextTier = tiers[i+1];
      if (caletaDivesCount >= currentTier.dives && (!nextTier || caletaDivesCount < nextTier.dives)) {
        playitasCaletaTierPrice = currentTier.price;
        break;
      }
    }
    if (playitasCaletaTierPrice == null && tiers.length > 0) playitasCaletaTierPrice = tiers[tiers.length-1].price;
  }

  // Get settings for addon pricing - use API
  let settings = {};
  try {
    const settingsData = await dataService.getAll('settings');
    if (Array.isArray(settingsData) && settingsData.length > 0) {
      settings = settingsData[0];
    }
  } catch (error) {
    console.warn('[StayService] Failed to load settings from API, using empty object:', error);
  }
  const locationPricingFull = location?.pricing || {};
  
  // Create breakdown for each booking
  const breakdown = stayBookings.map(booking => {
    const bookingDives = booking.diveSessions ? 
      (booking.diveSessions.morning ? 1 : 0) + (booking.diveSessions.afternoon ? 1 : 0) + (booking.diveSessions.night ? 1 : 0) :
      (booking.numberOfDives || booking.number_of_dives || 0);

    let perDive = pricePerDive;
    let extra = 0;
    if (isPlayitas) {
      if (booking.routeType === 'playitas_local') perDive = 35;
      if (booking.routeType === 'dive_trip') perDive = 45;
      if (booking.routeType === 'caleta_from_playitas' && playitasCaletaTierPrice) perDive = playitasCaletaTierPrice;
      if (booking.routeType === 'caleta_from_playitas' && bookingDives > 0) extra += 15; // transfer per day
    }
    
    // Calculate base price for dives
    const basePrice = bookingDives * perDive;
    
    // Add night dive surcharge if night dive is selected
    let nightDiveSurcharge = 0;
    if (booking.diveSessions?.night) {
      nightDiveSurcharge = locationPricingFull.addons?.night_dive ?? settings?.prices?.addons?.night_dive ?? 20;
    }
    
    // Add other addons (e.g., personal instructor)
    let addonPrice = 0;
    if (booking.addons?.personalInstructor) {
      addonPrice += (locationPricingFull.addons?.personal_instructor ?? settings?.prices?.addons?.personal_instructor ?? 100);
    }
    
    // Add equipment rental (preserve existing equipment rental from booking)
    const equipmentRental = booking.equipmentRental || 0;
    
    // Add dive insurance (preserve existing dive insurance from booking)
    const diveInsurance = booking.diveInsurance || 0;
    
    // Calculate total including all costs
    const totalForBooking = basePrice + nightDiveSurcharge + addonPrice + extra + equipmentRental + diveInsurance;
    
    return {
      bookingId: booking.id,
      bookingDate: booking.bookingDate || booking.booking_date,
      dives: bookingDives,
      pricePerDive: perDive,
      totalForBooking: totalForBooking,
      sessions: booking.diveSessions ? {
        morning: booking.diveSessions.morning,
        afternoon: booking.diveSessions.afternoon,
        night: booking.diveSessions.night
      } : null
    };
  });
  
  return {
    totalDives,
    pricePerDive,
    totalPrice,
    breakdown,
    stayBookings
  };
};

// Recalculate all bookings for a customer with cumulative pricing
export const recalculateCustomerStayPricing = async (customerId, stayStartDate = null) => {
  const cumulativePricing = await getCumulativeStayPricing(customerId, stayStartDate);
  const stayBookings = cumulativePricing.stayBookings;
  
  // Update each booking with the cumulative price per dive
  for (const booking of stayBookings) {
    const bookingDives = booking.diveSessions ? 
      (booking.diveSessions.morning ? 1 : 0) + (booking.diveSessions.afternoon ? 1 : 0) + (booking.diveSessions.night ? 1 : 0) :
      (booking.numberOfDives || booking.number_of_dives || 0);
    
    const newPrice = bookingDives * cumulativePricing.pricePerDive;
    
    // Update the booking with new pricing
    const updatedBooking = {
      ...booking,
      price: newPrice,
      totalPrice: newPrice + (booking.discount || 0)
    };
    
    await dataService.update('bookings', booking.id, updatedBooking);
  }
  
  return cumulativePricing;
};

// Get stay summary for a customer
export const getCustomerStaySummary = async (customerId, stayStartDate = null) => {
  const cumulativePricing = await getCumulativeStayPricing(customerId, stayStartDate);
  
  // Get customer info
  let customer = null;
  try {
    customer = await dataService.getById('customers', customerId);
    // Ensure customer is an object
    if (!customer || typeof customer !== 'object') {
      customer = null;
    }
  } catch (e) {
    // Ignore errors - customer may not be available
    customer = null;
  }
  
  const firstBooking = cumulativePricing.stayBookings[0];
  const bookingDate = firstBooking?.bookingDate || firstBooking?.booking_date;
  
  return {
    customer: customer ? {
      id: customer.id,
      name: `${customer.firstName || customer.first_name || ''} ${customer.lastName || customer.last_name || ''}`.trim() || customer.email,
      email: customer.email,
      // Include divingInsurance so BillGenerator can check if customer has valid insurance
      divingInsurance: customer.divingInsurance || customer.diving_insurance || null
    } : null,
    stayStartDate: stayStartDate || bookingDate || null,
    totalDives: cumulativePricing.totalDives,
    pricePerDive: cumulativePricing.pricePerDive,
    totalPrice: cumulativePricing.totalPrice,
    breakdown: cumulativePricing.breakdown,
    bookingCount: cumulativePricing.stayBookings.length
  };
};

// Get all active stays (customers with recent bookings)
export const getActiveStays = async (days = 30) => {
  const allBookings = await dataService.getAll('bookings');
  
  // Guard: if getAll returns a non-array, return empty array
  if (!Array.isArray(allBookings)) {
    return [];
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  // Group bookings by customer
  const customerBookings = {};
  allBookings.forEach(booking => {
    const bookingDate = new Date(booking.bookingDate || booking.booking_date);
    if (bookingDate >= cutoffDate) {
      const customerId = booking.customerId || booking.customer_id;
      if (customerId) {
        if (!customerBookings[customerId]) {
          customerBookings[customerId] = [];
        }
        customerBookings[customerId].push(booking);
      }
    }
  });
  
  // Get stay summaries for each customer
  const stayPromises = Object.keys(customerBookings).map(async (customerId) => {
    const customerBookingsList = customerBookings[customerId]
      .sort((a, b) => {
        const dateA = new Date(a.bookingDate || a.booking_date);
        const dateB = new Date(b.bookingDate || b.booking_date);
        return dateA - dateB;
      });
    const stayStartDate = customerBookingsList[0]?.bookingDate || customerBookingsList[0]?.booking_date;
    return await getCustomerStaySummary(customerId, stayStartDate);
  });
  
  const activeStays = await Promise.all(stayPromises);
  return activeStays.filter(stay => stay.customer !== null);
};

export default {
  getCustomerStayBookings,
  getCustomerStayDiveCount,
  getCumulativeStayPricing,
  recalculateCustomerStayPricing,
  getCustomerStaySummary,
  getActiveStays
};
