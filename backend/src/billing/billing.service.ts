import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ACTIVITY_NAMES, billedUnits, withDives } from '../config/catalogue.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  BookingStatus,
  InvoiceStatus,
  NumberSeries,
  PaymentMethod,
  PaymentStatus,
  StayStatus,
} from '../generated/prisma/enums.js';
import { bonoDiscount, releaseBonos, useBonos } from '../bonos/bono-rules.js';
import { MailerService } from '../mail/mailer.service.js';
import { addOnLines, bookingEquipmentLines, bookingUnitPrice, pricesFor } from './price-lines.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PricingService } from '../settings/pricing.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { centerYear } from '../financial/center-day.js';
import { nextNumber } from '../tenant/numbering.js';
import { TenantConfig, type CenterConfig } from '../tenant/tenant-config.service.js';
import { requireTenantId } from '../tenant/tenant-context.js';
import { AddPaymentDto } from './dto/add-payment.dto.js';
import { AddRefundDto } from './dto/add-refund.dto.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import { EmailInvoiceDto } from './dto/email-invoice.dto.js';
import { InvoiceItemDto } from './dto/invoice-item.dto.js';
import { UpdateInvoiceDto } from './dto/update-invoice.dto.js';

// All money arithmetic uses Decimal, never JavaScript floats.
const D = Prisma.Decimal;
type Decimal = Prisma.Decimal;
type Money = Decimal | number | string;
export type Tx = Prisma.TransactionClient;

// A stay's partner bookings: their activity is the partner's to pay, on a
// partner invoice, so the customer's invoice leaves it out.
const PARTNER_BOOKINGS = {
  select: {
    bookings: {
      where: { partnerId: { not: null } },
      select: {
        id: true,
        date: true,
        activityType: true,
        participantCount: true,
        numberOfDives: true,
        pricePerDiver: true,
        partner: { select: { id: true, name: true } },
        partnerInvoice: { select: { id: true, invoiceNumber: true } },
        customer: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
    },
  },
} satisfies Prisma.StayDefaultArgs;

const LIST_INCLUDE = {
  customer: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { items: true, payments: true } },
  stay: { select: { bookings: { where: { partnerId: { not: null } }, select: { partner: { select: { id: true, name: true } } } } } },
  payments: { where: { status: PaymentStatus.SUCCEEDED }, select: { method: true } },
} satisfies Prisma.InvoiceInclude;

const DETAIL_INCLUDE = {
  // Contact details for the "Bill to" block of the invoice document.
  customer: {
    select: { id: true, firstName: true, lastName: true, phone: true, country: true, user: { select: { email: true } } },
  },
  items: true,
  payments: { include: { refunds: { orderBy: { processedAt: 'asc' } } }, orderBy: { createdAt: 'asc' } },
  stay: PARTNER_BOOKINGS,
} satisfies Prisma.InvoiceInclude;

type PaymentWithRefunds = { status: PaymentStatus; amount: Decimal; refunds: { amount: Decimal }[] };

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly pricing: PricingService,
    private readonly config: TenantConfig,
    private readonly mailer: MailerService,
  ) {}

  // Each with who pays: the customer, plus the partners who pay some of the
  // stay's activities; and how the customer paid (succeeded payments).
  async findAll(filters: { status?: InvoiceStatus; customerId?: string } = {}) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        ...(filters.status && { status: filters.status }),
        ...(filters.customerId && { customerId: filters.customerId }),
      },
      include: LIST_INCLUDE,
      orderBy: { invoiceNumber: 'desc' },
    });
    return invoices.map(({ stay, payments, ...invoice }) => ({
      ...invoice,
      partners: [...new Map((stay?.bookings ?? []).map((b) => [b.partner!.id, b.partner!])).values()],
      paymentMethods: [...new Set(payments.map((p) => p.method))],
    }));
  }

  async findOne(id: string) {
    const found = await this.prisma.invoice.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!found) throw new NotFoundException(`Invoice ${id} not found`);
    const { stay, ...invoice } = found;
    const amountPaid = netPaid(invoice.payments);
    return {
      ...invoice,
      amountPaid: amountPaid.toFixed(2),
      balance: new D(invoice.total).minus(amountPaid).toFixed(2),
      partnerSplit: await this.partnerSplit(stay?.bookings ?? []),
    };
  }

  // Who pays what for a stay invoice: the customer pays the invoice; each
  // partner pays its bookings' activities, at the prices locked on them,
  // before its commission and tax, on its partner invoice. Empty without
  // partner bookings.
  private async partnerSplit(bookings: Prisma.StayGetPayload<typeof PARTNER_BOOKINGS>['bookings']) {
    if (bookings.length === 0) return [];
    const prices = await this.pricing.current();
    const byPartner = new Map<string, { partner: { id: string; name: string }; bookings: typeof bookings; total: Decimal }>();
    for (const b of bookings) {
      const unit = bookingUnitPrice(prices, b);
      const entry = byPartner.get(b.partner!.id) ?? { partner: b.partner!, bookings: [], total: new D(0) };
      entry.bookings.push(b);
      if (unit !== null) entry.total = entry.total.plus(new D(unit).times(billedUnits(b)));
      byPartner.set(b.partner!.id, entry);
    }
    return [...byPartner.values()].map(({ partner, bookings: own, total }) => ({
      partner,
      total: total.toFixed(2),
      bookings: own.map((b) => {
        const unit = bookingUnitPrice(prices, b);
        return {
          id: b.id,
          date: b.date.toISOString().slice(0, 10),
          activity: withDives(b),
          activityType: b.activityType,
          numberOfDives: b.numberOfDives,
          customerName: `${b.customer.firstName} ${b.customer.lastName}`,
          total: unit === null ? null : new D(unit).times(billedUnits(b)).toFixed(2),
          partnerInvoice: b.partnerInvoice,
        };
      }),
    }));
  }

  // Builds the invoice from the booking and the server-side price list: one
  // line for the activity (price x participants), one per equipment item from
  // a guest booking's notes (the full package when all five are chosen), the
  // tax from the settings on the subtotal, due on the dive date. A price in the notes is ignored:
  // the guest's browser calculated it.
  async createFromBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        customerId: true,
        activityType: true,
        participantCount: true,
        numberOfDives: true,
        date: true,
        status: true,
        notes: true,
        bonoId: true,
        bono: { select: { code: true, type: true, discountValue: true } },
        addOns: true,
        pricePerDiver: true,
        equipmentPrice: true,
        addOnPrices: true,
        funDiveTiers: true,
        invoice: { select: { id: true, invoiceNumber: true } },
        stayId: true,
        partner: { select: { name: true } },
      },
    });
    if (!booking) throw new NotFoundException(`Booking ${bookingId} not found`);
    if (booking.invoice) {
      throw new ConflictException(`This booking already has invoice ${booking.invoice.invoiceNumber}`);
    }
    if (booking.stayId) {
      throw new ConflictException('This booking is billed with its stay; see Stays');
    }
    if (booking.partner) {
      throw new ConflictException(
        `${booking.partner.name} pays this booking's activity (partner invoice); bill any equipment with the customer's stay`,
      );
    }
    if (booking.status === BookingStatus.CANCELLED) {
      throw new ConflictException('Cancelled bookings cannot be invoiced');
    }

    // The prices locked on the booking when it was made; the current price
    // list for a booking from before prices were locked.
    const prices = pricesFor(await this.pricing.current(), booking);
    const unitPrice = bookingUnitPrice(prices, booking);
    if (unitPrice === null) {
      throw new UnprocessableEntityException(
        `No price is set for ${ACTIVITY_NAMES[booking.activityType]}; set it in Settings → Pricing`,
      );
    }

    const items: InvoiceItemDto[] = [
      {
        description: withDives(booking),
        quantity: billedUnits(booking),
        unitPrice,
        total: new D(unitPrice).times(billedUnits(booking)).toNumber(),
        type: 'activity',
      },
      ...bookingEquipmentLines(prices, booking),
      ...addOnLines(booking, prices),
    ];
    const subtotal = sum(items.map((i) => i.total));
    // A government bono takes its discount off the activity; tax is on what
    // remains.
    const discount = booking.bono ? bonoDiscount(booking.bono, items[0].total) : new D(0);
    const { taxRate } = await this.settings.tax();
    const tax = subtotal.minus(discount).times(taxRate).dividedBy(100).toDecimalPlaces(2, D.ROUND_HALF_UP);

    return this.insert(
      {
        bookingId,
        customerId: booking.customerId,
        subtotal: subtotal.toNumber(),
        tax: tax.toNumber(),
        discount: discount.toNumber(),
        total: subtotal.minus(discount).plus(tax).toNumber(),
        dueDate: booking.date.toISOString(),
        items,
      },
      async (tx) => {
        if (!booking.bonoId) return;
        await useBonos(tx, [booking.bonoId]);
        await tx.booking.update({ where: { id: bookingId }, data: { bonoUsed: true } });
      },
    );
  }

  create(dto: CreateInvoiceDto) {
    return this.insert(dto);
  }

  // Creates the invoice; `alongside` runs in the same transaction.
  private async insert(dto: CreateInvoiceDto, alongside?: (tx: Tx) => Promise<void>) {
    const { items, ...fields } = dto;
    assertAmounts(fields.subtotal, fields.tax, fields.discount ?? 0, fields.total, items);
    const config = await this.config.get();
    try {
      const { id } = await this.prisma.$transaction(async (tx) => {
        await assertBookingCustomer(tx, fields.bookingId, fields.customerId);
        await alongside?.(tx);
        const invoiceNumber = await nextInvoiceNumber(tx, config);
        return tx.invoice.create({
          data: {
            ...fields,
            // Invoices are in the center's currency unless one is given.
            currency: fields.currency ?? config.currency,
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
          if (current.stayId) {
            throw new ConflictException("A stay invoice's booking and customer cannot be changed");
          }
          await assertBookingCustomer(
            tx,
            fields.bookingId ?? current.bookingId!,
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

  // A stay's invoice, inside the stays service's transaction (which holds the
  // customer's stay lock). Tax from the settings on the subtotal, due today.
  // `discount`: the stay's government bono discounts (see stays.service).
  async createStayInvoice(
    tx: Tx,
    data: { stayId: string; customerId: string; items: InvoiceItemDto[]; discount: Prisma.Decimal },
  ) {
    const subtotal = sum(data.items.map((i) => i.total));
    const { taxRate } = await this.settings.tax();
    const tax = subtotal.minus(data.discount).times(taxRate).dividedBy(100).toDecimalPlaces(2, D.ROUND_HALF_UP);
    const total = subtotal.minus(data.discount).plus(tax);
    assertAmounts(subtotal, tax, data.discount, total, data.items);
    const config = await this.config.get();
    const invoiceNumber = await nextInvoiceNumber(tx, config);
    return tx.invoice.create({
      data: {
        invoiceNumber,
        currency: config.currency,
        stayId: data.stayId,
        customerId: data.customerId,
        subtotal,
        tax,
        discount: data.discount,
        total,
        dueDate: new Date(),
        items: { create: data.items.map(itemData) },
      },
      select: { id: true, invoiceNumber: true },
    });
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
      // The bonos it used can be used again.
      const used = await tx.booking.findMany({
        where: { bonoUsed: true, ...(invoice.stayId ? { stayId: invoice.stayId } : { invoice: { is: { id } } }) },
        select: { id: true, bonoId: true },
      });
      await releaseBonos(tx, used.map((b) => b.bonoId));
      await tx.booking.updateMany({ where: { id: { in: used.map((b) => b.id) } }, data: { bonoUsed: false } });
      // The stay is open again, with the same bookings and costs, to be
      // corrected and billed on a new invoice.
      if (invoice.stayId) await reopenStay(tx, invoice.stayId, invoice.customerId);
    });
    return this.findOne(id);
  }

  // Emails the invoice document (a PDF the backoffice rendered) to the
  // customer's account email. The address is the one on record, never one
  // the caller names.
  async emailInvoice(id: string, dto: EmailInvoiceDto) {
    if (!this.mailer.configured) {
      throw new ServiceUnavailableException('Email is not set up on this server (SMTP_URL); download the PDF and send it yourself');
    }
    const invoice = await this.findOne(id);
    const to = invoice.customer.user.email;
    const pdf = Buffer.from(dto.pdf, 'base64');
    if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') throw new BadRequestException('pdf must be a PDF document');
    const center = (await this.settings.get()).name || 'the dive center';
    const sent = await this.mailer.send({
      to,
      subject: `Invoice ${invoice.invoiceNumber} from ${center}`,
      text: [
        `Hello ${invoice.customer.firstName},`,
        '',
        `Please find attached invoice ${invoice.invoiceNumber} from ${center}.`,
        '',
        'Thank you for diving with us!',
      ].join('\n'),
      attachments: [{ filename: dto.filename, content: pdf, contentType: 'application/pdf' }],
    });
    if (!sent) throw new ServiceUnavailableException('The email could not be sent; try again later');
    return { sent: true, to };
  }
}

// A customer has at most one open stay: one opened since this stay was billed
// is merged into it.
async function reopenStay(tx: Tx, stayId: string, customerId: string) {
  await lockCustomerStays(tx, customerId);
  const other = await tx.stay.findFirst({
    where: { customerId, status: StayStatus.OPEN, id: { not: stayId } },
    select: { id: true },
  });
  if (other) {
    await tx.stayCost.updateMany({ where: { stayId: other.id }, data: { stayId } });
    await tx.booking.updateMany({ where: { stayId: other.id }, data: { stayId } });
    await tx.stay.delete({ where: { id: other.id } });
  }
  await tx.stay.update({ where: { id: stayId }, data: { status: StayStatus.OPEN, billedAt: null } });
}

// Serialises changes to one customer's stays (opening, billing, reopening).
// Customer ids are unique across tenants, so the key needs no tenant.
export async function lockCustomerStays(tx: Tx, customerId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('stay'), hashtext(${customerId}))`;
}

// Locks the invoice row so payments, refunds and edits on the same invoice are
// applied one after the other; two payments at once cannot both pass the
// outstanding-balance check.
async function lockInvoice(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Invoice" WHERE id = ${id} AND "tenantId" = ${requireTenantId()} FOR UPDATE`;
  if (rows.length === 0) throw new NotFoundException(`Invoice ${id} not found`);
  return tx.invoice.findUniqueOrThrow({ where: { id } });
}

// Numbers run INV-YYYY-0001 (the tenant's prefix) per tenant and calendar
// year of creation at the center: each center is its own issuer with its own
// gap-free series. Taken inside the same transaction as the insert, so a
// failed create gives its number back.
async function nextInvoiceNumber(tx: Tx, config: CenterConfig) {
  const year = centerYear(config.timeZone);
  const n = await nextNumber(tx, NumberSeries.INVOICE, year);
  return `${config.invoicePrefix}-${year}-${String(n).padStart(4, '0')}`;
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
