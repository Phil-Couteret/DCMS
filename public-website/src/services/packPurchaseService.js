// Pack Purchase Service - Manages dive pack purchases for customers
// Packs are pre-paid credits (e.g. 10 dives with equipment) that customers can use when booking

const STORAGE_KEY = 'dcms_packPurchases';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getAll = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveAll = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn('[PackPurchaseService] Failed to save:', err);
    return false;
  }
};

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3003/api';

function extractPacksFromLocation(location) {
  if (!location) return [];
  const sources = [
    location.pricing?.divePacks,
    location.settings?.pricing?.divePacks,
    location.settings?.divePacks
  ];
  const allPacks = sources.filter(Array.isArray).flat();
  const seen = new Set();
  const merged = [];
  for (const p of allPacks) {
    if (!p || typeof p.dives !== 'number' || p.dives <= 0 || typeof p.price !== 'number' || p.price <= 0) continue;
    const key = `${p.dives}-${!!p.withEquipment}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(p);
  }
  return merged.sort(
    (a, b) => a.dives - b.dives || ((a.withEquipment ? 1 : 0) - (b.withEquipment ? 1 : 0))
  );
}

/**
 * Get available packs from the API (source of truth). Falls back to localStorage if API fails.
 */
export async function getAvailablePacksAsync(locationId) {
  try {
    const res = await fetch(`${API_BASE}/locations`, { cache: 'no-store' });
    if (res.ok) {
      const locations = await res.json();
      const loc = Array.isArray(locations) ? locations.find(l => l && l.id === locationId) : null;
      const packs = extractPacksFromLocation(loc);
      if (packs.length > 0) return packs;
    }
  } catch (e) {
    // Fall through to localStorage
  }
  return getAvailablePacks(locationId);
}

/**
 * Get available packs for a location (sync, from localStorage).
 * Use getAvailablePacksAsync for fresh API data.
 */
export const getAvailablePacks = (locationId) => {
  const raw = localStorage.getItem('dcms_locations');
  if (!raw) return [];
  let locations;
  try {
    locations = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(locations)) return [];
  const location = locations.find(l => l && l.id === locationId);
  return extractPacksFromLocation(location);
};

/**
 * Get pack purchases for a customer (active ones with remaining dives)
 */
export const getCustomerPackPurchases = (customerId) => {
  const all = getAll();
  return all.filter(
    p => p.customerId === customerId && p.divesRemaining > 0 && (p.status !== 'consumed')
  );
};

/**
 * Find a pack purchase that can cover a booking (same location, same equipment, enough dives)
 */
export const findMatchingPack = (customerId, locationId, numberOfDives, withEquipment) => {
  const packs = getCustomerPackPurchases(customerId);
  return packs.find(
    p => p.locationId === locationId &&
         p.withEquipment === !!withEquipment &&
         p.divesRemaining >= numberOfDives
  );
};

/**
 * Create a new pack purchase
 */
export const createPackPurchase = ({ customerId, locationId, dives, withEquipment, price }) => {
  const all = getAll();
  const purchase = {
    id: generateId(),
    customerId,
    locationId,
    divesTotal: dives,
    divesRemaining: dives,
    withEquipment: !!withEquipment,
    price,
    purchaseDate: new Date().toISOString().split('T')[0],
    status: 'active',
    createdAt: new Date().toISOString()
  };
  all.push(purchase);
  saveAll(all);
  return purchase;
};

/**
 * Deduct dives from a pack (when customer books using pack credits)
 * Returns updated pack or null if deduction failed
 */
export const deductFromPack = (packPurchaseId, numberOfDives) => {
  const all = getAll();
  const idx = all.findIndex(p => p.id === packPurchaseId);
  if (idx < 0) return null;
  const pack = all[idx];
  if (pack.divesRemaining < numberOfDives) return null;
  pack.divesRemaining -= numberOfDives;
  if (pack.divesRemaining <= 0) pack.status = 'consumed';
  all[idx] = pack;
  saveAll(all);
  return pack;
};

/**
 * Get all pack purchases (for admin/sync)
 */
export const getAllPackPurchases = () => getAll();

const packPurchaseService = {
  getAvailablePacks,
  getAvailablePacksAsync,
  getCustomerPackPurchases,
  findMatchingPack,
  createPackPurchase,
  deductFromPack,
  getAllPackPurchases
};

export default packPurchaseService;
