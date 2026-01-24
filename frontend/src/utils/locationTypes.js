/**
 * Location types configuration and feature-flag helpers.
 * Types are stored in settings.locationTypes (start from scratch: empty by default).
 * Database: locations.type is VARCHAR(50) — any slug allowed.
 */

/** Default features per known type when not in config (fallback for existing data). */
export const DEFAULT_FEATURES = {
  diving: {
    requiresBoats: true,
    requiresDiveSites: true,
    requiresCertifications: true,
    requiresMedicalClearance: true,
  },
  bike_rental: {
    requiresBoats: false,
    requiresDiveSites: false,
    requiresCertifications: false,
    requiresMedicalClearance: false,
  },
  future: {
    requiresBoats: false,
    requiresDiveSites: false,
    requiresCertifications: false,
    requiresMedicalClearance: false,
  },
};

/** Feature keys used across the app. */
export const FEATURE_KEYS = [
  'requiresBoats',
  'requiresDiveSites',
  'requiresCertifications',
  'requiresMedicalClearance',
];

/** Slug-like id: lowercase, alphanumeric + underscores. */
export const TYPE_ID_PATTERN = /^[a-z][a-z0-9_]*$/;

export function isValidTypeId(id) {
  return typeof id === 'string' && id.length > 0 && TYPE_ID_PATTERN.test(id);
}

/**
 * @param {object} settings - Full settings object (from API or localStorage).
 * @returns {Array<{id: string, name: string, displayName: string, icon: string, color: string, order: number, isActive: boolean, features: object}>}
 */
export function getLocationTypes(settings) {
  const raw = settings?.locationTypes;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t) => t && typeof t.id === 'string')
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

/**
 * @param {object} settings
 * @param {string} typeId
 * @returns {object|null} Type config or null.
 */
export function getTypeConfig(settings, typeId) {
  const types = getLocationTypes(settings);
  return types.find((t) => t.id === typeId) || null;
}

/**
 * @param {object} location - Location record with location.type.
 * @param {string} featureKey - One of FEATURE_KEYS.
 * @param {object} settings - Settings object.
 * @returns {boolean}
 */
export function hasFeature(location, featureKey, settings) {
  if (!location?.type) return false;
  const config = getTypeConfig(settings, location.type);
  const features = config?.features ?? DEFAULT_FEATURES[location.type] ?? {};
  if (typeof features[featureKey] !== 'boolean') return false;
  return features[featureKey];
}

/**
 * Convenience: true when location has diving-like features (boats, dive sites, etc.).
 */
export function hasDivingFeatures(location, settings) {
  return hasFeature(location, 'requiresDiveSites', settings);
}

/**
 * Display name for a type. Config first, else humanize typeId (snake_case -> words).
 * @param {object} settings
 * @param {string} typeId
 * @returns {string}
 */
export function getDisplayName(settings, typeId) {
  const config = getTypeConfig(settings, typeId);
  if (config?.displayName) return config.displayName;
  if (config?.name) return config.name;
  if (!typeId) return '';
  return typeId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Color for chip/UI. Config first, else 'default'.
 */
export function getTypeColor(settings, typeId) {
  const config = getTypeConfig(settings, typeId);
  return config?.color || 'default';
}
