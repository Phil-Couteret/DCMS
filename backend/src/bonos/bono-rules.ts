import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { BonoType } from '../generated/prisma/enums.js';

// Government bonos: which code a booking may use, the discount it gives, and
// counting its uses. A bono discounts the activity of the booking it is on
// (not equipment hire); it is used, and counted, when that booking is
// invoiced, on its own or with its stay. Cancelling the invoice gives the use
// back.

type Tx = Prisma.TransactionClient;
const D = Prisma.Decimal;
type Decimal = Prisma.Decimal;

export interface BonoTerms {
  code: string;
  type: BonoType;
  discountValue: Prisma.Decimal | string | number;
}

// The discount on an activity amount: a percentage of it (rounded to the
// cent), or a fixed amount up to the whole of it.
export function bonoDiscount(bono: BonoTerms, amount: Decimal | number): Decimal {
  const base = new D(amount);
  if (base.lte(0)) return new D(0);
  if (bono.type === BonoType.PERCENTAGE) {
    return base.times(bono.discountValue).dividedBy(100).toDecimalPlaces(2, D.ROUND_HALF_UP);
  }
  return D.min(base, new D(bono.discountValue));
}

// The bono a code names, if it can go on a booking on that date: active,
// valid on the date, and not used up. Codes are not case-sensitive.
export async function usableBono(tx: Tx, code: string, bookingDate: Date) {
  const bono = await tx.governmentBono.findFirst({ where: { code: code.trim().toUpperCase() } });
  if (!bono) throw new BadRequestException(`There is no bono with the code ${code.trim().toUpperCase()}`);
  if (!bono.isActive) throw new BadRequestException(`Bono ${bono.code} is not active`);
  if (bookingDate < bono.validFrom || (bono.validTo && bookingDate > bono.validTo)) {
    const until = bono.validTo ? ` to ${day(bono.validTo)}` : '';
    throw new BadRequestException(`Bono ${bono.code} is valid from ${day(bono.validFrom)}${until}, not on ${day(bookingDate)}`);
  }
  if (bono.usageLimit !== null && bono.usageCount >= bono.usageLimit) {
    throw new BadRequestException(`Bono ${bono.code} has been used ${bono.usageLimit} times, its limit`);
  }
  return bono;
}

// Counts one use of each booking's bono, refusing when that would pass a
// bono's limit (checked in the same statement, so two invoices at once
// cannot both take the last use).
export async function useBonos(tx: Tx, bonoIds: (string | null)[]) {
  for (const id of bonoIds) {
    if (!id) continue;
    const counted = await tx.$executeRaw`
      UPDATE "GovernmentBono" SET "usageCount" = "usageCount" + 1, "updatedAt" = now()
      WHERE id = ${id} AND ("usageLimit" IS NULL OR "usageCount" < "usageLimit")`;
    if (counted === 0) {
      const bono = await tx.governmentBono.findUnique({ where: { id }, select: { code: true } });
      throw new ConflictException(
        `Bono ${bono?.code ?? id} has reached its usage limit; remove it from the booking to invoice it`,
      );
    }
  }
}

// Gives back the uses counted by useBonos.
export async function releaseBonos(tx: Tx, bonoIds: (string | null)[]) {
  for (const id of bonoIds) {
    if (!id) continue;
    await tx.$executeRaw`
      UPDATE "GovernmentBono" SET "usageCount" = GREATEST("usageCount" - 1, 0), "updatedAt" = now()
      WHERE id = ${id}`;
  }
}

function day(date: Date) {
  return date.toISOString().slice(0, 10);
}
