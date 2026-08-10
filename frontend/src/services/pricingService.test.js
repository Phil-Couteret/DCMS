import {
  getLocationPricing,
  getPackPrice,
  calculateDivePriceWithPacks,
  calculateDivePrice,
  calculateActivityPrice,
  getCustomerType,
} from './pricingService';

// Phase 6.6 (roadmap item 6, targeted test-coverage expansion): pricingService
// is pure calculation logic (no network calls, only localStorage for config)
// that every bill/financial-summary page depends on - Bill.jsx (Phase 6.5c)
// and Financial.jsx (Phase 5.2) both call into it - yet it had zero tests.
// Given the Financial.jsx expenseCategories bug and the Schedule.jsx scope
// bugs already found this session, pricing math is exactly the kind of
// logic worth locking down: a wrong tier boundary or a swapped
// tourist/local fallback silently under- or over-charges every future
// invoice until someone notices on a real bill.

const setLocations = (locations) => {
  window.localStorage.setItem('dcms_locations', JSON.stringify(locations));
};

const setSettings = (settings) => {
  window.localStorage.setItem('dcms_settings', JSON.stringify(settings));
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('getLocationPricing', () => {
  it('returns the pricing object for a configured location', () => {
    setLocations([{ id: 'loc-1', pricing: { tax: { igic_rate: 0.07 } } }]);
    expect(getLocationPricing('loc-1')).toEqual({ tax: { igic_rate: 0.07 } });
  });

  it('returns {} when the location is not found', () => {
    setLocations([{ id: 'loc-1', pricing: {} }]);
    expect(getLocationPricing('missing-loc')).toEqual({});
  });

  it('returns {} when the location has no pricing configured', () => {
    setLocations([{ id: 'loc-1' }]);
    expect(getLocationPricing('loc-1')).toEqual({});
  });

  it('returns {} when dcms_locations is missing or invalid JSON entirely', () => {
    expect(getLocationPricing('loc-1')).toEqual({});
    window.localStorage.setItem('dcms_locations', 'not json');
    expect(getLocationPricing('loc-1')).toEqual({});
  });
});

describe('getPackPrice', () => {
  it('finds a matching pack by dive count and equipment flag', () => {
    setLocations([{
      id: 'loc-1',
      pricing: { divePacks: [{ dives: 5, withEquipment: true, price: 200 }] },
    }]);
    expect(getPackPrice('loc-1', 5, true)).toBe(200);
  });

  it('returns null when no pack matches the equipment flag', () => {
    setLocations([{
      id: 'loc-1',
      pricing: { divePacks: [{ dives: 5, withEquipment: true, price: 200 }] },
    }]);
    expect(getPackPrice('loc-1', 5, false)).toBeNull();
  });

  it('returns null when there are no packs configured', () => {
    setLocations([{ id: 'loc-1', pricing: {} }]);
    expect(getPackPrice('loc-1', 5, false)).toBeNull();
  });
});

describe('calculateDivePrice', () => {
  it('returns 0 for zero or negative dive counts', () => {
    expect(calculateDivePrice('loc-1', 'tourist', 0)).toBe(0);
    expect(calculateDivePrice('loc-1', 'tourist', -3)).toBe(0);
  });

  it('uses the configured per-dive price for recurrent customers', () => {
    setLocations([{ id: 'loc-1', pricing: { customerTypes: { recurrent: { pricePerDive: 25 } } } }]);
    expect(calculateDivePrice('loc-1', 'recurrent', 4)).toBe(100);
  });

  it('falls back to 32/dive for recurrent customers when unconfigured', () => {
    setLocations([{ id: 'loc-1', pricing: {} }]);
    expect(calculateDivePrice('loc-1', 'recurrent', 3)).toBe(96);
  });

  it('uses the configured per-dive price for local customers', () => {
    setLocations([{ id: 'loc-1', pricing: { customerTypes: { local: { pricePerDive: 30 } } } }]);
    expect(calculateDivePrice('loc-1', 'local', 2)).toBe(60);
  });

  it('falls back to 35/dive for local customers when unconfigured', () => {
    setLocations([{ id: 'loc-1', pricing: {} }]);
    expect(calculateDivePrice('loc-1', 'local', 2)).toBe(70);
  });

  it('selects the correct tiered price for tourist customers based on dive count', () => {
    setLocations([{
      id: 'loc-1',
      pricing: {
        customerTypes: {
          tourist: {
            diveTiers: [
              { dives: 1, price: 46 },
              { dives: 3, price: 44 },
              { dives: 6, price: 42 },
            ],
          },
        },
      },
    }]);
    // Below the lowest tier boundary still uses the lowest tier.
    expect(calculateDivePrice('loc-1', 'tourist', 1)).toBe(46);
    // Exactly on a tier boundary uses that tier, not the one below it.
    expect(calculateDivePrice('loc-1', 'tourist', 3)).toBe(3 * 44);
    // Between tiers uses the highest tier whose threshold has been met.
    expect(calculateDivePrice('loc-1', 'tourist', 5)).toBe(5 * 44);
    expect(calculateDivePrice('loc-1', 'tourist', 6)).toBe(6 * 42);
  });

  it('selects the correct tier when diveTiers are configured out of order', () => {
    // getLocationPricing doesn't sort the source data - calculateDivePrice
    // sorts its own copy internally, so out-of-order config must still work.
    setLocations([{
      id: 'loc-1',
      pricing: {
        customerTypes: {
          tourist: {
            diveTiers: [
              { dives: 6, price: 42 },
              { dives: 1, price: 46 },
              { dives: 3, price: 44 },
            ],
          },
        },
      },
    }]);
    expect(calculateDivePrice('loc-1', 'tourist', 4)).toBe(4 * 44);
  });

  it('uses the hardcoded fallback tourist pricing when no tiers are configured', () => {
    setLocations([{ id: 'loc-1', pricing: {} }]);
    expect(calculateDivePrice('loc-1', 'tourist', 2)).toBe(2 * 46); // 1-2 dives
    expect(calculateDivePrice('loc-1', 'tourist', 5)).toBe(5 * 44); // 3-5 dives
    expect(calculateDivePrice('loc-1', 'tourist', 8)).toBe(8 * 42); // 6-8 dives
    expect(calculateDivePrice('loc-1', 'tourist', 12)).toBe(12 * 40); // 9-12 dives
    expect(calculateDivePrice('loc-1', 'tourist', 13)).toBe(13 * 38); // 13+ dives
  });

  it('treats an unrecognized customerType the same as tourist', () => {
    setLocations([{ id: 'loc-1', pricing: {} }]);
    expect(calculateDivePrice('loc-1', 'unknown-type', 2)).toBe(calculateDivePrice('loc-1', 'tourist', 2));
  });
});

describe('calculateDivePriceWithPacks', () => {
  it('prefers a matching pack price over tiered pricing', () => {
    setLocations([{
      id: 'loc-1',
      pricing: {
        divePacks: [{ dives: 5, withEquipment: false, price: 180 }],
        customerTypes: { tourist: { diveTiers: [{ dives: 1, price: 46 }] } },
      },
    }]);
    expect(calculateDivePriceWithPacks('loc-1', 'tourist', 5, false)).toBe(180);
  });

  it('falls back to tiered pricing plus equipment surcharge when no pack matches', () => {
    setLocations([{ id: 'loc-1', pricing: {} }]);
    setSettings({ prices: { equipment: { complete_equipment: 15 } } });
    // No pack configured -> base tiered price (fallback table) + equipment/dive.
    const base = calculateDivePrice('loc-1', 'tourist', 2);
    expect(calculateDivePriceWithPacks('loc-1', 'tourist', 2, true)).toBe(base + 15 * 2);
  });

  it('uses the default equipment price of 13/dive when settings are unconfigured', () => {
    setLocations([{ id: 'loc-1', pricing: {} }]);
    const base = calculateDivePrice('loc-1', 'tourist', 1);
    expect(calculateDivePriceWithPacks('loc-1', 'tourist', 1, true)).toBe(base + 13);
  });

  it('does not add an equipment surcharge when withEquipment is false', () => {
    setLocations([{ id: 'loc-1', pricing: {} }]);
    const base = calculateDivePrice('loc-1', 'tourist', 3);
    expect(calculateDivePriceWithPacks('loc-1', 'tourist', 3, false)).toBe(base);
  });
});

describe('calculateActivityPrice', () => {
  it('prices snorkeling at a flat 38/person regardless of location config', () => {
    setLocations([{ id: 'loc-1', pricing: {} }]);
    expect(calculateActivityPrice('snorkeling', 3, 'loc-1')).toBe(114);
  });

  it('uses the configured discover-dive price when set', () => {
    setLocations([{ id: 'loc-1', pricing: { customerTypes: { tourist: { discoverDive: 90 } } } }]);
    expect(calculateActivityPrice('discover', 1, 'loc-1')).toBe(90);
  });

  it('falls back to 100 for discover dives when unconfigured', () => {
    setLocations([{ id: 'loc-1', pricing: {} }]);
    expect(calculateActivityPrice('discover', 2, 'loc-1')).toBe(200);
  });

  it('uses the configured orientation-dive price when set', () => {
    setLocations([{ id: 'loc-1', pricing: { customerTypes: { tourist: { orientationDive: 28 } } } }]);
    expect(calculateActivityPrice('orientation', 1, 'loc-1')).toBe(28);
  });

  it('falls back to 32 for orientation dives when unconfigured', () => {
    setLocations([{ id: 'loc-1', pricing: {} }]);
    expect(calculateActivityPrice('orientation', 1, 'loc-1')).toBe(32);
  });

  it('returns 0 for an unrecognized activity type', () => {
    setLocations([{ id: 'loc-1', pricing: {} }]);
    expect(calculateActivityPrice('kayaking', 1, 'loc-1')).toBe(0);
  });

  it('defaults numberOfDives to 1 when not provided', () => {
    setLocations([{ id: 'loc-1', pricing: {} }]);
    expect(calculateActivityPrice('snorkeling', undefined, 'loc-1')).toBe(38);
  });
});

describe('getCustomerType', () => {
  it("returns the customer's configured type", () => {
    expect(getCustomerType({ customerType: 'local' })).toBe('local');
  });

  it("defaults to 'tourist' when unset", () => {
    expect(getCustomerType({})).toBe('tourist');
  });

  it("defaults to 'tourist' when the customer is null/undefined", () => {
    expect(getCustomerType(null)).toBe('tourist');
    expect(getCustomerType(undefined)).toBe('tourist');
  });
});
