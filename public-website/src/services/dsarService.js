// Data Subject Access Request (DSAR) Service
// For GDPR Article 15 - Right to Access

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003/api';

/**
 * Create a new DSAR request
 */
export const createDsarRequest = async (customerId, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/customers/${customerId}/dsar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: options.requestType || 'access',
        requestedBy: options.requestedBy || null,
        requestDetails: options.requestDetails || {},
        responseFormat: options.responseFormat || 'json',
        responseDeliveryMethod: options.responseDeliveryMethod || 'portal',
      }),
    });

    if (response.ok) {
      return await response.json();
    }
    
    throw new Error(`DSAR request failed: ${response.statusText}`);
  } catch (error) {
    console.error('[DSAR Service] Error creating DSAR request:', error);
    throw error;
  }
};

/**
 * Get all DSAR requests for a customer
 */
export const getCustomerDsars = async (customerId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/customers/${customerId}/dsar`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      return await response.json();
    }
    
    return [];
  } catch (error) {
    console.error('[DSAR Service] Error fetching DSAR requests:', error);
    return [];
  }
};

/**
 * Get DSAR statistics for a customer
 */
export const getDsarStatistics = async (customerId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/customers/${customerId}/dsar/statistics`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      return await response.json();
    }
    
    return { total: 0, pending: 0, completed: 0, overdue: 0 };
  } catch (error) {
    console.error('[DSAR Service] Error fetching DSAR statistics:', error);
    return { total: 0, pending: 0, completed: 0, overdue: 0 };
  }
};

/**
 * Get a specific DSAR request
 */
export const getDsarRequest = async (dsarId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/customers/:customerId/dsar/requests/${dsarId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      return await response.json();
    }
    
    return null;
  } catch (error) {
    console.error('[DSAR Service] Error fetching DSAR request:', error);
    return null;
  }
};

/**
 * Calculate days until deadline
 */
export const getDaysUntilDeadline = (deadline) => {
  if (!deadline) return null;
  
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffTime = deadlineDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Check if DSAR is overdue
 */
export const isDsarOverdue = (dsar) => {
  if (!dsar || !dsar.deadline) return false;
  if (dsar.status === 'completed' || dsar.status === 'rejected') return false;
  
  return new Date(dsar.deadline) < new Date();
};

// Default export
const dsarService = {
  createDsarRequest,
  getCustomerDsars,
  getDsarStatistics,
  getDsarRequest,
  getDaysUntilDeadline,
  isDsarOverdue,
};

export default dsarService;

