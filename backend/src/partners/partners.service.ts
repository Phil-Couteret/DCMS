import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { ACTIVITY_NAMES, type PriceList } from '../config/catalogue.js';
import { addDays, centerToday, dateOnly } from '../financial/center-day.js';
import { Prisma } from '../generated/prisma/client.js';
import { BookingStatus, NumberSeries, PartnerInvoiceStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { nextNumber } from '../tenant/numbering.js';
import { TenantConfig } from '../tenant/tenant-config.service.js';
import { PricingService } from '../settings/pricing.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { runUnscoped } from '../tenant/tenant-context.js';
import { TenantsService } from '../tenant/tenants.service.js';
import { DUMMY_HASH, newCredentials } from './credentials.js';
import { CreatePartnerDto } from './dto/create-partner.dto.js';
import { PartnerLoginDto } from './dto/partner-login.dto.js';
import { UpdatePartnerDto } from './dto/update-partner.dto.js';

// All money arithmetic uses Decimal, never JavaScript floats.
const D = Prisma.Decimal;
type Decimal = Prisma.Decimal;
type Tx = Prisma.TransactionClient;
type Money = Decimal | number | string;

// Partners pay 30 days after the invoice date.
export const PAYMENT_TERMS_DAYS = 30;

// Bookings a partner is invoiced for: confirmed or done. Pending ones wait,
// cancelled and no-shows are not charged.
export const INVOICEABLE = [BookingStatus.CONFIRMED, BookingStatus.COMPLETED];

// Everything but the secret's hash.
export const PARTNER_SELECT = {
  id: true,
  name: true,
  companyName: true,
  contactEmail: true,
  contactPhone: true,
  commissionRate: true,
  isActive: true,
  apiKey: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PartnerSelect;

const BOOKING_SELECT = {
  id: true,
  date: true,
  timeSlot: true,
  activityType: true,
  participantCount: true,
  status: true,
  customer: { select: { firstName: true, lastName: true } },
} satisfies Prisma.BookingSelect;

type ValuedBooking = Prisma.BookingGetPayload<{ select: typeof BOOKING_SELECT }>;

const money = (v: Decimal | number) => new D(v).toFixed(2);
const sum = (values: Decimal[]) => values.reduce<Decimal>((acc, v) => acc.plus(v), new D(0));
const round2 = (v: Decimal) => v.toDecimalPlaces(2, D.ROUND_HALF_UP);

function shortDay(d: Date) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

// A booking's catalogue value: the activity price for each diver. Equipment
// is the customer's to pay and is billed with their stay.
export function valueBooking(b: ValuedBooking, prices: PriceList) {
  const unit = prices.activities[b.activityType];
  return {
    booking: b,
    unitPrice: unit === null ? null : new D(unit),
    total: unit === null ? null : new D(unit).times(b.participantCount),
  };
}

// gross → commission → amount due → tax → total, each rounded to cents.
export function partnerAmounts(gross: Decimal, commissionRate: Money, taxRate: Money) {
  const commission = round2(gross.times(commissionRate).dividedBy(100));
  const subtotal = gross.minus(commission);
  const tax = round2(subtotal.times(taxRate).dividedBy(100));
  return { gross, commission, subtotal, tax, total: subtotal.plus(tax) };
}

function assertRange(from: string, to: string) {
  if (from > to) throw new BadRequestException('from must not be after to');
}

@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly pricing: PricingService,
    private readonly jwt: JwtService,
    private readonly tenants: TenantsService,
    private readonly config: TenantConfig,
  ) {}

  // --- Partner accounts ---

  async findAll() {
    const partners = await this.prisma.partner.findMany({
      select: { ...PARTNER_SELECT, _count: { select: { bookings: true, customers: true } } },
      orderBy: { name: 'asc' },
    });
    const owed = await this.prisma.partnerInvoice.groupBy({
      by: ['partnerId'],
      where: { status: { not: PartnerInvoiceStatus.CANCELLED } },
      _sum: { total: true, paidAmount: true },
    });
    return partners.map((p) => {
      const o = owed.find((x) => x.partnerId === p.id);
      const outstanding = new D(o?._sum.total ?? 0).minus(o?._sum.paidAmount ?? 0);
      return { ...p, outstanding: money(outstanding) };
    });
  }

  async findOne(id: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      select: { ...PARTNER_SELECT, _count: { select: { bookings: true, customers: true, invoices: true } } },
    });
    if (!partner) throw new NotFoundException(`Partner ${id} not found`);
    return partner;
  }

  // The secret is in this response only.
  async create(dto: CreatePartnerDto) {
    const { apiKey, apiSecret, apiSecretHash } = await newCredentials();
    try {
      const partner = await this.prisma.partner.create({
        data: { ...clean(dto), contactEmail: dto.contactEmail.toLowerCase(), apiKey, apiSecretHash },
        select: PARTNER_SELECT,
      });
      return { partner, apiKey, apiSecret };
    } catch (e) {
      throw mapError(e);
    }
  }

  async update(id: string, dto: UpdatePartnerDto) {
    await this.findOne(id);
    try {
      return await this.prisma.partner.update({
        where: { id },
        data: { ...clean(dto), ...(dto.contactEmail && { contactEmail: dto.contactEmail.toLowerCase() }) },
        select: PARTNER_SELECT,
      });
    } catch (e) {
      throw mapError(e);
    }
  }

  // New key and secret; the old ones stop working at once.
  async regenerateCredentials(id: string) {
    await this.findOne(id);
    const { apiKey, apiSecret, apiSecretHash } = await newCredentials();
    await this.prisma.partner.update({ where: { id }, data: { apiKey, apiSecretHash } });
    return { apiKey, apiSecret };
  }

  // Only a partner with no history can be deleted; others are deactivated.
  async remove(id: string) {
    const partner = await this.findOne(id);
    const { bookings, customers, invoices } = partner._count;
    if (bookings + customers + invoices > 0) {
      throw new ConflictException('This partner has bookings, customers or invoices; deactivate it instead');
    }
    await this.prisma.partner.delete({ where: { id } });
    return partner;
  }

  // --- Portal sign-in ---

  async login(dto: PartnerLoginDto) {
    if (!dto.email === !dto.apiKey) throw new BadRequestException('Give either email or apiKey');
    // An API key is unique across the platform and names its tenant; an
    // email is unique only within a tenant, so it is looked up in the
    // request's tenant.
    const partner = dto.apiKey
      ? await runUnscoped(() => this.prisma.partner.findUnique({ where: { apiKey: dto.apiKey } }))
      : await this.prisma.partner.findFirst({ where: { contactEmail: dto.email!.toLowerCase() } });
    const ok = await bcrypt.compare(dto.apiSecret, partner?.apiSecretHash ?? DUMMY_HASH);
    if (!partner || !ok || !partner.isActive) throw new UnauthorizedException('Invalid credentials');
    await this.tenants.useTokenTenant(partner.tenantId);
    const accessToken = await this.jwt.signAsync({
      sub: partner.id,
      email: partner.contactEmail,
      role: 'PARTNER',
      type: 'partner',
      tenantId: partner.tenantId,
    });
    const { apiSecretHash: _, ...safe } = partner;
    return { partner: safe, center: await this.center(), accessToken };
  }

  // The center a partner works with: its name and slug (its address), and
  // the time zone and currency the portal displays in.
  async center() {
    const [{ timeZone, currency }, row] = await Promise.all([
      this.config.get(),
      this.prisma.centerSettings.findFirst({ select: { name: true, tenant: { select: { slug: true } } } }),
    ]);
    return { name: row?.name ?? '', slug: row?.tenant.slug ?? null, timeZone, currency };
  }

  // --- Partner invoices ---

  // What an invoice for these dates would hold, without creating it.
  async preview(partnerId: string, from: string, to: string) {
    assertRange(from, to);
    const partner = await this.findOne(partnerId);
    const [bookings, waiting, { taxRate, taxName }, prices] = await Promise.all([
      this.invoiceable(this.prisma, partnerId, from, to),
      this.prisma.booking.count({
        where: {
          partnerId,
          partnerInvoiceId: null,
          status: BookingStatus.PENDING,
          date: { gte: dateOnly(from), lte: dateOnly(to) },
        },
      }),
      this.settings.tax(),
      this.pricing.current(),
    ]);
    const valued = bookings.map((b) => valueBooking(b, prices));
    const unpriced = [...new Set(valued.filter((v) => v.total === null).map((v) => ACTIVITY_NAMES[v.booking.activityType]))];
    const amounts = partnerAmounts(sum(valued.map((v) => v.total ?? new D(0))), partner.commissionRate, taxRate);
    return {
      from,
      to,
      taxName,
      taxRate: money(taxRate),
      commissionRate: money(partner.commissionRate),
      pendingBookings: waiting,
      unpriced,
      bookings: valued.map((v) => ({
        id: v.booking.id,
        date: v.booking.date.toISOString().slice(0, 10),
        timeSlot: v.booking.timeSlot,
        activityName: ACTIVITY_NAMES[v.booking.activityType],
        participantCount: v.booking.participantCount,
        status: v.booking.status,
        customerName: `${v.booking.customer.firstName} ${v.booking.customer.lastName}`,
        unitPrice: v.unitPrice && money(v.unitPrice),
        total: v.total && money(v.total),
      })),
      ...Object.fromEntries(Object.entries(amounts).map(([k, v]) => [k, money(v)])),
    };
  }

  async createInvoice(partnerId: string, from: string, to: string, createdBy: string) {
    assertRange(from, to);
    const [{ taxRate, taxName }, prices, config] = await Promise.all([
      this.settings.tax(),
      this.pricing.current(),
      this.config.get(),
    ]);
    const id = await this.prisma.$transaction(async (tx) => {
      // One invoice at a time per partner, so a booking cannot land on two.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('partner_invoice'), hashtext(${partnerId}))`;
      const partner = await tx.partner.findUnique({ where: { id: partnerId }, select: { commissionRate: true } });
      if (!partner) throw new NotFoundException(`Partner ${partnerId} not found`);
      const valued = (await this.invoiceable(tx, partnerId, from, to)).map((b) => valueBooking(b, prices));
      if (valued.length === 0) throw new BadRequestException('No confirmed bookings to invoice in this period');
      const unpriced = valued.filter((v) => v.total === null);
      if (unpriced.length > 0) {
        const names = [...new Set(unpriced.map((v) => ACTIVITY_NAMES[v.booking.activityType]))].join(', ');
        throw new UnprocessableEntityException(`No price is set for ${names}; set it in Settings → Pricing`);
      }
      const amounts = partnerAmounts(sum(valued.map((v) => v.total!)), partner.commissionRate, taxRate);
      const today = centerToday(config.timeZone);
      const invoice = await tx.partnerInvoice.create({
        data: {
          invoiceNumber: await nextPartnerInvoiceNumber(tx, config.partnerInvoicePrefix, Number(today.slice(0, 4))),
          partnerId,
          periodFrom: dateOnly(from),
          periodTo: dateOnly(to),
          dueDate: dateOnly(addDays(today, PAYMENT_TERMS_DAYS)),
          commissionRate: partner.commissionRate,
          taxName,
          taxRate,
          ...amounts,
          createdBy,
          lines: {
            create: valued.map((v) => ({
              bookingId: v.booking.id,
              date: v.booking.date,
              description: `${ACTIVITY_NAMES[v.booking.activityType]} · ${shortDay(v.booking.date)} · ${v.booking.customer.firstName} ${v.booking.customer.lastName}`,
              quantity: v.booking.participantCount,
              unitPrice: v.unitPrice!,
              total: v.total!,
            })),
          },
        },
        select: { id: true },
      });
      await tx.booking.updateMany({
        where: { id: { in: valued.map((v) => v.booking.id) } },
        data: { partnerInvoiceId: invoice.id },
      });
      return invoice.id;
    });
    return this.findInvoice(id);
  }

  findInvoices(filters: { partnerId?: string; status?: PartnerInvoiceStatus } = {}) {
    return this.prisma.partnerInvoice.findMany({
      where: { ...(filters.partnerId && { partnerId: filters.partnerId }), ...(filters.status && { status: filters.status }) },
      include: { partner: { select: { id: true, name: true, companyName: true } } },
      orderBy: { invoiceNumber: 'desc' },
    });
  }

  async findInvoice(id: string, partnerId?: string) {
    const invoice = await this.prisma.partnerInvoice.findUnique({
      where: { id },
      include: {
        partner: { select: { id: true, name: true, companyName: true, contactEmail: true } },
        lines: { orderBy: [{ date: 'asc' }, { description: 'asc' }] },
      },
    });
    // A partner asking for another partner's invoice gets the same 404.
    if (!invoice || (partnerId && invoice.partnerId !== partnerId)) {
      throw new NotFoundException(`Partner invoice ${id} not found`);
    }
    return invoice;
  }

  // Sets the total paid so far, as the previous system did.
  async recordPayment(id: string, paidAmount: number) {
    const invoice = await this.findInvoice(id);
    if (invoice.status === PartnerInvoiceStatus.CANCELLED) throw new ConflictException('This invoice is cancelled');
    const paid = new D(paidAmount);
    if (paid.greaterThan(invoice.total)) {
      throw new BadRequestException(`The amount paid cannot be more than the total of ${money(invoice.total)}`);
    }
    const status = paid.greaterThanOrEqualTo(invoice.total)
      ? PartnerInvoiceStatus.PAID
      : paid.greaterThan(0)
        ? PartnerInvoiceStatus.PARTIAL
        : PartnerInvoiceStatus.PENDING;
    await this.prisma.partnerInvoice.update({
      where: { id },
      data: { paidAmount: paid, status, paidAt: status === PartnerInvoiceStatus.PAID ? new Date() : null },
    });
    return this.findInvoice(id);
  }

  // Frees its bookings to go on a new invoice. Refused once anything is paid.
  async cancelInvoice(id: string) {
    await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.partnerInvoice.findUnique({ where: { id } });
      if (!invoice) throw new NotFoundException(`Partner invoice ${id} not found`);
      if (invoice.status === PartnerInvoiceStatus.CANCELLED) return;
      if (new D(invoice.paidAmount).greaterThan(0)) {
        throw new ConflictException('Invoices with a payment recorded cannot be cancelled; set the amount paid to 0 first');
      }
      await tx.booking.updateMany({ where: { partnerInvoiceId: id }, data: { partnerInvoiceId: null } });
      await tx.partnerInvoice.update({ where: { id }, data: { status: PartnerInvoiceStatus.CANCELLED } });
    });
    return this.findInvoice(id);
  }

  private invoiceable(db: PrismaService | Tx, partnerId: string, from: string, to: string) {
    return db.booking.findMany({
      where: {
        partnerId,
        partnerInvoiceId: null,
        status: { in: INVOICEABLE },
        date: { gte: dateOnly(from), lte: dateOnly(to) },
      },
      select: BOOKING_SELECT,
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
    });
  }
}

// Trims text fields; empty optional ones become null.
function clean<T extends Partial<CreatePartnerDto>>(dto: T) {
  return {
    ...dto,
    ...(dto.name !== undefined && { name: dto.name.trim() }),
    ...(dto.companyName !== undefined && { companyName: dto.companyName.trim() }),
    ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone?.trim() || null }),
    ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
  };
}

// PINV-YYYY-0001 (the tenant's prefix), one gap-free series per tenant and
// calendar year at the center.
async function nextPartnerInvoiceNumber(tx: Tx, prefix: string, year: number) {
  const n = await nextNumber(tx, NumberSeries.PARTNER_INVOICE, year);
  return `${prefix}-${year}-${String(n).padStart(4, '0')}`;
}

function mapError(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return new ConflictException('Another partner already uses this contact email');
  }
  return e;
}
