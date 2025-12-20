// Data Breach Tracking Service for Admin Portal
// Uses the same API as the public website service

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003/api';

/**
 * Create a new breach record
 */
export const createBreach = async (breachData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/breaches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(breachData),
    });

    if (response.ok) {
      return await response.json();
    }
    
    throw new Error(`Breach creation failed: ${response.statusText}`);
  } catch (error) {
    console.error('[Breach Service] Error creating breach:', error);
    throw error;
  }
};

/**
 * Get all breach records
 */
export const getAllBreaches = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.severity) queryParams.append('severity', filters.severity);
    if (filters.limit) queryParams.append('limit', filters.limit.toString());
    if (filters.offset) queryParams.append('offset', filters.offset.toString());

    const url = `${API_BASE_URL}/breaches${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      return await response.json();
    }
    
    return { breaches: [], total: 0 };
  } catch (error) {
    console.error('[Breach Service] Error fetching breaches:', error);
    return { breaches: [], total: 0 };
  }
};

/**
 * Get breach statistics
 */
export const getBreachStatistics = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/breaches/statistics`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      return await response.json();
    }
    
    return {
      total: 0,
      detected: 0,
      assessed: 0,
      reported: 0,
      resolved: 0,
      overdue: 0,
      requiringCustomerNotification: 0,
    };
  } catch (error) {
    console.error('[Breach Service] Error fetching breach statistics:', error);
    return {
      total: 0,
      detected: 0,
      assessed: 0,
      reported: 0,
      resolved: 0,
      overdue: 0,
      requiringCustomerNotification: 0,
    };
  }
};

/**
 * Get overdue breaches (past 72-hour deadline)
 */
export const getOverdueBreaches = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/breaches/overdue`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      return await response.json();
    }
    
    return [];
  } catch (error) {
    console.error('[Breach Service] Error fetching overdue breaches:', error);
    return [];
  }
};

/**
 * Get a specific breach
 */
export const getBreach = async (breachId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/breaches/${breachId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      return await response.json();
    }
    
    return null;
  } catch (error) {
    console.error('[Breach Service] Error fetching breach:', error);
    return null;
  }
};

/**
 * Update breach status
 */
export const updateBreachStatus = async (breachId, status, updates = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/breaches/${breachId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        ...updates,
      }),
    });

    if (response.ok) {
      return await response.json();
    }
    
    throw new Error(`Breach update failed: ${response.statusText}`);
  } catch (error) {
    console.error('[Breach Service] Error updating breach:', error);
    throw error;
  }
};

/**
 * Calculate hours until notification deadline
 */
export const getHoursUntilDeadline = (deadline) => {
  if (!deadline) return null;
  
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffTime = deadlineDate - now;
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
  
  return diffHours;
};

/**
 * Check if breach is overdue for notification
 */
export const isBreachOverdue = (breach) => {
  if (!breach || !breach.notification_deadline) return false;
  if (breach.reported_to_authority) return false;
  if (breach.status === 'resolved') return false;
  
  return new Date(breach.notification_deadline) < new Date();
};

/**
 * Get severity color for UI display
 */
export const getSeverityColor = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
      return 'success';
    default:
      return 'default';
  }
};

/**
 * Get status color for UI display
 */
export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'resolved':
      return 'success';
    case 'reported':
      return 'info';
    case 'assessed':
      return 'warning';
    case 'detected':
      return 'error';
    default:
      return 'default';
  }
};

// Default export
const breachService = {
  createBreach,
  getAllBreaches,
  getBreachStatistics,
  getOverdueBreaches,
  getBreach,
  updateBreachStatus,
  getHoursUntilDeadline,
  isBreachOverdue,
  getSeverityColor,
  getStatusColor,
};

export default breachService;

