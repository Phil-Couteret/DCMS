// Booking Service for Public Website
// Uses the same localStorage pattern as DCMS admin to sync bookings

import { sendBookingConfirmationEmail } from './emailService';
import { transformCustomerFromBackend } from '../utils/customerTransform';
import { transformCustomerToBackend } from '../utils/transformCustomerToBackend';

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

// Find or create customer (async - uses API directly)
export const findOrCreateCustomer = async (customerData) => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003/api';
  
  try {
    // First, try to find existing customer by email using the dedicated endpoint
    let existingCustomer = null;
    try {
      // Email is required for lookup
      if (!customerData.email) {
        throw new Error('Email is required to find or create a customer');
      }
      
      const emailParam = encodeURIComponent(customerData.email);
      const response = await fetch(`${API_BASE_URL}/customers/email/${emailParam}`);
      if (response.ok) {
        const customerRaw = await response.json();
        // Transform customer data from backend format to frontend format
        existingCustomer = transformCustomerFromBackend(customerRaw);
      } else if (response.status !== 404) {
        // 404 is expected if customer doesn't exist, other errors should be logged
        console.warn('[BookingService] Failed to check customer by email:', response.status, response.statusText);
      }
    } catch (e) {
      console.warn('[BookingService] Failed to check customer by email:', e.message);
    }
    
    if (existingCustomer) {
      // Customer exists - update if needed
      let updated = false;
      const updates = {};
      
      if (customerData.phone && !existingCustomer.phone) {
        updates.phone = customerData.phone;
        updated = true;
      }
      if (customerData.password && !existingCustomer.password) {
        // Store password in preferences (backend doesn't have password field in DTO)
        const preferences = existingCustomer.preferences || {};
        preferences.password = customerData.password;
        updates.preferences = preferences;
        updated = true;
      }
      
      if (updated) {
        try {
          const updateResponse = await fetch(`${API_BASE_URL}/customers/${existingCustomer.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
          
          if (updateResponse.ok) {
            const updatedCustomerRaw = await updateResponse.json();
            // Transform customer data from backend format to frontend format
            const updatedCustomer = transformCustomerFromBackend(updatedCustomerRaw);
            // Also update localStorage for local caching
            const key = 'dcms_customers';
            const localCustomers = getAll('customers');
            const idx = localCustomers.findIndex(c => c.id === updatedCustomer.id);
            if (idx !== -1) {
              localCustomers[idx] = updatedCustomer;
              localStorage.setItem(key, JSON.stringify(localCustomers));
            }
            
            dispatchBrowserEvent('dcms_customer_updated', updatedCustomer);
            return updatedCustomer;
          }
        } catch (e) {
          console.error('[BookingService] Failed to update customer:', e);
        }
      }
      
      return existingCustomer;
    }
    
    // Customer doesn't exist - create new one
    // Validate required fields (only required when creating new customers)
    // Check for undefined, null, or empty string
    const firstName = customerData.firstName?.trim();
    const lastName = customerData.lastName?.trim();
    const email = customerData.email?.trim();
    
    // If we have firstName/lastName but customer lookup failed, it means the customer doesn't exist in the database
    // This can happen for new customers, but not for registered customers (they should already exist)
    if (!firstName || !lastName || !email) {
      throw new Error(`Missing required customer fields to create account. Please provide first name, last name, and email. Received: firstName="${firstName || 'missing'}", lastName="${lastName || 'missing'}", email="${email || 'missing'}"`);
    }
    
    // Prepare customer data for API (transform to backend format)
    const isDivingCustomer = customerData.customerType !== undefined && customerData.customerType !== null && customerData.customerType !== '';
    
    // Build preferences with extra fields
    const preferences = mergePreferences(getDefaultPreferences(), customerData.preferences || {});
    
    // Store password and diving-specific fields in preferences if it's a diving customer
    if (customerData.password) {
      preferences.password = customerData.password;
    }
    
    if (isDivingCustomer) {
      preferences.isApproved = false;
      preferences.centerSkillLevel = customerData.centerSkillLevel || 'beginner';
      if (customerData.certifications && customerData.certifications.length > 0) {
        preferences.certifications = customerData.certifications;
      }
      if (customerData.medicalCertificate) {
        preferences.medicalCertificate = customerData.medicalCertificate;
      }
      if (customerData.divingInsurance) {
        preferences.divingInsurance = customerData.divingInsurance;
      }
    }
    
    if (customerData.uploadedDocuments && customerData.uploadedDocuments.length > 0) {
      preferences.uploadedDocuments = customerData.uploadedDocuments;
    }
    
    // Build API customer data, ensuring all required fields are strings
    const apiCustomerData = {
      firstName: String(customerData.firstName || '').trim(),
      lastName: String(customerData.lastName || '').trim(),
      email: String(customerData.email || '').trim().toLowerCase(),
      phone: customerData.phone ? String(customerData.phone).trim() : '',
      nationality: customerData.nationality ? String(customerData.nationality).trim() : '',
      preferences: preferences,
      notes: customerData.specialRequirements || customerData.notes || '',
      isActive: true
    };
    
    // Double-check required fields are not empty after trimming
    if (!apiCustomerData.firstName || !apiCustomerData.lastName || !apiCustomerData.email) {
      throw new Error(`Missing required customer fields: firstName="${apiCustomerData.firstName}", lastName="${apiCustomerData.lastName}", email="${apiCustomerData.email}"`);
    }
    
    // Only include diving-specific fields for diving customers
    if (isDivingCustomer) {
      apiCustomerData.customerType = customerData.customerType || 'tourist';
      if (customerData.medicalConditions && customerData.medicalConditions.length > 0) {
        apiCustomerData.medicalConditions = customerData.medicalConditions;
      }
    }
    
    // Create customer via API
    const createResponse = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiCustomerData)
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create customer: ${createResponse.status} ${createResponse.statusText} - ${errorText}`);
    }
    
    const newCustomerRaw = await createResponse.json();
    // Transform customer data from backend format to frontend format
    const newCustomer = transformCustomerFromBackend(newCustomerRaw);
    
    // Also save to localStorage for local caching
    const key = 'dcms_customers';
    const localCustomers = getAll('customers');
    localCustomers.push(newCustomer);
    localStorage.setItem(key, JSON.stringify(localCustomers));
    
    // Dispatch events to notify admin system (if running)
    dispatchBrowserEvent('dcms_customer_created', newCustomer);
    dispatchBrowserEvent('dcms_customer_updated', newCustomer);
    
    return newCustomer;
    
  } catch (error) {
    console.error('[BookingService] Error in findOrCreateCustomer:', error);
    throw error;
  }
};

// Check availability (basic validation) - uses API
export const checkAvailability = async (date, time, location, activityType) => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003/api';
  
  try {
    // Map location name to locationId (using same UUIDs as admin portal)
    const locationId = location === 'caleta' 
      ? '550e8400-e29b-41d4-a716-446655440001' // Caleta de Fuste
      : '550e8400-e29b-41d4-a716-446655440002'; // Las Playitas
    
    // Fetch bookings from API for the specific date and location
    const response = await fetch(`${API_BASE_URL}/bookings?booking_date=${date}&location_id=${locationId}`);
    
    if (!response.ok) {
      console.warn('[BookingService] Failed to check availability, assuming available');
      return { available: true, existingBookings: 0, maxCapacity: 20 };
    }
    
    const bookings = await response.json();
    const bookingsArray = Array.isArray(bookings) ? bookings : [];
    
    // Get bookings for the same date, time, and location
    const conflictingBookings = bookingsArray.filter(booking => {
      const bookingDate = booking.booking_date || booking.bookingDate;
      const bookingLocationId = booking.location_id || booking.locationId;
      const bookingStatus = booking.status;
      return bookingDate === date &&
             bookingLocationId === locationId &&
             bookingStatus !== 'cancelled' &&
             bookingStatus !== 'no_show';
    });
    
    // Basic capacity check (can be enhanced later)
    // For now, we'll allow bookings but flag if there are many
    const maxCapacity = 20; // Adjust based on actual capacity
    return {
      available: conflictingBookings.length < maxCapacity,
      existingBookings: conflictingBookings.length,
      maxCapacity
    };
  } catch (error) {
    console.error('[BookingService] Error checking availability:', error);
    // On error, assume available to not block bookings
    return { available: true, existingBookings: 0, maxCapacity: 20 };
  }
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

// Create booking (async - uses API directly)
export const createBooking = async (bookingData) => {
  // Find or create customer (include password if provided for new customers)
  // For registered divers, the customer must already exist
  const customerDataForLookup = {
    firstName: bookingData.firstName,
    lastName: bookingData.lastName,
    email: bookingData.email,
    phone: bookingData.phone,
    password: bookingData.password, // Include password for new customers
    specialRequirements: bookingData.specialRequirements
  };
  
  // Validate that we have email (required for lookup)
  if (!customerDataForLookup.email) {
    throw new Error('Email is required to create a booking');
  }
  
  const customer = await findOrCreateCustomer(customerDataForLookup);
  
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
  
  // Prepare booking data for backend API
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003/api';
  
  // Map paymentMethod: 'account' -> 'deferred' (backend enum doesn't support 'account')
  const paymentMethod = bookingData.paymentMethod === 'account' ? 'deferred' : (bookingData.paymentMethod || 'card');
  
  // Prepare booking payload for backend (camelCase format as expected by backend DTO)
  // For diving activities, store diveSessions in equipmentNeeded as an object
  // For other activities, equipmentNeeded can be an array or empty
  let equipmentNeeded;
  if (activityType === 'diving') {
    // Store dive sessions in equipmentNeeded for diving activities
    equipmentNeeded = diveSessions;
  } else {
    // For other activity types, use empty array
    equipmentNeeded = [];
  }
  
  const bookingPayload = {
    customerId: customer.id,
    locationId: locationId,
    bookingDate: bookingData.date,
    activityType: activityType,
    numberOfDives: bookingData.numberOfDives || 1,
    price: Number(bookingData.price || 0),
    discount: Number(bookingData.discount || 0),
    totalPrice: Number(bookingData.totalPrice || 0),
    status: 'confirmed',
    paymentMethod: paymentMethod,
    paymentStatus: 'paid',
    equipmentNeeded: equipmentNeeded
  };
  
  // Add special requirements if provided
  if (bookingData.specialRequirements) {
    bookingPayload.specialRequirements = bookingData.specialRequirements;
  }
  
  try {
    // Create booking via API
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingPayload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create booking: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Get the created booking from API response
    const createdBookingRaw = await response.json();
    
    // Transform from backend format to frontend format for consistency
    // Backend returns snake_case, but we'll handle it in the response
    const booking = {
      id: createdBookingRaw.id || createdBookingRaw.id,
      customerId: createdBookingRaw.customer_id || createdBookingRaw.customerId,
      locationId: createdBookingRaw.location_id || createdBookingRaw.locationId,
      bookingDate: createdBookingRaw.booking_date || createdBookingRaw.bookingDate,
      activityType: createdBookingRaw.activity_type || createdBookingRaw.activityType,
      numberOfDives: createdBookingRaw.number_of_dives || createdBookingRaw.numberOfDives,
      price: createdBookingRaw.price,
      discount: createdBookingRaw.discount || 0,
      totalPrice: createdBookingRaw.total_price || createdBookingRaw.totalPrice,
      status: createdBookingRaw.status,
      paymentMethod: (createdBookingRaw.payment_method || createdBookingRaw.paymentMethod) === 'deferred' ? 'account' : (createdBookingRaw.payment_method || createdBookingRaw.paymentMethod),
      paymentStatus: createdBookingRaw.payment_status || createdBookingRaw.paymentStatus,
      diveSessions: diveSessions, // Preserve dive sessions from our logic
      time: bookingData.time,
      equipmentNeeded: createdBookingRaw.equipment_needed || createdBookingRaw.equipmentNeeded || [],
      notes: bookingData.specialRequirements || '',
      createdAt: createdBookingRaw.created_at || createdBookingRaw.createdAt,
      updatedAt: createdBookingRaw.updated_at || createdBookingRaw.updatedAt
    };
    
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
  } catch (error) {
    console.error('[BookingService] Error creating booking:', error);
    throw error;
  }
};

export const updateBookingEquipmentDetails = async (bookingId, updates = {}) => {
  if (!bookingId) return null;

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003/api';
  
  try {
    // First, get the current booking from API
    const getResponse = await fetch(`${API_BASE_URL}/bookings/${bookingId}`);
    
    if (!getResponse.ok) {
      console.error('[BookingService] Failed to get booking for update:', getResponse.status, getResponse.statusText);
      return null;
    }
    
    const bookingRaw = await getResponse.json();
    
    // Transform from backend format to frontend format
    const booking = {
      id: bookingRaw.id,
      customerId: bookingRaw.customer_id || bookingRaw.customerId,
      locationId: bookingRaw.location_id || bookingRaw.locationId,
      bookingDate: bookingRaw.booking_date || bookingRaw.bookingDate,
      activityType: bookingRaw.activity_type || bookingRaw.activityType,
      numberOfDives: bookingRaw.number_of_dives || bookingRaw.numberOfDives,
      price: bookingRaw.price,
      discount: bookingRaw.discount || 0,
      totalPrice: bookingRaw.total_price || bookingRaw.totalPrice,
      paymentMethod: bookingRaw.payment_method === 'deferred' ? 'account' : (bookingRaw.payment_method || bookingRaw.paymentMethod),
      paymentStatus: bookingRaw.payment_status || bookingRaw.paymentStatus,
      status: bookingRaw.status,
      equipmentNeeded: bookingRaw.equipment_needed || bookingRaw.equipmentNeeded,
    };
    
    // Merge updates
    const updatedBooking = {
      ...booking,
      ...updates,
    };
    
    // Prepare data for backend (transform to snake_case)
    const backendData = {
      customerId: updatedBooking.customerId,
      locationId: updatedBooking.locationId,
      bookingDate: updatedBooking.bookingDate,
      activityType: updatedBooking.activityType,
      numberOfDives: updatedBooking.numberOfDives,
      price: updatedBooking.price,
      discount: updatedBooking.discount,
      totalPrice: updatedBooking.totalPrice,
      paymentMethod: updatedBooking.paymentMethod === 'account' ? 'deferred' : updatedBooking.paymentMethod,
      paymentStatus: updatedBooking.paymentStatus,
      status: updatedBooking.status,
      equipmentNeeded: updatedBooking.equipmentNeeded,
    };
    
    // Update booking via API
    const updateResponse = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(backendData)
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update booking: ${updateResponse.status} ${updateResponse.statusText} - ${errorText}`);
    }
    
    const updatedBookingRaw = await updateResponse.json();
    
    // Transform response back to frontend format
    const updatedBookingFrontend = {
      id: updatedBookingRaw.id,
      customerId: updatedBookingRaw.customer_id || updatedBookingRaw.customerId,
      locationId: updatedBookingRaw.location_id || updatedBookingRaw.locationId,
      bookingDate: updatedBookingRaw.booking_date || updatedBookingRaw.bookingDate,
      activityType: updatedBookingRaw.activity_type || updatedBookingRaw.activityType,
      numberOfDives: updatedBookingRaw.number_of_dives || updatedBookingRaw.numberOfDives,
      price: updatedBookingRaw.price,
      discount: updatedBookingRaw.discount || 0,
      totalPrice: updatedBookingRaw.total_price || updatedBookingRaw.totalPrice,
      paymentMethod: updatedBookingRaw.payment_method === 'deferred' ? 'account' : (updatedBookingRaw.payment_method || updatedBookingRaw.paymentMethod),
      paymentStatus: updatedBookingRaw.payment_status || updatedBookingRaw.paymentStatus,
      status: updatedBookingRaw.status,
      equipmentNeeded: updatedBookingRaw.equipment_needed || updatedBookingRaw.equipmentNeeded,
      updatedAt: updatedBookingRaw.updated_at || updatedBookingRaw.updatedAt,
    };
    
    dispatchBrowserEvent('dcms_booking_updated', updatedBookingFrontend);
    
    return updatedBookingFrontend;
  } catch (error) {
    console.error('[BookingService] Error updating booking equipment details:', error);
    throw error;
  }
};

export const cancelBooking = async (bookingId, options = {}) => {
  if (!bookingId) return null;
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003/api';
  
  try {
    // First, get the current booking from API
    const getResponse = await fetch(`${API_BASE_URL}/bookings/${bookingId}`);
    
    if (!getResponse.ok) {
      console.error('[BookingService] Failed to get booking for cancellation:', getResponse.status, getResponse.statusText);
      return null;
    }
    
    const bookingRaw = await getResponse.json();
    
    // CRITICAL: Verify the booking ID matches what was requested (prevents ID confusion bugs)
    if (bookingRaw.id !== bookingId) {
      console.error('[BookingService] Booking ID mismatch! Requested:', bookingId, 'Got:', bookingRaw.id);
      throw new Error('Booking ID mismatch - cannot cancel booking');
    }
    
    // Transform from backend format to frontend format
    const booking = {
      id: bookingRaw.id,
      customerId: bookingRaw.customer_id || bookingRaw.customerId,
      locationId: bookingRaw.location_id || bookingRaw.locationId,
      bookingDate: bookingRaw.booking_date || bookingRaw.bookingDate,
      activityType: bookingRaw.activity_type || bookingRaw.activityType,
      numberOfDives: bookingRaw.number_of_dives || bookingRaw.numberOfDives,
      price: bookingRaw.price,
      discount: bookingRaw.discount || 0,
      totalPrice: bookingRaw.total_price || bookingRaw.totalPrice,
      paymentMethod: bookingRaw.payment_method === 'deferred' ? 'account' : (bookingRaw.payment_method || bookingRaw.paymentMethod),
      paymentStatus: bookingRaw.payment_status || bookingRaw.paymentStatus,
      status: bookingRaw.status,
      equipmentNeeded: bookingRaw.equipment_needed || bookingRaw.equipmentNeeded,
    };
    
    // CRITICAL: If a customerId is provided in options, verify the booking belongs to that customer
    if (options.customerId && booking.customerId !== options.customerId) {
      console.error('[BookingService] Booking does not belong to customer! Booking customer:', booking.customerId, 'Expected:', options.customerId);
      throw new Error('This booking does not belong to the current customer');
    }
    
    // Determine new payment status
    // If booking was paid, mark as refunded (valid enum value: pending, partial, paid, refunded)
    // If not paid yet, keep the current status
    const newPaymentStatus = booking.paymentStatus === 'paid' ? 'refunded' : booking.paymentStatus;
    
    // Prepare data for backend (transform to snake_case)
    const backendData = {
      customerId: booking.customerId,
      locationId: booking.locationId,
      bookingDate: booking.bookingDate,
      activityType: booking.activityType,
      numberOfDives: booking.numberOfDives,
      price: booking.price,
      discount: booking.discount,
      totalPrice: booking.totalPrice,
      paymentMethod: booking.paymentMethod === 'account' ? 'deferred' : booking.paymentMethod,
      paymentStatus: newPaymentStatus,
      status: 'cancelled',
      equipmentNeeded: booking.equipmentNeeded,
      // Store cancellation details in specialRequirements or equipmentNeeded
      specialRequirements: JSON.stringify({
        cancellationReason: options.reason || 'Cancelled by diver',
        cancellationNotes: options.notes || '',
        cancelledBy: options.cancelledBy || 'customer',
      }),
    };
    
    // Update booking via API
    const updateResponse = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(backendData)
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to cancel booking: ${updateResponse.status} ${updateResponse.statusText} - ${errorText}`);
    }
    
    const cancelledBookingRaw = await updateResponse.json();
    
    // Transform response back to frontend format
    const cancelledBooking = {
      id: cancelledBookingRaw.id,
      customerId: cancelledBookingRaw.customer_id || cancelledBookingRaw.customerId,
      locationId: cancelledBookingRaw.location_id || cancelledBookingRaw.locationId,
      bookingDate: cancelledBookingRaw.booking_date || cancelledBookingRaw.bookingDate,
      activityType: cancelledBookingRaw.activity_type || cancelledBookingRaw.activityType,
      numberOfDives: cancelledBookingRaw.number_of_dives || cancelledBookingRaw.numberOfDives,
      price: cancelledBookingRaw.price,
      discount: cancelledBookingRaw.discount || 0,
      totalPrice: cancelledBookingRaw.total_price || cancelledBookingRaw.totalPrice,
      paymentMethod: cancelledBookingRaw.payment_method === 'deferred' ? 'account' : (cancelledBookingRaw.payment_method || cancelledBookingRaw.paymentMethod),
      paymentStatus: cancelledBookingRaw.payment_status || cancelledBookingRaw.paymentStatus,
      status: cancelledBookingRaw.status,
      equipmentNeeded: cancelledBookingRaw.equipment_needed || cancelledBookingRaw.equipmentNeeded,
      cancellationReason: options.reason || 'Cancelled by diver',
      cancellationNotes: options.notes || '',
      cancelledBy: options.cancelledBy || 'customer',
      updatedAt: cancelledBookingRaw.updated_at || cancelledBookingRaw.updatedAt,
    };
    
    dispatchBrowserEvent('dcms_booking_updated', cancelledBooking);
    
    return cancelledBooking;
  } catch (error) {
    console.error('[BookingService] Error cancelling booking:', error);
    throw error;
  }
};

// Transform booking from backend format (snake_case) to frontend format (camelCase)
const transformBookingFromBackend = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  // Transform snake_case to camelCase
  const transformed = {
    id: data.id,
    customerId: data.customer_id || data.customerId,
    locationId: data.location_id || data.locationId,
    boatId: data.boat_id || data.boatId,
    diveSiteId: data.dive_site_id || data.diveSiteId,
    staffPrimaryId: data.staff_primary_id || data.staffPrimaryId,
    bookingDate: data.booking_date || data.bookingDate,
    activityType: data.activity_type || data.activityType,
    numberOfDives: data.number_of_dives !== undefined ? data.number_of_dives : (data.numberOfDives !== undefined ? data.numberOfDives : 1),
    price: data.price,
    discount: data.discount || 0,
    totalPrice: data.total_price !== undefined ? parseFloat(data.total_price) : (data.totalPrice !== undefined ? parseFloat(data.totalPrice) : 0),
    // Map "deferred" back to "account" for display (backend stores as "deferred" but frontend uses "account")
    paymentMethod: (data.payment_method === 'deferred' || data.paymentMethod === 'deferred') 
      ? 'account' 
      : (data.payment_method || data.paymentMethod),
    paymentStatus: data.payment_status || data.paymentStatus || 'pending',
    status: data.status || 'pending',
    specialRequirements: data.special_requirements || data.specialRequirements,
    equipmentNeeded: data.equipment_needed !== undefined ? data.equipment_needed : data.equipmentNeeded,
    bonoId: data.bono_id || data.bonoId,
    stayId: data.stay_id || data.stayId,
    createdAt: data.created_at || data.createdAt,
    updatedAt: data.updated_at || data.updatedAt,
  };
  
  // For diving activities, extract diveSessions from equipmentNeeded if it's an object
  // (diveSessions are stored in equipmentNeeded when created from the public website)
  const activityType = transformed.activityType || data.activity_type;
  if (activityType === 'diving' && transformed.equipmentNeeded && typeof transformed.equipmentNeeded === 'object' && !Array.isArray(transformed.equipmentNeeded)) {
    // Check if equipmentNeeded contains dive session keys (morning, afternoon, night, etc.)
    if ('morning' in transformed.equipmentNeeded || 'afternoon' in transformed.equipmentNeeded || 'night' in transformed.equipmentNeeded || 'tenFifteen' in transformed.equipmentNeeded || '10:15' in transformed.equipmentNeeded) {
      transformed.diveSessions = transformed.equipmentNeeded;
    }
  }
  
  // Include any nested relations if they exist
  if (data.customers) {
    transformed.customer = transformCustomerFromBackend(data.customers);
  }
  if (data.locations) {
    transformed.location = data.locations;
  }
  if (data.boats) {
    transformed.boat = data.boats;
  }
  if (data.dive_sites || data.diveSites) {
    transformed.diveSite = data.dive_sites || data.diveSites;
  }
  
  return transformed;
};

// Get customer bookings (async - uses API directly)
export const getCustomerBookings = async (email) => {
  if (!email) return [];
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003/api';
  
  try {
    // First, get the customer by email to get their ID
    const emailParam = encodeURIComponent(email);
    const customerResponse = await fetch(`${API_BASE_URL}/customers/email/${emailParam}`);
    
    if (!customerResponse.ok) {
      return [];
    }
    
    const customer = await customerResponse.json();
    if (!customer || !customer.id) {
      return [];
    }
    
    // Get all bookings for this customer
    const bookingsResponse = await fetch(`${API_BASE_URL}/bookings?customer_id=${customer.id}`);
    
    if (!bookingsResponse.ok) {
      return [];
    }
    
    const bookings = await bookingsResponse.json();
    const bookingsArray = Array.isArray(bookings) ? bookings : [];
    
    // Transform bookings from backend format to frontend format
    return bookingsArray.map(booking => transformBookingFromBackend(booking));
  } catch (error) {
    console.error('[BookingService] Failed to get customer bookings:', error);
    // Fallback: try localStorage if API fails (backward compatibility)
    try {
      const customers = getAll('customers');
      const bookings = getAll('bookings');
      const customer = customers.find(c => c.email?.toLowerCase() === email?.toLowerCase());
      if (!customer) {
        return [];
      }
      const filtered = bookings.filter(b => b.customerId === customer.id);
      return Array.isArray(filtered) ? filtered : [];
    } catch (fallbackError) {
      console.error('[BookingService] Fallback to localStorage also failed:', fallbackError);
      return [];
    }
  }
};

// Get customer by email (async - uses API directly)
export const getCustomerByEmail = async (email) => {
  if (!email) return null;
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003/api';
  
  try {
    // Use the dedicated email lookup endpoint
    const emailParam = encodeURIComponent(email);
    const response = await fetch(`${API_BASE_URL}/customers/email/${emailParam}`);
    
    if (response.ok) {
      const customerRaw = await response.json();
      // Transform customer data from backend format to frontend format
      const customer = transformCustomerFromBackend(customerRaw);
      
      // Also cache in localStorage for local access
      if (customer && customer.id) {
        const key = 'dcms_customers';
        const localCustomers = getAll('customers');
        const idx = localCustomers.findIndex(c => c.id === customer.id);
        if (idx !== -1) {
          localCustomers[idx] = customer;
        } else {
          localCustomers.push(customer);
        }
        localStorage.setItem(key, JSON.stringify(localCustomers));
      }
      return customer;
    } else if (response.status === 404) {
      return null; // Customer not found
    } else {
      console.warn('[BookingService] Failed to get customer by email:', response.status, response.statusText);
    }
  } catch (e) {
    console.warn('[BookingService] Error getting customer by email:', e.message);
  }
  
  // Fallback: try localStorage if API fails
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
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003/api';
  
  try {
    // First, get the current customer from API
    const emailParam = encodeURIComponent(email);
    const getResponse = await fetch(`${API_BASE_URL}/customers/email/${emailParam}`);
    
    if (!getResponse.ok) {
      console.error('[BookingService] Failed to get customer for update:', getResponse.status, getResponse.statusText);
      return null;
    }
    
    const customerRaw = await getResponse.json();
    const customer = transformCustomerFromBackend(customerRaw);
  
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
  
    // Merge updates with existing customer data
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
    };
    
    // Transform merged customer data to backend format
    const backendData = transformCustomerToBackend(merged);
    
    // Update customer via API
    const updateResponse = await fetch(`${API_BASE_URL}/customers/${customer.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(backendData)
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update customer: ${updateResponse.status} ${updateResponse.statusText} - ${errorText}`);
    }
    
    // Get updated customer from API response
    const updatedCustomerRaw = await updateResponse.json();
    const updatedCustomer = transformCustomerFromBackend(updatedCustomerRaw);
    
    // Also update localStorage cache for local access
    const key = 'dcms_customers';
    const localCustomers = getAll('customers');
    const idx = localCustomers.findIndex(c => c.id === updatedCustomer.id);
    if (idx !== -1) {
      localCustomers[idx] = updatedCustomer;
      localStorage.setItem(key, JSON.stringify(localCustomers));
    }
    
    // Dispatch events to notify admin system (if running)
    dispatchBrowserEvent('dcms_customer_updated', updatedCustomer);
    
    return updatedCustomer;
  } catch (error) {
    console.error('[BookingService] Error updating customer profile:', error);
    throw error;
  }
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
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003/api';
  
  try {
    // First, get the current customer from API
    const emailParam = encodeURIComponent(email);
    const getResponse = await fetch(`${API_BASE_URL}/customers/email/${emailParam}`);
    
    if (!getResponse.ok) {
      console.error('[BookingService] Failed to get customer for certification update:', getResponse.status, getResponse.statusText);
      return null;
    }
    
    const customerRaw = await getResponse.json();
    const customer = transformCustomerFromBackend(customerRaw);
    
    // Prepare certification with ID
    const certWithId = {
      id: certification.id || generateId(),
      agency: certification.agency || 'PADI',
      level: certification.level || '',
      certificationNumber: certification.certificationNumber || '',
      issueDate: certification.issueDate || new Date().toISOString().slice(0, 10),
      expiryDate: certification.expiryDate || null,
      verified: certification.verified ?? false,
      verifiedDate: certification.verifiedDate || null,
    };

    // Update certifications array
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

    // Merge customer data with updated certifications
    const updatedCustomerData = {
      ...customer,
      certifications: updatedCertifications,
    };
    
    // Transform to backend format and update via API
    const backendData = transformCustomerToBackend(updatedCustomerData);
    
    const updateResponse = await fetch(`${API_BASE_URL}/customers/${customer.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(backendData)
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update certification: ${updateResponse.status} ${updateResponse.statusText} - ${errorText}`);
    }
    
    // Get updated customer from API response
    const updatedCustomerRaw = await updateResponse.json();
    const updatedCustomer = transformCustomerFromBackend(updatedCustomerRaw);
    
    // Also update localStorage cache
    const key = 'dcms_customers';
    const localCustomers = getAll('customers');
    const idx = localCustomers.findIndex(c => c.id === updatedCustomer.id);
    if (idx !== -1) {
      localCustomers[idx] = updatedCustomer;
      localStorage.setItem(key, JSON.stringify(localCustomers));
    }
    
    // Dispatch events to notify admin system (if running)
    dispatchBrowserEvent('dcms_customer_updated', updatedCustomer);
    
    return certWithId;
  } catch (error) {
    console.error('[BookingService] Error adding/updating certification:', error);
    throw error;
  }
};

export const deleteCertification = async (email, certificationId) => {
  if (!email || !certificationId) return null;
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003/api';
  
  try {
    // First, get the current customer from API
    const emailParam = encodeURIComponent(email);
    const getResponse = await fetch(`${API_BASE_URL}/customers/email/${emailParam}`);
    
    if (!getResponse.ok) {
      console.error('[BookingService] Failed to get customer for certification deletion:', getResponse.status, getResponse.statusText);
      return null;
    }
    
    const customerRaw = await getResponse.json();
    const customer = transformCustomerFromBackend(customerRaw);
    
    // Remove certification from array
    const updatedCertifications = (customer.certifications || []).filter(
      (cert) =>
        cert.id !== certificationId &&
        cert.certificationNumber !== certificationId
    );

    // Merge customer data with updated certifications
    const updatedCustomerData = {
      ...customer,
      certifications: updatedCertifications,
    };
    
    // Transform to backend format and update via API
    const backendData = transformCustomerToBackend(updatedCustomerData);
    
    const updateResponse = await fetch(`${API_BASE_URL}/customers/${customer.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(backendData)
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to delete certification: ${updateResponse.status} ${updateResponse.statusText} - ${errorText}`);
    }
    
    // Get updated customer from API response
    const updatedCustomerRaw = await updateResponse.json();
    const updatedCustomer = transformCustomerFromBackend(updatedCustomerRaw);
    
    // Also update localStorage cache
    const key = 'dcms_customers';
    const localCustomers = getAll('customers');
    const idx = localCustomers.findIndex(c => c.id === updatedCustomer.id);
    if (idx !== -1) {
      localCustomers[idx] = updatedCustomer;
      localStorage.setItem(key, JSON.stringify(localCustomers));
    }
    
    // Dispatch events to notify admin system (if running)
    dispatchBrowserEvent('dcms_customer_updated', updatedCustomer);
    
    return updatedCustomer;
  } catch (error) {
    console.error('[BookingService] Error deleting certification:', error);
    throw error;
  }
};

// Delete customer account with soft delete and anonymization
// Personal data is anonymized, but booking/financial records are retained for 7 years (legal requirement)
export const deleteCustomerAccount = async (email, reason = 'User requested') => {
  const { anonymizeCustomer, anonymizeBooking } = require('./anonymizationService');
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003/api';
  
  try {
    // Get customer from API
    const emailParam = encodeURIComponent(email);
    const customerResponse = await fetch(`${API_BASE_URL}/customers/email/${emailParam}`);
    
    if (!customerResponse.ok) {
      if (customerResponse.status === 404) {
        throw new Error('Customer not found');
      }
      throw new Error(`Failed to get customer: ${customerResponse.status} ${customerResponse.statusText}`);
    }
    
    const customerRaw = await customerResponse.json();
    const customer = transformCustomerFromBackend(customerRaw);
    
    // Check if already deleted
    if (customer.deletedAt) {
      console.warn(`[DCMS] Customer ${email} is already deleted`);
      return { success: true, alreadyDeleted: true };
    }
    
    // Get customer's bookings from API
    const bookingsResponse = await fetch(`${API_BASE_URL}/bookings?customer_id=${customer.id}`);
    let bookings = [];
    if (bookingsResponse.ok) {
      const bookingsData = await bookingsResponse.json();
      bookings = Array.isArray(bookingsData) ? bookingsData : [];
    }
    
    // Soft delete: Anonymize customer data instead of deleting
    const anonymizedCustomer = anonymizeCustomer({
      ...customer,
      deletionReason: reason,
    });
    
    // Transform anonymized customer to backend format
    const anonymizedCustomerBackend = transformCustomerToBackend(anonymizedCustomer);
    
    // Update customer via API
    const updateCustomerResponse = await fetch(`${API_BASE_URL}/customers/${customer.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(anonymizedCustomerBackend)
    });
    
    if (!updateCustomerResponse.ok) {
      const errorText = await updateCustomerResponse.text();
      throw new Error(`Failed to anonymize customer: ${updateCustomerResponse.status} ${updateCustomerResponse.statusText} - ${errorText}`);
    }
    
    // Clean up localStorage for this customer's bookings
    try {
      const key = 'dcms_bookings';
      const localBookings = getAll('bookings');
      // Remove bookings that belong to this customer
      const filteredBookings = localBookings.filter(b => {
        const bookingCustomerId = b.customerId || b.customer_id;
        const bookingEmail = b.email || b.customer?.email;
        return bookingCustomerId !== customer.id && 
               bookingEmail?.toLowerCase() !== email?.toLowerCase();
      });
      localStorage.setItem(key, JSON.stringify(filteredBookings));
    } catch (err) {
      console.warn('[DCMS] Failed to clean up localStorage bookings:', err);
    }
    
    // Clean up localStorage for this customer
    try {
      const key = 'dcms_customers';
      const localCustomers = getAll('customers');
      const filteredCustomers = localCustomers.filter(c => c.id !== customer.id && c.email?.toLowerCase() !== email?.toLowerCase());
      localStorage.setItem(key, JSON.stringify(filteredCustomers));
    } catch (err) {
      console.warn('[DCMS] Failed to clean up localStorage customer:', err);
    }
    
    // Anonymize bookings (remove personal details, keep financial data for accounting)
    let anonymizedBookingsCount = 0;
    for (const booking of bookings) {
      const anonymizedBooking = anonymizeBooking(booking);
      
      // Transform booking to backend format
      const bookingBackend = {
        customerId: anonymizedBooking.customerId || anonymizedBooking.customer_id,
        locationId: anonymizedBooking.locationId || anonymizedBooking.location_id,
        bookingDate: anonymizedBooking.bookingDate || anonymizedBooking.booking_date,
        activityType: anonymizedBooking.activityType || anonymizedBooking.activity_type,
        numberOfDives: anonymizedBooking.numberOfDives || anonymizedBooking.number_of_dives,
        price: anonymizedBooking.price,
        discount: anonymizedBooking.discount || 0,
        totalPrice: anonymizedBooking.totalPrice || anonymizedBooking.total_price,
        paymentMethod: anonymizedBooking.paymentMethod === 'account' ? 'deferred' : (anonymizedBooking.paymentMethod || anonymizedBooking.payment_method),
        paymentStatus: anonymizedBooking.paymentStatus || anonymizedBooking.payment_status,
        status: anonymizedBooking.status,
        equipmentNeeded: anonymizedBooking.equipmentNeeded || anonymizedBooking.equipment_needed,
      };
      
      // Update booking via API
      const updateBookingResponse = await fetch(`${API_BASE_URL}/bookings/${booking.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingBackend)
      });
      
      if (updateBookingResponse.ok) {
        anonymizedBookingsCount++;
      } else {
        console.warn(`[DCMS] Failed to anonymize booking ${booking.id}:`, updateBookingResponse.status, updateBookingResponse.statusText);
      }
    }
    
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
    
    return { 
      success: true, 
      anonymizedBookings: anonymizedBookingsCount,
      customerId: customer.id,
      message: 'Account anonymized. Financial records retained for 7 years per legal requirements.'
    };
  } catch (error) {
    console.error('[BookingService] Error deleting customer account:', error);
    throw error;
  }
};

// Manually sync all customers to server (for existing customers that weren't synced)
export const syncAllCustomersToServer = async () => {
  const customers = getAll('customers');
  
  if (typeof window !== 'undefined' && window.syncService) {
    window.syncService.markChanged('customers');
    await window.syncService.pushPendingChanges();
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

