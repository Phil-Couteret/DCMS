import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { BookingStatus, InvoiceStatus, PaymentStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DEFAULT_SETTINGS, seedTenantDefaults } from '../config/tenant-defaults.js';
import { centerToday, dateOnly } from '../financial/center-day.js';
import { runInTenant } from '../tenant/tenant-context.js';
import { TenantsService } from '../tenant/tenants.service.js';
import { recordPlatformAction } from './audit.js';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Tenant is a global model; the counts are of each tenant's own rows.
const tenantSelect = {
  id: true,
  name: true,
  slug: true,
  plan: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      memberships: { where: { isActive: true } },
      locations: true,
      customers: true,
      bookings: true,
    },
  },
} satisfies Prisma.TenantSelect;

type TenantRow = Prisma.TenantGetPayload<{ select: typeof tenantSelect }>;

function toView({ _count, ...tenant }: TenantRow) {
  return {
    ...tenant,
    counts: { staff: _count.memberships, locations: _count.locations, customers: _count.customers, bookings: _count.bookings },
  };
}

const money = (d: Prisma.Decimal | null | undefined) => (d ?? new Prisma.Decimal(0)).toFixed(2);

@Injectable()
export class SuperadminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
  ) {}

  async listTenants() {
    const rows = await this.prisma.tenant.findMany({ select: tenantSelect, orderBy: { name: 'asc' } });
    return rows.map(toView);
  }

  async getTenant(id: string) {
    const row = await this.prisma.tenant.findUnique({ where: { id }, select: tenantSelect });
    if (!row) throw new NotFoundException('Tenant not found');
    return toView(row);
  }

  // A new tenant with its settings and the default price list, so it can
  // price and invoice from day one. Its first location and the invitation of
  // its first admin come with onboarding (MULTITENANT_PLAN.md step 5); until
  // then a superadmin enters it and adds its first admin.
  async createTenant(dto: CreateTenantDto, actorId: string) {
    const { name: rawName, slug, plan, ...regional } = dto;
    const name = rawName.trim();
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const { id } = await tx.tenant.create({ data: { name, slug, plan }, select: { id: true } });
        await runInTenant(id, () => seedTenantDefaults(tx, { name, ...regional }));
        const tenant = await tx.tenant.findUniqueOrThrow({ where: { id }, select: tenantSelect });
        await recordPlatformAction(tx, {
          userId: actorId,
          action: 'tenant.create',
          tenantId: tenant.id,
          details: { name: tenant.name, slug: tenant.slug, plan: tenant.plan, ...regional },
        });
        return tenant;
      });
      this.tenants.forget();
      return toView(row);
    } catch (e) {
      throw this.slugTaken(e);
    }
  }

  async updateTenant(id: string, dto: UpdateTenantDto, actorId: string) {
    const current = await this.getTenant(id);
    const next = { name: dto.name?.trim(), slug: dto.slug, plan: dto.plan, isActive: dto.isActive };
    const changes: Record<string, { from: string | boolean; to: string | boolean }> = {};
    for (const key of ['name', 'slug', 'plan', 'isActive'] as const) {
      const to = next[key];
      if (to !== undefined && to !== current[key]) changes[key] = { from: current[key], to };
    }
    if (Object.keys(changes).length === 0) return current;
    const data = Object.fromEntries(Object.entries(changes).map(([k, c]) => [k, c.to])) as Prisma.TenantUpdateInput;
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.update({ where: { id }, data, select: tenantSelect });
        await recordPlatformAction(tx, { userId: actorId, action: 'tenant.update', tenantId: id, details: changes });
        return tenant;
      });
      // Activation is cached for 30 seconds per tenant.
      this.tenants.forget();
      return toView(row);
    } catch (e) {
      throw this.slugTaken(e);
    }
  }

  // Bookings, customers and revenue of one tenant, read in that tenant's
  // context so the usual tenant filtering applies. Revenue: invoiced is the
  // total of issued, not cancelled invoices; collected is succeeded
  // payments less their refunds.
  async tenantStats(id: string) {
    const tenant = await this.getTenant(id);
    const since = new Date(Date.now() - 30 * DAY_MS);
    const stats = await runInTenant(id, async () => {
      const settings = await this.prisma.centerSettings.findUnique({
        where: { tenantId: id },
        select: { currency: true, timeZone: true },
      });
      // Upcoming: from today at the center.
      const today = dateOnly(centerToday(settings?.timeZone ?? DEFAULT_SETTINGS.timeZone));
      const [byStatus, recentBookings, upcoming, customers, newCustomers, invoiced, paid, refunded, paid30, refunded30] =
        await Promise.all([
          this.prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
          this.prisma.booking.count({ where: { createdAt: { gte: since } } }),
          this.prisma.booking.count({
            where: { date: { gte: today }, status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] } },
          }),
          this.prisma.customer.count(),
          this.prisma.customer.count({ where: { createdAt: { gte: since } } }),
          this.prisma.invoice.aggregate({
            where: { status: { notIn: [InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED] } },
            _sum: { total: true },
          }),
          this.prisma.payment.aggregate({ where: { status: PaymentStatus.SUCCEEDED }, _sum: { amount: true } }),
          this.prisma.refund.aggregate({ _sum: { amount: true } }),
          this.prisma.payment.aggregate({
            where: { status: PaymentStatus.SUCCEEDED, paidAt: { gte: since } },
            _sum: { amount: true },
          }),
          this.prisma.refund.aggregate({ where: { processedAt: { gte: since } }, _sum: { amount: true } }),
        ]);
      const statusCounts = Object.fromEntries(Object.values(BookingStatus).map((s) => [s, 0])) as Record<BookingStatus, number>;
      for (const row of byStatus) statusCounts[row.status] = row._count._all;
      const zero = new Prisma.Decimal(0);
      return {
        currency: settings?.currency ?? DEFAULT_SETTINGS.currency,
        timeZone: settings?.timeZone ?? DEFAULT_SETTINGS.timeZone,
        bookings: {
          total: byStatus.reduce((n, r) => n + r._count._all, 0),
          byStatus: statusCounts,
          last30Days: recentBookings,
          upcoming,
        },
        customers: { total: customers, last30Days: newCustomers },
        revenue: {
          invoiced: money(invoiced._sum.total),
          collected: money((paid._sum.amount ?? zero).minus(refunded._sum.amount ?? zero)),
          collectedLast30Days: money((paid30._sum.amount ?? zero).minus(refunded30._sum.amount ?? zero)),
        },
      };
    });
    return { tenant, ...stats, generatedAt: new Date().toISOString() };
  }

  async auditLog(limit = 50) {
    return this.prisma.platformAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        details: true,
        createdAt: true,
        user: { select: { id: true, email: true, name: true } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  private slugTaken(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return new ConflictException('A tenant with this slug already exists');
    }
    return e;
  }
}
