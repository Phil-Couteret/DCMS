// Prices match the pricing page. Keys double as message keys under pricing.items.
export const ACTIVITIES = [
  { key: 'snorkeling', type: 'SNORKELING', price: 25 },
  { key: 'discoverScuba', type: 'DISCOVER_SCUBA', price: 60 },
  { key: 'funDive', type: 'FUN_DIVE', price: 45 },
  { key: 'openWater', type: 'OW_CERT', price: 350 },
  { key: 'advanced', type: 'AOW_CERT', price: 280 },
  { key: 'rescue', type: 'RESCUE_CERT', price: 320 },
] as const;

export type Activity = (typeof ACTIVITIES)[number];
export type ActivityType = Activity['type'];

const SHOE_SIZES = Array.from({ length: 11 }, (_, i) => String(36 + i));

export const EQUIPMENT = [
  { key: 'wetsuit', price: 8, sizes: ['XS', 'S', 'M', 'L', 'XL'], sizeLabel: 'size' },
  { key: 'bcd', price: 10, sizes: ['S', 'M', 'L', 'XL'], sizeLabel: 'size' },
  { key: 'regulator', price: 10, sizes: null, sizeLabel: null },
  { key: 'maskFins', price: 5, sizes: SHOE_SIZES, sizeLabel: 'shoeSize' },
  { key: 'computer', price: 12, sizes: null, sizeLabel: null },
] as const;

export type EquipmentKey = (typeof EQUIPMENT)[number]['key'];

// All five hired together cost 35 instead of 45, whether chosen through the
// Full Package box or ticked one by one.
export const FULL_PACKAGE_PRICE = 35;

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

export function equipmentTotal(selected: Partial<Record<EquipmentKey, string | true>>) {
  if (isFullPackage(selected)) return FULL_PACKAGE_PRICE;
  return EQUIPMENT.reduce((sum, e) => sum + (selected[e.key] !== undefined ? e.price : 0), 0);
}
