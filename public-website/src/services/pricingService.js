// Pricing Service - Calculates prices based on admin pricing configuration
// Reads from location.pricing.customerTypes (synced from admin portal)

/**
 * Get pricing configuration for a location
 */
export const getLocationPricing = (locationId) => {
  const locations = JSON.parse(localStorage.getItem('dcms_locations') || '[]');
  const location = locations.find(l => l.id === locationId);
  
  if (!location) {
    console.warn('[Pricing] Location not found:', locationId, 'Available locations:', locations.map(l => ({ id: l.id, name: l.name })));
    return {};
  }
  
  if (!location.pricing) {
    console.warn('[Pricing] Location has no pricing config:', location.name, 'Please configure pricing in admin Settings → Prices');
    return {};
  }
  
  return location.pricing;
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
  
  const pricing = getLocationPricing(locationId);
  const customerTypePricing = pricing.customerTypes || {};
  
  console.log('[Pricing] Calculating price:', { locationId, customerType, numberOfDives, pricing, customerTypePricing });
  
  // Recurrent customers: fixed price per dive
  if (customerType === 'recurrent' && customerTypePricing.recurrent?.pricePerDive) {
    const price = customerTypePricing.recurrent.pricePerDive * numberOfDives;
    console.log('[Pricing] Using recurrent pricing:', price);
    return price;
  }
  
  // Local customers: fixed price per dive
  if (customerType === 'local' && customerTypePricing.local?.pricePerDive) {
    return customerTypePricing.local.pricePerDive * numberOfDives;
  }
  
  // Tourist customers: tiered pricing
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
    
    return selectedTier.price * numberOfDives;
  }
  
  // Fallback: use hardcoded tourist pricing if no config found
  console.warn('[Pricing] No pricing config found, using fallback pricing');
  let basePrice = 46;
  if (numberOfDives <= 2) {
    basePrice = 46;
  } else if (numberOfDives <= 5) {
    basePrice = 44;
  } else if (numberOfDives <= 8) {
    basePrice = 42;
  } else if (numberOfDives <= 12) {
    basePrice = 40;
  } else {
    basePrice = 38;
  }
  return basePrice * numberOfDives;
};

/**
 * Calculate price for other activity types
 */
export const calculateActivityPrice = (activityType, numberOfDives = 1) => {
  // These might also be configurable in the future, but for now use fixed prices
  switch (activityType) {
    case 'snorkeling':
      return 38 * numberOfDives;
    case 'discover':
      return 100 * numberOfDives;
    case 'orientation':
      // Check if orientation price is configured for tourist
      const locations = JSON.parse(localStorage.getItem('dcms_locations') || '[]');
      const location = locations[0]; // Use first location as default
      const orientationPrice = location?.pricing?.customerTypes?.tourist?.orientationDive;
      return orientationPrice ? orientationPrice * numberOfDives : 32 * numberOfDives;
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
    console.warn('[Pricing] Customer has no customerType, defaulting to tourist:', customer.email);
  }
  return customerType;
};

