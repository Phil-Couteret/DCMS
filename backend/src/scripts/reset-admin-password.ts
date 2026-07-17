/**
 * Reset password for admin or superadmin (API-mode login).
 * Use when you cannot connect to DCMS admin with the password.
 *
 * From backend folder:
 *   npm run reset-password
 *   # Resets both superadmin and admin to default passwords (superadmin123 / admin123)
 *
 *   RESET_ADMIN_USER=superadmin RESET_ADMIN_PASSWORD=mynewpass npm run reset-password
 *   # Resets only superadmin to mynewpass
 *
 *   RESET_ADMIN_USER=admin RESET_ADMIN_PASSWORD=mynewpass npm run reset-password
 *   # Resets only admin to mynewpass
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_PASSWORDS: Record<string, string> = {
  superadmin: 'superadmin123',
  admin: 'admin123',
};

async function main() {
  const userSpec = process.env.RESET_ADMIN_USER?.trim(); // 'superadmin' | 'admin' | empty = both
  const newPassword = process.env.RESET_ADMIN_PASSWORD?.trim();

  const toReset: { username: string; password: string }[] = [];
  if (userSpec === 'superadmin' || userSpec === 'admin') {
    toReset.push({
      username: userSpec,
      password: newPassword || DEFAULT_PASSWORDS[userSpec],
    });
  } else {
    toReset.push(
      { username: 'superadmin', password: newPassword || DEFAULT_PASSWORDS.superadmin },
      { username: 'admin', password: newPassword || DEFAULT_PASSWORDS.admin },
    );
  }

  console.log('🔐 Resetting admin password(s)...');

  for (const { username, password } of toReset) {
    const user = await prisma.users.findUnique({
      where: { username },
    });
    if (!user) {
      console.log(`⚠️  User "${username}" not found. Run: npm run seed:users`);
      continue;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.users.update({
      where: { username },
      data: { password_hash: passwordHash },
    });
    console.log(`✅ ${username}: password reset (use the password you set, or default: ${DEFAULT_PASSWORDS[username] ?? 'see script'})`);
  }

  console.log('✅ Done. Try logging in again.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
