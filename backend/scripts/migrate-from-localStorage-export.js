/**
 * Node.js Migration Script: Import localStorage data from JSON export
 * 
 * Usage:
 *   1. Export localStorage data from browser console:
 *      JSON.stringify({
 *        locations: JSON.parse(localStorage.getItem('dcms_locations') || '[]'),
 *        customers: JSON.parse(localStorage.getItem('dcms_customers') || '[]'),
 *        bookings: JSON.parse(localStorage.getItem('dcms_bookings') || '[]'),
 *        equipment: JSON.parse(localStorage.getItem('dcms_equipment') || '[]')
 *      })
 *   2. Save to localStorage-export.json
 *   3. Run: node backend/scripts/migrate-from-localStorage-export.js
 */

const fs = require('fs');
const path = require('path');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3003/api';

// Helper functions to transform data
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

// API call helper
async function apiCall(method, endpoint, data = null) {
  const fetch = (await import('node-fetch')).default;
  
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

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
}

// Main migration function
async function migrateFromExport(exportPath) {
  console.log('🚀 Starting migration from localStorage export...');
  console.log(`📡 API URL: ${API_BASE_URL}`);
  console.log(`📁 Export file: ${exportPath}`);

  // Read export file
  let data;
  try {
    const fileContent = fs.readFileSync(exportPath, 'utf8');
    data = JSON.parse(fileContent);
  } catch (error) {
    console.error('❌ Failed to read export file:', error.message);
    process.exit(1);
  }

  const results = {
    locations: { success: 0, errors: [] },
    customers: { success: 0, errors: [] },
    bookings: { success: 0, errors: [] },
    equipment: { success: 0, errors: [] },
  };

  console.log('📦 Data found:', {
    locations: (data.locations || []).length,
    customers: (data.customers || []).length,
    bookings: (data.bookings || []).length,
    equipment: (data.equipment || []).length,
  });

  // Migrate Locations
  console.log('\n📍 Migrating locations...');
  for (const loc of data.locations || []) {
    try {
      const transformed = transformLocation(loc);
      try {
        await apiCall('POST', '/locations', transformed);
        results.locations.success++;
        console.log(`  ✅ Created location: ${loc.name}`);
      } catch (error) {
        if (error.message.includes('409') || error.message.includes('already exists') || error.message.includes('duplicate')) {
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
  for (const customer of data.customers || []) {
    try {
      const transformed = transformCustomer(customer);
      try {
        await apiCall('POST', '/customers', transformed);
        results.customers.success++;
      } catch (error) {
        if (error.message.includes('409') || error.message.includes('already exists') || error.message.includes('duplicate')) {
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
  for (const booking of data.bookings || []) {
    try {
      const transformed = transformBooking(booking);
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
  for (const eq of data.equipment || []) {
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
  console.log('📊 Results:', JSON.stringify(results, null, 2));
  
  return results;
}

// Run if called directly
if (require.main === module) {
  const exportPath = process.argv[2] || path.join(__dirname, 'localStorage-export.json');
  
  if (!fs.existsSync(exportPath)) {
    console.error(`❌ Export file not found: ${exportPath}`);
    console.log('\n💡 To export localStorage data from browser:');
    console.log('1. Open browser DevTools Console');
    console.log('2. Run:');
    console.log(`
      const data = {
        locations: JSON.parse(localStorage.getItem('dcms_locations') || '[]'),
        customers: JSON.parse(localStorage.getItem('dcms_customers') || '[]'),
        bookings: JSON.parse(localStorage.getItem('dcms_bookings') || '[]'),
        equipment: JSON.parse(localStorage.getItem('dcms_equipment') || '[]')
      };
      copy(JSON.stringify(data, null, 2));
    `);
    console.log('3. Save the copied JSON to:', exportPath);
    process.exit(1);
  }

  migrateFromExport(exportPath)
    .then(() => {
      console.log('\n✨ Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateFromExport, transformLocation, transformCustomer, transformBooking, transformEquipment };

