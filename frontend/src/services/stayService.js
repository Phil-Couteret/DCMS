// Stay Service - Manages customer stays and cumulative pricing
// This service tracks all dives for a customer during their stay and applies cumulative pricing

import dataService from './dataService';

// Get all bookings for a customer during their stay
export const getCustomerStayBookings = (customerId, stayStartDate = null) => {
  const allBookings = dataService.getAll('bookings');
  
  // Filter bookings for this customer
  let customerBookings = allBookings.filter(booking => booking.customerId === customerId);
  
  // If stayStartDate is provided, filter by date range (within 30 days of stay start)
  if (stayStartDate) {
    const stayStart = new Date(stayStartDate);
    const stayEnd = new Date(stayStart);
    stayEnd.setDate(stayEnd.getDate() + 30); // 30-day stay window
    
    customerBookings = customerBookings.filter(booking => {
      const bookingDate = new Date(booking.bookingDate);
      return bookingDate >= stayStart && bookingDate <= stayEnd;
    });
  }
  
  // Sort by booking date
  return customerBookings.sort((a, b) => new Date(a.bookingDate) - new Date(b.bookingDate));
};

// Calculate total dives for a customer during their stay
export const getCustomerStayDiveCount = (customerId, stayStartDate = null) => {
  const stayBookings = getCustomerStayBookings(customerId, stayStartDate);
  
  let totalDives = 0;
  stayBookings.forEach(booking => {
    if (booking.diveSessions) {
      // New format: count sessions
      totalDives += (booking.diveSessions.morning ? 1 : 0) + (booking.diveSessions.afternoon ? 1 : 0) + (booking.diveSessions.night ? 1 : 0);
    } else if (booking.numberOfDives) {
      // Old format: use numberOfDives
      totalDives += booking.numberOfDives;
    }
  });
  
  return totalDives;
};

// Get cumulative pricing for a customer's stay
export const getCumulativeStayPricing = (customerId, stayStartDate = null) => {
  const stayBookings = getCustomerStayBookings(customerId, stayStartDate);
  const totalDives = getCustomerStayDiveCount(customerId, stayStartDate);
  
  // Get customer info to determine customer type
  const customer = dataService.getById('customers', customerId);
  const customerType = customer?.customerType || 'tourist';
  
  // Determine location-specific pricing (use first booking's location)
  const locations = dataService.getAll('locations') || [];
  const stayLocationId = stayBookings[0]?.locationId;
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
  
  if (!customerPricing) {
    console.warn(`Pricing config not found for customer type: ${customerType}, using fallback pricing`);
    return {
      totalDives,
      pricePerDive: 46,
      totalPrice: totalDives * 46,
      breakdown: [],
      stayBookings
    };
  }
  
  let pricePerDive;
  
  if (customerPricing.tiers) {
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
  
  // Create breakdown for each booking
  const breakdown = stayBookings.map(booking => {
    const bookingDives = booking.diveSessions ? 
      (booking.diveSessions.morning ? 1 : 0) + (booking.diveSessions.afternoon ? 1 : 0) + (booking.diveSessions.night ? 1 : 0) :
      (booking.numberOfDives || 0);
    
    return {
      bookingId: booking.id,
      bookingDate: booking.bookingDate,
      dives: bookingDives,
      pricePerDive,
      totalForBooking: bookingDives * pricePerDive,
      sessions: booking.diveSessions ? {
        morning: booking.diveSessions.morning,
        afternoon: booking.diveSessions.afternoon
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
export const recalculateCustomerStayPricing = (customerId, stayStartDate = null) => {
  const cumulativePricing = getCumulativeStayPricing(customerId, stayStartDate);
  const stayBookings = cumulativePricing.stayBookings;
  
  // Update each booking with the cumulative price per dive
  stayBookings.forEach(booking => {
    const bookingDives = booking.diveSessions ? 
      (booking.diveSessions.morning ? 1 : 0) + (booking.diveSessions.afternoon ? 1 : 0) + (booking.diveSessions.night ? 1 : 0) :
      (booking.numberOfDives || 0);
    
    const newPrice = bookingDives * cumulativePricing.pricePerDive;
    
    // Update the booking with new pricing
    const updatedBooking = {
      ...booking,
      price: newPrice,
      totalPrice: newPrice + (booking.discount || 0)
    };
    
    dataService.update('bookings', booking.id, updatedBooking);
  });
  
  return cumulativePricing;
};

// Get stay summary for a customer
export const getCustomerStaySummary = (customerId, stayStartDate = null) => {
  const cumulativePricing = getCumulativeStayPricing(customerId, stayStartDate);
  const customer = dataService.getById('customers', customerId);
  
  return {
    customer: customer ? {
      id: customer.id,
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email
    } : null,
    stayStartDate: stayStartDate || (cumulativePricing.stayBookings.length > 0 ? 
      cumulativePricing.stayBookings[0].bookingDate : null),
    totalDives: cumulativePricing.totalDives,
    pricePerDive: cumulativePricing.pricePerDive,
    totalPrice: cumulativePricing.totalPrice,
    breakdown: cumulativePricing.breakdown,
    bookingCount: cumulativePricing.stayBookings.length
  };
};

// Get all active stays (customers with recent bookings)
export const getActiveStays = (days = 30) => {
  const allBookings = dataService.getAll('bookings');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  // Group bookings by customer
  const customerBookings = {};
  allBookings.forEach(booking => {
    const bookingDate = new Date(booking.bookingDate);
    if (bookingDate >= cutoffDate) {
      if (!customerBookings[booking.customerId]) {
        customerBookings[booking.customerId] = [];
      }
      customerBookings[booking.customerId].push(booking);
    }
  });
  
  // Get stay summaries for each customer
  const activeStays = Object.keys(customerBookings).map(customerId => {
    const customerBookingsList = customerBookings[customerId];
    const stayStartDate = customerBookingsList[0].bookingDate;
    return getCustomerStaySummary(customerId, stayStartDate);
  });
  
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
