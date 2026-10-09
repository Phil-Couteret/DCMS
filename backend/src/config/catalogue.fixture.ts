import type { PriceList } from './catalogue.js';

// For tests: the price list the add_price_list migration seeds.
export const SEEDED_PRICES: PriceList = {
  activities: {
    SNORKELING: 25,
    DISCOVER_SCUBA: 60,
    FUN_DIVE: 45,
    OW_CERT: 350,
    AOW_CERT: 280,
    RESCUE_CERT: 320,
    DM_CERT: null,
  },
  equipment: { wetsuit: 8, bcd: 10, regulator: 10, maskFins: 5, diveComputer: 12 },
  fullPackage: 35,
  funDiveTiers: [
    { minDives: 1, tourist: 46, local: 35, recurrent: 32 },
    { minDives: 3, tourist: 44, local: 35, recurrent: 32 },
    { minDives: 6, tourist: 42, local: 35, recurrent: 32 },
    { minDives: 9, tourist: 40, local: 35, recurrent: 32 },
    { minDives: 13, tourist: 38, local: 35, recurrent: 32 },
  ],
  addOns: { NIGHT_DIVE: 20, PERSONAL_INSTRUCTOR: 100 },
  divePacks: [
    { diveCount: 5, price: 200 },
    { diveCount: 10, price: 380 },
  ],
};
