// Real API Adapter - Makes HTTP calls to backend
// This will be used when backend is ready

import { httpClient } from './httpClient';

// Real API Adapter - HTTP calls to backend
const realApiAdapter = {
  // Generic CRUD operations
  async getAll(resource) {
    let endpoint = resource;
    if (resource === 'users') endpoint = 'users';
    else if (resource === 'diveSites') endpoint = 'dive-sites';
    else if (resource === 'governmentBonos') endpoint = 'government-bonos';
    else if (resource === 'boatPreps') endpoint = 'boat-preps';
    else if (resource === 'partners') endpoint = 'partners';
    else if (resource === 'partnerInvoices') endpoint = 'partner-invoices';
    else if (resource === 'customerBills') endpoint = 'customer-bills';
    else if (resource === 'staff') endpoint = 'staff';

    const response = await httpClient.get(`/${endpoint}`);
    return this.transformResponse(resource, response.data || response);
  },

  async getById(resource, id) {
    // Map frontend resource names to backend API endpoints
    let endpoint = resource;
    if (resource === 'users') endpoint = 'users';
    else if (resource === 'diveSites') endpoint = 'dive-sites';
    else if (resource === 'governmentBonos') endpoint = 'government-bonos';
    else if (resource === 'boatPreps') endpoint = 'boat-preps';
    else if (resource === 'partners') endpoint = 'partners';
    else if (resource === 'partnerInvoices') endpoint = 'partner-invoices';
    else if (resource === 'customerBills') endpoint = 'customer-bills';
    else if (resource === 'staff') endpoint = 'staff';
    
    const response = await httpClient.get(`/${endpoint}/${id}`);
    return this.transformResponse(resource, response.data || response);
  },

  async create(resource, data) {
    // Map frontend resource names to backend API endpoints
    let endpoint = resource;
    if (resource === 'users') endpoint = 'users';
    else if (resource === 'diveSites') endpoint = 'dive-sites';
    else if (resource === 'governmentBonos') endpoint = 'government-bonos';
    else if (resource === 'boatPreps') endpoint = 'boat-preps';
    else if (resource === 'partners') endpoint = 'partners';
    
    // Transform data from frontend to backend format
    let transformedData = data;
    if (resource === 'customers') {
      transformedData = this.transformCustomerToBackend(data);
    } else if (resource === 'users') {
      transformedData = this.transformUserToBackend(data);
    } else if (resource === 'settings') {
      transformedData = this.transformSettingsToBackend(data);
    } else if (resource === 'partners') {
      transformedData = this.transformPartnerToBackend(data);
    } else if (resource === 'staff') {
      transformedData = this.transformStaffToBackend(data);
    } else if (resource === 'boats') {
      transformedData = this.transformBoatToBackend(data);
    } else if (resource === 'diveSites') {
      transformedData = this.transformDiveSiteToBackend(data);
    } else if (resource === 'boatPreps') {
      transformedData = this.transformBoatPrepToBackend(data);
    } else if (resource === 'partnerInvoices') {
      transformedData = this.transformPartnerInvoiceToBackend(data);
      endpoint = 'partner-invoices';
    } else if (resource === 'customerBills') {
      transformedData = this.transformCustomerBillToBackend(data);
      endpoint = 'customer-bills';
    }
    
    const response = await httpClient.post(`/${endpoint}`, transformedData);
    return this.transformResponse(resource, response.data || response);
  },

  async update(resource, id, data) {
    // Map frontend resource names to backend API endpoints
    let endpoint = resource;
    if (resource === 'users') endpoint = 'users';
    else if (resource === 'diveSites') endpoint = 'dive-sites';
    else if (resource === 'governmentBonos') endpoint = 'government-bonos';
    else if (resource === 'boatPreps') endpoint = 'boat-preps';
    else if (resource === 'partners') endpoint = 'partners';
    else if (resource === 'staff') endpoint = 'staff';
    else if (resource === 'partnerInvoices') endpoint = 'partner-invoices';
    else if (resource === 'customerBills') endpoint = 'customer-bills';
    
    // Transform data from frontend to backend format
    let transformedData = data;
    if (resource === 'customers') {
      transformedData = this.transformCustomerToBackend(data);
    } else if (resource === 'users') {
      transformedData = this.transformUserToBackend(data);
    } else if (resource === 'settings') {
      transformedData = this.transformSettingsToBackend(data);
    } else if (resource === 'partners') {
      transformedData = this.transformPartnerToBackend(data);
    } else if (resource === 'staff') {
      transformedData = this.transformStaffToBackend(data);
    } else if (resource === 'boats') {
      transformedData = this.transformBoatToBackend(data);
    } else if (resource === 'diveSites') {
      transformedData = this.transformDiveSiteToBackend(data);
    } else if (resource === 'boatPreps') {
      transformedData = this.transformBoatPrepToBackend(data);
    } else if (resource === 'partnerInvoices') {
      transformedData = this.transformPartnerInvoiceToBackend(data);
    } else if (resource === 'customerBills') {
      transformedData = this.transformCustomerBillToBackend(data);
    }
    const response = await httpClient.put(`/${endpoint}/${id}`, transformedData);
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
      gender: data.gender || '', // Gender is universal, not diving-specific
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
      delete cleanPreferences.equipmentOwnership;
      delete cleanPreferences.suitPreferences;
      delete cleanPreferences.ownEquipment;
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
    // firstName and lastName are REQUIRED
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
  },

  // Transform response from backend snake_case to frontend camelCase
  // Transform partner data from frontend to backend format
  transformPartnerToBackend(data) {
    if (!data || typeof data !== 'object') return data;
    
    return {
      name: data.name,
      companyName: data.companyName || data.company_name,
      contactEmail: data.contactEmail || data.contact_email,
      contactPhone: data.contactPhone || data.contact_phone,
      webhookUrl: data.webhookUrl || data.webhook_url,
      commissionRate: data.commissionRate || data.commission_rate,
      allowedLocations: data.allowedLocations || data.allowed_locations || [],
      settings: data.settings || {},
      isActive: data.isActive !== undefined ? data.isActive : (data.is_active !== undefined ? data.is_active : true),
    };
  },

  // Transform partner data from backend to frontend format
  transformPartnerFromBackend(data) {
    if (!data || typeof data !== 'object') return data;
    
    return {
      id: data.id,
      name: data.name,
      companyName: data.company_name || data.companyName,
      contactEmail: data.contact_email || data.contactEmail,
      contactPhone: data.contact_phone || data.contactPhone,
      webhookUrl: data.webhook_url || data.webhookUrl,
      commissionRate: data.commission_rate !== undefined ? parseFloat(data.commission_rate) : (data.commissionRate !== undefined ? parseFloat(data.commissionRate) : null),
      allowedLocations: data.allowed_locations || data.allowedLocations || [],
      apiKey: data.api_key || data.apiKey,
      apiSecret: data.apiSecret, // Only present on create/regenerate
      isActive: data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : true),
      settings: data.settings || {},
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt,
    };
  },

  transformStaffToBackend(data) {
    if (!data || typeof data !== 'object') return data;
    
    const locationIds = data.locationIds || data.location_ids || [];
    return {
      firstName: data.firstName || data.first_name,
      lastName: data.lastName || data.last_name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      locationId: data.locationId || data.location_id || (locationIds.length > 0 ? locationIds[0] : null),
      locationIds: Array.isArray(locationIds) ? locationIds : [],
      certifications: data.certifications || [],
      emergencyContact: data.emergencyContact || data.emergency_contact || {},
      employmentStartDate: data.employmentStartDate || data.employment_start_date,
      isActive: data.isActive !== undefined ? data.isActive : (data.is_active !== undefined ? data.is_active : true),
    };
  },

  transformStaffFromBackend(data) {
    if (!data || typeof data !== 'object') return data;
    
    const locationIds = data.location_ids || data.locationIds || [];
    return {
      id: data.id,
      firstName: data.first_name || data.firstName,
      lastName: data.last_name || data.lastName,
      name: `${data.first_name || data.firstName || ''} ${data.last_name || data.lastName || ''}`.trim(),
      email: data.email,
      phone: data.phone,
      role: data.role,
      locationId: data.location_id || data.locationId || (locationIds.length > 0 ? locationIds[0] : null),
      locationIds: Array.isArray(locationIds) ? locationIds : (data.location_id ? [data.location_id] : []),
      certifications: data.certifications || [],
      emergencyContact: data.emergency_contact || data.emergencyContact || {},
      employmentStartDate: data.employment_start_date || data.employmentStartDate,
      isActive: data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : true),
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt,
    };
  },

  transformBoatToBackend(data) {
    if (!data || typeof data !== 'object') return data;
    
    return {
      name: data.name,
      location_id: data.locationId || data.location_id,
      capacity: data.capacity,
      equipment_onboard: data.equipmentOnboard || data.equipment_onboard || [],
      is_active: data.isActive !== undefined ? data.isActive : (data.is_active !== undefined ? data.is_active : true),
    };
  },

  transformBoatFromBackend(data) {
    if (!data || typeof data !== 'object') return data;
    
    return {
      id: data.id,
      name: data.name,
      locationId: data.location_id || data.locationId,
      capacity: data.capacity,
      equipmentOnboard: data.equipment_onboard || data.equipmentOnboard || [],
      isActive: data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : true),
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt,
    };
  },

  transformDiveSiteToBackend(data) {
    if (!data || typeof data !== 'object') return data;
    
    return {
      name: data.name,
      location_id: data.locationId || data.location_id,
      type: data.type || 'diving',
      depth_range: data.depthRange || data.depth_range || { min: 0, max: 0 },
      difficulty_level: data.difficultyLevel || data.difficulty_level || 'beginner',
      conditions: data.conditions || {},
      is_active: data.isActive !== undefined ? data.isActive : (data.is_active !== undefined ? data.is_active : true),
    };
  },

  transformDiveSiteFromBackend(data) {
    if (!data || typeof data !== 'object') return data;
    
    return {
      id: data.id,
      name: data.name,
      locationId: data.location_id || data.locationId,
      type: data.type || 'diving',
      depthRange: data.depth_range || data.depthRange || { min: 0, max: 0 },
      difficultyLevel: data.difficulty_level || data.difficultyLevel || 'beginner',
      conditions: data.conditions || {},
      isActive: data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : true),
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt,
    };
  },

  transformBoatPrepToBackend(data) {
    if (!data || typeof data !== 'object') return data;
    
    // Backend DTO expects camelCase (the service maps it to snake_case for Prisma)
    return {
      locationId: data.locationId || data.location_id,
      date: data.date,
      session: data.session,
      boatId: data.boatId || data.boat_id || null,
      diverIds: data.diverIds || data.diver_ids || [],
      diveSiteId: data.diveSiteId || data.dive_site_id || null,
      actualDiveSiteId: data.actualDiveSiteId || data.actual_dive_site_id || null,
      diveSiteStatus: data.diveSiteStatus || data.dive_site_status || {},
      postDiveReport: data.postDiveReport || data.post_dive_report || null,
      staff: data.staff || {},
      createdAt: data.createdAt || data.created_at,
      updatedAt: data.updatedAt || data.updated_at,
    };
  },

  transformBoatPrepFromBackend(data) {
    if (!data || typeof data !== 'object') return data;
    
    return {
      id: data.id,
      locationId: data.location_id || data.locationId,
      date: data.date,
      session: data.session,
      boatId: data.boat_id || data.boatId || null,
      diverIds: data.diver_ids || data.diverIds || [],
      diveSiteId: data.dive_site_id || data.diveSiteId || null,
      actualDiveSiteId: data.actual_dive_site_id || data.actualDiveSiteId || null,
      diveSiteStatus: data.dive_site_status || data.diveSiteStatus || {},
      postDiveReport: data.post_dive_report || data.postDiveReport || null,
      staff: data.staff || {},
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt,
    };
  },

  transformPartnerInvoiceToBackend(data) {
    if (!data || typeof data !== 'object') return data;
    
    // Backend DTO expects camelCase
    // Only include defined fields (for updates, we only send changed fields)
    const result = {};
    
    if (data.partnerId !== undefined || data.partner_id !== undefined) {
      result.partnerId = data.partnerId || data.partner_id;
    }
    if (data.customerId !== undefined || data.customer_id !== undefined) {
      result.customerId = data.customerId || data.customer_id || null;
    }
    if (data.billId !== undefined || data.bill_id !== undefined) {
      result.billId = data.billId || data.bill_id || null;
    }
    if (data.locationId !== undefined || data.location_id !== undefined) {
      result.locationId = data.locationId || data.location_id;
    }
    if (data.invoiceDate !== undefined || data.invoice_date !== undefined) {
      result.invoiceDate = data.invoiceDate || data.invoice_date;
    }
    if (data.dueDate !== undefined || data.due_date !== undefined) {
      result.dueDate = data.dueDate || data.due_date;
    }
    if (data.paymentTermsDays !== undefined || data.payment_terms_days !== undefined) {
      result.paymentTermsDays = data.paymentTermsDays || data.payment_terms_days || 30;
    }
    if (data.subtotal !== undefined) {
      result.subtotal = data.subtotal;
    }
    if (data.tax !== undefined) {
      result.tax = data.tax;
    }
    if (data.total !== undefined) {
      result.total = data.total;
    }
    if (data.bookingIds !== undefined || data.booking_ids !== undefined) {
      result.bookingIds = data.bookingIds || data.booking_ids || [];
    }
    if (data.notes !== undefined) {
      result.notes = data.notes;
    }
    if (data.paidAmount !== undefined || data.paid_amount !== undefined) {
      result.paidAmount = data.paidAmount !== undefined ? data.paidAmount : data.paid_amount;
    }
    if (data.status !== undefined) {
      result.status = data.status;
    }
    
    return result;
  },

  transformCustomerBillToBackend(data) {
    if (!data || typeof data !== 'object') return data;
    
    return {
      customerId: data.customerId || data.customer_id,
      locationId: data.locationId || data.location_id,
      billNumber: data.billNumber || data.bill_number,
      stayStartDate: data.stayStartDate || data.stay_start_date,
      billDate: data.billDate || data.bill_date,
      bookingIds: data.bookingIds || data.booking_ids || [],
      billItems: data.billItems || data.bill_items || [],
      subtotal: data.subtotal || 0,
      tax: data.tax || 0,
      total: data.total || 0,
      partnerPaidTotal: data.partnerPaidTotal || data.partner_paid_total || 0,
      customerPaidTotal: data.customerPaidTotal || data.customer_paid_total || 0,
      partnerTax: data.partnerTax || data.partner_tax || 0,
      customerTax: data.customerTax || data.customer_tax || 0,
      breakdown: data.breakdown || {},
      notes: data.notes,
    };
  },

  transformCustomerBillFromBackend(data) {
    if (!data || typeof data !== 'object') return data;
    
    return {
      id: data.id,
      customerId: data.customer_id || data.customerId,
      locationId: data.location_id || data.locationId,
      billNumber: data.bill_number || data.billNumber,
      stayStartDate: data.stay_start_date || data.stayStartDate,
      billDate: data.bill_date || data.billDate,
      bookingIds: data.booking_ids || data.bookingIds || [],
      billItems: data.bill_items || data.billItems || [],
      subtotal: parseFloat(data.subtotal) || 0,
      tax: parseFloat(data.tax) || 0,
      total: parseFloat(data.total) || 0,
      partnerPaidTotal: parseFloat(data.partner_paid_total || data.partnerPaidTotal || 0),
      customerPaidTotal: parseFloat(data.customer_paid_total || data.customerPaidTotal || 0),
      partnerTax: parseFloat(data.partner_tax || data.partnerTax || 0),
      customerTax: parseFloat(data.customer_tax || data.customerTax || 0),
      breakdown: data.breakdown || {},
      notes: data.notes,
      customer: data.customers || data.customer,
      location: data.locations || data.location,
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt,
    };
  },

  transformPartnerInvoiceFromBackend(data) {
    if (!data || typeof data !== 'object') return data;
    
    return {
      id: data.id,
      partnerId: data.partner_id || data.partnerId,
      customerId: data.customer_id || data.customerId || null,
      billId: data.bill_id || data.billId || null,
      locationId: data.location_id || data.locationId,
      invoiceNumber: data.invoice_number || data.invoiceNumber,
      invoiceDate: data.invoice_date || data.invoiceDate,
      dueDate: data.due_date || data.dueDate,
      paymentTermsDays: data.payment_terms_days || data.paymentTermsDays || 30,
      subtotal: parseFloat(data.subtotal) || 0,
      tax: parseFloat(data.tax) || 0,
      total: parseFloat(data.total) || 0,
      paidAmount: data.paid_amount !== undefined ? parseFloat(data.paid_amount) : (data.paidAmount !== undefined ? parseFloat(data.paidAmount) : 0),
      status: data.status || 'pending',
      bookingIds: data.booking_ids || data.bookingIds || [],
      notes: data.notes || null,
      paidAt: data.paid_at || data.paidAt || null,
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt,
      partner: data.partners ? this.transformPartnerFromBackend(data.partners) : null,
    };
  },

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
    if (resource === 'users') {
      if (Array.isArray(data)) {
        return data.map(item => this.transformUserFromBackend(item));
      }
      return this.transformUserFromBackend(data);
    }
    if (resource === 'settings') {
      if (Array.isArray(data)) {
        return data.map(item => this.transformSettingsFromBackend(item));
      }
      return this.transformSettingsFromBackend(data);
    }
    if (resource === 'partners') {
      if (Array.isArray(data)) {
        return data.map(item => this.transformPartnerFromBackend(item));
      }
      return this.transformPartnerFromBackend(data);
    }
    if (resource === 'staff') {
      if (Array.isArray(data)) {
        return data.map(item => this.transformStaffFromBackend(item));
      }
      return this.transformStaffFromBackend(data);
    }
    if (resource === 'boats') {
      if (Array.isArray(data)) {
        return data.map(item => this.transformBoatFromBackend(item));
      }
      return this.transformBoatFromBackend(data);
    }
    if (resource === 'diveSites') {
      if (Array.isArray(data)) {
        return data.map(item => this.transformDiveSiteFromBackend(item));
      }
      return this.transformDiveSiteFromBackend(data);
    }
    if (resource === 'boatPreps') {
      if (Array.isArray(data)) {
        return data.map(item => this.transformBoatPrepFromBackend(item));
      }
      return this.transformBoatPrepFromBackend(data);
    }
    if (resource === 'partnerInvoices') {
      if (Array.isArray(data)) {
        return data.map(item => this.transformPartnerInvoiceFromBackend(item));
      }
      return this.transformPartnerInvoiceFromBackend(data);
    }
    if (resource === 'customerBills') {
      if (Array.isArray(data)) {
        return data.map(item => this.transformCustomerBillFromBackend(item));
      }
      return this.transformCustomerBillFromBackend(data);
    }
    return data;
  },

  transformSettingsFromBackend(data) {
    if (!data || typeof data !== 'object') return data;
    
    // Backend stores settings as { id, key, value: {...}, description }
    // Frontend expects { id, certificationUrls, prices, ... }
    // So we need to flatten the structure by merging value into the root
    if (data.value && typeof data.value === 'object') {
      return {
        id: data.id,
        key: data.key,
        description: data.description,
        ...data.value, // Merge value properties into root
        createdAt: data.created_at || data.createdAt,
        updatedAt: data.updated_at || data.updatedAt,
      };
    }
    
    // If no value field, return as-is (already in correct format)
    return {
      ...data,
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt,
    };
  },

  transformSettingsToBackend(data) {
    if (!data || typeof data !== 'object') return data;
    
    // Frontend sends { id, certificationUrls, prices, ... }
    // Backend expects { key, value: { certificationUrls, prices, ... }, description }
    
    // Extract value fields (everything except id, key, description)
    const { id, key, description, createdAt, updatedAt, ...valueFields } = data;
    
    return {
      key: key || 'default',
      value: valueFields,
      description: description,
    };
  },

  transformUserFromBackend(data) {
    if (!data || typeof data !== 'object') return data;
    
    return {
      id: data.id,
      username: data.username,
      name: data.name,
      email: data.email,
      role: data.role,
      permissions: data.permissions || [],
      locationAccess: data.location_access || data.locationAccess || [],
      isActive: data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : true),
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt,
      // Don't include password_hash
    };
  },

  transformUserToBackend(data) {
    if (!data || typeof data !== 'object') return data;
    
    return {
      username: data.username,
      name: data.name,
      email: data.email,
      password: data.password, // Password will be hashed by backend
      role: data.role,
      permissions: data.permissions || [],
      locationAccess: data.locationAccess || [],
      isActive: data.isActive !== undefined ? data.isActive : true,
    };
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
      // Preserve customerType value exactly as it is (don't default to 'tourist' if it's already set)
      // Only default to 'tourist' if customerType is actually undefined or null, not if it's an empty string
      result.customerType = (customerType !== undefined && customerType !== null && customerType !== '') 
        ? customerType 
        : 'tourist';
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
    // Map frontend resource names to backend API endpoints
    let endpoint = resource;
    if (resource === 'users') endpoint = 'users';
    else if (resource === 'diveSites') endpoint = 'dive-sites';
    else if (resource === 'governmentBonos') endpoint = 'government-bonos';
    else if (resource === 'boatPreps') endpoint = 'boat-preps';
    else if (resource === 'partners') endpoint = 'partners';
    else if (resource === 'partnerInvoices') endpoint = 'partner-invoices';
    else if (resource === 'customerBills') endpoint = 'customer-bills';
    else if (resource === 'staff') endpoint = 'staff';
    
    const response = await httpClient.delete(`/${endpoint}/${id}`);
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

  // All endpoints now use the API - localStorage fallbacks removed
};

export default realApiAdapter;

