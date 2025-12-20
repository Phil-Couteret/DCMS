// Consent Management Service for GDPR Compliance
// Stores consent records in localStorage (for POC) - will migrate to database in production

const CONSENT_STORAGE_KEY = 'dcms_consents';

/**
 * Get all consents for a customer
 */
export const getCustomerConsents = (customerId) => {
  const allConsents = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) || '{}');
  return allConsents[customerId] || [];
};

/**
 * Record consent for a customer
 * @param {string} customerId - Customer ID
 * @param {string} consentType - Type of consent: 'data_processing', 'marketing', 'medical_data', 'photo_video'
 * @param {boolean} consentGiven - Whether consent was given
 * @param {string} consentMethod - How consent was given: 'online', 'paper', 'verbal'
 * @param {string} ipAddress - IP address (optional)
 * @param {string} userAgent - User agent (optional)
 */
export const recordConsent = (customerId, consentType, consentGiven, consentMethod = 'online', ipAddress = null, userAgent = null) => {
  const allConsents = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) || '{}');
  const customerConsents = allConsents[customerId] || [];

  // Create consent record
  const consentRecord = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    customerId,
    consentType,
    consentGiven,
    consentDate: new Date().toISOString(),
    consentMethod,
    ipAddress,
    userAgent,
    withdrawalDate: null,
    isActive: true
  };

  // If withdrawing consent, mark previous consent as withdrawn
  if (!consentGiven && consentType !== 'data_processing') {
    // Data processing is necessary for service, but others can be withdrawn
    const existingConsent = customerConsents.find(
      c => c.consentType === consentType && c.isActive && c.consentGiven
    );
    if (existingConsent) {
      existingConsent.withdrawalDate = new Date().toISOString();
      existingConsent.isActive = false;
    }
  }

  // Add new consent record
  customerConsents.push(consentRecord);

  // Keep only active consents and recent withdrawals (last 5 years for audit)
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
  const filteredConsents = customerConsents.filter(
    c => c.isActive || new Date(c.withdrawalDate || c.consentDate) > cutoffDate
  );

  allConsents[customerId] = filteredConsents;
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(allConsents));

  // Dispatch event for sync service
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dcms_consent_updated', {
      detail: { customerId, consentType, consentGiven }
    }));
  }

  return consentRecord;
};

/**
 * Withdraw consent for a customer
 */
export const withdrawConsent = (customerId, consentType) => {
  return recordConsent(customerId, consentType, false, 'online');
};

/**
 * Check if customer has given consent for a specific type
 */
export const hasConsent = (customerId, consentType) => {
  const consents = getCustomerConsents(customerId);
  const activeConsent = consents.find(
    c => c.consentType === consentType && c.isActive && c.consentGiven
  );
  return !!activeConsent;
};

/**
 * Get all active consents for a customer
 */
export const getActiveConsents = (customerId) => {
  const consents = getCustomerConsents(customerId);
  return consents.filter(c => c.isActive && c.consentGiven);
};

/**
 * Get consent history for a customer (for data export)
 */
export const getConsentHistory = (customerId) => {
  return getCustomerConsents(customerId);
};

/**
 * Delete all consents for a customer (when account is deleted)
 */
export const deleteCustomerConsents = (customerId) => {
  const allConsents = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) || '{}');
  delete allConsents[customerId];
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(allConsents));
};

// Default export
const consentService = {
  getCustomerConsents,
  recordConsent,
  withdrawConsent,
  hasConsent,
  getActiveConsents,
  getConsentHistory,
  deleteCustomerConsents
};

export default consentService;

