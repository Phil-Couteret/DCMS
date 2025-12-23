// Transform customer data from frontend format to backend API format
// This mirrors the logic in frontend/src/services/api/realApiAdapter.js

export const transformCustomerToBackend = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  // Backend DTO supports: firstName, lastName, email, phone, dob, nationality,
  // address, customerType, preferences, medicalConditions, restrictions, notes, isActive
  
  // Fields to store in preferences JSON (not directly supported by backend DTO)
  // Only include diving-related fields if customerType exists (indicating it's a diving customer)
  const isDivingCustomer = data.customerType !== undefined && data.customerType !== null && data.customerType !== '';
  
  const extraFields = {
    gender: data.gender, // Gender is universal, not diving-specific
  };
  
  // Only include diving-specific fields for diving customers
  if (isDivingCustomer) {
    if (data.isApproved !== undefined) extraFields.isApproved = data.isApproved;
    if (data.centerSkillLevel !== undefined) extraFields.centerSkillLevel = data.centerSkillLevel;
    if (data.certifications !== undefined && Array.isArray(data.certifications)) {
      // Save certifications array even if empty to persist structure
      extraFields.certifications = data.certifications;
    }
    // Save medicalCertificate and divingInsurance regardless of hasCertificate/hasInsurance to persist all data
    if (data.medicalCertificate !== undefined) {
      extraFields.medicalCertificate = data.medicalCertificate;
    }
    if (data.divingInsurance !== undefined) {
      extraFields.divingInsurance = data.divingInsurance;
    }
    if (data.uploadedDocuments !== undefined && Array.isArray(data.uploadedDocuments)) {
      // Save uploadedDocuments array even if empty to persist structure
      extraFields.uploadedDocuments = data.uploadedDocuments;
    }
  }
  
  // Build preferences object, merging existing preferences with extra fields
  // First, clean existing preferences to remove diving fields if not a diving customer
  const existingPreferences = data.preferences || {};
  let cleanPreferences = { ...existingPreferences };
  
  // If not a diving customer, remove any diving-related fields from existing preferences
  if (!isDivingCustomer) {
    delete cleanPreferences.isApproved;
    delete cleanPreferences.centerSkillLevel;
    delete cleanPreferences.certifications;
    delete cleanPreferences.medicalCertificate;
    delete cleanPreferences.divingInsurance;
    // Keep uploadedDocuments and gender for all customers
  }
  
  const preferences = {
    ...cleanPreferences,
    ...Object.fromEntries(
      Object.entries(extraFields).filter(([_, value]) => value !== undefined && value !== null)
    )
  };

  const transformed = {};
  
  // Only include fields that the backend DTO supports
  if (data.firstName !== undefined) transformed.firstName = data.firstName;
  if (data.lastName !== undefined) transformed.lastName = data.lastName;
  if (data.email !== undefined) transformed.email = data.email;
  if (data.phone !== undefined) transformed.phone = data.phone;
  if (data.dob !== undefined) transformed.dob = data.dob;
  if (data.nationality !== undefined) transformed.nationality = data.nationality;
  if (data.address !== undefined) transformed.address = data.address;
  // Always include customerType if it's provided (don't rely on isDivingCustomer check)
  // This ensures customerType changes (e.g., tourist -> recurrent) are preserved
  if (data.customerType !== undefined && data.customerType !== null && data.customerType !== '') {
    transformed.customerType = data.customerType;
  }
  // Always include preferences (with extra fields merged in)
  transformed.preferences = preferences;
  // Only include medicalConditions for diving customers
  if (isDivingCustomer && data.medicalConditions !== undefined) transformed.medicalConditions = data.medicalConditions;
  if (data.restrictions !== undefined) transformed.restrictions = data.restrictions;
  if (data.notes !== undefined) transformed.notes = data.notes;
  if (data.isActive !== undefined) transformed.isActive = data.isActive;

  return transformed;
};

