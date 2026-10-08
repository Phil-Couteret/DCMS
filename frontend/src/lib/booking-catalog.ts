// Prices come from the API (GET /pricing, see getPrices), the same list
// invoices are built from. Keys double as message keys under pricing.items;
// priceKey is the activity's key in the price list.
export const ACTIVITIES = [
  { key: 'snorkeling', type: 'SNORKELING', priceKey: 'snorkeling' },
  { key: 'discoverScuba', type: 'DISCOVER_SCUBA', priceKey: 'discoverScuba' },
  { key: 'funDive', type: 'FUN_DIVE', priceKey: 'funDive' },
  { key: 'openWater', type: 'OW_CERT', priceKey: 'owCert' },
  { key: 'advanced', type: 'AOW_CERT', priceKey: 'aowCert' },
  { key: 'rescue', type: 'RESCUE_CERT', priceKey: 'rescueCert' },
] as const;

export type Activity = (typeof ACTIVITIES)[number];
export type ActivityType = Activity['type'];

const SHOE_SIZES = Array.from({ length: 11 }, (_, i) => String(36 + i));

// key is how a booking stores the item ("computer"); priceKey is its key in
// the price list.
export const EQUIPMENT = [
  { key: 'wetsuit', priceKey: 'wetsuit', sizes: ['XS', 'S', 'M', 'L', 'XL'], sizeLabel: 'size' },
  { key: 'bcd', priceKey: 'bcd', sizes: ['S', 'M', 'L', 'XL'], sizeLabel: 'size' },
  { key: 'regulator', priceKey: 'regulator', sizes: null, sizeLabel: null },
  { key: 'maskFins', priceKey: 'maskFins', sizes: SHOE_SIZES, sizeLabel: 'shoeSize' },
  { key: 'computer', priceKey: 'diveComputer', sizes: null, sizeLabel: null },
] as const;

export type EquipmentKey = (typeof EQUIPMENT)[number]['key'];

// Net prices from GET /pricing, in the center's currency (ISO 4217). An
// activity priced null is not sold.
// equipment.fullPackage is the price of all five items hired together,
// whether chosen through the Full Package box or ticked one by one.
export interface Prices {
  currency: string;
  activities: Record<Activity['priceKey'] | 'dmCert', number | null>;
  equipment: Record<(typeof EQUIPMENT)[number]['priceKey'] | 'fullPackage', number>;
}

export function activityPrice(prices: Prices, activity: Activity) {
  return prices.activities[activity.priceKey];
}

// The activities on sale: those with a price.
export function pricedActivities(prices: Prices) {
  return ACTIVITIES.filter((a) => activityPrice(prices, a) !== null);
}

export function equipmentPrice(prices: Prices, key: EquipmentKey) {
  return prices.equipment[EQUIPMENT.find((e) => e.key === key)!.priceKey];
}

export const COUNTRIES = ['ES', 'DE', 'GB', 'FR', 'US', 'Other'] as const;

export const CERT_LEVELS = [
  'none',
  'openWater',
  'advanced',
  'rescue',
  'divemaster',
  'instructor',
] as const;

export function isFullPackage(selected: Partial<Record<EquipmentKey, string | true>>) {
  return EQUIPMENT.every((e) => selected[e.key] !== undefined);
}

export function equipmentTotal(selected: Partial<Record<EquipmentKey, string | true>>, prices: Prices) {
  if (isFullPackage(selected)) return prices.equipment.fullPackage;
  return EQUIPMENT.reduce((sum, e) => sum + (selected[e.key] !== undefined ? prices.equipment[e.priceKey] : 0), 0);
}
