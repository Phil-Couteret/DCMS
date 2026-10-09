import { Injectable } from '@nestjs/common';
import { addOnLines, bookingEquipmentLines, bookingUnitPrice, pricesFor } from '../billing/price-lines.js';
import { billedUnits } from '../config/catalogue.js';
import { PricingService } from '../settings/pricing.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { ActivityType, BookingStatus, PaymentStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantConfig } from '../tenant/tenant-config.service.js';
import { addDays, centerMidnight, centerToday, dateOnly } from './center-day.js';

const D = Prisma.Decimal;
const TREND_DAYS = 30;
const UPCOMING_DAYS = 7;
// Bookings that take place (or took place): not cancelled, not a no-show.
const HAPPENING = { notIn: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW] };

// The dashboard's figures, in the center's time zone and currency. Revenue
// is cash basis, like the Financial page: succeeded payments less refunds,
// by the day they were made. Admins only see the money.
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: TenantConfig,
    private readonly pricing: PricingService,
  ) {}

  // locationId: the bookings of that location only (revenue is the center's).
  async overview(includeRevenue: boolean, locationId?: string) {
    const { timeZone, currency } = await this.config.get();
    const today = centerToday(timeZone);
    const trendFrom = addDays(today, -(TREND_DAYS - 1));

    const [bookingsByActivity, upcoming, revenue] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['activityType'],
        where: { date: { gte: dateOnly(trendFrom), lte: dateOnly(today) }, status: HAPPENING, ...(locationId && { locationId }) },
        _count: { _all: true },
      }),
      this.prisma.booking.findMany({
        where: {
          date: { gte: dateOnly(today), lte: dateOnly(addDays(today, UPCOMING_DAYS - 1)) },
          status: HAPPENING,
          ...(locationId && { locationId }),
        },
        select: {
          id: true,
          date: true,
          timeSlot: true,
          activityType: true,
          participantCount: true,
          numberOfDives: true,
          status: true,
          customer: { select: { id: true, firstName: true, lastName: true } },
          boat: { select: { name: true } },
          shoreTime: true,
        },
        orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }, { createdAt: 'asc' }],
      }),
      includeRevenue ? this.revenue(timeZone, today, trendFrom) : null,
    ]);
    // Admins only, like revenue.
    const insights = includeRevenue ? await this.insights(today, trendFrom, locationId) : null;

    return {
      currency,
      timeZone,
      today,
      bookingsByActivity: bookingsByActivity
        .map((r) => ({ activityType: r.activityType, count: r._count._all }))
        .sort((a, b) => b.count - a.count),
      bookingsPeriod: { from: trendFrom, to: today },
      upcoming: upcoming.map((b) => ({ ...b, date: b.date.toISOString().slice(0, 10) })),
      revenue,
      ...(insights ?? { bookingTrend: null, valueByActivity: null, topCustomers: null }),
    };
  }

  // Booking trends (bookings and divers per day over the last 30 days), the
  // value of this month's bookings by activity, and the year's top customers
  // by dives. Cancellations and no-shows are left out.
  private async insights(today: string, trendFrom: string, locationId?: string) {
    const monthStart = `${today.slice(0, 7)}-01`;
    const [y, m] = today.split('-').map(Number);
    const nextMonthStart = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
    const yearStart = `${today.slice(0, 4)}-01-01`;
    const yearEnd = `${today.slice(0, 4)}-12-31`;
    const where = { status: HAPPENING, ...(locationId && { locationId }) };
    const [trend, month, prices, year] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['date'],
        where: { ...where, date: { gte: dateOnly(trendFrom), lte: dateOnly(today) } },
        _count: { _all: true },
        _sum: { participantCount: true },
      }),
      this.prisma.booking.findMany({
        where: { ...where, date: { gte: dateOnly(monthStart), lt: dateOnly(nextMonthStart) } },
        select: {
          date: true,
          activityType: true,
          participantCount: true,
          numberOfDives: true,
          notes: true,
          addOns: true,
          pricePerDiver: true,
          equipmentPrice: true,
          addOnPrices: true,
        },
      }),
      this.pricing.current().catch(() => null),
      this.prisma.booking.groupBy({
        by: ['customerId'],
        where: { ...where, activityType: { not: ActivityType.SNORKELING }, date: { gte: dateOnly(yearStart), lte: dateOnly(yearEnd) } },
        _sum: { numberOfDives: true },
        _count: { _all: true },
        _max: { date: true },
        orderBy: [{ _sum: { numberOfDives: 'desc' } }, { _count: { customerId: 'desc' } }],
        take: 10,
      }),
    ]);

    const byDay = new Map(trend.map((g) => [g.date.toISOString().slice(0, 10), g]));
    const bookingTrend = Array.from({ length: TREND_DAYS }, (_, i) => addDays(trendFrom, i)).map((date) => ({
      date,
      bookings: byDay.get(date)?._count._all ?? 0,
      divers: byDay.get(date)?._sum.participantCount ?? 0,
    }));

    // Each booking at the prices locked on it, before tax: its activity, and
    // its equipment and add-ons together. Fun dives billed in a stay get the
    // stay's volume rate instead, so this is the booked value, not invoices.
    const value = new Map<string, Prisma.Decimal>();
    const add = (key: string, amount: Prisma.Decimal) => value.set(key, (value.get(key) ?? new D(0)).plus(amount));
    for (const b of prices ? month : []) {
      const own = pricesFor(prices!, b);
      const unit = bookingUnitPrice(own, b);
      if (unit !== null) add(b.activityType, new D(unit).times(billedUnits(b)));
      const extras = [...bookingEquipmentLines(own, b), ...addOnLines(b, own)].reduce((s, l) => s.plus(l.total), new D(0));
      if (!extras.isZero()) add('EXTRAS', extras);
    }
    const valueByActivity = [...value]
      .map(([activityType, amount]) => ({ activityType, amount: amount.toFixed(2) }))
      .sort((a, b) => Number(b.amount) - Number(a.amount));

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: year.map((g) => g.customerId) } },
      select: { id: true, firstName: true, lastName: true, customerType: true },
    });
    const topCustomers = year.map((g) => ({
      customer: customers.find((c) => c.id === g.customerId)!,
      dives: g._sum.numberOfDives ?? 0,
      bookings: g._count._all,
      lastDate: g._max.date?.toISOString().slice(0, 10) ?? null,
    }));

    return { bookingTrend, valueByActivity, valueMonthStart: monthStart, topCustomers, topYear: Number(today.slice(0, 4)) };
  }

  // This month's revenue and the last 30 days, day by day (zero days included).
  private async revenue(timeZone: string, today: string, trendFrom: string) {
    const monthStart = `${today.slice(0, 7)}-01`;
    const from = monthStart < trendFrom ? monthStart : trendFrom;
    const start = centerMidnight(from, timeZone);
    const end = centerMidnight(addDays(today, 1), timeZone);
    const [payments, refunds] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: PaymentStatus.SUCCEEDED, paidAt: { gte: start, lt: end } },
        select: { amount: true, paidAt: true },
      }),
      this.prisma.refund.findMany({
        where: { processedAt: { gte: start, lt: end } },
        select: { amount: true, processedAt: true },
      }),
    ]);
    const byDay = new Map<string, Prisma.Decimal>();
    const add = (at: Date, amount: Prisma.Decimal | string | number) => {
      const day = centerToday(timeZone, at);
      byDay.set(day, (byDay.get(day) ?? new D(0)).plus(amount));
    };
    for (const p of payments) add(p.paidAt!, p.amount);
    for (const r of refunds) add(r.processedAt, new D(r.amount).negated());

    const days = Array.from({ length: TREND_DAYS }, (_, i) => addDays(trendFrom, i));
    const month = [...byDay.entries()].filter(([d]) => d >= monthStart).reduce((s, [, v]) => s.plus(v), new D(0));
    return {
      month: month.toFixed(2),
      monthStart,
      trend: days.map((date) => ({ date, amount: (byDay.get(date) ?? new D(0)).toFixed(2) })),
    };
  }
}
