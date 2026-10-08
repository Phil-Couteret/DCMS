import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';

type Db = Pick<Prisma.TransactionClient, 'location'>;

// A locationId given by a client must be one of the tenant's locations (the
// query is tenant-filtered; the database's same-tenant trigger is the
// backstop). null and undefined pass: unassigned, or left as it is.
export async function assertLocation(db: Db, locationId: string | null | undefined) {
  if (!locationId) return;
  const found = await db.location.findUnique({ where: { id: locationId }, select: { id: true } });
  if (!found) throw new BadRequestException('Unknown location');
}
