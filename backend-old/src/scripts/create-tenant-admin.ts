/**
 * Create default admin user for an existing tenant (e.g. one created before we auto-created tenant admins).
 * Usage: TENANT_SLUG=my-tenant npm run create-tenant-admin
 * Creates user: admin-{slug} / admin123
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const slug = process.env.TENANT_SLUG?.trim();
  if (!slug) {
    console.error('Usage: TENANT_SLUG=your-tenant-slug npm run create-tenant-admin');
    process.exit(1);
  }

  const tenant = await prisma.tenants.findUnique({
    where: { slug },
  });
  if (!tenant) {
    console.error(`Tenant with slug "${slug}" not found.`);
    process.exit(1);
  }

  const username = `admin-${slug}`;
  const existing = await prisma.users.findUnique({
    where: { username },
  });
  if (existing) {
    console.log(`User ${username} already exists. Use: npm run reset-password with RESET_ADMIN_USER=${username} to reset password.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.users.create({
    data: {
      username,
      name: `Admin (${tenant.name})`,
      email: `admin@${slug}.local`,
      password_hash: passwordHash,
      role: 'admin',
      permissions: ['dashboard', 'bookings', 'customers', 'settings', 'users'],
      location_access: [],
      is_active: true,
      tenant_id: tenant.id,
    },
  });
  console.log(`✅ Created ${username} / admin123 for tenant "${tenant.name}" (${slug}).`);
  console.log('Log in with tenant context (e.g. X-Tenant-Slug or subdomain) set to:', slug);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
