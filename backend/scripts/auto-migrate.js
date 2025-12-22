/**
 * Automated Migration Script
 * Uses Puppeteer to access localStorage from browser and migrate to database
 */

const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3003/api';
const FRONTEND_URL = 'http://localhost:3001'; // Admin portal
const PUBLIC_URL = 'http://localhost:3000'; // Public website

// Helper to transform data (same as migration script)
function transformLocation(loc) {
  return {
    id: loc.id, // Include ID for migration to preserve existing IDs
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
  if (booking.activityType) activityType = booking.activityType;
  else if (booking.activity_type) activityType = booking.activity_type;

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

async function apiCall(method, endpoint, data = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (data) options.body = JSON.stringify(data);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  return await response.json();
}

async function migrateFromBrowser() {
  console.log('🚀 Starting automated migration from browser localStorage...');
  
  let browser;
  try {
    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Try admin portal first, then public website
    let localStorageData = null;
    for (const url of [FRONTEND_URL, PUBLIC_URL]) {
      try {
        console.log(`📡 Accessing ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });
        
        // Get localStorage data
        localStorageData = await page.evaluate(() => {
          return {
            locations: JSON.parse(localStorage.getItem('dcms_locations') || '[]'),
            customers: JSON.parse(localStorage.getItem('dcms_customers') || '[]'),
            bookings: JSON.parse(localStorage.getItem('dcms_bookings') || '[]'),
            equipment: JSON.parse(localStorage.getItem('dcms_equipment') || '[]'),
          };
        });
        
        console.log(`✅ Retrieved data from ${url}`);
        break;
      } catch (error) {
        console.warn(`⚠️ Could not access ${url}:`, error.message);
        continue;
      }
    }

    if (!localStorageData) {
      throw new Error('Could not access localStorage from any URL. Make sure frontend or public website is running.');
    }

    await browser.close();

    const results = {
      locations: { success: 0, errors: [] },
      customers: { success: 0, errors: [] },
      bookings: { success: 0, errors: [] },
      equipment: { success: 0, errors: [] },
    };

    console.log('\n📦 Data found:', {
      locations: localStorageData.locations.length,
      customers: localStorageData.customers.length,
      bookings: localStorageData.bookings.length,
      equipment: localStorageData.equipment.length,
    });

    // Migrate Locations
    console.log('\n📍 Migrating locations...');
    for (const loc of localStorageData.locations || []) {
      try {
        const transformed = transformLocation(loc);
        // Check if location already exists
        try {
          await apiCall('GET', `/locations/${loc.id}`);
          // Exists, update it (remove ID from update payload)
          const { id, ...updateData } = transformed;
          await apiCall('PUT', `/locations/${loc.id}`, updateData);
          results.locations.success++;
          console.log(`  ✅ Updated location: ${loc.name}`);
        } catch (getError) {
          // Doesn't exist, create it
          if (getError.message.includes('404') || getError.message.includes('not found')) {
            await apiCall('POST', '/locations', transformed);
            results.locations.success++;
            console.log(`  ✅ Created location: ${loc.name}`);
          } else {
            throw getError;
          }
        }
      } catch (error) {
        results.locations.errors.push({ id: loc.id, name: loc.name, error: error.message });
        console.error(`  ❌ Failed location ${loc.name}:`, error.message);
      }
    }

    // Migrate Customers
    console.log('\n👥 Migrating customers...');
    for (const customer of localStorageData.customers || []) {
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
    for (const booking of localStorageData.bookings || []) {
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
    for (const eq of localStorageData.equipment || []) {
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
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  migrateFromBrowser()
    .then(() => {
      console.log('\n✨ Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateFromBrowser };

