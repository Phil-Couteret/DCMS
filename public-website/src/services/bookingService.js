// Booking Service for Public Website
// Uses the same localStorage pattern as DCMS admin to sync bookings

import { sendBookingConfirmationEmail } from './emailService';

// Helper functions
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const DEFAULT_EQUIPMENT_ITEMS = [
  'mask',
  'snorkel',
  'fins',
  'boots',
  'wetsuit',
  'hood',
  'bcd',
  'regulator',
  'computer',
  'torch',
  'camera',
  'weights',
  'tank'
];

const normalizeEquipmentOwnership = (ownership = {}) => {
  const normalized = DEFAULT_EQUIPMENT_ITEMS.reduce((acc, key) => {
    acc[key] = Boolean(ownership[key]);
    return acc;
  }, {});
  normalized.tank = false; // Tanks are always provided by the center
  return normalized;
};

const getDefaultEquipmentOwnership = () => normalizeEquipmentOwnership();

const getDefaultSuitPreferences = () => ({
  style: 'full', // shorty | full
  thickness: '5mm', // 3mm | 5mm | 7mm
  hood: false
});

const getDefaultPreferences = () => ({
  ownEquipment: false,
  tankSize: '12L',
  bcdSize: null,
  finsSize: null,
  bootsSize: null,
  wetsuitSize: null,
  equipmentOwnership: getDefaultEquipmentOwnership(),
  suitPreferences: getDefaultSuitPreferences()
});

const dispatchBrowserEvent = (eventName, detail) => {
  if (
    typeof window !== 'undefined' &&
    typeof window.dispatchEvent === 'function'
  ) {
    const event = new CustomEvent(eventName, { detail, bubbles: true });
    window.dispatchEvent(event);
  }
};

// Minimal localStorage approach - only store user_email
// No longer initializing customers/bookings in localStorage - fetch from server instead

// Get all items - try localStorage first, then fetch from server if needed
const getAll = (resource) => {
  const key = `dcms_${resource}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

// Save all items - push to server AND save to localStorage for persistence
const saveAll = async (resource, data) => {
  const key = `dcms_${resource}`;
  
  // Save to localStorage FIRST for immediate persistence
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[DCMS] Failed to save ${resource} to localStorage:`, err);
  }
  
  // Also push to sync server for cross-portal sync
  if (typeof window !== 'undefined' && window.syncService) {
    await window.syncService.syncToServer(resource, data).catch(err => {
      console.warn(`[DCMS] Failed to push ${resource} to server:`, err);
    });
  }
};

// Find or create customer (async - fetches from server)
export const findOrCreateCustomer = async (customerData) => {
  let customers = [];
  
  // Fetch from sync server instead of localStorage
  if (typeof window !== 'undefined' && window.syncService) {
    customers = await window.syncService.fetchFromServer('customers');
  } else {
    // Fallback: try localStorage if sync service not available (backward compatibility)
    customers = getAll('customers');
  }
  
  // Try to find by email first
  let customer = customers.find(c => c.email?.toLowerCase() === customerData.email?.toLowerCase());
  
  if (!customer) {
    // Create new customer
    customer = {
      id: generateId(),
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      email: customerData.email,
      phone: customerData.phone || '',
      password: customerData.password, // Store password (in production, should be hashed)
      nationality: customerData.nationality || '',
      customerType: customerData.customerType || 'tourist', // Default to tourist
      centerSkillLevel: customerData.centerSkillLevel || 'beginner', // Default to beginner
      preferences: mergePreferences(getDefaultPreferences(), customerData.preferences || {}),
      certifications: customerData.certifications || [],
      medicalConditions: customerData.medicalConditions || [],
      notes: customerData.specialRequirements || customerData.notes || '',
      isApproved: false, // New customers require admin approval before booking
      medicalCertificate: customerData.medicalCertificate || {
        hasCertificate: false,
        certificateNumber: '',
        issueDate: '',
        expiryDate: '',
        verified: false
      },
      divingInsurance: customerData.divingInsurance || {
        hasInsurance: false,
        insuranceProvider: '',
        policyNumber: '',
        issueDate: '',
        expiryDate: '',
        verified: false
      },
      uploadedDocuments: customerData.uploadedDocuments || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    customers.push(customer);
    await saveAll('customers', customers);
    
    // Dispatch events to notify admin system (if running)
    dispatchBrowserEvent('dcms_customer_created', customer);
    dispatchBrowserEvent('dcms_customer_updated', customer);
  } else {
    // Update existing customer if new info provided
    // IMPORTANT: Preserve existing customerType and centerSkillLevel - don't overwrite with defaults
    let updated = false;
    if (customerData.phone && !customer.phone) {
      customer.phone = customerData.phone;
      updated = true;
    }
    if (customerData.specialRequirements && !customer.notes) {
      customer.notes = customerData.specialRequirements;
      updated = true;
    }
    if (customerData.password && !customer.password) {
      customer.password = customerData.password;
      updated = true;
    }
    // Only update customerType if explicitly provided in customerData
    if (customerData.customerType) {
      customer.customerType = customerData.customerType;
      updated = true;
    }
    // Only update centerSkillLevel if explicitly provided in customerData
    if (customerData.centerSkillLevel) {
      customer.centerSkillLevel = customerData.centerSkillLevel;
      updated = true;
    }
    
    if (updated) {
      customer.updatedAt = new Date().toISOString();
      // Update the customer in the array and push to server
      const idx = customers.findIndex(c => c.id === customer.id);
      if (idx !== -1) {
        customers[idx] = customer;
        await saveAll('customers', customers);
      }
      
      // Dispatch event to notify admin system
      dispatchBrowserEvent('dcms_customer_updated', customer);
    }
  }
  
  return customer;
};

// Check availability (basic validation)
export const checkAvailability = (date, time, location, activityType) => {
  const bookings = getAll('bookings');
  // Map location name to locationId (using same UUIDs as admin portal)
  const locationId = location === 'caleta' 
    ? '550e8400-e29b-41d4-a716-446655440001' // Caleta de Fuste
    : '550e8400-e29b-41d4-a716-446655440002'; // Las Playitas
  
  // Get bookings for the same date, time, and location
  const conflictingBookings = bookings.filter(booking => {
    return booking.bookingDate === date &&
           booking.locationId === locationId &&
           booking.status !== 'cancelled' &&
           booking.status !== 'no_show';
  });
  
  // Basic capacity check (can be enhanced later)
  // For now, we'll allow bookings but flag if there are many
  const maxCapacity = 20; // Adjust based on actual capacity
  return {
    available: conflictingBookings.length < maxCapacity,
    existingBookings: conflictingBookings.length,
    maxCapacity
  };
};

// Check if medical certificate is required for an activity
export const requiresMedicalCertificate = (activityType) => {
  return ['diving', 'discover', 'orientation'].includes(activityType);
};

// Check if customer has valid medical certificate
export const hasValidMedicalCertificate = (customer) => {
  if (!customer || !customer.medicalCertificate) {
    return false;
  }
  const cert = customer.medicalCertificate;
  // Check if certificate exists and is valid
  if (!cert.hasCertificate) {
    return false;
  }
  // Check if certificate has expiration date and if it's still valid
  if (cert.expirationDate) {
    const expiration = new Date(cert.expirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiration >= today;
  }
  // If no expiration date, assume it's valid if hasCertificate is true
  return true;
};

// Create booking (async - fetches from server)
export const createBooking = async (bookingData) => {
  let bookings = [];
  
  // Fetch from sync server instead of localStorage
  if (typeof window !== 'undefined' && window.syncService) {
    bookings = await window.syncService.fetchFromServer('bookings');
  } else {
    // Fallback: try localStorage if sync service not available (backward compatibility)
    bookings = getAll('bookings');
  }
  
  // Find or create customer (include password if provided for new customers)
  const customer = await findOrCreateCustomer({
    firstName: bookingData.firstName,
    lastName: bookingData.lastName,
    email: bookingData.email,
    phone: bookingData.phone,
    password: bookingData.password, // Include password for new customers
    specialRequirements: bookingData.specialRequirements
  });
  
  // Validate medical certificate checkbox for diving activities
  // Only check if checkbox is checked - actual certificate details will be provided later in profile
  // Registered divers can skip this check as they can update their profile
  if (requiresMedicalCertificate(bookingData.activityType) && !bookingData.isRegisteredDiver) {
    if (bookingData.hasMedicalCertificate !== true) {
      throw new Error('A valid medical certificate is required for diving activities. Please confirm that you have a valid medical certificate.');
    }
  }
  
  // Map location name to locationId (using same UUIDs as admin portal)
  const locationId = bookingData.location === 'caleta' 
    ? '550e8400-e29b-41d4-a716-446655440001' // Caleta de Fuste
    : '550e8400-e29b-41d4-a716-446655440002'; // Las Playitas
  
  // Map activity type to booking format
  const activityType = bookingData.activityType;
  
  // Map time to session format
  let diveSessions = {};
  if (bookingData.time === '09:00' || bookingData.time === 'morning') {
    diveSessions.morning = true;
  } else if (bookingData.time === '12:00' || bookingData.time === 'afternoon') {
    diveSessions.afternoon = true;
  } else if (bookingData.time === '10:15') {
    diveSessions.morning = true; // 10:15 is additional morning session
  } else {
    // Default to morning for other times
    diveSessions.morning = true;
  }
  
  // Create booking object matching DCMS format
  const booking = {
    id: generateId(),
    customerId: customer.id,
    locationId: locationId,
    bookingDate: bookingData.date,
    activityType: activityType,
    diveSessions: diveSessions,
    numberOfDives: bookingData.numberOfDives || 1,
    time: bookingData.time,
    experienceLevel: bookingData.experienceLevel || 'intermediate',
    price: bookingData.price,
    discount: bookingData.discount || 0,
    totalPrice: bookingData.totalPrice,
    status: 'confirmed', // Start as confirmed after payment
    paymentMethod: bookingData.paymentMethod || 'card',
    paymentStatus: 'paid',
    paymentTransactionId: bookingData.paymentTransactionId || `TXN-${generateId()}`,
    equipmentNeeded: activityType === 'diving' ? ['BCD', 'Regulator', 'Mask', 'Fins', 'Boots', 'Wetsuit', 'Tank'] : [],
    ownEquipment: Boolean(bookingData.ownEquipment),
    notes: bookingData.specialRequirements || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  bookings.push(booking);
  await saveAll('bookings', bookings);
  
  // Store user email for MyAccount page (only thing we keep in localStorage)
  if (bookingData.email) {
    localStorage.setItem('dcms_user_email', bookingData.email);
  }
  
  // Prepare and send confirmation email (async, non-blocking)
  sendBookingConfirmationEmail(booking, customer).catch(err => {
    console.error('Failed to send confirmation email:', err);
    // Don't fail the booking if email fails
  });
  
  // Dispatch events to notify admin system (if running)
  dispatchBrowserEvent('dcms_booking_created', booking);
  
  return {
    success: true,
    booking,
    customer
  };
};

export const updateBookingEquipmentDetails = (bookingId, updates = {}) => {
  if (!bookingId) return null;

  const bookings = getAll('bookings');
  const idx = bookings.findIndex((b) => b.id === bookingId);
  if (idx === -1) {
    return null;
  }

  const updatedBooking = {
    ...bookings[idx],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  bookings[idx] = updatedBooking;
  saveAll('bookings', bookings);
  dispatchBrowserEvent('dcms_booking_updated', updatedBooking);

  if (typeof window !== 'undefined' && window.syncService) {
    window.syncService.markChanged('bookings');
    window.syncService.pushPendingChanges?.().catch(err => {
      console.warn('[DCMS] Failed to sync booking updates immediately:', err);
    });
  }

  return updatedBooking;
};

export const cancelBooking = (bookingId, options = {}) => {
  if (!bookingId) return null;
  const bookings = getAll('bookings');
  const idx = bookings.findIndex((b) => b.id === bookingId);
  if (idx === -1) {
    return null;
  }

  const booking = bookings[idx];
  bookings[idx] = {
    ...booking,
    status: 'cancelled',
    cancellationReason: options.reason || 'Cancelled by diver',
    cancellationNotes: options.notes || '',
    cancelledBy: options.cancelledBy || 'customer',
    paymentStatus: booking.paymentStatus === 'paid' ? 'refund_pending' : booking.paymentStatus,
    updatedAt: new Date().toISOString()
  };

  saveAll('bookings', bookings);
  dispatchBrowserEvent('dcms_booking_updated', bookings[idx]);
  return bookings[idx];
};

// Get customer bookings (async - fetches from sync server)
export const getCustomerBookings = async (email) => {
  if (!email) return [];
  
  // Fetch from sync server instead of localStorage
  if (typeof window !== 'undefined' && window.syncService) {
    const customers = await window.syncService.fetchFromServer('customers');
    const bookings = await window.syncService.fetchFromServer('bookings');
    
    const customer = customers.find(c => c.email?.toLowerCase() === email?.toLowerCase());
    if (!customer) {
      return [];
    }
    
    return bookings.filter(b => b.customerId === customer.id);
  }
  
  // Fallback: try localStorage if sync service not available (backward compatibility)
  const customers = getAll('customers');
  const bookings = getAll('bookings');
  const customer = customers.find(c => c.email?.toLowerCase() === email?.toLowerCase());
  if (!customer) {
    return [];
  }
  return bookings.filter(b => b.customerId === customer.id);
};

// Get customer by email (async - fetches from sync server)
export const getCustomerByEmail = async (email) => {
  if (!email) return null;
  
  // Fetch from sync server instead of localStorage
  if (typeof window !== 'undefined' && window.syncService) {
    const customers = await window.syncService.fetchFromServer('customers');
    return (
      customers.find(
        (c) => c.email?.toLowerCase() === email.toLowerCase()
      ) || null
    );
  }
  
  // Fallback: try localStorage if sync service not available (backward compatibility)
  const customers = getAll('customers');
  return (
    customers.find(
      (c) => c.email?.toLowerCase() === email.toLowerCase()
    ) || null
  );
};

const mergeNestedObject = (original = {}, updates = {}) => {
  return {
    ...original,
    ...updates,
  };
};

const mergePreferences = (existing = {}, incoming = {}) => {
  const mergedEquipmentOwnership = normalizeEquipmentOwnership({
    ...(existing.equipmentOwnership || {}),
    ...(incoming.equipmentOwnership || {})
  });

  const mergedSuitPreferences = {
    ...getDefaultSuitPreferences(),
    ...(existing.suitPreferences || {}),
    ...(incoming.suitPreferences || {})
  };

  const ownsAllExceptTank = DEFAULT_EQUIPMENT_ITEMS.filter(
    (item) => item !== 'tank'
  ).every((key) => mergedEquipmentOwnership[key]);

  return {
    ...existing,
    ...incoming,
    equipmentOwnership: mergedEquipmentOwnership,
    suitPreferences: mergedSuitPreferences,
    ownEquipment: ownsAllExceptTank
  };
};

export const updateCustomerProfile = async (email, updates = {}) => {
  if (!email) return null;
  
  let customers = [];
  
  // Fetch from sync server instead of localStorage
  if (typeof window !== 'undefined' && window.syncService) {
    customers = await window.syncService.fetchFromServer('customers');
  } else {
    // Fallback: try localStorage if sync service not available (backward compatibility)
    customers = getAll('customers');
  }
  
  const idx = customers.findIndex(
    (c) => c.email?.toLowerCase() === email.toLowerCase()
  );

  if (idx === -1) {
    return null;
  }

  const customer = customers[idx];
  
  // Ensure required fields exist (for backward compatibility with existing customers)
  // IMPORTANT: Preserve existing customerType and centerSkillLevel unless explicitly updated with a valid value
  const preservedCustomerType = (updates.hasOwnProperty('customerType') && updates.customerType) 
    ? updates.customerType 
    : (customer.customerType || 'tourist');
  const preservedCenterSkillLevel = (updates.hasOwnProperty('centerSkillLevel') && updates.centerSkillLevel)
    ? updates.centerSkillLevel
    : (customer.centerSkillLevel || 'beginner');
  
  // Log if customerType is being changed
  if (customer.customerType && customer.customerType !== preservedCustomerType && updates.hasOwnProperty('customerType')) {
    console.warn(`[DCMS] CustomerType changed from "${customer.customerType}" to "${preservedCustomerType}" for ${email}`);
  }
  
  // Get defaults for medical certificate and insurance
  const getDefaultMedicalCertificate = () => ({
    hasCertificate: false,
    certificateNumber: '',
    issueDate: '',
    expiryDate: '',
    verified: false
  });
  
  const getDefaultDivingInsurance = () => ({
    hasInsurance: false,
    insuranceProvider: '',
    policyNumber: '',
    issueDate: '',
    expiryDate: '',
    verified: false
  });
  
  const merged = {
    ...customer, // Start with ALL existing customer data
    // Only spread updates that are explicitly provided (not undefined)
    ...Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined)),
    // Explicitly preserve fields that should not be overwritten unless provided
    customerType: preservedCustomerType,
    centerSkillLevel: preservedCenterSkillLevel,
    nationality: updates.hasOwnProperty('nationality') ? (updates.nationality || '') : customer.nationality || '',
    phone: updates.hasOwnProperty('phone') ? (updates.phone || '') : customer.phone || '',
    // CRITICAL: Preserve isApproved - never overwrite unless explicitly provided
    isApproved: updates.hasOwnProperty('isApproved') ? updates.isApproved : (customer.isApproved !== undefined ? customer.isApproved : false),
    // Preserve preferences, certifications, medical data, and insurance unless explicitly updated
    preferences: updates.preferences 
      ? mergePreferences(customer.preferences || getDefaultPreferences(), updates.preferences)
      : (customer.preferences || getDefaultPreferences()),
    certifications: updates.hasOwnProperty('certifications')
      ? (updates.certifications || [])
      : (customer.certifications || []),
    medicalConditions: updates.hasOwnProperty('medicalConditions')
      ? (updates.medicalConditions || [])
      : (customer.medicalConditions || []),
    // CRITICAL: Preserve medicalCertificate - merge if updating, otherwise keep existing
    medicalCertificate: updates.medicalCertificate
      ? { ...getDefaultMedicalCertificate(), ...(customer.medicalCertificate || {}), ...updates.medicalCertificate }
      : (customer.medicalCertificate || getDefaultMedicalCertificate()),
    // CRITICAL: Preserve divingInsurance - merge if updating, otherwise keep existing
    divingInsurance: updates.divingInsurance
      ? { ...getDefaultDivingInsurance(), ...(customer.divingInsurance || {}), ...updates.divingInsurance }
      : (customer.divingInsurance || getDefaultDivingInsurance()),
    // Preserve uploadedDocuments unless explicitly updated
    uploadedDocuments: updates.hasOwnProperty('uploadedDocuments')
      ? updates.uploadedDocuments
      : (customer.uploadedDocuments || []),
    // Preserve notes unless explicitly updated
    notes: updates.hasOwnProperty('notes') ? (updates.notes || '') : (customer.notes || ''),
    updatedAt: new Date().toISOString(),
  };

  customers[idx] = merged;
  await saveAll('customers', customers);
  dispatchBrowserEvent('dcms_customer_updated', merged);

  return merged;
};

// Migration function to upgrade existing customers with missing fields
export const migrateExistingCustomers = () => {
  const customers = getAll('customers');
  let updated = false;
  
  const migrated = customers.map(customer => {
    const needsUpdate = !customer.customerType || !customer.centerSkillLevel;
    
    if (needsUpdate) {
      updated = true;
      return {
        ...customer,
        customerType: customer.customerType || 'tourist',
        centerSkillLevel: customer.centerSkillLevel || 'beginner',
        nationality: customer.nationality || '',
        medicalConditions: customer.medicalConditions || [],
        certifications: customer.certifications || [],
        updatedAt: new Date().toISOString()
      };
    }
    return customer;
  });
  
  if (updated) {
    saveAll('customers', migrated);
    // Dispatch events for all migrated customers
    migrated.forEach(customer => {
      dispatchBrowserEvent('dcms_customer_updated', customer);
    });
  }
  
  return { migrated: updated, count: migrated.length };
};

// Migration function to normalize booking locationIds (convert 'caleta'/'playitas' strings to UUIDs)
export const migrateBookingLocationIds = () => {
  const bookings = getAll('bookings');
  let updated = false;
  
  const locationMapping = {
    'caleta': '550e8400-e29b-41d4-a716-446655440001',
    'playitas': '550e8400-e29b-41d4-a716-446655440002',
    'las playitas': '550e8400-e29b-41d4-a716-446655440002'
  };
  
  const migrated = bookings.map(booking => {
    // Check if locationId is a string name instead of UUID
    if (booking.locationId && !booking.locationId.includes('-')) {
      const normalized = locationMapping[booking.locationId.toLowerCase()];
      if (normalized) {
        updated = true;
        return {
          ...booking,
          locationId: normalized,
          updatedAt: new Date().toISOString()
        };
      }
    }
    return booking;
  });
  
  if (updated) {
    saveAll('bookings', migrated);
    // Dispatch events for all migrated bookings
    migrated.forEach(booking => {
      dispatchBrowserEvent('dcms_booking_updated', booking);
    });
  }
  
  return { migrated: updated, count: migrated.filter((b, i) => b !== bookings[i]).length };
};

export const addOrUpdateCertification = async (email, certification) => {
  if (!email || !certification) return null;
  
  let customers = [];
  
  // Fetch from sync server instead of localStorage
  if (typeof window !== 'undefined' && window.syncService) {
    customers = await window.syncService.fetchFromServer('customers');
  } else {
    // Fallback: try localStorage if sync service not available (backward compatibility)
    customers = getAll('customers');
  }
  
  const idx = customers.findIndex(
    (c) => c.email?.toLowerCase() === email.toLowerCase()
  );
  if (idx === -1) return null;

  const customer = customers[idx];
  const certWithId = {
    id: certification.id || generateId(),
    agency: certification.agency || 'PADI',
    level: certification.level || '',
    certificationNumber: certification.certificationNumber || '',
    issueDate: certification.issueDate || new Date().toISOString().slice(0, 10),
    verified: certification.verified ?? false,
    verifiedDate: certification.verifiedDate || null,
  };

  const existingIndex = (customer.certifications || []).findIndex(
    (c) => c.id === certWithId.id
  );

  let updatedCertifications = customer.certifications || [];
  if (existingIndex >= 0) {
    updatedCertifications = [...updatedCertifications];
    updatedCertifications[existingIndex] = {
      ...updatedCertifications[existingIndex],
      ...certWithId,
    };
  } else {
    updatedCertifications = [...updatedCertifications, certWithId];
  }

  const updatedCustomer = {
    ...customer,
    certifications: updatedCertifications,
    updatedAt: new Date().toISOString(),
  };

  customers[idx] = updatedCustomer;
  await saveAll('customers', customers);
  dispatchBrowserEvent('dcms_customer_updated', updatedCustomer);

  return certWithId;
};

export const deleteCertification = async (email, certificationId) => {
  if (!email || !certificationId) return null;
  
  let customers = [];
  
  // Fetch from sync server instead of localStorage
  if (typeof window !== 'undefined' && window.syncService) {
    customers = await window.syncService.fetchFromServer('customers');
  } else {
    // Fallback: try localStorage if sync service not available (backward compatibility)
    customers = getAll('customers');
  }
  
  const idx = customers.findIndex(
    (c) => c.email?.toLowerCase() === email.toLowerCase()
  );
  if (idx === -1) return null;

  const customer = customers[idx];
  const updatedCertifications = (customer.certifications || []).filter(
    (cert) =>
      cert.id !== certificationId &&
      cert.certificationNumber !== certificationId
  );

  const updatedCustomer = {
    ...customer,
    certifications: updatedCertifications,
    updatedAt: new Date().toISOString(),
  };

  customers[idx] = updatedCustomer;
  await saveAll('customers', customers);
  dispatchBrowserEvent('dcms_customer_updated', updatedCustomer);

  return updatedCustomer;
};

// Delete customer account with soft delete and anonymization
// Personal data is anonymized, but booking/financial records are retained for 7 years (legal requirement)
export const deleteCustomerAccount = (email, reason = 'User requested') => {
  const { anonymizeCustomer, anonymizeBooking } = require('./anonymizationService');
  const customers = getAll('customers');
  const bookings = getAll('bookings');
  
  // Find customer
  const customerIndex = customers.findIndex(c => c.email?.toLowerCase() === email?.toLowerCase());
  if (customerIndex === -1) {
    throw new Error('Customer not found');
  }
  
  const customer = customers[customerIndex];
  
  // Check if already deleted
  if (customer.deletedAt) {
    console.warn(`[DCMS] Customer ${email} is already deleted`);
    return { success: true, alreadyDeleted: true };
  }
  
  // Soft delete: Anonymize customer data instead of deleting
  const anonymizedCustomer = anonymizeCustomer({
    ...customer,
    deletionReason: reason,
  });
  
  customers[customerIndex] = anonymizedCustomer;
  saveAll('customers', customers);
  
  // Anonymize bookings (remove personal details, keep financial data for accounting)
  let anonymizedBookingsCount = 0;
  const updatedBookings = bookings.map(booking => {
    if (booking.customerId === customer.id) {
      anonymizedBookingsCount++;
      return anonymizeBooking(booking);
    }
    return booking;
  });
  saveAll('bookings', updatedBookings);
  
  // Clear user session
  if (localStorage.getItem('dcms_user_email')?.toLowerCase() === email?.toLowerCase()) {
    localStorage.removeItem('dcms_user_email');
  }
  
  // Dispatch events
  dispatchBrowserEvent('dcms_customer_updated', { 
    email, 
    deleted: true, 
    anonymized: true,
    customerId: customer.id 
  });
  
  console.log(`[DCMS] Anonymized customer account: ${email} (${anonymizedBookingsCount} bookings anonymized, data retained for 7 years for legal/accounting)`);
  
  return { 
    success: true, 
    anonymizedBookings: anonymizedBookingsCount,
    customerId: customer.id,
    message: 'Account anonymized. Financial records retained for 7 years per legal requirements.'
  };
};

// Manually sync all customers to server (for existing customers that weren't synced)
export const syncAllCustomersToServer = async () => {
  const customers = getAll('customers');
  
  if (typeof window !== 'undefined' && window.syncService) {
    console.log(`[DCMS] Manually syncing ${customers.length} customers to server...`);
    window.syncService.markChanged('customers');
    await window.syncService.pushPendingChanges();
    console.log(`[DCMS] ✅ Synced ${customers.length} customers to server`);
    return { success: true, count: customers.length };
  } else {
    console.warn('[DCMS] Sync service not available');
    return { success: false, error: 'Sync service not available' };
  }
};

// Default export
const bookingServiceAPI = {
  findOrCreateCustomer,
  checkAvailability,
  createBooking,
  updateBookingEquipmentDetails,
  cancelBooking,
  getCustomerBookings,
  getCustomerByEmail,
  updateCustomerProfile,
  addOrUpdateCertification,
  deleteCertification,
  migrateExistingCustomers,
  migrateBookingLocationIds,
  deleteCustomerAccount,
  syncAllCustomersToServer
};

export default bookingServiceAPI;

