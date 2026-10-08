import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { BillingService, equipmentLines, lockCustomerStays, type Tx } from '../billing/billing.service.js';
import { InvoiceItemDto } from '../billing/dto/invoice-item.dto.js';
import { ACTIVITY_NAMES, ACTIVITY_PRICES, stayDivePrice } from '../config/prices.js';
import { addDays, centerToday, dateOnly } from '../financial/center-day.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  ActivityType,
  BookingSource,
  BookingStatus,
  StayCostCategory,
  StayStatus,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { CreateStayCostDto } from './dto/create-stay-cost.dto.js';
import { UpdateStayCostDto } from './dto/update-stay-cost.dto.js';

// All money arithmetic uses Decimal, never JavaScript floats.
const D = Prisma.Decimal;
type Decimal = Prisma.Decimal;
type Db = PrismaService | Tx;

// A stay runs from the customer's first unbilled booking for up to this many
// days; unbilled bookings older than this before today are left out.
export const STAY_DAYS = 30;

const COST_LABELS: Record<StayCostCategory, string> = {
  INSURANCE: 'Insurance',
  EQUIPMENT: 'Equipment',
  CLOTHES: 'Clothes',
  GOODIES: 'Goodies',
  BEVERAGES: 'Beverages',
  OTHER: 'Other',
};

const SLOT_NAMES = { MORNING: 'Morning', AFTERNOON: 'Afternoon', NIGHT: 'Night' } as const;

const BOOKING_SELECT = {
  id: true,
  customerId: true,
  date: true,
  timeSlot: true,
  activityType: true,
  participantCount: true,
  status: true,
  bookingSource: true,
  notes: true,
  stayId: true,
  boat: { select: { name: true } },
} satisfies Prisma.BookingSelect;

type StayBookingRow = Prisma.BookingGetPayload<{ select: typeof BOOKING_SELECT }>;

const CUSTOMER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  customerType: true,
  user: { select: { email: true } },
} satisfies Prisma.CustomerSelect;

type StayCustomer = Prisma.CustomerGetPayload<{ select: typeof CUSTOMER_SELECT }>;
type StayCostRow = Prisma.StayCostGetPayload<object>;

const money = (v: Decimal | number) => new D(v).toFixed(2);
const sum = (values: (Decimal | number)[]) => values.reduce<Decimal>((acc, v) => acc.plus(v), new D(0));
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

function shortDay(d: Date) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(d);
}

// Prices one customer's stay: every fun dive at the stay rate for the number
// of fun dives in it (per diver, so a booking for two counts once), other
// activities at catalogue price, equipment as booked. Partner bookings count
// toward the volume, but their activity is the partner's to pay.
export function priceStay(customer: StayCustomer, bookings: StayBookingRow[], costs: StayCostRow[]) {
  const totalDives = bookings.filter((b) => b.activityType === ActivityType.FUN_DIVE).length;
  const pricePerDive = stayDivePrice(customer.customerType, totalDives);
  const unpriced = new Set<string>();

  const lines = bookings.map((b) => {
    const partner = b.bookingSource === BookingSource.PARTNER;
    const unit = b.activityType === ActivityType.FUN_DIVE ? pricePerDive : ACTIVITY_PRICES[b.activityType];
    if (unit === undefined && !partner) unpriced.add(ACTIVITY_NAMES[b.activityType]);
    const activityTotal = partner || unit === undefined ? new D(0) : new D(unit).times(b.participantCount);
    const equipment = equipmentLines(b.notes);
    const total = activityTotal.plus(sum(equipment.map((e) => e.total)));
    return { booking: b, partner, unit, activityTotal, equipment, total };
  });
  const bookingsTotal = sum(lines.map((l) => l.total));
  const costsTotal = sum(costs.map((c) => c.total));
  return { totalDives, pricePerDive, lines, unpriced: [...unpriced], bookingsTotal, costsTotal };
}

@Injectable()
export class StaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly settings: SettingsService,
  ) {}

  // Every customer with an open stay: unbilled bookings from the last
  // STAY_DAYS days on, or extra costs recorded.
  async findAll() {
    const [stays, { taxRate }] = await Promise.all([this.openStays(this.prisma), this.settings.tax()]);
    return stays
      .map((s) => this.present(s, taxRate))
      .sort((a, b) => (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999') || a.customer.lastName.localeCompare(b.customer.lastName));
  }

  async findOne(customerId: string) {
    const [stay, { taxRate }] = await Promise.all([this.openStay(this.prisma, customerId), this.settings.tax()]);
    if (!stay) throw new NotFoundException('This customer has no open stay');
    return this.present(stay, taxRate);
  }

  async addCost(customerId: string, dto: CreateStayCostDto, createdBy: string) {
    const description = costDescription(dto.category, dto.description);
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId }, select: { id: true } });
      if (!customer) throw new NotFoundException(`Customer ${customerId} not found`);
      await lockCustomerStays(tx, customerId);
      const stay =
        (await tx.stay.findFirst({ where: { customerId, status: StayStatus.OPEN }, select: { id: true } })) ??
        (await tx.stay.create({ data: { customerId }, select: { id: true } }));
      return tx.stayCost.create({
        data: {
          stayId: stay.id,
          date: dateOnly(dto.date),
          category: dto.category,
          description,
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          total: new D(dto.unitPrice).times(dto.quantity),
          notes: dto.notes?.trim() || null,
          createdBy,
        },
      });
    });
  }

  async updateCost(id: string, dto: UpdateStayCostDto) {
    const current = await this.openCost(id);
    const category = dto.category ?? current.category;
    const quantity = dto.quantity ?? current.quantity;
    const unitPrice = dto.unitPrice !== undefined ? new D(dto.unitPrice) : current.unitPrice;
    return this.prisma.stayCost.update({
      where: { id },
      data: {
        category,
        description: costDescription(category, dto.description ?? current.description),
        quantity,
        unitPrice,
        total: unitPrice.times(quantity),
        ...(dto.date !== undefined && { date: dateOnly(dto.date) }),
        ...(dto.notes !== undefined && { notes: dto.notes.trim() || null }),
      },
    });
  }

  async removeCost(id: string) {
    await this.openCost(id);
    return this.prisma.stayCost.delete({ where: { id } });
  }

  // Ends the stay: one invoice for its bookings and extra costs, after which
  // its bookings cannot be invoiced again. Cancelling that invoice reopens it.
  async bill(customerId: string) {
    return this.prisma.$transaction(async (tx) => {
      await lockCustomerStays(tx, customerId);
      const stay = await this.openStay(tx, customerId);
      if (!stay) throw new NotFoundException('This customer has no open stay');
      const priced = priceStay(stay.customer, stay.bookings, stay.costs);
      if (priced.unpriced.length > 0) {
        throw new UnprocessableEntityException(
          `No price is set for ${priced.unpriced.join(', ')}; add it to config/prices.ts`,
        );
      }
      const items = invoiceItems(priced, stay.costs);
      if (items.length === 0) throw new BadRequestException('This stay has nothing to bill');

      const stayId = stay.row?.id ?? (await tx.stay.create({ data: { customerId }, select: { id: true } })).id;
      await tx.booking.updateMany({ where: { id: { in: stay.bookings.map((b) => b.id) } }, data: { stayId } });
      const invoice = await this.billing.createStayInvoice(tx, { stayId, customerId, items });
      await tx.stay.update({ where: { id: stayId }, data: { status: StayStatus.BILLED, billedAt: new Date() } });
      return { stayId, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber };
    });
  }

  private async openCost(id: string) {
    const cost = await this.prisma.stayCost.findUnique({ where: { id }, include: { stay: { select: { status: true } } } });
    if (!cost) throw new NotFoundException(`Cost ${id} not found`);
    if (cost.stay.status !== StayStatus.OPEN) {
      throw new ConflictException('This stay has been billed; cancel its invoice to change it');
    }
    return cost;
  }

  private async openStay(db: Db, customerId: string) {
    return (await this.openStays(db, customerId))[0] ?? null;
  }

  // Bookings of an open stay: those already tied to it (from a cancelled stay
  // invoice), plus the customer's unbilled ones dated from STAY_DAYS days ago,
  // up to STAY_DAYS days after the earliest. Cancelled and no-show bookings
  // are not billed.
  private async openStays(db: Db, customerId?: string) {
    const since = dateOnly(addDays(centerToday(), -STAY_DAYS));
    const [rows, bookings] = await Promise.all([
      db.stay.findMany({
        where: { status: StayStatus.OPEN, ...(customerId && { customerId }) },
        include: { costs: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] }, customer: { select: CUSTOMER_SELECT } },
      }),
      db.booking.findMany({
        where: {
          ...(customerId && { customerId }),
          status: { notIn: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW] },
          invoice: { is: null },
          OR: [{ stayId: null, date: { gte: since } }, { stay: { status: StayStatus.OPEN } }],
        },
        select: { ...BOOKING_SELECT, customer: { select: CUSTOMER_SELECT } },
        orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
      }),
    ]);

    const byCustomer = new Map<string, { customer: StayCustomer; bookings: StayBookingRow[] }>();
    for (const { customer, ...b } of bookings) {
      const entry = byCustomer.get(b.customerId) ?? { customer, bookings: [] };
      entry.bookings.push(b);
      byCustomer.set(b.customerId, entry);
    }
    for (const row of rows) {
      if (!byCustomer.has(row.customerId)) byCustomer.set(row.customerId, { customer: row.customer, bookings: [] });
    }

    return [...byCustomer].map(([id, { customer, bookings: all }]) => {
      const row = rows.find((r) => r.customerId === id) ?? null;
      const start = all[0] ? isoDay(all[0].date) : null;
      const last = start ? addDays(start, STAY_DAYS) : null;
      const included = all.filter((b) => (row && b.stayId === row.id) || (last !== null && isoDay(b.date) <= last));
      return { row, customer, bookings: included, costs: row?.costs ?? [] };
    });
  }

  private present(stay: Awaited<ReturnType<StaysService['openStays']>>[number], taxRate: Decimal) {
    const priced = priceStay(stay.customer, stay.bookings, stay.costs);
    const subtotal = priced.bookingsTotal.plus(priced.costsTotal);
    const tax = subtotal.times(taxRate).dividedBy(100).toDecimalPlaces(2, D.ROUND_HALF_UP);
    const { user, ...customer } = stay.customer;
    return {
      stayId: stay.row?.id ?? null,
      customer: { ...customer, email: user.email },
      startDate: stay.bookings[0] ? isoDay(stay.bookings[0].date) : null,
      endDate: stay.bookings.length > 0 ? isoDay(stay.bookings[stay.bookings.length - 1].date) : null,
      totalDives: priced.totalDives,
      pricePerDive: money(priced.pricePerDive),
      unpriced: priced.unpriced,
      bookings: priced.lines.map((l) => ({
        id: l.booking.id,
        date: isoDay(l.booking.date),
        timeSlot: l.booking.timeSlot,
        activityType: l.booking.activityType,
        activityName: ACTIVITY_NAMES[l.booking.activityType],
        participantCount: l.booking.participantCount,
        status: l.booking.status,
        boatName: l.booking.boat.name,
        partner: l.partner,
        unitPrice: l.unit === undefined ? null : money(l.unit),
        activityTotal: money(l.activityTotal),
        equipment: l.equipment.map((e) => ({ description: e.description, total: money(e.total) })),
        total: money(l.total),
      })),
      costs: stay.costs.map((c) => ({ ...c, unitPrice: money(c.unitPrice), total: money(c.total) })),
      totals: {
        bookings: money(priced.bookingsTotal),
        costs: money(priced.costsTotal),
        subtotal: money(subtotal),
        tax: money(tax),
        total: money(subtotal.plus(tax)),
      },
    };
  }
}

function costDescription(category: StayCostCategory, description: string | undefined) {
  const text = description?.trim() ?? '';
  if (text) return text;
  if (category === StayCostCategory.BEVERAGES) return COST_LABELS.BEVERAGES;
  throw new BadRequestException('description should not be empty');
}

function invoiceItems(priced: ReturnType<typeof priceStay>, costs: StayCostRow[]): InvoiceItemDto[] {
  const items: InvoiceItemDto[] = [];
  for (const l of priced.lines) {
    const when = `${shortDay(l.booking.date)} ${SLOT_NAMES[l.booking.timeSlot]}`;
    const name = ACTIVITY_NAMES[l.booking.activityType];
    const rate =
      l.booking.activityType === ActivityType.FUN_DIVE && !l.partner
        ? ` (stay rate, ${priced.totalDives} dive${priced.totalDives === 1 ? '' : 's'})`
        : '';
    const unitPrice = l.partner ? 0 : Number(l.unit);
    items.push({
      description: `${name} · ${when}${l.partner ? ' · paid by partner' : rate}`,
      quantity: l.booking.participantCount,
      unitPrice,
      total: new D(unitPrice).times(l.booking.participantCount).toNumber(),
      type: 'activity',
    });
    for (const e of l.equipment) items.push({ ...e, description: `${e.description} · ${when}` });
  }
  for (const c of costs) {
    items.push({
      description: c.description === COST_LABELS[c.category] ? c.description : `${COST_LABELS[c.category]}: ${c.description}`,
      quantity: c.quantity,
      unitPrice: c.unitPrice.toNumber(),
      total: c.total.toNumber(),
      type: 'stay_cost',
    });
  }
  return items;
}
