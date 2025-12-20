// Pricing Service for Admin Portal
// Mirrors the pricing logic used on the public website so we can recompute
// historical bookings based on the latest pricing configuration.

const getLocations = () => {
  try {
    return JSON.parse(localStorage.getItem('dcms_locations') || '[]');
  } catch (error) {
    // Failed to parse locations
    return [];
  }
};

export const getLocationPricing = (locationId) => {
  const locations = getLocations();
  const location = locations.find((loc) => loc.id === locationId);

  if (!location) {
    // Location not found for pricing
    return {};
  }

  if (!location.pricing) {
    // No pricing configured for location
    return {};
  }

  return location.pricing;
};

export const calculateDivePrice = (locationId, customerType, numberOfDives) => {
  if (!numberOfDives || numberOfDives <= 0) return 0;

  const pricing = getLocationPricing(locationId);
  const customerTypePricing = pricing.customerTypes || {};

  // Recurrent customers: fixed price per dive
  if (customerType === 'recurrent' && customerTypePricing.recurrent?.pricePerDive) {
    return customerTypePricing.recurrent.pricePerDive * numberOfDives;
  }

  // Local customers: fixed price per dive
  if (customerType === 'local' && customerTypePricing.local?.pricePerDive) {
    return customerTypePricing.local.pricePerDive * numberOfDives;
  }

  // Tourist customers: tiered pricing
  if (customerTypePricing.tourist?.diveTiers?.length) {
    const tiers = [...customerTypePricing.tourist.diveTiers].sort((a, b) => a.dives - b.dives);
    let selectedTier = tiers[0];
    for (const tier of tiers) {
      if (numberOfDives >= tier.dives) {
        selectedTier = tier;
      } else {
        break;
      }
    }
    return selectedTier.price * numberOfDives;
  }

  // Fallback pricing if configuration is missing
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

export const calculateActivityPrice = (activityType, numberOfDives = 1, locationId) => {
  const pricing = getLocationPricing(locationId);
  
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

export const getCustomerType = (customer) => {
  return customer?.customerType || 'tourist';
};

