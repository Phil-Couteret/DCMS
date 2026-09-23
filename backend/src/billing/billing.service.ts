import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import {
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddPaymentDto } from './dto/add-payment.dto.js';
import { AddRefundDto } from './dto/add-refund.dto.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import { InvoiceItemDto } from './dto/invoice-item.dto.js';
import { UpdateInvoiceDto } from './dto/update-invoice.dto.js';

// All money arithmetic uses Decimal, never JavaScript floats.
const D = Prisma.Decimal;
type Decimal = Prisma.Decimal;
type Money = Decimal | number | string;
type Tx = Prisma.TransactionClient;

const LIST_INCLUDE = {
  customer: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { items: true, payments: true } },
} satisfies Prisma.InvoiceInclude;

const DETAIL_INCLUDE = {
  customer: { select: { id: true, firstName: true, lastName: true } },
  items: true,
  payments: { include: { refunds: { orderBy: { processedAt: 'asc' } } }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.InvoiceInclude;

type PaymentWithRefunds = { status: PaymentStatus; amount: Decimal; refunds: { amount: Decimal }[] };

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: { status?: InvoiceStatus; customerId?: string } = {}) {
    return this.prisma.invoice.findMany({
      where: {
        ...(filters.status && { status: filters.status }),
        ...(filters.customerId && { customerId: filters.customerId }),
      },
      include: LIST_INCLUDE,
      orderBy: { invoiceNumber: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    const amountPaid = netPaid(invoice.payments);
    return {
      ...invoice,
      amountPaid: amountPaid.toFixed(2),
      balance: new D(invoice.total).minus(amountPaid).toFixed(2),
    };
  }

  async create(dto: CreateInvoiceDto) {
    const { items, ...fields } = dto;
    assertAmounts(fields.subtotal, fields.tax, fields.discount ?? 0, fields.total, items);
    try {
      const { id } = await this.prisma.$transaction(async (tx) => {
        await assertBookingCustomer(tx, fields.bookingId, fields.customerId);
        const invoiceNumber = await nextInvoiceNumber(tx, new Date().getUTCFullYear());
        return tx.invoice.create({
          data: {
            ...fields,
            invoiceNumber,
            dueDate: new Date(fields.dueDate),
            items: { create: items.map(itemData) },
          },
          select: { id: true },
        });
      });
      return this.findOne(id);
    } catch (e) {
      throw mapError(e);
    }
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const { items, ...fields } = dto;
    try {
      await this.prisma.$transaction(async (tx) => {
        const current = await lockInvoice(tx, id);
        if (current.status !== InvoiceStatus.DRAFT) {
          throw new ConflictException(`Only DRAFT invoices can be edited; this one is ${current.status}`);
        }
        const currentItems = await tx.invoiceItem.findMany({ where: { invoiceId: id } });
        assertAmounts(
          fields.subtotal ?? current.subtotal,
          fields.tax ?? current.tax,
          fields.discount ?? current.discount,
          fields.total ?? current.total,
          items ?? currentItems,
        );
        if (fields.bookingId || fields.customerId) {
          await assertBookingCustomer(
            tx,
            fields.bookingId ?? current.bookingId,
            fields.customerId ?? current.customerId,
          );
        }
        await tx.invoice.update({
          where: { id },
          data: {
            ...fields,
            ...(fields.dueDate !== undefined && { dueDate: new Date(fields.dueDate) }),
            ...(items && { items: { deleteMany: {}, create: items.map(itemData) } }),
          },
        });
      });
      return this.findOne(id);
    } catch (e) {
      throw mapError(e);
    }
  }

  async addPayment(invoiceId: string, dto: AddPaymentDto) {
    const status =
      dto.status ?? (dto.method === PaymentMethod.CARD ? PaymentStatus.PENDING : PaymentStatus.SUCCEEDED);
    const paidAt = dto.paidAt
      ? new Date(dto.paidAt)
      : status === PaymentStatus.SUCCEEDED
        ? new Date()
        : undefined;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const invoice = await lockInvoice(tx, invoiceId);
        if (invoice.status === InvoiceStatus.CANCELLED || invoice.status === InvoiceStatus.PAID) {
          throw new ConflictException(`Cannot add a payment to a ${invoice.status} invoice`);
        }
        const currency = dto.currency ?? invoice.currency;
        if (currency !== invoice.currency) {
          throw new BadRequestException(`Payment currency must be ${invoice.currency}`);
        }
        if (status === PaymentStatus.SUCCEEDED) {
          const outstanding = new D(invoice.total).minus(await paidOn(tx, invoiceId));
          if (new D(dto.amount).greaterThan(outstanding)) {
            throw new BadRequestException(
              `Payment of ${new D(dto.amount).toFixed(2)} exceeds the outstanding ${outstanding.toFixed(2)}`,
            );
          }
        }
        const payment = await tx.payment.create({
          data: { ...dto, invoiceId, currency, status, paidAt },
        });
        await syncInvoiceStatus(tx, invoiceId);
        return payment;
      });
    } catch (e) {
      throw mapError(e);
    }
  }

  async addRefund(invoiceId: string, paymentId: string, dto: AddRefundDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await lockInvoice(tx, invoiceId);
        const payment = await tx.payment.findFirst({
          where: { id: paymentId, invoiceId },
          include: { refunds: { select: { amount: true } } },
        });
        if (!payment) throw new NotFoundException(`Payment ${paymentId} not found on this invoice`);
        if (payment.status !== PaymentStatus.SUCCEEDED) {
          throw new ConflictException(`Only SUCCEEDED payments can be refunded; this one is ${payment.status}`);
        }
        const refundable = new D(payment.amount).minus(sum(payment.refunds.map((r) => r.amount)));
        if (new D(dto.amount).greaterThan(refundable)) {
          throw new BadRequestException(
            `Refund of ${new D(dto.amount).toFixed(2)} exceeds the refundable ${refundable.toFixed(2)}`,
          );
        }
        const refund = await tx.refund.create({ data: { ...dto, paymentId } });
        await syncInvoiceStatus(tx, invoiceId);
        return refund;
      });
    } catch (e) {
      throw mapError(e);
    }
  }

  async cancel(id: string) {
    await this.prisma.$transaction(async (tx) => {
      const invoice = await lockInvoice(tx, id);
      if (invoice.status === InvoiceStatus.CANCELLED) return;
      const succeeded = await tx.payment.count({
        where: { invoiceId: id, status: PaymentStatus.SUCCEEDED },
      });
      if (succeeded > 0) {
        throw new ConflictException('Invoices with succeeded payments cannot be cancelled');
      }
      await tx.invoice.update({ where: { id }, data: { status: InvoiceStatus.CANCELLED } });
    });
    return this.findOne(id);
  }
}

// Locks the invoice row so payments, refunds and edits on the same invoice are
// applied one after the other; two payments at once cannot both pass the
// outstanding-balance check.
async function lockInvoice(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Invoice" WHERE id = ${id} FOR UPDATE`;
  if (rows.length === 0) throw new NotFoundException(`Invoice ${id} not found`);
  return tx.invoice.findUniqueOrThrow({ where: { id } });
}

// Numbers run INV-YYYY-0001 per calendar year of creation. The per-year lock
// serialises concurrent creates, and the number is taken inside the same
// transaction as the insert, so a failed create leaves no gap.
async function nextInvoiceNumber(tx: Tx, year: number) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('invoice_number'), ${year}::int)`;
  const [{ max }] = await tx.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST(split_part("invoiceNumber", '-', 3) AS int)) AS max
    FROM "Invoice" WHERE "invoiceNumber" LIKE ${`INV-${year}-%`}`;
  return `INV-${year}-${String((max ?? 0) + 1).padStart(4, '0')}`;
}

// Paid = SUCCEEDED payments minus their refunds. PAID when it covers the
// total, PARTIAL when above zero, back to SENT when refunds bring it to zero.
async function syncInvoiceStatus(tx: Tx, invoiceId: string) {
  const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const paid = await paidOn(tx, invoiceId);
  let status: InvoiceStatus = invoice.status;
  if (paid.greaterThanOrEqualTo(invoice.total) && paid.greaterThan(0)) status = InvoiceStatus.PAID;
  else if (paid.greaterThan(0)) status = InvoiceStatus.PARTIAL;
  else if (status === InvoiceStatus.PAID || status === InvoiceStatus.PARTIAL) status = InvoiceStatus.SENT;
  if (status !== invoice.status) {
    await tx.invoice.update({ where: { id: invoiceId }, data: { status } });
  }
}

async function paidOn(tx: Tx, invoiceId: string) {
  const payments = await tx.payment.findMany({
    where: { invoiceId },
    select: { status: true, amount: true, refunds: { select: { amount: true } } },
  });
  return netPaid(payments);
}

function netPaid(payments: PaymentWithRefunds[]) {
  return sum(
    payments
      .filter((p) => p.status === PaymentStatus.SUCCEEDED)
      .map((p) => new D(p.amount).minus(sum(p.refunds.map((r) => r.amount)))),
  );
}

function sum(values: Money[]) {
  return values.reduce<Decimal>((acc, v) => acc.plus(v), new D(0));
}

type ItemAmounts = Pick<InvoiceItemDto, 'quantity'> & { unitPrice: Money; total: Money };

function assertAmounts(subtotal: Money, tax: Money, discount: Money, total: Money, items: ItemAmounts[]) {
  items.forEach((item, i) => {
    const expected = new D(item.unitPrice).times(item.quantity ?? 1);
    if (!expected.equals(item.total)) {
      throw new BadRequestException(
        `items[${i}].total must equal quantity x unitPrice: expected ${expected.toFixed(2)}, got ${new D(item.total).toFixed(2)}`,
      );
    }
  });
  const itemsTotal = sum(items.map((item) => item.total));
  if (!itemsTotal.equals(subtotal)) {
    throw new BadRequestException(
      `subtotal must equal the sum of item totals: expected ${itemsTotal.toFixed(2)}, got ${new D(subtotal).toFixed(2)}`,
    );
  }
  const expectedTotal = new D(subtotal).plus(tax).minus(discount);
  if (!expectedTotal.equals(total)) {
    throw new BadRequestException(
      `total must equal subtotal + tax - discount: expected ${expectedTotal.toFixed(2)}, got ${new D(total).toFixed(2)}`,
    );
  }
}

async function assertBookingCustomer(tx: Tx, bookingId: string, customerId: string) {
  const booking = await tx.booking.findUnique({ where: { id: bookingId }, select: { customerId: true } });
  if (!booking) throw new BadRequestException('bookingId does not match an existing booking');
  if (booking.customerId !== customerId) {
    throw new BadRequestException("customerId must be the booking's customer");
  }
}

function itemData(item: InvoiceItemDto) {
  return { ...item, quantity: item.quantity ?? 1 };
}

function mapError(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    const target = String(e.meta?.target ?? e.meta?.constraint ?? e.message);
    if (target.includes('bookingId')) return new ConflictException('This booking already has an invoice');
    if (target.includes('stripePaymentId')) return new ConflictException('This Stripe payment is already recorded');
    if (target.includes('stripeRefundId')) return new ConflictException('This Stripe refund is already recorded');
    return new ConflictException('A record with these unique values already exists');
  }
  return e;
}
