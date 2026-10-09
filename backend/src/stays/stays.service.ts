import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { BillingService, lockCustomerStays, type Tx } from '../billing/billing.service.js';
import {
  addOnLines,
  bookingEquipmentLines,
  bookingUnitPrice,
  equipmentLines,
  lockPrices,
  lockedTiers,
  pricesFor,
  relockedPrices,
  sumLines,
} from '../billing/price-lines.js';
import { InvoiceItemDto } from '../billing/dto/invoice-item.dto.js';
import { bonoDiscount, usableBono, useBonos } from '../bonos/bono-rules.js';
import {
  ACTIVITY_NAMES,
  billedUnits,
  INSURANCE_NAMES,
  insurancePeriodFor,
  isDiving,
  stayDivePrice,
  withDives,
  type PriceList,
} from '../config/catalogue.js';
import { addDays, centerToday, dateOnly } from '../financial/center-day.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  ActivityType,
  BookingSource,
  BookingStatus,
  CustomerType,
  StayCostCategory,
  StayStatus,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantConfig } from '../tenant/tenant-config.service.js';
import { PricingService } from '../settings/pricing.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { CreateStayCostDto } from './dto/create-stay-cost.dto.js';
import { QuoteBookingDto } from './dto/quote-booking.dto.js';
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
  numberOfDives: true,
  status: true,
  bookingSource: true,
  notes: true,
  stayId: true,
  partnerId: true,
  partner: { select: { name: true } },
  boat: { select: { name: true } },
  shoreTime: true,
  locationId: true,
  bonoId: true,
  bono: { select: { code: true, type: true, discountValue: true } },
  addOns: true,
  pricePerDiver: true,
  equipmentPrice: true,
  addOnPrices: true,
  funDiveTiers: true,
} satisfies Prisma.BookingSelect;

type StayBookingRow = Prisma.BookingGetPayload<{ select: typeof BOOKING_SELECT }>;

const CUSTOMER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  customerType: true,
  insuranceExpiry: true,
  waiverSignedAt: true,
  user: { select: { email: true } },
} satisfies Prisma.CustomerSelect;

type StayCustomer = Prisma.CustomerGetPayload<{ select: typeof CUSTOMER_SELECT }>;
type StayCostRow = Prisma.StayCostGetPayload<object>;

const money = (v: Decimal | number) => new D(v).toFixed(2);

// How a customer is covered for diving until a day: dive insurance valid
// that day, or a signed waiver. null: neither.
function diveCover(customer: { insuranceExpiry: Date | null; waiverSignedAt: Date | null }, until: string) {
  if (customer.insuranceExpiry && isoDay(customer.insuranceExpiry) >= until) return 'insured' as const;
  if (customer.waiverSignedAt) return 'waiver' as const;
  return null;
}

// Dive insurance for a stay: how the customer is covered, or what to sell
// them (the shortest period covering the stay's diving days). null when the
// stay has no diving.
function stayInsurance(
  customer: StayCustomer,
  bookings: StayBookingRow[],
  costs: StayCostRow[],
  prices: PriceList,
) {
  const diving = bookings.filter((b) => isDiving(b.activityType));
  if (diving.length === 0) return null;
  const from = isoDay(diving[0].date);
  const to = isoDay(diving[diving.length - 1].date);
  const cover = costs.some((c) => c.category === StayCostCategory.INSURANCE) ? ('added' as const) : diveCover(customer, to);
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
  const period = insurancePeriodFor(days);
  return {
    cover, // insured, waiver, added (an insurance cost in the stay), or null
    insuranceExpiry: customer.insuranceExpiry ? isoDay(customer.insuranceExpiry) : null,
    waiverSignedAt: customer.waiverSignedAt ? isoDay(customer.waiverSignedAt) : null,
    offer: cover === null ? { period, description: `Dive insurance (${INSURANCE_NAMES[period]})`, price: money(prices.insurance[period]) } : null,
  };
}
const sum = (values: (Decimal | number)[]) => values.reduce<Decimal>((acc, v) => acc.plus(v), new D(0));
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

function shortDay(d: Date) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(d);
}

// The dive pack a stay can be billed with: when the customer's own fun dives
// (not partner-paid), per diver, come to exactly a pack's number of dives,
// and every one of those bookings is for the same number of divers. The pack
// price is per diver.
export function packOffer(bookings: StayBookingRow[], prices: PriceList) {
  const own = bookings.filter((b) => b.activityType === ActivityType.FUN_DIVE && !partnerPaid(b));
  const divers = new Set(own.map((b) => b.participantCount));
  if (own.length === 0 || divers.size !== 1) return null;
  const dives = own.reduce((n, b) => n + b.numberOfDives, 0);
  const pack = prices.divePacks.find((p) => p.diveCount === dives);
  if (!pack) return null;
  const count = [...divers][0];
  return { diveCount: pack.diveCount, price: pack.price, divers: count, total: new D(pack.price).times(count), bookingIds: own.map((b) => b.id) };
}

function partnerPaid(b: StayBookingRow) {
  return b.partnerId !== null || b.bookingSource === BookingSource.PARTNER;
}

// Prices one customer's stay: every fun dive at the stay rate for the number
// of fun dives in it (the dives of each fun dive booking added up, per diver,
// so a booking for two counts its dives once), other activities at catalogue
// price, equipment and add-ons as booked. Partner bookings count toward the
// volume, but their activity is the partner's to pay. With usePack, the
// customer's fun dives are billed at the pack price instead (packOffer), each
// booking carrying its share of it.
export function priceStay(
  customer: StayCustomer,
  bookings: StayBookingRow[],
  costs: StayCostRow[],
  prices: PriceList,
  usePack = false,
) {
  const pack = packOffer(bookings, prices);
  if (usePack && !pack) throw new BadRequestException('No dive pack matches the fun dives in this stay');
  const packShares = usePack && pack ? packShareByBooking(bookings, pack) : null;
  // The volume tier is set by the whole stay's fun dives, whatever their
  // dates; each booking's rate at that tier comes from the volume rates
  // locked on it when it was made (the current ones for a booking from before
  // locking). So a stay across a price change gives every dive the tier for
  // the full count, each at its own booking's price list.
  const totalDives = bookings
    .filter((b) => b.activityType === ActivityType.FUN_DIVE)
    .reduce((n, b) => n + b.numberOfDives, 0);
  const rateFor = (b: StayBookingRow) =>
    stayDivePrice({ ...prices, funDiveTiers: lockedTiers(b) ?? prices.funDiveTiers }, customer.customerType, totalDives);
  // The rate of the stay's earliest fun dive booking, for display.
  const first = [...bookings]
    .filter((b) => b.activityType === ActivityType.FUN_DIVE)
    .sort((a, b) => a.date.getTime() - b.date.getTime() || SLOTS.indexOf(a.timeSlot) - SLOTS.indexOf(b.timeSlot))[0];
  const pricePerDive = first ? rateFor(first) : stayDivePrice(prices, customer.customerType, totalDives);
  const unpriced = new Set<string>();

  const lines = bookings.map((b) => {
    const partner = partnerPaid(b);
    // Each booking at the prices locked when it was made.
    const own = pricesFor(prices, b);
    const unit = b.activityType === ActivityType.FUN_DIVE ? rateFor(b) : bookingUnitPrice(own, b);
    const share = packShares?.get(b.id);
    if (unit === null && !partner && share === undefined) unpriced.add(ACTIVITY_NAMES[b.activityType]);
    const activityTotal =
      share ?? (partner || unit === null ? new D(0) : new D(unit).times(billedUnits(b)));
    const equipment = bookingEquipmentLines(own, b);
    const addOns = addOnLines(b, own);
    const total = activityTotal.plus(sum([...equipment, ...addOns].map((e) => new D(e.total))));
    // A government bono discounts this booking's activity (not a partner's).
    const bono = partner ? null : b.bono;
    const discount = bono ? bonoDiscount(bono, activityTotal) : new D(0);
    return { booking: b, partner, unit, activityTotal, equipment, addOns, total, bono, discount, inPack: share !== undefined };
  });
  const bookingsTotal = sum(lines.map((l) => l.total));
  const costsTotal = sum(costs.map((c) => c.total));
  const discount = sum(lines.map((l) => l.discount));
  return {
    totalDives,
    pricePerDive,
    // Where locked prices differ from the current price list.
    priceChanges: priceChanges(customer, bookings, prices, totalDives),
    // Every fun dive rate in the stay (one per price list its bookings were
    // made under), lowest first.
    funDiveRates: [...new Set(bookings.filter((b) => b.activityType === ActivityType.FUN_DIVE).map(rateFor))].sort((a, b) => a - b),
    stayTiers: (first && lockedTiers(first)) ?? prices.funDiveTiers,
    lines,
    unpriced: [...unpriced],
    bookingsTotal,
    costsTotal,
    discount,
    pack,
    usedPack: usePack ? pack : null,
  };
}

const SLOTS = ['MORNING', 'AFTERNOON', 'NIGHT'];

export type PriceChange =
  | { kind: 'stayRate'; locked: number; current: number }
  | { kind: 'activity'; activityType: ActivityType; locked: number; current: number | null }
  | { kind: 'equipment'; bookings: number }
  | { kind: 'addOn'; addOn: string; locked: number; current: number };

// The prices this stay is billed at that are no longer the price list's: the
// stay's fun dive rates, activity prices, equipment sets and add-ons, each
// once. Staff see them on the Stays page.
function priceChanges(
  customer: StayCustomer,
  bookings: StayBookingRow[],
  prices: PriceList,
  totalDives: number,
): PriceChange[] {
  const changes = new Map<string, PriceChange>();
  const current = stayDivePrice(prices, customer.customerType, totalDives);
  for (const b of bookings) {
    const tiers = b.activityType === ActivityType.FUN_DIVE ? lockedTiers(b) : null;
    if (!tiers) continue;
    const locked = stayDivePrice({ ...prices, funDiveTiers: tiers }, customer.customerType, totalDives);
    if (locked !== current) changes.set(`stayRate:${locked}`, { kind: 'stayRate', locked, current });
  }
  let equipment = 0;
  for (const b of bookings) {
    if (b.activityType !== ActivityType.FUN_DIVE && b.pricePerDiver !== null) {
      const locked = new D(b.pricePerDiver).toNumber();
      const current = prices.activities[b.activityType];
      if (locked !== current) changes.set(`activity:${b.activityType}`, { kind: 'activity', activityType: b.activityType, locked, current });
    }
    if (b.equipmentPrice !== null && !new D(b.equipmentPrice).equals(sumLines(equipmentLines(b.notes, prices)))) equipment++;
    const lockedAddOns = pricesFor(prices, b).addOns;
    for (const a of b.addOns) {
      if (lockedAddOns[a] !== prices.addOns[a]) changes.set(`addOn:${a}`, { kind: 'addOn', addOn: a, locked: lockedAddOns[a], current: prices.addOns[a] });
    }
  }
  if (equipment > 0) changes.set('equipment', { kind: 'equipment', bookings: equipment });
  return [...changes.values()];
}

// Each pack booking's share of the pack price, by its dives (the last takes
// the rounding), so the shares add up to the pack total exactly.
function packShareByBooking(bookings: StayBookingRow[], pack: NonNullable<ReturnType<typeof packOffer>>) {
  const own = bookings.filter((b) => pack.bookingIds.includes(b.id));
  const shares = new Map<string, Decimal>();
  let left = pack.total;
  own.forEach((b, i) => {
    const share =
      i === own.length - 1
        ? left
        : pack.total.times(b.numberOfDives).dividedBy(pack.diveCount).toDecimalPlaces(2, D.ROUND_HALF_UP);
    shares.set(b.id, share);
    left = left.minus(share);
  });
  return shares;
}

@Injectable()
export class StaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly settings: SettingsService,
    private readonly pricing: PricingService,
    private readonly config: TenantConfig,
  ) {}

  // Every customer with an open stay: unbilled bookings from the last
  // STAY_DAYS days on, or extra costs recorded.
  async findAll() {
    const [stays, { taxRate }, prices] = await Promise.all([
      this.openStays(this.prisma),
      this.settings.tax(),
      this.pricing.current(),
    ]);
    return stays
      .map((s) => this.present(s, taxRate, prices))
      .sort((a, b) => (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999') || a.customer.lastName.localeCompare(b.customer.lastName));
  }

  async findOne(customerId: string) {
    const [stay, { taxRate }, prices] = await Promise.all([
      this.openStay(this.prisma, customerId),
      this.settings.tax(),
      this.pricing.current(),
    ]);
    if (!stay) throw new NotFoundException('This customer has no open stay');
    return this.present(stay, taxRate, prices);
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
  // usePack: bill the customer's fun dives at the matching dive pack's price.
  async bill(customerId: string, usePack = false) {
    return this.prisma.$transaction(async (tx) => {
      await lockCustomerStays(tx, customerId);
      const stay = await this.openStay(tx, customerId);
      if (!stay) throw new NotFoundException('This customer has no open stay');
      const priced = priceStay(stay.customer, stay.bookings, stay.costs, await this.pricing.current(), usePack);
      if (priced.unpriced.length > 0) {
        throw new UnprocessableEntityException(
          `No price is set for ${priced.unpriced.join(', ')}; set it in Settings → Pricing`,
        );
      }
      const items = invoiceItems(priced, stay.costs);
      // A stay of partner-paid bookings with no extras leaves the customer
      // nothing to pay: no empty invoice.
      if (priced.bookingsTotal.plus(priced.costsTotal).isZero()) {
        throw new BadRequestException('Nothing in this stay is for the customer to pay');
      }

      const stayId = stay.row?.id ?? (await tx.stay.create({ data: { customerId }, select: { id: true } })).id;
      await tx.booking.updateMany({ where: { id: { in: stay.bookings.map((b) => b.id) } }, data: { stayId } });
      const withBono = priced.lines.filter((l) => l.bono).map((l) => l.booking);
      await useBonos(tx, withBono.map((b) => b.bonoId));
      await tx.booking.updateMany({ where: { id: { in: withBono.map((b) => b.id) } }, data: { bonoUsed: true } });
      const invoice = await this.billing.createStayInvoice(tx, { stayId, customerId, items, discount: priced.discount });
      await tx.stay.update({ where: { id: stayId }, data: { status: StayStatus.BILLED, billedAt: new Date() } });
      return { stayId, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber };
    });
  }

  // Adds the dive insurance the stay needs to it, as an extra cost, at the
  // price for the period that covers its diving days.
  async addInsurance(customerId: string, createdBy: string) {
    const [stay, prices] = await Promise.all([this.openStay(this.prisma, customerId), this.pricing.current()]);
    if (!stay) throw new NotFoundException('This customer has no open stay');
    const insurance = stayInsurance(stay.customer, stay.bookings, stay.costs, prices);
    if (!insurance) throw new BadRequestException('There is no diving in this stay');
    if (!insurance.offer) {
      const why = { insured: 'has dive insurance for it', waiver: 'has signed a waiver', added: 'already has insurance added' };
      throw new ConflictException(`This customer ${why[insurance.cover!]}`);
    }
    return this.addCost(
      customerId,
      {
        date: isoDay(stay.bookings.find((b) => isDiving(b.activityType))!.date),
        category: StayCostCategory.INSURANCE,
        description: insurance.offer.description,
        quantity: 1,
        unitPrice: Number(insurance.offer.price),
      },
      createdBy,
    );
  }

  // Prices a booking before it is saved, as its stay would bill it: the
  // customer's open stay with this booking in it (fun dives at the tier for
  // all the stay's dives), the prices it would lock (an edit keeps those it
  // locked, except for what changed), its bono and add-ons. Also says whether
  // a new diving booking needs the insurance check.
  async quote(dto: QuoteBookingDto) {
    const date = dto.date.slice(0, 10);
    const [prices, { taxRate, taxName }, currency, customer, current, stay] = await Promise.all([
      this.pricing.current(),
      this.settings.tax(),
      this.config.currency(),
      dto.customerId
        ? this.prisma.customer.findUnique({ where: { id: dto.customerId }, select: CUSTOMER_SELECT })
        : Promise.resolve(null),
      dto.bookingId ? this.prisma.booking.findUnique({ where: { id: dto.bookingId }, select: BOOKING_SELECT }) : Promise.resolve(null),
      dto.customerId ? this.openStay(this.prisma, dto.customerId) : Promise.resolve(null),
    ]);
    if (dto.customerId && !customer) throw new NotFoundException(`Customer ${dto.customerId} not found`);
    if (dto.bookingId && !current) throw new NotFoundException(`Booking ${dto.bookingId} not found`);

    const notes = dto.notes ?? null;
    const now = lockPrices(prices, { activityType: dto.activityType, notes });
    const locked = current ? { ...current, ...relockedPrices(current, { activityType: dto.activityType, notes }, now) } : now;
    let bono: StayBookingRow['bono'] = null;
    let bonoError: string | null = null;
    const code = dto.bonoCode?.trim().toUpperCase();
    if (code) {
      if (current?.bono?.code === code) bono = current.bono;
      else {
        try {
          const found = await usableBono(this.prisma, code, dateOnly(date));
          bono = { code: found.code, type: found.type, discountValue: found.discountValue };
        } catch (e) {
          bonoError = (e as Error).message;
        }
      }
    }
    const draft: StayBookingRow = {
      id: dto.bookingId ?? 'draft',
      customerId: dto.customerId ?? '',
      date: dateOnly(date),
      timeSlot: dto.timeSlot,
      activityType: dto.activityType,
      participantCount: dto.participantCount,
      numberOfDives: dto.numberOfDives ?? 1,
      status: BookingStatus.CONFIRMED,
      bookingSource: dto.partnerId ? BookingSource.PARTNER : (dto.bookingSource ?? BookingSource.WALK_IN),
      notes,
      stayId: current?.stayId ?? null,
      partnerId: dto.partnerId ?? null,
      partner: null,
      boat: null,
      shoreTime: null,
      locationId: null,
      bonoId: null,
      bono,
      addOns: dto.addOns ?? [],
      pricePerDiver: locked.pricePerDiver === null ? null : new D(locked.pricePerDiver),
      equipmentPrice: locked.equipmentPrice === null ? null : new D(locked.equipmentPrice),
      addOnPrices: (locked.addOnPrices ?? null) as Prisma.JsonValue,
      funDiveTiers: (locked.funDiveTiers ?? null) as Prisma.JsonValue,
    };

    // The stay this booking falls in: the customer's open one if the date is
    // within STAY_DAYS of its start, else a stay of its own.
    const others = (stay?.bookings ?? []).filter((b) => b.id !== dto.bookingId);
    const together = [...others, draft].sort((a, b) => a.date.getTime() - b.date.getTime());
    const last = addDays(isoDay(together[0].date), STAY_DAYS);
    const inStay = (stay?.row && draft.stayId === stay.row.id) || date <= last;
    const stayBookings = inStay ? together.filter((b) => b === draft || isoDay(b.date) <= last || (stay?.row && b.stayId === stay.row.id)) : [draft];
    const fallback = { id: '', firstName: '', lastName: '', customerType: CustomerType.TOURIST, insuranceExpiry: null, waiverSignedAt: null, user: { email: '' } };
    const who = customer ?? fallback;
    const priced = priceStay(who, stayBookings, [], prices);
    const line = priced.lines.find((l) => l.booking === draft)!;
    const net = line.total.minus(line.discount);
    const tax = net.times(taxRate).dividedBy(100).toDecimalPlaces(2, D.ROUND_HALF_UP);
    // With other bookings in the stay, more fun dives can lower their rate
    // too: what the stay's bookings total changes by.
    const rest = stayBookings.filter((b) => b !== draft);
    const before = rest.length > 0 ? priceStay(who, rest, [], prices) : null;
    const stayChange = before
      ? priced.bookingsTotal.minus(priced.discount).minus(before.bookingsTotal.minus(before.discount))
      : null;

    // The first-dive insurance check: a new diving booking, for a customer
    // with no other diving booking, who has neither insurance valid on the
    // day nor a signed waiver.
    let insuranceCheck = false;
    if (!dto.bookingId && isDiving(dto.activityType)) {
      const earlier = customer
        ? await this.prisma.booking.count({
            where: {
              customerId: customer.id,
              status: { not: BookingStatus.CANCELLED },
              activityType: { not: ActivityType.SNORKELING },
            },
          })
        : 0;
      insuranceCheck = earlier === 0 && (!customer || diveCover(customer, date) === null);
    }

    return {
      activity: {
        name: ACTIVITY_NAMES[dto.activityType],
        unitPrice: line.unit === null ? null : money(line.unit),
        units: billedUnits(draft),
        total: money(line.activityTotal),
      },
      partnerPaid: line.partner,
      unpriced: line.unit === null && !line.partner,
      equipment: line.equipment.map((e) => ({ description: e.description, total: money(e.total) })),
      addOns: line.addOns.map((e) => ({ description: e.description, total: money(e.total) })),
      bono: bono && { code: bono.code, discount: money(line.discount) },
      bonoError,
      subtotal: money(line.total),
      discount: money(line.discount),
      tax: money(tax),
      total: money(net.plus(tax)),
      taxName,
      taxRate: new D(taxRate).toNumber(),
      currency,
      // Fun dives: the tier is for every fun dive in the stay.
      stayDives: dto.activityType === ActivityType.FUN_DIVE ? priced.totalDives : null,
      stayChange: stayChange && !stayChange.equals(net) ? money(stayChange) : null,
      insurance: {
        check: insuranceCheck,
        insuranceExpiry: customer?.insuranceExpiry ? isoDay(customer.insuranceExpiry) : null,
        waiverSignedAt: customer?.waiverSignedAt ? isoDay(customer.waiverSignedAt) : null,
      },
    };
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
    const since = dateOnly(addDays(centerToday(await this.config.timeZone()), -STAY_DAYS));
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

  private present(stay: Awaited<ReturnType<StaysService['openStays']>>[number], taxRate: Decimal, prices: PriceList) {
    const priced = priceStay(stay.customer, stay.bookings, stay.costs, prices);
    const totals = (p: ReturnType<typeof priceStay>) => {
      const subtotal = p.bookingsTotal.plus(p.costsTotal);
      const tax = subtotal.minus(p.discount).times(taxRate).dividedBy(100).toDecimalPlaces(2, D.ROUND_HALF_UP);
      return {
        bookings: money(p.bookingsTotal),
        costs: money(p.costsTotal),
        subtotal: money(subtotal),
        discount: money(p.discount),
        tax: money(tax),
        total: money(subtotal.minus(p.discount).plus(tax)),
      };
    };
    // The same stay billed with the matching dive pack, to offer as an option.
    const withPack = priced.pack && priceStay(stay.customer, stay.bookings, stay.costs, prices, true);
    const { user, ...customer } = stay.customer;
    return {
      stayId: stay.row?.id ?? null,
      customer: { ...customer, email: user.email },
      startDate: stay.bookings[0] ? isoDay(stay.bookings[0].date) : null,
      endDate: stay.bookings.length > 0 ? isoDay(stay.bookings[stay.bookings.length - 1].date) : null,
      totalDives: priced.totalDives,
      pricePerDive: money(priced.pricePerDive),
      funDiveRates: priced.funDiveRates.map(money),
      priceChanges: priced.priceChanges,
      // The volume rates of the stay's earliest booking, for the rate note.
      funDiveTiers: priced.stayTiers,
      unpriced: priced.unpriced,
      insurance: stayInsurance(stay.customer, stay.bookings, stay.costs, prices),
      bookings: priced.lines.map((l) => ({
        id: l.booking.id,
        date: isoDay(l.booking.date),
        timeSlot: l.booking.timeSlot,
        activityType: l.booking.activityType,
        activityName: ACTIVITY_NAMES[l.booking.activityType],
        participantCount: l.booking.participantCount,
        status: l.booking.status,
        boatName: l.booking.boat?.name ?? null, // null: a shore booking
        shoreTime: l.booking.shoreTime,
        locationId: l.booking.locationId,
        partner: l.partner,
        partnerName: l.booking.partner?.name ?? null,
        unitPrice: l.unit === null ? null : money(l.unit),
        activityTotal: money(l.activityTotal),
        equipment: l.equipment.map((e) => ({ description: e.description, total: money(e.total) })),
        addOns: l.addOns.map((e) => ({ description: e.description, total: money(e.total) })),
        total: money(l.total),
        bono: l.bono && { code: l.bono.code, discount: money(l.discount) },
      })),
      costs: stay.costs.map((c) => ({ ...c, unitPrice: money(c.unitPrice), total: money(c.total) })),
      totals: totals(priced),
      pack:
        priced.pack && withPack
          ? {
              diveCount: priced.pack.diveCount,
              price: money(priced.pack.price),
              divers: priced.pack.divers,
              total: money(priced.pack.total),
              totals: totals(withPack),
            }
          : null,
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
  const pack = priced.usedPack;
  if (pack) {
    // One line for the pack, in place of the fun dives it covers.
    const days = priced.lines.filter((l) => l.inPack).map((l) => l.booking.date);
    const first = shortDay(days[0]);
    const last = shortDay(days[days.length - 1]);
    items.push({
      description: `${pack.diveCount}-dive pack · ${first === last ? first : `${first} – ${last}`}`,
      quantity: pack.divers,
      unitPrice: pack.price,
      total: pack.total.toNumber(),
      type: 'activity',
    });
  }
  for (const l of priced.lines) {
    const when = `${shortDay(l.booking.date)} ${SLOT_NAMES[l.booking.timeSlot]}`;
    if (l.inPack) {
      for (const e of [...l.equipment, ...l.addOns]) items.push({ ...e, description: `${e.description} · ${when}` });
      continue;
    }
    const name = withDives(l.booking);
    const rate =
      l.booking.activityType === ActivityType.FUN_DIVE && !l.partner
        ? ` (stay rate, ${priced.totalDives} dive${priced.totalDives === 1 ? '' : 's'})`
        : '';
    const unitPrice = l.partner ? 0 : Number(l.unit);
    items.push({
      description: `${name} · ${when}${l.partner ? ` · paid by ${l.booking.partner?.name ?? 'partner'}` : rate}`,
      quantity: billedUnits(l.booking),
      unitPrice,
      total: new D(unitPrice).times(billedUnits(l.booking)).toNumber(),
      type: 'activity',
    });
    for (const e of [...l.equipment, ...l.addOns]) items.push({ ...e, description: `${e.description} · ${when}` });
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
