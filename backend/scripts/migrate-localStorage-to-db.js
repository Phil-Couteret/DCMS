/**
 * Migration Script: localStorage to Database
 * 
 * This script exports data from localStorage and imports it into PostgreSQL database.
 * 
 * Usage:
 *   1. Open browser DevTools Console on either public website or admin portal
 *   2. Copy and paste this entire script into the console
 *   3. Run: migrateLocalStorageToDB('http://localhost:3003/api')
 * 
 * Or run as Node.js script (requires fetching localStorage data manually first):
 *   node backend/scripts/migrate-localStorage-to-db.js
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:3003/api';

// Helper to convert localStorage data format to database format
function transformLocation(loc) {
  return {
    id: loc.id,
    name: loc.name,
    type: loc.type || 'diving',
    address: loc.address || {},
    contactInfo: loc.address ? {
      phone: loc.phone,
      email: loc.email,
      website: loc.website,
    } : {},
    settings: {
      pricing: loc.pricing || {},
    },
    isActive: loc.isActive !== undefined ? loc.isActive : true,
  };
}

function transformCustomer(customer) {
  return {
    firstName: customer.firstName || customer.first_name,
    lastName: customer.lastName || customer.last_name,
    email: customer.email,
    phone: customer.phone,
    dob: customer.dob || customer.dateOfBirth,
    nationality: customer.nationality,
    address: customer.address || {},
    customerType: customer.customerType || customer.customer_type || null,
    preferences: customer.preferences || {},
    medicalConditions: customer.medicalConditions || customer.medical_conditions || [],
    restrictions: customer.restrictions || {},
    notes: customer.notes,
  };
}

function transformBooking(booking) {
  // Map activity type
  let activityType = 'diving';
  if (booking.activityType) {
    activityType = booking.activityType;
  } else if (booking.activity_type) {
    activityType = booking.activity_type;
  }

  return {
    customerId: booking.customerId || booking.customer_id,
    locationId: booking.locationId || booking.location_id,
    boatId: booking.boatId || booking.boat_id || null,
    diveSiteId: booking.diveSiteId || booking.dive_site_id || null,
    bookingDate: booking.bookingDate || booking.booking_date,
    activityType: activityType,
    numberOfDives: booking.numberOfDives || booking.number_of_dives || 1,
    price: parseFloat(booking.price || 0),
    discount: parseFloat(booking.discount || 0),
    totalPrice: parseFloat(booking.totalPrice || booking.total_price || booking.price || 0),
    paymentMethod: booking.paymentMethod || booking.payment_method || null,
    paymentStatus: booking.paymentStatus || booking.payment_status || 'pending',
    status: booking.status || 'pending',
    specialRequirements: booking.notes || booking.specialRequirements || booking.special_requirements || null,
    equipmentNeeded: booking.equipmentNeeded || booking.equipment_needed || [],
  };
}

function transformEquipment(eq) {
  return {
    locationId: eq.locationId || eq.location_id,
    name: eq.name,
    category: eq.category || eq.type || 'diving',
    type: eq.type || eq.category || 'diving',
    size: eq.size || null,
    condition: eq.condition || null,
    serialNumber: eq.serialNumber || eq.serial_number || null,
    isAvailable: eq.isAvailable !== undefined ? eq.isAvailable : (eq.is_available !== undefined ? eq.is_available : true),
  };
}

// Main migration function
async function migrateLocalStorageToDB(apiUrl = API_BASE_URL) {
  console.log('🚀 Starting migration from localStorage to database...');
  console.log(`📡 API URL: ${apiUrl}`);

  const results = {
    locations: { success: 0, errors: [] },
    customers: { success: 0, errors: [] },
    bookings: { success: 0, errors: [] },
    equipment: { success: 0, errors: [] },
  };

  // Helper function to make API calls
  async function apiCall(method, endpoint, data = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${apiUrl}${endpoint}`, options);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  // Get localStorage data (for browser console execution)
  function getLocalStorageData() {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available. Run this script in a browser console.');
    }

    return {
      locations: JSON.parse(localStorage.getItem('dcms_locations') || '[]'),
      customers: JSON.parse(localStorage.getItem('dcms_customers') || '[]'),
      bookings: JSON.parse(localStorage.getItem('dcms_bookings') || '[]'),
      equipment: JSON.parse(localStorage.getItem('dcms_equipment') || '[]'),
    };
  }

  try {
    // Get data from localStorage
    const data = getLocalStorageData();
    console.log('📦 Data found:', {
      locations: data.locations.length,
      customers: data.customers.length,
      bookings: data.bookings.length,
      equipment: data.equipment.length,
    });

    // Migrate Locations
    console.log('\n📍 Migrating locations...');
    for (const loc of data.locations) {
      try {
        const transformed = transformLocation(loc);
        // Try to create, if exists (409), update instead
        try {
          await apiCall('POST', '/locations', transformed);
          results.locations.success++;
          console.log(`  ✅ Created location: ${loc.name}`);
        } catch (error) {
          if (error.message.includes('409') || error.message.includes('already exists')) {
            await apiCall('PUT', `/locations/${loc.id}`, transformed);
            results.locations.success++;
            console.log(`  ✅ Updated location: ${loc.name}`);
          } else {
            throw error;
          }
        }
      } catch (error) {
        results.locations.errors.push({ id: loc.id, name: loc.name, error: error.message });
        console.error(`  ❌ Failed location ${loc.name}:`, error.message);
      }
    }

    // Migrate Customers
    console.log('\n👥 Migrating customers...');
    for (const customer of data.customers) {
      try {
        const transformed = transformCustomer(customer);
        try {
          await apiCall('POST', '/customers', transformed);
          results.customers.success++;
        } catch (error) {
          if (error.message.includes('409') || error.message.includes('already exists')) {
            await apiCall('PUT', `/customers/${customer.id}`, transformed);
            results.customers.success++;
          } else {
            throw error;
          }
        }
      } catch (error) {
        results.customers.errors.push({ id: customer.id, email: customer.email, error: error.message });
        console.error(`  ❌ Failed customer ${customer.email}:`, error.message);
      }
    }

    // Migrate Bookings
    console.log('\n📅 Migrating bookings...');
    for (const booking of data.bookings) {
      try {
        const transformed = transformBooking(booking);
        // Skip if required fields are missing
        if (!transformed.customerId || !transformed.locationId) {
          console.warn(`  ⚠️ Skipping booking ${booking.id}: missing customerId or locationId`);
          continue;
        }
        await apiCall('POST', '/bookings', transformed);
        results.bookings.success++;
      } catch (error) {
        results.bookings.errors.push({ id: booking.id, error: error.message });
        console.error(`  ❌ Failed booking ${booking.id}:`, error.message);
      }
    }

    // Migrate Equipment
    console.log('\n🎒 Migrating equipment...');
    for (const eq of data.equipment) {
      try {
        const transformed = transformEquipment(eq);
        if (!transformed.locationId) {
          console.warn(`  ⚠️ Skipping equipment ${eq.id}: missing locationId`);
          continue;
        }
        await apiCall('POST', '/equipment', transformed);
        results.equipment.success++;
      } catch (error) {
        results.equipment.errors.push({ id: eq.id, name: eq.name, error: error.message });
        console.error(`  ❌ Failed equipment ${eq.name}:`, error.message);
      }
    }

    // Summary
    console.log('\n✅ Migration completed!');
    console.log('📊 Results:', results);
    
    return results;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Export for use in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { migrateLocalStorageToDB, transformLocation, transformCustomer, transformBooking, transformEquipment };
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('💡 To run migration, call: migrateLocalStorageToDB("http://localhost:3003/api")');
  window.migrateLocalStorageToDB = migrateLocalStorageToDB;
}

