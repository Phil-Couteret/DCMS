import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding users...');

  // Check if superadmin already exists
  const existingSuperadmin = await prisma.users.findUnique({
    where: { username: 'superadmin' },
  });

  if (!existingSuperadmin) {
    const passwordHash = await bcrypt.hash('superadmin123', 10);
    
    await prisma.users.create({
      data: {
        username: 'superadmin',
        name: 'Super Administrator',
        email: 'superadmin@deep-blue-diving.com',
        password_hash: passwordHash,
        role: 'superadmin',
        permissions: [],
        location_access: [],
        is_active: true,
      },
    });
    console.log('✅ Superadmin user created');
  } else {
    console.log('ℹ️  Superadmin user already exists');
  }

  // Check if admin already exists
  const existingAdmin = await prisma.users.findUnique({
    where: { username: 'admin' },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    const defaultTenant = await prisma.tenants.findUnique({
      where: { slug: 'default' },
    });

    await prisma.users.create({
      data: {
        username: 'admin',
        name: 'Administrator',
        email: 'admin@deep-blue-diving.com',
        password_hash: passwordHash,
        role: 'admin',
        permissions: ['dashboard', 'bookings', 'customers', 'settings', 'users'],
        location_access: [],
        is_active: true,
        tenant_id: defaultTenant?.id ?? null,
      },
    });
    console.log('✅ Admin user created');
  } else {
    console.log('ℹ️  Admin user already exists');
  }

  console.log('✅ Users seeding completed');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

