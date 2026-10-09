import { randomUUID } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client.js';
import { Role } from '../generated/prisma/enums.js';

// Which login a person has. Staff and platform accounts are global
// (tenantId null); customer accounts belong to one tenant, the company, and
// serve all its locations. The same email may therefore have a staff login
// and a customer login at each company that has it as a customer: they are
// separate accounts with separate passwords.

type Db = Pick<Prisma.TransactionClient, 'user' | 'membership'>;

// The global (staff or platform) account with this email.
export function globalAccount<S extends Prisma.UserSelect>(db: Pick<Db, 'user'>, email: string, select: S) {
  return db.user.findFirst({ where: { email, tenantId: null }, select });
}

// This tenant's customer account with this email.
export function customerAccount<S extends Prisma.UserSelect>(db: Pick<Db, 'user'>, tenantId: string, email: string, select: S) {
  return db.user.findFirst({ where: { email, tenantId }, select });
}

// The account a customer of this tenant with this email is linked to: the
// tenant's customer account if it exists; otherwise, for someone who works
// at this tenant, their staff account (their own customer profile at their
// center); otherwise a new customer account of the tenant, which cannot be
// signed in to until a password is set (a random UUID never matches a bcrypt
// hash), as for guest bookings.
export async function accountForCustomer(db: Db, tenantId: string, email: string) {
  const own = await customerAccount(db, tenantId, email, { id: true });
  if (own) return own.id;
  const staff = await globalAccount(db, email, { id: true, memberships: { where: { tenantId }, select: { id: true } } });
  if (staff && staff.memberships.length > 0) return staff.id;
  const created = await db.user.create({
    data: { email, passwordHash: randomUUID(), role: Role.CUSTOMER, tenantId },
    select: { id: true },
  });
  return created.id;
}
