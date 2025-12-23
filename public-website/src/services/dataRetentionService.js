// Data Retention Service for GDPR Compliance
// Implements automated data retention and deletion policies

import bookingService from './bookingService';
import consentService from './consentService';

// Retention periods in days
const RETENTION_POLICIES = {
  // Customer data: 7 years (2555 days) after last activity
  customerInactive: 7 * 365, // 2555 days
  
  // Booking records: 7 years after booking date (legal/accounting requirement)
  bookings: 7 * 365, // 2555 days
  
  // Medical certificates: 3 years or until expiry (whichever is longer)
  medicalCertificates: 3 * 365, // 1095 days (minimum, but check expiry date)
  
  // Marketing consent: Until withdrawn or 3 years of inactivity
  marketingConsent: 3 * 365, // 1095 days
  
  // All consent records: 5 years for audit purposes (after withdrawal)
  consentAudit: 5 * 365, // 1825 days
  
  // Password change requirements: Already handled by passwordMigrationService
  // This is separate and handled immediately on login
};

/**
 * Get last activity date for a customer
 * Returns the most recent of: last login, last booking, last profile update
 */
const getLastActivityDate = (customer) => {
  const dates = [];
  
  // Last profile update
  if (customer.updatedAt) {
    dates.push(new Date(customer.updatedAt));
  }
  
  // Created date as fallback
  if (customer.createdAt) {
    dates.push(new Date(customer.createdAt));
  }
  
  // Get bookings for this customer to check last booking date
  const bookingsStr = localStorage.getItem('dcms_bookings') || '[]';
  const bookings = JSON.parse(bookingsStr);
  const customerBookings = bookings.filter(b => 
    b.customerId === customer.id || 
    b.email?.toLowerCase() === customer.email?.toLowerCase()
  );
  
  if (customerBookings.length > 0) {
    customerBookings.forEach(booking => {
      if (booking.date) dates.push(new Date(booking.date));
      if (booking.createdAt) dates.push(new Date(booking.createdAt));
    });
  }
  
  // Return most recent date, or null if no dates found
  return dates.length > 0 ? new Date(Math.max(...dates)) : null;
};

/**
 * Check if customer should be deleted due to inactivity
 */
export const shouldDeleteInactiveCustomer = (customer) => {
  if (!customer) return false;
  
  const lastActivity = getLastActivityDate(customer);
  if (!lastActivity) return false; // No activity data, keep for now
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_POLICIES.customerInactive);
  
  return lastActivity < cutoffDate;
};

/**
 * Check if booking should be deleted based on retention policy
 */
export const shouldDeleteBooking = (booking) => {
  if (!booking || !booking.date) return false;
  
  const bookingDate = new Date(booking.date);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_POLICIES.bookings);
  
  return bookingDate < cutoffDate;
};

/**
 * Check if medical certificate should be deleted
 * Returns true if certificate is expired AND past retention period
 */
export const shouldDeleteMedicalCertificate = (medicalCert) => {
  if (!medicalCert || !medicalCert.hasCertificate) return false;
  
  // Get expiry date
  const expiryDate = medicalCert.expiryDate ? new Date(medicalCert.expiryDate) : null;
  if (!expiryDate) return false; // Keep if no expiry date
  
  // Check if expired
  const now = new Date();
  if (expiryDate > now) return false; // Not expired yet, keep
  
  // Calculate retention period from expiry date
  const retentionCutoff = new Date(expiryDate);
  retentionCutoff.setDate(retentionCutoff.getDate() + RETENTION_POLICIES.medicalCertificates);
  
  // Delete if past retention period
  return now > retentionCutoff;
};

/**
 * Check if marketing consent should be deleted (3 years inactive)
 */
export const shouldDeleteMarketingConsent = (consent, customerId) => {
  if (!consent || consent.consentType !== 'marketing') return false;
  if (!consent.consentGiven || !consent.isActive) return false; // Already withdrawn
  
  // Get customer to check activity
  const customer = bookingService.getCustomerByEmail(consent.customerId || customerId);
  if (!customer) return true; // Customer deleted, delete consent
  
  const lastActivity = getLastActivityDate(customer);
  if (!lastActivity) return false;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_POLICIES.marketingConsent);
  
  return lastActivity < cutoffDate;
};

/**
 * Delete inactive customers and their associated data
 * Returns list of deleted customer emails
 */
export const cleanupInactiveCustomers = async () => {
  const customers = getAllCustomers();
  const deletedEmails = [];
  
  for (const customer of customers) {
    if (shouldDeleteInactiveCustomer(customer)) {
      try {
        // Delete customer account (this will cascade delete bookings)
        await bookingService.deleteCustomerAccount(customer.email);
        
        // Delete consent records
        consentService.deleteCustomerConsents(customer.id);
        
        deletedEmails.push(customer.email);
        console.log(`[Data Retention] Deleted inactive customer: ${customer.email} (inactive for 7+ years)`);
      } catch (error) {
        console.error(`[Data Retention] Error deleting inactive customer ${customer.email}:`, error);
      }
    }
  }
  
  return deletedEmails;
};

/**
 * Delete old bookings based on retention policy
 * Returns count of deleted bookings
 */
export const cleanupOldBookings = () => {
  const bookingsStr = localStorage.getItem('dcms_bookings') || '[]';
  const bookings = JSON.parse(bookingsStr);
  const customers = getAllCustomers();
  let deletedCount = 0;
  
  bookings.forEach(booking => {
    if (shouldDeleteBooking(booking)) {
      try {
        // Check if customer still exists
        const customer = customers.find(c => 
          c.id === booking.customerId || 
          c.email?.toLowerCase() === booking.email?.toLowerCase()
        );
        
        if (!customer) {
          // Customer already deleted, safe to delete booking
          const remainingBookings = bookings.filter(b => b.id !== booking.id);
          saveAllBookings(remainingBookings);
          deletedCount++;
          console.log(`[Data Retention] Deleted old booking: ${booking.id} (older than 7 years)`);
        }
        // If customer exists, we keep the booking (it will be deleted when customer is deleted)
      } catch (error) {
        console.error(`[Data Retention] Error deleting old booking ${booking.id}:`, error);
      }
    }
  });
  
  return deletedCount;
};

/**
 * Clean up expired medical certificates (anonymize, don't delete entirely)
 * Returns count of cleaned certificates
 */
export const cleanupExpiredMedicalCertificates = () => {
  const customers = getAllCustomers();
  let cleanedCount = 0;
  
  customers.forEach(customer => {
    if (customer.medicalCertificate && shouldDeleteMedicalCertificate(customer.medicalCertificate)) {
      try {
        // Anonymize medical certificate (remove sensitive data, keep structure)
        bookingService.updateCustomerProfile(customer.email, {
          medicalCertificate: {
            hasCertificate: false,
            certificateNumber: null,
            issueDate: null,
            expiryDate: null,
            verified: false,
            _retainedUntil: new Date().toISOString() // Mark when it was retained
          }
        });
        
        cleanedCount++;
        console.log(`[Data Retention] Cleaned expired medical certificate for: ${customer.email}`);
      } catch (error) {
        console.error(`[Data Retention] Error cleaning medical certificate for ${customer.email}:`, error);
      }
    }
  });
  
  return cleanedCount;
};

/**
 * Clean up old marketing consents
 * Returns count of withdrawn consents
 */
export const cleanupInactiveMarketingConsents = () => {
  const customers = getAllCustomers();
  let withdrawnCount = 0;
  
  customers.forEach(customer => {
    const consents = consentService.getCustomerConsents(customer.id);
    
    consents.forEach(consent => {
      if (shouldDeleteMarketingConsent(consent, customer.id)) {
        try {
          consentService.withdrawConsent(customer.id, 'marketing');
          withdrawnCount++;
          console.log(`[Data Retention] Withdrawn inactive marketing consent for: ${customer.email}`);
        } catch (error) {
          console.error(`[Data Retention] Error withdrawing consent for ${customer.email}:`, error);
        }
      }
    });
  });
  
  return withdrawnCount;
};

/**
 * Run all data retention cleanup tasks
 * Returns summary of cleanup operations
 */
export const runDataRetentionCleanup = () => {
  console.log('[Data Retention] Starting data retention cleanup...');
  
  const summary = {
    inactiveCustomers: 0,
    oldBookings: 0,
    expiredMedicalCerts: 0,
    inactiveMarketingConsents: 0,
    timestamp: new Date().toISOString()
  };
  
  try {
    // Clean up inactive customers (7+ years inactive)
    const deletedCustomers = cleanupInactiveCustomers();
    summary.inactiveCustomers = deletedCustomers.length;
    
    // Clean up old bookings (7+ years old, only if customer already deleted)
    summary.oldBookings = cleanupOldBookings();
    
    // Clean up expired medical certificates (3 years after expiry)
    summary.expiredMedicalCerts = cleanupExpiredMedicalCertificates();
    
    // Clean up inactive marketing consents (3 years inactive)
    summary.inactiveMarketingConsents = cleanupInactiveMarketingConsents();
    
    console.log('[Data Retention] Cleanup completed:', summary);
  } catch (error) {
    console.error('[Data Retention] Error during cleanup:', error);
    summary.error = error.message;
  }
  
  return summary;
};

/**
 * Get retention policy information for display
 */
export const getRetentionPolicies = () => {
  return {
    customerInactive: {
      days: RETENTION_POLICIES.customerInactive,
      years: RETENTION_POLICIES.customerInactive / 365,
      description: 'Customer accounts are retained for 7 years after last activity'
    },
    bookings: {
      days: RETENTION_POLICIES.bookings,
      years: RETENTION_POLICIES.bookings / 365,
      description: 'Booking records are retained for 7 years (legal/accounting requirement)'
    },
    medicalCertificates: {
      days: RETENTION_POLICIES.medicalCertificates,
      years: RETENTION_POLICIES.medicalCertificates / 365,
      description: 'Medical certificates are retained for 3 years after expiry'
    },
    marketingConsent: {
      days: RETENTION_POLICIES.marketingConsent,
      years: RETENTION_POLICIES.marketingConsent / 365,
      description: 'Marketing consent expires after 3 years of account inactivity'
    }
  };
};

// Helper functions (using bookingService internal methods)
const getAllCustomers = () => {
  const customersStr = localStorage.getItem('dcms_customers') || '[]';
  return JSON.parse(customersStr);
};

const saveAllBookings = (bookings) => {
  localStorage.setItem('dcms_bookings', JSON.stringify(bookings));
};

// Default export
const dataRetentionService = {
  shouldDeleteInactiveCustomer,
  shouldDeleteBooking,
  shouldDeleteMedicalCertificate,
  shouldDeleteMarketingConsent,
  cleanupInactiveCustomers,
  cleanupOldBookings,
  cleanupExpiredMedicalCertificates,
  cleanupInactiveMarketingConsents,
  runDataRetentionCleanup,
  getRetentionPolicies,
  getLastActivityDate
};

export default dataRetentionService;

