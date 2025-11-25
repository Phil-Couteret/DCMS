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
    console.log(`[DCMS Public] Dispatched event: ${eventName}`, detail);
  }
};

// Initialize mock data if not exists (compatible with DCMS admin)
const initializeData = () => {
  const bookingsKey = 'dcms_bookings';
  const customersKey = 'dcms_customers';
  const locationsKey = 'dcms_locations';
  
  // Initialize bookings if empty
  if (!localStorage.getItem(bookingsKey)) {
    localStorage.setItem(bookingsKey, JSON.stringify([]));
  }
  
  // Initialize customers if empty
  if (!localStorage.getItem(customersKey)) {
    localStorage.setItem(customersKey, JSON.stringify([]));
  }
  
  // Initialize locations if empty (needed for booking)
  if (!localStorage.getItem(locationsKey)) {
    const defaultLocations = [
      {
        id: 'caleta',
        name: 'Caleta de Fuste',
        address: 'Muelle Deportivo / Calle Teneriffe, 35610',
        phone: '+34.928 163 712',
        hasBoats: true
      },
      {
        id: 'playitas',
        name: 'Las Playitas',
        address: 'Hotel Gran Resort Las Playitas',
        phone: '+34.653 512 638',
        hasBoats: false
      }
    ];
    localStorage.setItem(locationsKey, JSON.stringify(defaultLocations));
  }
};

// Initialize on load
initializeData();

// Get all items from localStorage
const getAll = (resource) => {
  const key = `dcms_${resource}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

// Save all items to localStorage
const saveAll = (resource, data) => {
  const key = `dcms_${resource}`;
  localStorage.setItem(key, JSON.stringify(data));
  
  // Mark resource as changed (will be synced in next batch)
  if (typeof window !== 'undefined' && window.syncService) {
    window.syncService.markChanged(resource);
  }
};

// Find or create customer
export const findOrCreateCustomer = (customerData) => {
  const customers = getAll('customers');
  
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    customers.push(customer);
    saveAll('customers', customers);
    
    // Dispatch events to notify admin system (if running)
    dispatchBrowserEvent('dcms_customer_created', customer);
    dispatchBrowserEvent('dcms_customer_updated', customer);
    
    console.log('[DCMS] Customer created:', customer.email, 'Total customers:', customers.length);
  } else {
    // Update existing customer if new info provided
    // IMPORTANT: Preserve existing customerType and centerSkillLevel - don't overwrite with defaults
    if (customerData.phone && !customer.phone) {
      customer.phone = customerData.phone;
    }
    if (customerData.specialRequirements && !customer.notes) {
      customer.notes = customerData.specialRequirements;
    }
    if (customerData.password && !customer.password) {
      customer.password = customerData.password;
    }
    // Only update customerType if explicitly provided in customerData
    if (customerData.customerType) {
      customer.customerType = customerData.customerType;
    }
    // Only update centerSkillLevel if explicitly provided in customerData
    if (customerData.centerSkillLevel) {
      customer.centerSkillLevel = customerData.centerSkillLevel;
    }
    customer.updatedAt = new Date().toISOString();
    saveAll('customers', customers);
    
    // Dispatch event to notify admin system
    dispatchBrowserEvent('dcms_customer_updated', customer);
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

// Create booking
export const createBooking = (bookingData) => {
  const bookings = getAll('bookings');
  
  // Find or create customer
  const customer = findOrCreateCustomer({
    firstName: bookingData.firstName,
    lastName: bookingData.lastName,
    email: bookingData.email,
    phone: bookingData.phone,
    specialRequirements: bookingData.specialRequirements
  });
  
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
    ownEquipment: false,
    notes: bookingData.specialRequirements || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  bookings.push(booking);
  saveAll('bookings', bookings);
  
  // Immediately push to sync server
  if (typeof window !== 'undefined' && window.syncService) {
    window.syncService.markChanged('bookings');
    // Force immediate push
    setTimeout(() => {
      window.syncService.pushPendingChanges().catch(err => {
        console.warn('[DCMS] Failed to push booking immediately:', err);
      });
    }, 100);
  }
  
  // Store user email for MyAccount page
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
  
  console.log('[DCMS] Booking created:', booking.id, 'for customer:', customer.email, 'Total bookings:', bookings.length);

  // Ensure the sync server receives the brand-new booking, even if the calling component forgets
  if (typeof window !== 'undefined' && window.syncService?.syncNow) {
    window.syncService.syncNow().catch(err => {
      console.warn('[DCMS] Failed to run immediate sync after booking creation:', err);
    });
  }
  
  return {
    success: true,
    booking,
    customer
  };
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
  console.log('[DCMS] Booking cancelled:', bookings[idx].id);
  return bookings[idx];
};

// Get customer bookings
export const getCustomerBookings = (email) => {
  const customers = getAll('customers');
  const bookings = getAll('bookings');
  
  const customer = customers.find(c => c.email?.toLowerCase() === email?.toLowerCase());
  if (!customer) {
    return [];
  }
  
  return bookings.filter(b => b.customerId === customer.id);
};

export const getCustomerByEmail = (email) => {
  if (!email) return null;
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

export const updateCustomerProfile = (email, updates = {}) => {
  if (!email) return null;
  const customers = getAll('customers');
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
  
  const merged = {
    ...customer,
    ...updates,
    // Preserve existing customerType unless explicitly provided with a valid value in updates
    customerType: preservedCustomerType,
    // Preserve existing centerSkillLevel unless explicitly provided with a valid value in updates
    centerSkillLevel: preservedCenterSkillLevel,
    nationality: updates.nationality || customer.nationality || '',
    phone: updates.phone || customer.phone || '',
    preferences: mergePreferences(customer.preferences || getDefaultPreferences(), updates.preferences),
    certifications: updates.certifications || customer.certifications || [],
    medicalConditions: updates.medicalConditions || customer.medicalConditions || [],
    medicalCertificate: mergeNestedObject(
      customer.medicalCertificate,
      updates.medicalCertificate
    ),
    divingInsurance: mergeNestedObject(
      customer.divingInsurance,
      updates.divingInsurance
    ),
    updatedAt: new Date().toISOString(),
  };

  customers[idx] = merged;
  saveAll('customers', customers);
  dispatchBrowserEvent('dcms_customer_updated', merged);
  
  console.log('[DCMS] Customer updated:', merged.email);

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

export const addOrUpdateCertification = (email, certification) => {
  if (!email || !certification) return null;
  const customers = getAll('customers');
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
  saveAll('customers', customers);
  dispatchBrowserEvent('dcms_customer_updated', updatedCustomer);

  return certWithId;
};

export const deleteCertification = (email, certificationId) => {
  if (!email || !certificationId) return null;
  const customers = getAll('customers');
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
  saveAll('customers', customers);
  dispatchBrowserEvent('dcms_customer_updated', updatedCustomer);

  return updatedCustomer;
};

// Delete customer account (and all their bookings)
export const deleteCustomerAccount = (email) => {
  const customers = getAll('customers');
  const bookings = getAll('bookings');
  
  // Find customer
  const customerIndex = customers.findIndex(c => c.email?.toLowerCase() === email?.toLowerCase());
  if (customerIndex === -1) {
    throw new Error('Customer not found');
  }
  
  const customer = customers[customerIndex];
  
  // Delete customer
  customers.splice(customerIndex, 1);
  saveAll('customers', customers);
  
  // Delete all bookings for this customer
  const customerBookings = bookings.filter(b => b.customerId === customer.id);
  const remainingBookings = bookings.filter(b => b.customerId !== customer.id);
  saveAll('bookings', remainingBookings);
  
  // Clear user session
  if (localStorage.getItem('dcms_user_email')?.toLowerCase() === email?.toLowerCase()) {
    localStorage.removeItem('dcms_user_email');
  }
  
  // Dispatch events
  dispatchBrowserEvent('dcms_customer_updated', { email, deleted: true });
  
  console.log(`[DCMS] Deleted customer account: ${email} (${customerBookings.length} bookings removed)`);
  
  return { success: true, deletedBookings: customerBookings.length };
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
  cancelBooking,
  getCustomerBookings,
  getCustomerByEmail,
  updateCustomerProfile,
  addOrUpdateCertification,
  deleteCertification,
  migrateExistingCustomers,
  deleteCustomerAccount,
  syncAllCustomersToServer
};

export default bookingServiceAPI;

