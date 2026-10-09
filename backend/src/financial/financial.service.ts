import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { addOnLines, bookingEquipmentLines, bookingUnitPrice, pricesFor } from '../billing/price-lines.js';
import { MailerService } from '../mail/mailer.service.js';
import { PricingService } from '../settings/pricing.service.js';
import { runUnscoped } from '../tenant/tenant-context.js';
import { ACTIVITY_NAMES, billedUnits, withDives } from '../config/catalogue.js';
import { Prisma } from '../generated/prisma/client.js';
import { ActivityType, BookingStatus, InvoiceStatus, PaymentMethod, PaymentStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { TenantConfig } from '../tenant/tenant-config.service.js';
import { TenantContext } from '../tenant/tenant-context.service.js';
import { addDays, centerMidnight, centerToday, dateOnly, quarterDates } from './center-day.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { CreateIncomeDto } from './dto/create-income.dto.js';

// All money arithmetic uses Decimal, never JavaScript floats.
const D = Prisma.Decimal;
type Decimal = Prisma.Decimal;
type Money = Decimal | number | string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Invoices that count as sales: issued and not cancelled.
const ISSUED = { notIn: [InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED] };

const INVOICE_REF = {
  select: {
    id: true,
    invoiceNumber: true,
    customer: { select: { firstName: true, lastName: true } },
    booking: { select: { activityType: true } },
    stayId: true,
  },
} satisfies Prisma.InvoiceDefaultArgs;

type InvoiceRef = Prisma.InvoiceGetPayload<typeof INVOICE_REF>;

function sum(values: Money[]) {
  return values.reduce<Decimal>((acc, v) => acc.plus(v), new D(0));
}

const money = (v: Money) => new D(v).toFixed(2);

function invoiceFields(invoice: InvoiceRef) {
  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerName: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
    activityType: activityOf(invoice),
  };
}

// A stay invoice covers several activities, so its payments count as "STAY".
type IncomeActivity = ActivityType | 'STAY';

function activityOf(invoice: InvoiceRef): IncomeActivity {
  return invoice.booking?.activityType ?? 'STAY';
}

const INCOME_ACTIVITY_NAMES: Record<IncomeActivity, string> = { ...ACTIVITY_NAMES, STAY: 'Stay (several activities)' };

// The day's bookings for the daily report: who, what, where, what it is
// worth and how it is being billed.
const DAY_BOOKING = {
  select: {
    id: true,
    date: true,
    timeSlot: true,
    activityType: true,
    participantCount: true,
    numberOfDives: true,
    status: true,
    notes: true,
    addOns: true,
    pricePerDiver: true,
    equipmentPrice: true,
    addOnPrices: true,
    customer: { select: { id: true, firstName: true, lastName: true } },
    boat: { select: { name: true } },
    partner: { select: { name: true } },
    invoice: { select: { id: true, invoiceNumber: true, status: true } },
    stay: { select: { status: true, invoices: { where: { status: { not: InvoiceStatus.CANCELLED } }, select: { id: true, invoiceNumber: true, status: true } } } },
  },
} satisfies Prisma.BookingDefaultArgs;

// Dive counts by kind of activity: bookings, divers (participants) and dives
// (each diver's dives).
const DIVE_GROUPS: Record<ActivityType, 'funDives' | 'snorkeling' | 'discoverScuba' | 'courses'> = {
  [ActivityType.FUN_DIVE]: 'funDives',
  [ActivityType.SNORKELING]: 'snorkeling',
  [ActivityType.DISCOVER_SCUBA]: 'discoverScuba',
  [ActivityType.OW_CERT]: 'courses',
  [ActivityType.AOW_CERT]: 'courses',
  [ActivityType.RESCUE_CERT]: 'courses',
  [ActivityType.DM_CERT]: 'courses',
};

export function assertIsoDate(value: string | undefined, name = 'date') {
  if (!value || !ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) {
    throw new BadRequestException(`${name} must be a date as YYYY-MM-DD`);
  }
  return value;
}

@Injectable()
export class FinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly tenant: TenantContext,
    private readonly config: TenantConfig,
    private readonly pricing: PricingService,
    private readonly mailer: MailerService,
  ) {}

  // The day's bookings that take place (not cancelled, not no-shows), each
  // valued at the prices locked on it (activity, equipment, add-ons, before
  // tax; fun dives billed in a stay get the stay's volume rate instead), and
  // the dive counts by kind.
  private async dayBookings(day: Date) {
    const [rows, prices] = await Promise.all([
      this.prisma.booking.findMany({
        where: { date: day, status: { notIn: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW] } },
        ...DAY_BOOKING,
        orderBy: [{ timeSlot: 'asc' }, { createdAt: 'asc' }],
      }),
      // A center with no price list still gets its bookings, unpriced.
      this.pricing.current().catch(() => null),
    ]);
    const counts = Object.fromEntries(
      ['funDives', 'snorkeling', 'discoverScuba', 'courses'].map((k) => [k, { bookings: 0, divers: 0, dives: 0 }]),
    ) as Record<(typeof DIVE_GROUPS)[ActivityType], { bookings: number; divers: number; dives: number }>;
    const bookings = rows.map((b) => {
      const group = counts[DIVE_GROUPS[b.activityType]];
      group.bookings += 1;
      group.divers += b.participantCount;
      group.dives += b.participantCount * b.numberOfDives;
      const own = prices && pricesFor(prices, b);
      const unit = own && bookingUnitPrice(own, b);
      const extras = own ? sum([...bookingEquipmentLines(own, b), ...addOnLines(b, own)].map((l) => l.total)) : new D(0);
      const invoice = b.invoice ?? b.stay?.invoices[0] ?? null;
      return {
        id: b.id,
        timeSlot: b.timeSlot,
        customerName: `${b.customer.firstName} ${b.customer.lastName}`,
        customerId: b.customer.id,
        activity: withDives(b),
        activityType: b.activityType,
        numberOfDives: b.numberOfDives,
        participantCount: b.participantCount,
        place: b.boat?.name ?? null, // null: shore
        partnerName: b.partner?.name ?? null, // the partner pays the activity
        amount: unit === null || unit === undefined ? null : money(new D(unit).times(billedUnits(b)).plus(extras)),
        billing: invoice
          ? { kind: 'invoice' as const, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, status: invoice.status }
          : { kind: b.stay ? ('stay' as const) : ('unbilled' as const) },
      };
    });
    return { bookings, diveCounts: counts };
  }

  // Everything the center took in and spent on one day (center time).
  // Invoice income is cash basis: payments that succeeded that day, less
  // refunds made that day, whenever the dives took place.
  async daily(date: string) {
    const tz = await this.config.timeZone();
    const start = centerMidnight(date, tz);
    const end = centerMidnight(addDays(date, 1), tz);
    const day = dateOnly(date);
    const [payments, refunds, income, expenses, closed, { taxName }, day_] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: PaymentStatus.SUCCEEDED, paidAt: { gte: start, lt: end } },
        include: { invoice: INVOICE_REF },
        orderBy: { paidAt: 'asc' },
      }),
      this.prisma.refund.findMany({
        where: { processedAt: { gte: start, lt: end } },
        include: { payment: { select: { method: true, invoice: INVOICE_REF } } },
        orderBy: { processedAt: 'asc' },
      }),
      this.prisma.manualIncome.findMany({ where: { date: day }, orderBy: { createdAt: 'asc' } }),
      this.prisma.expense.findMany({ where: { date: day }, orderBy: { createdAt: 'asc' } }),
      this.prisma.closedDay.findFirst({ where: { date: day }, select: { closedAt: true, closedBy: true } }),
      this.settings.tax(),
      this.dayBookings(day),
    ]);

    const byMethod = new Map<PaymentMethod, Decimal>(Object.values(PaymentMethod).map((m) => [m, new D(0)]));
    const byActivity = new Map<IncomeActivity, Decimal>();
    const add = (method: PaymentMethod, activity: IncomeActivity, amount: Decimal) => {
      byMethod.set(method, byMethod.get(method)!.plus(amount));
      byActivity.set(activity, (byActivity.get(activity) ?? new D(0)).plus(amount));
    };
    for (const p of payments) add(p.method, activityOf(p.invoice), new D(p.amount));
    for (const r of refunds) add(r.payment.method, activityOf(r.payment.invoice), new D(r.amount).negated());

    const paymentsNet = sum(payments.map((p) => p.amount)).minus(sum(refunds.map((r) => r.amount)));
    const manualTotal = sum(income.map((i) => i.amount));
    const expensesTotal = sum(expenses.map((e) => e.amount));
    const totalIncome = paymentsNet.plus(manualTotal);

    return {
      date,
      taxName,
      payments: payments.map((p) => ({
        id: p.id,
        paidAt: p.paidAt,
        method: p.method,
        amount: money(p.amount),
        ...invoiceFields(p.invoice),
      })),
      refunds: refunds.map((r) => ({
        id: r.id,
        processedAt: r.processedAt,
        method: r.payment.method,
        amount: money(r.amount),
        reason: r.reason,
        ...invoiceFields(r.payment.invoice),
      })),
      byActivity: [...byActivity].map(([activityType, amount]) => ({
        activityType,
        label: INCOME_ACTIVITY_NAMES[activityType],
        amount: money(amount),
      })),
      byMethod: Object.fromEntries([...byMethod].map(([m, amount]) => [m, money(amount)])) as Record<PaymentMethod, string>,
      diveCounts: day_.diveCounts,
      bookings: day_.bookings,
      manualIncome: income.map((i) => ({ ...i, amount: money(i.amount) })),
      expenses: expenses.map((e) => ({ ...e, amount: money(e.amount), tax: money(e.tax) })),
      totals: {
        payments: money(paymentsNet),
        manualIncome: money(manualTotal),
        income: money(totalIncome),
        expenses: money(expensesTotal),
        net: money(totalIncome.minus(expensesTotal)),
      },
      closed,
    };
  }

  // Freezes the day's figures. Closing a day again replaces its report; the
  // figures themselves can still be changed afterwards.
  async closeDay(date: string, closedBy: string) {
    if (date > centerToday(await this.config.timeZone())) throw new BadRequestException('A day cannot be closed before it has started');
    const { closed: _, ...summary } = await this.daily(date);
    const data = { summary: summary as unknown as Prisma.InputJsonValue, closedBy, closedAt: new Date() };
    return this.prisma.closedDay.upsert({
      where: { tenantId_date: { tenantId: this.tenant.tenantId, date: dateOnly(date) } },
      create: { date: dateOnly(date), ...data },
      update: data,
    });
  }

  async closedDays() {
    const rows = await this.prisma.closedDay.findMany({ orderBy: { date: 'desc' } });
    return rows.map(({ summary, ...row }) => ({
      ...row,
      totals: (summary as { totals: Record<string, string> }).totals,
    }));
  }

  // With the name of the staff member who closed it, when their account
  // still exists.
  async closedDay(date: string) {
    const row = await this.prisma.closedDay.findFirst({ where: { date: dateOnly(date) } });
    if (!row) throw new NotFoundException(`${date} has not been closed`);
    const user = await runUnscoped(() => this.prisma.user.findFirst({ where: { email: row.closedBy, tenantId: null }, select: { name: true } }));
    return { ...row, closedByName: user?.name ?? null };
  }

  // Emails a closed day's report (the HTML the backoffice rendered from the
  // stored figures) to the center's address or the signed-in user's own.
  async emailReport(date: string, to: 'center' | 'me', html: string, userEmail: string) {
    if (!this.mailer.configured) {
      throw new ServiceUnavailableException('Email is not set up on this server (SMTP_URL); download the report and send it yourself');
    }
    await this.closedDay(date);
    if (!/^<!doctype html>/i.test(html.trimStart())) throw new BadRequestException('html must be an HTML document');
    const settings = await this.settings.get();
    const address = to === 'me' ? userEmail : settings.email;
    if (!address) throw new BadRequestException("The center has no email address; set it in Settings → Center");
    const center = settings.name || 'the dive center';
    const sent = await this.mailer.send({
      to: address,
      subject: `Daily report ${date} · ${center}`,
      text: [`The daily financial report of ${center} for ${date} is attached.`, '', `Sent from DCMS by ${userEmail}.`].join('\n'),
      attachments: [{ filename: `daily-report-${date}.html`, content: Buffer.from(html, 'utf8'), contentType: 'text/html; charset=utf-8' }],
    });
    if (!sent) throw new ServiceUnavailableException('The email could not be sent; try again later');
    return { sent: true, to: address };
  }

  async addExpense(dto: CreateExpenseDto, createdBy: string) {
    const amount = new D(dto.amount);
    let tax: Decimal;
    if (dto.tax !== undefined) {
      tax = new D(dto.tax);
      if (tax.greaterThan(amount)) throw new BadRequestException('tax cannot be more than the amount');
    } else {
      // amount = base × (1 + rate), so the tax part is amount − amount / (1 + rate).
      const { taxRate } = await this.settings.tax();
      const base = amount.dividedBy(new D(taxRate).dividedBy(100).plus(1));
      tax = amount.minus(base).toDecimalPlaces(2, D.ROUND_HALF_UP);
    }
    return this.prisma.expense.create({
      data: { ...dto, date: dateOnly(dto.date), amount, tax, notes: dto.notes?.trim() || null, createdBy },
    });
  }

  async removeExpense(id: string) {
    const row = await this.prisma.expense.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Expense ${id} not found`);
    return this.prisma.expense.delete({ where: { id } });
  }

  addIncome(dto: CreateIncomeDto, createdBy: string) {
    return this.prisma.manualIncome.create({
      data: { ...dto, date: dateOnly(dto.date), notes: dto.notes?.trim() || null, createdBy },
    });
  }

  async removeIncome(id: string) {
    const row = await this.prisma.manualIncome.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Income ${id} not found`);
    return this.prisma.manualIncome.delete({ where: { id } });
  }

  // Issued invoices created between two dates (center time, both inclusive),
  // with their totals.
  async invoices(from: string, to: string) {
    if (from > to) throw new BadRequestException('from must not be after to');
    const tz = await this.config.timeZone();
    const invoices = await this.prisma.invoice.findMany({
      where: { status: ISSUED, createdAt: { gte: centerMidnight(from, tz), lt: centerMidnight(addDays(to, 1), tz) } },
      include: { customer: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { invoiceNumber: 'desc' },
    });
    return {
      from,
      to,
      invoices,
      totals: {
        count: invoices.length,
        subtotal: money(sum(invoices.map((i) => i.subtotal))),
        tax: money(sum(invoices.map((i) => i.tax))),
        discount: money(sum(invoices.map((i) => i.discount))),
        total: money(sum(invoices.map((i) => i.total))),
      },
    };
  }

  // The quarter's tax: collected on issued invoices (dated by creation) less
  // what was paid on expenses. Manual income carries no tax figure and is left
  // out, as in the previous system.
  async taxDeclaration(year: number, quarter: number) {
    const { from, next } = quarterDates(year, quarter);
    const tz = await this.config.timeZone();
    const [sales, expenses, { taxName, taxRate }] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { status: ISSUED, createdAt: { gte: centerMidnight(from, tz), lt: centerMidnight(next, tz) } },
        select: {
          invoiceNumber: true,
          createdAt: true,
          subtotal: true,
          tax: true,
          discount: true,
          total: true,
          customer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.expense.findMany({
        where: { date: { gte: dateOnly(from), lt: dateOnly(next) } },
        select: { date: true, category: true, description: true, amount: true, tax: true },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      }),
      this.settings.tax(),
    ]);
    // Each sale and purchase, for the CSV and the printed declaration. Net is
    // before tax (after any discount); the rate is the one actually charged.
    const localDay = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    const rate = (tax: Prisma.Decimal, net: Prisma.Decimal) => (net.isZero() ? money(taxRate) : money(tax.dividedBy(net).times(100)));
    const entries = [
      ...sales.map((i) => {
        const net = new D(i.subtotal).minus(i.discount);
        return {
          date: localDay.format(i.createdAt),
          kind: 'SALE' as const,
          description: `Invoice ${i.invoiceNumber} · ${i.customer.firstName} ${i.customer.lastName}`,
          net: money(net),
          taxRate: rate(new D(i.tax), net),
          tax: money(i.tax),
          total: money(i.total),
        };
      }),
      ...expenses.map((e) => {
        const net = new D(e.amount).minus(e.tax);
        return {
          date: e.date.toISOString().slice(0, 10),
          kind: 'PURCHASE' as const,
          description: `Expense (${e.category.toLowerCase()}) · ${e.description}`,
          net: money(net),
          taxRate: rate(new D(e.tax), net),
          tax: money(e.tax),
          total: money(e.amount),
        };
      }),
    ];
    const collected = sum(sales.map((s) => s.tax));
    const paidAmount = sum(expenses.map((e) => e.amount));
    const paid = sum(expenses.map((e) => e.tax));
    const net = collected.minus(paid);
    return {
      year,
      quarter,
      from,
      to: addDays(next, -1),
      taxName,
      taxRate: money(taxRate),
      sales: {
        count: sales.length,
        // The taxed amount: subtotals less discounts (government bonos).
        base: money(sum(sales.map((s) => new D(s.subtotal).minus(s.discount)))),
        tax: money(collected),
        discount: money(sum(sales.map((s) => s.discount))),
        total: money(sum(sales.map((s) => s.total))),
      },
      purchases: {
        count: expenses.length,
        base: money(paidAmount.minus(paid)),
        tax: money(paid),
        total: money(paidAmount),
      },
      // Positive: to pay. Negative: to offset against later quarters.
      net: money(net),
      entries,
    };
  }
}
