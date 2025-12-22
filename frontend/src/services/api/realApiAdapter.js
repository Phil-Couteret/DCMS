// Real API Adapter - Makes HTTP calls to backend
// This will be used when backend is ready

import { httpClient } from './httpClient';

// Real API Adapter - HTTP calls to backend
const realApiAdapter = {
  // Generic CRUD operations
  async getAll(resource) {
    // Special handling for resources not yet implemented in backend
    if (resource === 'users') {
      return this.getAllUsers();
    }
    if (resource === 'diveSites' || resource === 'dive_sites') {
      return this.getAllDiveSites();
    }
    if (resource === 'settings') {
      return this.getAllSettings();
    }
    if (resource === 'governmentBonos') {
      return this.getAllGovernmentBonos();
    }
    const response = await httpClient.get(`/${resource}`);
    return this.transformResponse(resource, response.data || response);
  },

  async getById(resource, id) {
    const response = await httpClient.get(`/${resource}/${id}`);
    return this.transformResponse(resource, response.data || response);
  },

  async create(resource, data) {
    // Special handling for resources not yet implemented in backend
    if (resource === 'settings') {
      return this.createSettings(data);
    }
    
    // Transform customer data from camelCase to snake_case for backend
    const transformedData = resource === 'customers' ? this.transformCustomerToBackend(data) : data;
    const response = await httpClient.post(`/${resource}`, transformedData);
    return this.transformResponse(resource, response.data || response);
  },

  async update(resource, id, data) {
    // Special handling for resources not yet implemented in backend
    if (resource === 'settings') {
      return this.updateSettings(id, data);
    }
    
    // Transform customer data from camelCase to snake_case for backend
    const transformedData = resource === 'customers' ? this.transformCustomerToBackend(data) : data;
    const response = await httpClient.put(`/${resource}/${id}`, transformedData);
    return this.transformResponse(resource, response.data || response);
  },

  // Transform customer data from frontend to backend format (camelCase DTO)
  // The backend DTO expects camelCase, but we need to store extra fields in preferences JSON
  // Note: Diving-related fields (isApproved, centerSkillLevel, certifications, etc.) are only stored for diving customers
  transformCustomerToBackend(data) {
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
      if (data.certifications !== undefined && Array.isArray(data.certifications) && data.certifications.length > 0) {
        extraFields.certifications = data.certifications;
      }
      if (data.medicalCertificate !== undefined && data.medicalCertificate.hasCertificate) {
        extraFields.medicalCertificate = data.medicalCertificate;
      }
      if (data.divingInsurance !== undefined && data.divingInsurance.hasInsurance) {
        extraFields.divingInsurance = data.divingInsurance;
      }
      if (data.uploadedDocuments !== undefined && Array.isArray(data.uploadedDocuments) && data.uploadedDocuments.length > 0) {
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
    // Only include customerType for diving customers
    if (isDivingCustomer && data.customerType !== undefined) transformed.customerType = data.customerType;
    // Always include preferences (with extra fields merged in)
    transformed.preferences = preferences;
    // Only include medicalConditions for diving customers
    if (isDivingCustomer && data.medicalConditions !== undefined) transformed.medicalConditions = data.medicalConditions;
    if (data.restrictions !== undefined) transformed.restrictions = data.restrictions;
    if (data.notes !== undefined) transformed.notes = data.notes;
    if (data.isActive !== undefined) transformed.isActive = data.isActive;

    return transformed;
  },

  // Transform response from backend snake_case to frontend camelCase
  transformResponse(resource, data) {
    if (!data) return data;
    if (resource === 'customers') {
      if (Array.isArray(data)) {
        return data.map(item => this.transformCustomerFromBackend(item));
      }
      return this.transformCustomerFromBackend(data);
    }
    if (resource === 'bookings') {
      if (Array.isArray(data)) {
        return data.map(item => this.transformBookingFromBackend(item));
      }
      return this.transformBookingFromBackend(data);
    }
    return data;
  },

  transformBookingFromBackend(data) {
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
    
    // Include any nested relations if they exist
    if (data.customers) {
      transformed.customer = this.transformCustomerFromBackend(data.customers);
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
    
    // Include any other fields that might exist
    return {
      ...transformed,
      ...Object.keys(data).reduce((acc, key) => {
        if (!['customer_id', 'location_id', 'boat_id', 'dive_site_id', 'staff_primary_id',
              'booking_date', 'activity_type', 'number_of_dives', 'total_price',
              'payment_method', 'payment_status', 'special_requirements', 'equipment_needed',
              'bono_id', 'stay_id', 'created_at', 'updated_at', 'customers', 'locations',
              'boats', 'dive_sites'].includes(key)) {
          acc[key] = data[key];
        }
        return acc;
      }, {})
    };
  },

  transformCustomerFromBackend(data) {
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
    
    // Remove extra fields from preferences to get clean preferences object
    const cleanPreferences = { ...preferences };
    delete cleanPreferences.isApproved;
    delete cleanPreferences.centerSkillLevel;
    delete cleanPreferences.certifications;
    delete cleanPreferences.medicalCertificate;
    delete cleanPreferences.divingInsurance;
    delete cleanPreferences.uploadedDocuments;
    delete cleanPreferences.gender;
    
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
      preferences: cleanPreferences,
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
      // For bike rental customers, set defaults for diving fields (they won't be displayed anyway)
      result.customerType = undefined;
      result.centerSkillLevel = undefined;
      result.medicalConditions = [];
      result.isApproved = false;
      result.certifications = [];
      result.medicalCertificate = { hasCertificate: false };
      result.divingInsurance = { hasInsurance: false };
      result.uploadedDocuments = [];
    }
    
    // Include any other fields that might exist
    return {
      ...result,
      ...Object.keys(data).reduce((acc, key) => {
        if (!['first_name', 'last_name', 'customer_type', 'center_skill_level',
              'medical_conditions', 'is_active', 'is_approved', 'customer_certifications',
              'medical_certificate', 'diving_insurance', 'uploaded_documents',
              'created_at', 'updated_at', 'preferences'].includes(key)) {
          acc[key] = data[key];
        }
        return acc;
      }, {})
    };
  },

  async delete(resource, id) {
    const response = await httpClient.delete(`/${resource}/${id}`);
    return response.data || response;
  },

  // Booking operations
  async getBookingsByDate(date) {
    const response = await httpClient.get('/bookings', { date });
    return response.data || response;
  },

  async getTodaysBookings() {
    const today = new Date().toISOString().split('T')[0];
    return this.getBookingsByDate(today);
  },

  async getUpcomingBookings(days = 3) {
    // Filter bookings in memory since we don't have this endpoint
    const allBookings = await this.getAll('bookings');
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);
    return allBookings.filter(b => {
      const bookingDate = new Date(b.bookingDate || b.booking_date);
      return bookingDate >= today && bookingDate <= endDate;
    });
  },

  async getCustomerBookings(customerId) {
    const response = await httpClient.get('/bookings', { customerId });
    return response.data || response;
  },

  // Customer operations
  async searchCustomers(query) {
    const response = await httpClient.get('/customers', { search: query });
    return response.data || response;
  },

  // Equipment operations
  async getAvailableEquipment(category) {
    const params = { available: 'true' };
    if (category) params.category = category;
    const response = await httpClient.get('/equipment', params);
    return response.data || response;
  },

  // Pricing operations (not yet implemented in backend)
  async calculatePrice(numberOfDives, addons = {}) {
    // TODO: Implement pricing endpoint in backend
    console.warn('Pricing calculation not yet implemented in backend API');
    return numberOfDives * 46; // Fallback
  },

  async getVolumeDiscountPrice(cumulativeDives) {
    // TODO: Implement pricing endpoint in backend
    console.warn('Volume discount pricing not yet implemented in backend API');
    return 46; // Fallback
  },

  // Statistics
  async getStatistics(locationId) {
    const params = locationId ? { locationId } : {};
    const response = await httpClient.get('/statistics', params);
    return response.data || response;
  },

  // Users endpoint doesn't exist in backend yet (admin portal users are managed in localStorage)
  // Fall back to localStorage for users
  async getAllUsers() {
    try {
      const usersData = localStorage.getItem('dcms_users');
      return usersData ? JSON.parse(usersData) : [];
    } catch (error) {
      console.error('Error loading users from localStorage:', error);
      return [];
    }
  },

  // Dive Sites endpoint doesn't exist in backend yet - fall back to localStorage
  async getAllDiveSites() {
    try {
      const diveSitesData = localStorage.getItem('dcms_diveSites');
      return diveSitesData ? JSON.parse(diveSitesData) : [];
    } catch (error) {
      console.error('Error loading dive sites from localStorage:', error);
      return [];
    }
  },

  // Settings endpoint doesn't exist in backend yet - fall back to localStorage
  async getAllSettings() {
    try {
      const settingsData = localStorage.getItem('dcms_settings');
      return settingsData ? JSON.parse(settingsData) : [];
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
      return [];
    }
  },

  async createSettings(data) {
    try {
      const settingsArray = this.getAllSettingsSync();
      const newSetting = {
        ...data,
        id: data.id || `settings-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      settingsArray.push(newSetting);
      localStorage.setItem('dcms_settings', JSON.stringify(settingsArray));
      return newSetting;
    } catch (error) {
      console.error('Error creating settings in localStorage:', error);
      throw error;
    }
  },

  async updateSettings(id, data) {
    try {
      const settingsArray = this.getAllSettingsSync();
      const index = settingsArray.findIndex(s => s.id === id);
      if (index !== -1) {
        settingsArray[index] = {
          ...settingsArray[index],
          ...data,
          id: id,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('dcms_settings', JSON.stringify(settingsArray));
        return settingsArray[index];
      } else {
        // If not found, create it
        return this.createSettings({ ...data, id });
      }
    } catch (error) {
      console.error('Error updating settings in localStorage:', error);
      throw error;
    }
  },

  getAllSettingsSync() {
    try {
      const settingsData = localStorage.getItem('dcms_settings');
      return settingsData ? JSON.parse(settingsData) : [];
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
      return [];
    }
  },

  // Government Bonos endpoint doesn't exist in backend yet - fall back to localStorage
  async getAllGovernmentBonos() {
    try {
      const bonosData = localStorage.getItem('dcms_governmentBonos');
      return bonosData ? JSON.parse(bonosData) : [];
    } catch (error) {
      console.error('Error loading government bonos from localStorage:', error);
      return [];
    }
  },
};

export default realApiAdapter;

