// Transform customer data from backend API response to frontend format
// This handles the transformation of snake_case to camelCase and extraction of fields from preferences JSON

export const transformCustomerFromBackend = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  // Extract extra fields from preferences JSON
  const preferences = data.preferences || {};
  
  // Check if this is a diving customer (has customerType)
  const customerType = data.customer_type || data.customerType;
  const isDivingCustomer = customerType !== undefined && customerType !== null && customerType !== '';
  
  // Gender is universal, not diving-specific
  const extraFields = {
    gender: preferences.gender
  };
  
  // Only extract diving-related fields for diving customers
  if (isDivingCustomer) {
    if (preferences.isApproved !== undefined) extraFields.isApproved = preferences.isApproved;
    if (preferences.centerSkillLevel !== undefined) extraFields.centerSkillLevel = preferences.centerSkillLevel;
    if (preferences.certifications !== undefined) extraFields.certifications = preferences.certifications;
    if (preferences.medicalCertificate !== undefined) extraFields.medicalCertificate = preferences.medicalCertificate;
    if (preferences.divingInsurance !== undefined) extraFields.divingInsurance = preferences.divingInsurance;
    if (preferences.uploadedDocuments !== undefined) extraFields.uploadedDocuments = preferences.uploadedDocuments;
  }
  
  // Remove extra fields from preferences to get clean preferences object (keep only equipment/suit preferences)
  const cleanPreferences = { ...preferences };
  delete cleanPreferences.isApproved;
  delete cleanPreferences.centerSkillLevel;
  delete cleanPreferences.certifications;
  delete cleanPreferences.medicalCertificate;
  delete cleanPreferences.divingInsurance;
  delete cleanPreferences.uploadedDocuments;
  delete cleanPreferences.gender;
  delete cleanPreferences.password; // Don't expose password to frontend
  
  // Build the result object
  const result = {
    id: data.id,
    firstName: data.first_name || data.firstName,
    lastName: data.last_name || data.lastName,
    email: data.email,
    phone: data.phone,
    dob: data.dob,
    nationality: data.nationality,
    gender: extraFields.gender || data.gender || '',
    address: data.address,
    preferences: cleanPreferences, // Only equipment/suit preferences
    restrictions: data.restrictions,
    notes: data.notes,
    isActive: data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : true),
    createdAt: data.created_at || data.createdAt,
    updatedAt: data.updated_at || data.updatedAt,
  };
  
  // Only include diving-related fields for diving customers
  if (isDivingCustomer) {
    result.customerType = customerType || 'tourist';
    result.centerSkillLevel = extraFields.centerSkillLevel || data.center_skill_level || data.centerSkillLevel || 'beginner';
    result.medicalConditions = data.medical_conditions || data.medicalConditions || [];
    result.isApproved = extraFields.isApproved !== undefined ? extraFields.isApproved : (data.is_approved !== undefined ? data.is_approved : false);
    result.certifications = extraFields.certifications || data.certifications || data.customer_certifications || [];
    result.medicalCertificate = extraFields.medicalCertificate || data.medical_certificate || data.medicalCertificate || { hasCertificate: false };
    result.divingInsurance = extraFields.divingInsurance || data.diving_insurance || data.divingInsurance || { hasInsurance: false };
    result.uploadedDocuments = extraFields.uploadedDocuments || data.uploaded_documents || data.uploadedDocuments || [];
  } else {
    // For bike rental customers, set defaults
    result.customerType = undefined;
    result.centerSkillLevel = undefined;
    result.medicalConditions = [];
    result.isApproved = false;
    result.certifications = [];
    result.medicalCertificate = { hasCertificate: false };
    result.divingInsurance = { hasInsurance: false };
    result.uploadedDocuments = [];
  }
  
  return result;
};

