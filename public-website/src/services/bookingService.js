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
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
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
      phone: customerData.phone,
      preferences: mergePreferences(getDefaultPreferences(), customerData.preferences || {}),
      certifications: [],
      notes: customerData.specialRequirements || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    customers.push(customer);
    saveAll('customers', customers);
  } else {
    // Update existing customer if new info provided
    if (customerData.phone && !customer.phone) {
      customer.phone = customerData.phone;
    }
    if (customerData.specialRequirements && !customer.notes) {
      customer.notes = customerData.specialRequirements;
    }
    customer.updatedAt = new Date().toISOString();
    saveAll('customers', customers);
  }
  
  return customer;
};

// Check availability (basic validation)
export const checkAvailability = (date, time, location, activityType) => {
  const bookings = getAll('bookings');
  const locationId = location === 'caleta' ? 'caleta' : 'playitas';
  
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
  
  // Map location name to locationId
  const locationId = bookingData.location === 'caleta' ? 'caleta' : 'playitas';
  
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
  
  // Store user email for MyAccount page
  if (bookingData.email) {
    localStorage.setItem('dcms_user_email', bookingData.email);
  }
  
  // Prepare and send confirmation email (async, non-blocking)
  sendBookingConfirmationEmail(booking, customer).catch(err => {
    console.error('Failed to send confirmation email:', err);
    // Don't fail the booking if email fails
  });
  
  // Dispatch event to notify admin system (if running)
  dispatchBrowserEvent('dcms_booking_created', booking);
  
  return {
    success: true,
    booking,
    customer
  };
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
  const merged = {
    ...customer,
    ...updates,
    preferences: mergePreferences(customer.preferences || getDefaultPreferences(), updates.preferences),
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

  return merged;
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

// Default export
const bookingServiceAPI = {
  findOrCreateCustomer,
  checkAvailability,
  createBooking,
  getCustomerBookings,
  getCustomerByEmail,
  updateCustomerProfile,
  addOrUpdateCertification,
  deleteCertification
};

export default bookingServiceAPI;

