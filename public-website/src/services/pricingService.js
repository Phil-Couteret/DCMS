// Pricing Service - Calculates prices based on admin pricing configuration
// Reads from location.pricing.customerTypes (synced from admin portal)

/**
 * Get pricing configuration for a location
 */
export const getLocationPricing = (locationId) => {
  const locations = JSON.parse(localStorage.getItem('dcms_locations') || '[]');
  const location = locations.find(l => l.id === locationId);
  
  if (!location) {
    // Location not found for pricing
    return {};
  }
  
  if (!location.pricing) {
    // Location has no pricing config
    return {};
  }
  
  return location.pricing;
};

/**
 * Get price per dive for a customer type (doesn't calculate total, just returns per-dive rate)
 * @param {string} locationId - Location ID
 * @param {string} customerType - 'tourist', 'local', or 'recurrent'
 * @param {number} numberOfDives - Total number of dives (for tourist tier calculation)
 * @returns {number} Price per dive
 */
export const getPricePerDive = (locationId, customerType, numberOfDives = 1) => {
  const pricing = getLocationPricing(locationId);
  const customerTypePricing = pricing.customerTypes || {};
  
  // Recurrent customers: fixed price per dive (numberOfDives doesn't matter)
  if (customerType === 'recurrent') {
    if (customerTypePricing.recurrent?.pricePerDive) {
      return customerTypePricing.recurrent.pricePerDive;
    }
    // Fallback for recurrent if not configured
    return 32.00;
  }
  
  // Local customers: fixed price per dive (numberOfDives doesn't matter)
  if (customerType === 'local') {
    if (customerTypePricing.local?.pricePerDive) {
      return customerTypePricing.local.pricePerDive;
    }
    // Fallback for local if not configured
    return 35.00;
  }
  
  // Tourist customers: tiered pricing - need to find the right tier
  if (customerType === 'tourist' && customerTypePricing.tourist?.diveTiers) {
    const tiers = customerTypePricing.tourist.diveTiers;
    // Sort tiers by number of dives (ascending)
    const sortedTiers = [...tiers].sort((a, b) => a.dives - b.dives);
    
    // Find the appropriate tier for the number of dives
    let selectedTier = sortedTiers[0]; // Default to first tier
    for (const tier of sortedTiers) {
      if (numberOfDives >= tier.dives) {
        selectedTier = tier;
      } else {
        break;
      }
    }
    
    return selectedTier.price;
  }
  
  // Fallback: use hardcoded tourist pricing if no config found
  if (numberOfDives <= 2) return 46;
  if (numberOfDives <= 5) return 44;
  if (numberOfDives <= 8) return 42;
  if (numberOfDives <= 12) return 40;
  return 38;
};

/**
 * Calculate price for diving based on customer type and number of dives
 * @param {string} locationId - Location ID
 * @param {string} customerType - 'tourist', 'local', or 'recurrent'
 * @param {number} numberOfDives - Total number of dives
 * @returns {number} Total price
 */
export const calculateDivePrice = (locationId, customerType, numberOfDives) => {
  if (!numberOfDives || numberOfDives <= 0) return 0;
  
  const pricePerDive = getPricePerDive(locationId, customerType, numberOfDives);
  return pricePerDive * numberOfDives;
};

/**
 * Calculate price for other activity types
 * @param {string} activityType - Type of activity ('snorkeling', 'discover', 'orientation')
 * @param {number} numberOfDives - Number of dives/activities (default: 1)
 * @param {string} locationId - Location ID for location-specific pricing
 * @returns {number} Total price
 */
export const calculateActivityPrice = (activityType, numberOfDives = 1, locationId) => {
  // Get location-specific pricing if locationId is provided
  const locations = JSON.parse(localStorage.getItem('dcms_locations') || '[]');
  const location = locationId 
    ? locations.find(l => l.id === locationId) 
    : locations[0]; // Use first location as default if no locationId
  const pricing = location?.pricing || {};
  
  switch (activityType) {
    case 'snorkeling':
      return 38 * numberOfDives;
    case 'discover': {
      const discoverPrice = pricing.customerTypes?.tourist?.discoverDive;
      return (discoverPrice || 100) * numberOfDives;
    }
    case 'orientation': {
      const orientationPrice = pricing.customerTypes?.tourist?.orientationDive;
      return (orientationPrice || 32) * numberOfDives;
    }
    default:
      return 0;
  }
};

/**
 * Get customer type from customer data
 */
export const getCustomerType = (customer) => {
  const customerType = customer?.customerType || 'tourist';
  if (customer && customer.customerType !== customerType) {
    // Customer has no customerType, defaulting to tourist
  }
  return customerType;
};
