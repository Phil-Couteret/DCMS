import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { BookingStatus, PaymentStatus } from '../generated/prisma/enums.js';
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
  ) {}

  async overview(includeRevenue: boolean) {
    const { timeZone, currency } = await this.config.get();
    const today = centerToday(timeZone);
    const trendFrom = addDays(today, -(TREND_DAYS - 1));

    const [bookingsByActivity, upcoming, revenue] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['activityType'],
        where: { date: { gte: dateOnly(trendFrom), lte: dateOnly(today) }, status: HAPPENING },
        _count: { _all: true },
      }),
      this.prisma.booking.findMany({
        where: { date: { gte: dateOnly(today), lte: dateOnly(addDays(today, UPCOMING_DAYS - 1)) }, status: HAPPENING },
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
        },
        orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }, { createdAt: 'asc' }],
      }),
      includeRevenue ? this.revenue(timeZone, today, trendFrom) : null,
    ]);

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
    };
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
