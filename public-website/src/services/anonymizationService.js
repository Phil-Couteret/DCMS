// Anonymization Service for GDPR-Compliant Account Deletion
// Handles soft delete and anonymization while retaining data for legal/accounting purposes

/**
 * Anonymize a customer's personal data while keeping the record
 * Legal/accounting data is retained for 7 years
 */
export const anonymizeCustomer = (customer) => {
  if (!customer) return null;
  
  // Create anonymized version
  const anonymized = {
    ...customer,
    // Anonymize personal identifiers
    firstName: 'ANONYMIZED',
    lastName: 'USER',
    email: `deleted-${customer.id}@anonymized.local`,
    phone: null,
    address: null,
    nationality: null,
    gender: null,
    
    // Remove sensitive data
    password: null, // Clear password hash
    medicalConditions: [],
    medicalCertificate: null,
    divingInsurance: null,
    preferences: {}, // Remove personal preferences
    
    // Keep but anonymize notes
    notes: customer.notes ? '[ANONYMIZED]' : null,
    
    // Remove certifications
    certifications: [],
    
    // Mark as anonymized and deleted
    deletedAt: new Date().toISOString(),
    anonymized: true,
    isActive: false,
    
    // Keep for legal/accounting:
    // - id (needed for bookings/financial records)
    // - customerType (for statistics)
    // - createdAt (for retention period calculation)
    // - Bookings are kept separately with anonymized customer_id
  };
  
  return anonymized;
};

/**
 * Anonymize booking data (remove personal details, keep financial data)
 */
export const anonymizeBooking = (booking) => {
  if (!booking) return null;
  
  return {
    ...booking,
    // Remove personal notes/details
    notes: booking.notes ? '[ANONYMIZED]' : null,
    specialRequirements: null,
    
    // Keep financial data (needed for accounting):
    // - price, total, payment info (for 7-year retention)
    // - booking_date, activity_type (for business records)
    // - status (for historical accuracy)
    
    // Mark as anonymized
    anonymized: true,
    anonymizedAt: new Date().toISOString(),
  };
};

/**
 * Check if customer should be permanently deleted
 * (after 7 years from deletion date for accounting records)
 */
export const shouldPermanentlyDelete = (customer, retentionYears = 7) => {
  if (!customer?.deletedAt) return false;
  
  const deletionDate = new Date(customer.deletedAt);
  const retentionDate = new Date(deletionDate);
  retentionDate.setFullYear(retentionDate.getFullYear() + retentionYears);
  
  return new Date() > retentionDate;
};

/**
 * Generate anonymized identifier for logging/reference
 */
export const getAnonymizedIdentifier = (customerId) => {
  return `ANON-${customerId.substring(0, 8)}`;
};

