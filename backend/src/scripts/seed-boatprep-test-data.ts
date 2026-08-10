/**
 * Seeds a throwaway local test tenant with just enough data to click
 * through the Boat Prep page (Phase 5.2 part 2 verification): one tenant,
 * one location, one boat, two staff (a boat captain and a divemaster),
 * one customer, and one booking dated today so it shows up in Dive
 * Preparation without needing to create anything by hand first.
 *
 * Safe to re-run - it's idempotent by slug/email, so running it twice
 * just reuses what's already there instead of duplicating rows.
 *
 * Usage: npm run seed:boatprep-test
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TENANT_SLUG = 'test-dive';

async function main() {
  console.log('🌱 Seeding Boat Prep test data...');

  const tenant = await prisma.tenants.upsert({
    where: { slug: TENANT_SLUG },
    update: {},
    create: {
      slug: TENANT_SLUG,
      name: 'Test Dive Center',
      is_active: true,
    },
  });
  console.log(`✅ Tenant: ${tenant.name} (${tenant.slug})`);

  // Tenant admin (same convention as create-tenant-admin.ts)
  const adminUsername = `admin-${TENANT_SLUG}`;
  const existingAdmin = await prisma.users.findUnique({ where: { username: adminUsername } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.users.create({
      data: {
        username: adminUsername,
        name: `Admin (${tenant.name})`,
        email: `admin@${TENANT_SLUG}.local`,
        password_hash: passwordHash,
        role: 'admin',
        permissions: ['dashboard', 'bookings', 'customers', 'settings', 'users'],
        location_access: [],
        is_active: true,
        tenant_id: tenant.id,
      },
    });
    console.log(`✅ Tenant admin: ${adminUsername} / admin123`);
  } else {
    console.log(`ℹ️  Tenant admin ${adminUsername} already exists`);
  }

  let location = await prisma.locations.findFirst({
    where: { tenant_id: tenant.id, name: 'Test Bay' },
  });
  if (!location) {
    location = await prisma.locations.create({
      data: {
        tenant_id: tenant.id,
        name: 'Test Bay',
        type: 'diving',
        address: { city: 'Testville' },
        contact_info: { phone: '+34000000000' },
        is_active: true,
      },
    });
  }
  console.log(`✅ Location: ${location.name} (${location.id})`);

  let boat = await prisma.boats.findFirst({
    where: { tenant_id: tenant.id, location_id: location.id, name: 'Test Boat 1' },
  });
  if (!boat) {
    boat = await prisma.boats.create({
      data: {
        tenant_id: tenant.id,
        location_id: location.id,
        name: 'Test Boat 1',
        capacity: 8,
        is_active: true,
      },
    });
  }
  console.log(`✅ Boat: ${boat.name} (${boat.id})`);

  const staffSpecs: Array<{ email: string; first: string; last: string; role: 'boat_captain' | 'divemaster' }> = [
    { email: `captain@${TENANT_SLUG}.local`, first: 'Cara', last: 'Captain', role: 'boat_captain' },
    { email: `guide@${TENANT_SLUG}.local`, first: 'Gus', last: 'Guide', role: 'divemaster' },
  ];
  for (const spec of staffSpecs) {
    const existing = await prisma.staff.findUnique({ where: { email: spec.email } });
    if (!existing) {
      await prisma.staff.create({
        data: {
          tenant_id: tenant.id,
          location_id: location.id,
          first_name: spec.first,
          last_name: spec.last,
          email: spec.email,
          role: spec.role,
          is_active: true,
        },
      });
      console.log(`✅ Staff: ${spec.first} ${spec.last} (${spec.role})`);
    } else {
      console.log(`ℹ️  Staff ${spec.email} already exists`);
    }
  }

  let customer = await prisma.customers.findFirst({
    where: { tenant_id: tenant.id, email: `diver@${TENANT_SLUG}.local` },
  });
  if (!customer) {
    customer = await prisma.customers.create({
      data: {
        tenant_id: tenant.id,
        first_name: 'Dana',
        last_name: 'Diver',
        email: `diver@${TENANT_SLUG}.local`,
        customer_type: 'tourist',
        is_active: true,
      },
    });
  }
  console.log(`✅ Customer: ${customer.first_name} ${customer.last_name} (${customer.id})`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingBooking = await prisma.bookings.findFirst({
    where: { tenant_id: tenant.id, customer_id: customer.id, location_id: location.id, booking_date: today },
  });
  if (!existingBooking) {
    await prisma.bookings.create({
      data: {
        tenant_id: tenant.id,
        customer_id: customer.id,
        location_id: location.id,
        booking_date: today,
        activity_type: 'diving',
        number_of_dives: 1,
        price: 50,
        total_price: 50,
        status: 'confirmed',
      },
    });
    console.log(`✅ Booking created for today (${today.toISOString().slice(0, 10)})`);
  } else {
    console.log('ℹ️  Booking for today already exists');
  }

  console.log('');
  console.log('Done. Log in with:');
  console.log(`  username: ${adminUsername}`);
  console.log('  password: admin123');
  console.log(`  tenant slug: ${TENANT_SLUG}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding Boat Prep test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
