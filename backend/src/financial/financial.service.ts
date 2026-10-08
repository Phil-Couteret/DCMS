import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ACTIVITY_NAMES } from '../config/catalogue.js';
import { Prisma } from '../generated/prisma/client.js';
import { ActivityType, InvoiceStatus, PaymentMethod, PaymentStatus } from '../generated/prisma/enums.js';
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
  ) {}

  // Everything the center took in and spent on one day (center time).
  // Invoice income is cash basis: payments that succeeded that day, less
  // refunds made that day, whenever the dives took place.
  async daily(date: string) {
    const tz = await this.config.timeZone();
    const start = centerMidnight(date, tz);
    const end = centerMidnight(addDays(date, 1), tz);
    const day = dateOnly(date);
    const [payments, refunds, income, expenses, closed, { taxName }] = await Promise.all([
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

  async closedDay(date: string) {
    const row = await this.prisma.closedDay.findFirst({ where: { date: dateOnly(date) } });
    if (!row) throw new NotFoundException(`${date} has not been closed`);
    return row;
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
        select: { subtotal: true, tax: true, discount: true, total: true },
      }),
      this.prisma.expense.findMany({
        where: { date: { gte: dateOnly(from), lt: dateOnly(next) } },
        select: { amount: true, tax: true },
      }),
      this.settings.tax(),
    ]);
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
        base: money(sum(sales.map((s) => s.subtotal))),
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
    };
  }
}
