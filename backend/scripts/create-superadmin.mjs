// Creates the platform's superadmin, or makes an existing account one.
// Part of a new deployment: run it once, before the site is opened.
//
//   SUPERADMIN_PASSWORD='…' node scripts/create-superadmin.mjs admin@example.com "Platform Admin"
//
// In Docker:
//   docker compose run --rm -e SUPERADMIN_PASSWORD='…' backend \
//     node scripts/create-superadmin.mjs admin@example.com "Platform Admin"
//
// Uses DATABASE_URL. Users are global (no row-level security on them), so the
// app's own role can do this. The password comes from the environment, not
// the command line, so it stays out of shell history and process lists.

import bcrypt from 'bcrypt';
import pg from 'pg';

const [email, name] = process.argv.slice(2);
const password = process.env.SUPERADMIN_PASSWORD ?? '';
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: SUPERADMIN_PASSWORD=… node scripts/create-superadmin.mjs <email> [name]');
  process.exit(1);
}
if (password.length < 12 || password.length > 72) {
  console.error('SUPERADMIN_PASSWORD must be 12 to 72 characters');
  process.exit(1);
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL.split('?')[0] });
await db.connect();
try {
  const passwordHash = await bcrypt.hash(password, 12);
  const { rows } = await db.query(
    `INSERT INTO "User" (id, email, "passwordHash", name, role, "isSuperadmin", "updatedAt")
     VALUES (gen_random_uuid(), lower($1), $2, $3, 'ADMIN', true, now())
     ON CONFLICT (email) DO UPDATE SET "isSuperadmin" = true, "passwordHash" = EXCLUDED."passwordHash", "updatedAt" = now()
     RETURNING id, (xmax = 0) AS created`,
    [email, passwordHash, name ?? null],
  );
  console.log(`${rows[0].created ? 'Created' : 'Updated'} superadmin ${email.toLowerCase()}. Sign in at the platform address (admin.<domain>).`);
} finally {
  await db.end();
}
