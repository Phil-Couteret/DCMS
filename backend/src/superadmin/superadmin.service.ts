import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { BookingStatus, InvoiceStatus, LocationType, PaymentStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DEFAULT_SETTINGS, seedTenantDefaults } from '../config/tenant-defaults.js';
import { centerToday, dateOnly } from '../financial/center-day.js';
import { runInTenant } from '../tenant/tenant-context.js';
import { TenantsService } from '../tenant/tenants.service.js';
import { CreateInvitationDto } from '../invitations/dto/create-invitation.dto.js';
import { InvitationsService } from '../invitations/invitations.service.js';
import { recordPlatformAction } from './audit.js';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto.js';
import { QUOTA_KEYS, quotasOf } from './quotas.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Tenant is a global model; the counts are of each tenant's own rows.
const tenantSelect = {
  id: true,
  name: true,
  slug: true,
  plan: true,
  isActive: true,
  quotas: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      memberships: { where: { isActive: true } },
      locations: true,
      diveSites: true,
      boats: true,
      customers: true,
      bookings: true,
    },
  },
} satisfies Prisma.TenantSelect;

type TenantRow = Prisma.TenantGetPayload<{ select: typeof tenantSelect }>;

const GB = 1024 ** 3;

// A tenant with its counts, its quotas and its usage against them, as the
// original TenantManagement showed (used / authorized).
function toView({ _count, quotas: stored, ...tenant }: TenantRow, storageBytes: number) {
  const quotas = quotasOf(stored);
  const counts = {
    staff: _count.memberships,
    locations: _count.locations,
    diveSites: _count.diveSites,
    boats: _count.boats,
    customers: _count.customers,
    bookings: _count.bookings,
  };
  return {
    ...tenant,
    counts,
    quotas,
    usage: {
      locations: { used: counts.locations, authorized: quotas.locations },
      diveSites: { used: counts.diveSites, authorized: quotas.diveSites },
      boats: { used: counts.boats, authorized: quotas.boats },
      users: { used: counts.staff, authorized: quotas.users },
      customers: { used: counts.customers, authorized: quotas.customers },
      storage: {
        usedBytes: storageBytes,
        authorizedBytes: quotas.storageGb * GB,
        pricePerGbMonth: quotas.storagePricePerGbMonth,
      },
    },
  };
}

const money = (d: Prisma.Decimal | null | undefined) => (d ?? new Prisma.Decimal(0)).toFixed(2);

@Injectable()
export class SuperadminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
    private readonly invitations: InvitationsService,
  ) {}

  async listTenants() {
    const [rows, storage] = await Promise.all([
      this.prisma.tenant.findMany({ select: tenantSelect, orderBy: { name: 'asc' } }),
      this.storage(),
    ]);
    return rows.map((r) => toView(r, storage.get(r.id) ?? 0));
  }

  async getTenant(id: string) {
    const row = await this.prisma.tenant.findUnique({ where: { id }, select: tenantSelect });
    if (!row) throw new NotFoundException('Tenant not found');
    return toView(row, (await this.storage(id)).get(id) ?? 0);
  }

  // The platform at a glance: centers, customers, bookings and storage.
  async overview() {
    const [tenants, active, customers, bookings, storage] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { isActive: true } }),
      this.prisma.$queryRaw<[{ n: bigint }]>`SELECT count(*) AS n FROM "Customer"`,
      this.prisma.$queryRaw<[{ n: bigint }]>`SELECT count(*) AS n FROM "Booking"`,
      this.storage(),
    ]);
    return {
      tenants,
      activeTenants: active,
      customers: Number(customers[0].n),
      bookings: Number(bookings[0].n),
      storageBytes: [...storage.values()].reduce((a, b) => a + b, 0),
    };
  }

  // Bytes of row data each tenant holds, over every tenant-scoped table
  // (pg_column_size of its rows; indexes and table overhead are left out).
  // A full scan of every table: fine for the console, not for hot paths.
  private async storage(tenantId?: string): Promise<Map<string, number>> {
    const tables = await this.prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'tenantId'
        AND table_name NOT IN ('Membership', 'PlatformAuditLog', 'Invitation')`;
    if (tables.length === 0) return new Map();
    const filter = tenantId ? `WHERE "tenantId" = $1` : '';
    const parts = tables.map(
      ({ table_name }) => `SELECT "tenantId", pg_column_size(t.*) AS size FROM "${table_name.replace(/"/g, '')}" t ${filter}`,
    );
    const rows = await this.prisma.$queryRawUnsafe<{ tenantId: string; bytes: bigint }[]>(
      `SELECT "tenantId", sum(size)::bigint AS bytes FROM (${parts.join(' UNION ALL ')}) x GROUP BY "tenantId"`,
      ...(tenantId ? [tenantId] : []),
    );
    return new Map(rows.map((r) => [r.tenantId, Number(r.bytes)]));
  }

  // Onboarding, in one transaction: the tenant with its quotas, its settings
  // and default price list, its first location, and an invitation for its
  // first admin. The invitation email goes out after the commit; when it
  // cannot be sent, the link is returned for the superadmin to pass on.
  async createTenant(dto: CreateTenantDto, actorId: string) {
    const { name: rawName, slug, plan, firstLocation, firstAdmin, quotas, ...regional } = dto;
    const name = rawName.trim();
    let created: { tenant: TenantRow; invite: Awaited<ReturnType<InvitationsService['create']>> | null };
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const { id } = await tx.tenant.create({
          data: { name, slug, plan, ...(quotas && { quotas: { ...quotas } }) },
          select: { id: true },
        });
        await runInTenant(id, async () => {
          await seedTenantDefaults(tx, { name, ...regional });
          await tx.location.create({
            data: { name: firstLocation?.name.trim() || name, type: firstLocation?.type ?? LocationType.DIVING },
          });
        });
        const invite = firstAdmin
          ? await this.invitations.create(tx, { tenantId: id, email: firstAdmin.email, name: firstAdmin.name, invitedById: actorId })
          : null;
        const tenant = await tx.tenant.findUniqueOrThrow({ where: { id }, select: tenantSelect });
        await recordPlatformAction(tx, {
          userId: actorId,
          action: 'tenant.create',
          tenantId: id,
          details: {
            name,
            slug,
            plan: tenant.plan,
            ...regional,
            firstLocation: firstLocation?.name.trim() || name,
            ...(firstAdmin && { firstAdmin: firstAdmin.email.toLowerCase() }),
          },
        });
        return { tenant, invite };
      });
    } catch (e) {
      throw this.slugTaken(e);
    }
    this.tenants.forget();
    const { tenant, invite } = created;
    const sent = invite ? await this.invitations.send(invite.token, invite.invitation, tenant) : null;
    return {
      tenant: toView(tenant, 0),
      invitation: invite && sent ? { email: invite.invitation.email, link: sent.link, emailed: sent.emailed } : null,
    };
  }

  // Invites someone to a center's staff (by default as its admin). A
  // pending invitation to the same email is replaced.
  async invite(tenantId: string, dto: CreateInvitationDto, actorId: string) {
    const tenant = await this.getTenant(tenantId);
    const invite = await this.prisma.$transaction(async (tx) => {
      const created = await this.invitations.create(tx, { tenantId, ...dto, invitedById: actorId });
      await recordPlatformAction(tx, {
        userId: actorId,
        action: 'tenant.invite',
        tenantId,
        details: { email: created.invitation.email, role: created.invitation.role },
      });
      return created;
    });
    const sent = await this.invitations.send(invite.token, invite.invitation, tenant);
    return { email: invite.invitation.email, link: sent.link, emailed: sent.emailed };
  }

  listInvitations(tenantId: string) {
    return this.invitations.list(tenantId);
  }

  async updateTenant(id: string, dto: UpdateTenantDto, actorId: string) {
    const current = await this.getTenant(id);
    const next = { name: dto.name?.trim(), slug: dto.slug, plan: dto.plan, isActive: dto.isActive };
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of ['name', 'slug', 'plan', 'isActive'] as const) {
      const to = next[key];
      if (to !== undefined && to !== current[key]) changes[key] = { from: current[key], to };
    }
    const data = Object.fromEntries(Object.entries(changes).map(([k, c]) => [k, c.to])) as Prisma.TenantUpdateInput;
    if (dto.quotas) {
      // Only the quotas given (the validated object has every key, undefined
      // for those left out).
      const given = Object.fromEntries(Object.entries(dto.quotas).filter(([, v]) => v !== undefined));
      const quotas = { ...current.quotas, ...given };
      for (const key of QUOTA_KEYS) {
        if (quotas[key] !== current.quotas[key]) changes[`quotas.${key}`] = { from: current.quotas[key], to: quotas[key] };
      }
      if (QUOTA_KEYS.some((k) => quotas[k] !== current.quotas[k])) data.quotas = quotas;
    }
    if (Object.keys(changes).length === 0) return current;
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.update({ where: { id }, data, select: tenantSelect });
        await recordPlatformAction(tx, {
          userId: actorId,
          action: 'tenant.update',
          tenantId: id,
          details: changes as Prisma.InputJsonValue,
        });
        return tenant;
      });
      // Activation is cached for 30 seconds per tenant.
      this.tenants.forget();
      return toView(row, current.usage.storage.usedBytes);
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
