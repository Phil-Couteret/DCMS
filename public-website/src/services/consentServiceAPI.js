// Consent Service API Client
// Uses backend API when available, falls back to localStorage

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003/api';

/**
 * Check if API is available
 */
const isAPIAvailable = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Get customer ID from email (helper function)
 * This is a temporary solution - in production, we'd have a proper customer lookup
 */
const getCustomerIdByEmail = async (email) => {
  // Try to find customer by email from localStorage first
  const customersStr = localStorage.getItem('dcms_customers') || '[]';
  const customers = JSON.parse(customersStr);
  const customer = customers.find(c => c.email?.toLowerCase() === email?.toLowerCase());
  
  if (customer && customer.id) {
    return customer.id;
  }
  
  // If not found, try API (would need a customers endpoint)
  // For now, return null and use localStorage fallback
  return null;
};

/**
 * Get all consents for a customer (tries API first, falls back to localStorage)
 */
export const getCustomerConsents = async (customerId) => {
  const apiAvailable = await isAPIAvailable();
  
  if (apiAvailable && customerId) {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}/consents`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('[ConsentService] API error, falling back to localStorage:', error);
    }
  }
  
  // Fallback to localStorage
  const allConsents = JSON.parse(localStorage.getItem('dcms_consents') || '{}');
  return allConsents[customerId] || [];
};

/**
 * Record consent (tries API first, falls back to localStorage)
 */
export const recordConsent = async (customerId, consentType, consentGiven, consentMethod = 'online', ipAddress = null, userAgent = null) => {
  const apiAvailable = await isAPIAvailable();
  
  if (apiAvailable && customerId) {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}/consents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentType,
          consentGiven,
          consentMethod,
          ipAddress,
          userAgent,
        }),
      });
      
      if (response.ok) {
        const consent = await response.json();
        
        // Dispatch event for sync
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dcms_consent_updated', {
            detail: { customerId, consentType, consentGiven }
          }));
        }
        
        return consent;
      }
    } catch (error) {
      console.warn('[ConsentService] API error, falling back to localStorage:', error);
    }
  }
  
  // Fallback to localStorage (use original consentService)
  const consentService = await import('./consentService');
  return consentService.default.recordConsent(customerId, consentType, consentGiven, consentMethod, ipAddress, userAgent);
};

/**
 * Withdraw consent
 */
export const withdrawConsent = async (customerId, consentType) => {
  const apiAvailable = await isAPIAvailable();
  
  if (apiAvailable && customerId) {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}/consents/${consentType}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('[ConsentService] API error, falling back to localStorage:', error);
    }
  }
  
  // Fallback to localStorage
  const consentService = await import('./consentService');
  return consentService.default.withdrawConsent(customerId, consentType);
};

/**
 * Check if customer has consent
 */
export const hasConsent = async (customerId, consentType) => {
  const apiAvailable = await isAPIAvailable();
  
  if (apiAvailable && customerId) {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}/consents/check?type=${consentType}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.hasConsent;
      }
    } catch (error) {
      console.warn('[ConsentService] API error, falling back to localStorage:', error);
    }
  }
  
  // Fallback to localStorage
  const consentService = await import('./consentService');
  return consentService.default.hasConsent(customerId, consentType);
};

/**
 * Get active consents
 */
export const getActiveConsents = async (customerId) => {
  const apiAvailable = await isAPIAvailable();
  
  if (apiAvailable && customerId) {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}/consents/active`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('[ConsentService] API error, falling back to localStorage:', error);
    }
  }
  
  // Fallback to localStorage
  const consentService = await import('./consentService');
  return consentService.default.getActiveConsents(customerId);
};

/**
 * Delete all consents for a customer
 */
export const deleteCustomerConsents = async (customerId) => {
  const apiAvailable = await isAPIAvailable();
  
  if (apiAvailable && customerId) {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}/consents`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('[ConsentService] API error, falling back to localStorage:', error);
    }
  }
  
  // Fallback to localStorage
  const consentService = await import('./consentService');
  return consentService.default.deleteCustomerConsents(customerId);
};

/**
 * Get consent history
 */
export const getConsentHistory = async (customerId) => {
  return getCustomerConsents(customerId);
};

// Default export
const consentServiceAPI = {
  getCustomerConsents,
  recordConsent,
  withdrawConsent,
  hasConsent,
  getActiveConsents,
  deleteCustomerConsents,
  getConsentHistory,
};

export default consentServiceAPI;

