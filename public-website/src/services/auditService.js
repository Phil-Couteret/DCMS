// Audit Logging Service for GDPR Accountability (Article 5(2))
// Logs all data access, modifications, and user actions

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003/api';

/**
 * Log an audit event
 * @param {string} userType - 'admin', 'customer', 'system'
 * @param {string} userId - User ID (optional for system actions)
 * @param {string} action - 'view', 'create', 'update', 'delete', 'export', 'login', 'logout'
 * @param {string} resourceType - 'customer', 'booking', 'consent', 'account'
 * @param {string} resourceId - ID of the resource (optional)
 * @param {Object} details - Additional details about the action
 */
export const logAuditEvent = async (
  userType,
  userId = null,
  action,
  resourceType,
  resourceId = null,
  details = {}
) => {
  // Get IP address and user agent
  const ipAddress = null; // Could be retrieved from request if available
  const userAgent = navigator.userAgent;

  const auditLog = {
    userType,
    userId,
    action,
    resourceType,
    resourceId,
    details,
    ipAddress,
    userAgent,
  };

  // Try to log to backend API if available
  try {
    const response = await fetch(`${API_BASE_URL}/audit-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditLog),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    // API not available or error - log to console for now
    console.warn('[AuditService] Failed to log to API, logging to console:', auditLog);
  }

  // Fallback: Log to localStorage for POC (will be migrated to database)
  try {
    const logs = JSON.parse(localStorage.getItem('dcms_audit_logs') || '[]');
    logs.push({
      ...auditLog,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    });
    
    // Keep only last 1000 logs in localStorage (to avoid storage issues)
    const recentLogs = logs.slice(-1000);
    localStorage.setItem('dcms_audit_logs', JSON.stringify(recentLogs));
  } catch (error) {
    console.error('[AuditService] Failed to log to localStorage:', error);
  }

  return auditLog;
};

/**
 * Log customer data access
 */
export const logCustomerDataAccess = async (userId, customerId, action = 'view') => {
  return logAuditEvent('customer', userId, action, 'customer', customerId, {
    description: `${action} customer data`,
  });
};

/**
 * Log booking action
 */
export const logBookingAction = async (userId, bookingId, action, details = {}) => {
  return logAuditEvent('customer', userId, action, 'booking', bookingId, details);
};

/**
 * Log consent change
 */
export const logConsentChange = async (userId, customerId, consentType, action, details = {}) => {
  return logAuditEvent('customer', userId, action, 'consent', customerId, {
    consentType,
    ...details,
  });
};

/**
 * Log account deletion
 */
export const logAccountDeletion = async (userId, customerId, details = {}) => {
  return logAuditEvent('customer', userId, 'delete', 'account', customerId, {
    description: 'Account deletion requested',
    ...details,
  });
};

/**
 * Log data export
 */
export const logDataExport = async (userId, customerId, format = 'json') => {
  return logAuditEvent('customer', userId, 'export', 'account', customerId, {
    format,
    description: `Data exported as ${format.toUpperCase()}`,
  });
};

/**
 * Log login
 */
export const logLogin = async (userId, email) => {
  return logAuditEvent('customer', userId, 'login', 'account', userId, {
    email,
  });
};

/**
 * Log logout
 */
export const logLogout = async (userId) => {
  return logAuditEvent('customer', userId, 'logout', 'account', userId);
};

/**
 * Log profile update
 */
export const logProfileUpdate = async (userId, customerId, changedFields = {}) => {
  return logAuditEvent('customer', userId, 'update', 'customer', customerId, {
    changedFields: Object.keys(changedFields),
    description: 'Customer profile updated',
  });
};

// Default export
const auditService = {
  logAuditEvent,
  logCustomerDataAccess,
  logBookingAction,
  logConsentChange,
  logAccountDeletion,
  logDataExport,
  logLogin,
  logLogout,
  logProfileUpdate,
};

export default auditService;

