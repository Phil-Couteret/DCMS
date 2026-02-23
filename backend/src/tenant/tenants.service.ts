import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Slugify: company name → URL-safe slug (e.g. "Deep Blue Diving" → "deep-blue-diving") */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'tenant';
}

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { is_active: true };
    const tenants = await this.prisma.tenants.findMany({
      where,
      orderBy: { slug: 'asc' },
      include: {
        _count: { select: { locations: true, users: true } },
      },
    });
    // Enrich with usage stats and quotas
    const enriched = await Promise.all(
      tenants.map(async (t) => {
        const usage = await this.getUsageStats(t.id);
        const quotas = this.getQuotas(t);
        return { ...t, usage, quotas };
      }),
    );
    return enriched;
  }

  /** Get quotas from tenant settings. Defaults if not set. */
  private getQuotas(tenant: { settings?: any }) {
    const q = (tenant.settings as any)?.quotas || {};
    return {
      locations: q.locations ?? 20,
      dive_sites: q.dive_sites ?? 15,
      boats: q.boats ?? 10,
      users: q.users ?? 20,
      customers: q.customers ?? 500,
      storage_gb: q.storage_gb ?? 5,
      storage_price_per_gb_per_month: q.storage_price_per_gb_per_month ?? 0,
    };
  }

  /** Estimated bytes per row (for storage calculation). Conservative averages. */
  private static readonly AVG_BYTES = {
    locations: 600,
    dive_sites: 800,
    boats: 500,
    equipment: 600,
    users: 350,
    customers: 900,
    bookings: 550,
    staff: 650,
    partners: 550,
    settings: 2048,
    government_bonos: 400,
    customer_stays: 300,
    customer_certifications: 400,
    customer_consents: 250,
  };

  /** Estimate storage used by tenant (bytes) based on row counts × avg row size. */
  private async estimateTenantStorageBytes(tenantId: string): Promise<number> {
    const B = TenantsService.AVG_BYTES;
    const [locCount, diveCount, boatCount, equipCount, userCount, custCount, bookCount, staffCount, partnerCount, settingsCount, bonoCount, stayCount, certCount, consentCount] =
      await Promise.all([
        this.prisma.locations.count({ where: { tenant_id: tenantId } }),
        this.prisma.dive_sites.count({ where: { locations: { tenant_id: tenantId } } }),
        this.prisma.boats.count({ where: { locations: { tenant_id: tenantId } } }),
        this.prisma.equipment.count({ where: { locations: { tenant_id: tenantId } } }),
        this.prisma.users.count({ where: { tenant_id: tenantId } }),
        this.prisma.customers.count({ where: { tenant_id: tenantId } }),
        this.prisma.bookings.count({ where: { customers: { tenant_id: tenantId } } }),
        this.prisma.staff.count({ where: { locations: { tenant_id: tenantId } } }),
        this.prisma.partners.count({ where: { tenant_id: tenantId } }),
        this.prisma.settings.count({ where: { tenant_id: tenantId } }),
        this.prisma.government_bonos.count({ where: { tenant_id: tenantId } }),
        this.prisma.customer_stays.count({ where: { customers: { tenant_id: tenantId } } }),
        this.prisma.customer_certifications.count({ where: { customers: { tenant_id: tenantId } } }),
        this.prisma.customer_consents.count({ where: { customers: { tenant_id: tenantId } } }),
      ]);
    return (
      locCount * B.locations + diveCount * B.dive_sites + boatCount * B.boats +
      equipCount * B.equipment + userCount * B.users + custCount * B.customers +
      bookCount * B.bookings + staffCount * B.staff + partnerCount * B.partners +
      settingsCount * B.settings + bonoCount * B.government_bonos +
      stayCount * B.customer_stays + certCount * B.customer_certifications +
      consentCount * B.customer_consents
    );
  }

  /** Get usage counts for a tenant (used vs authorized). */
  async getUsageStats(tenantId: string) {
    const [locations, diveSites, boats, users, customers, storageBytes] = await Promise.all([
      this.prisma.locations.count({ where: { tenant_id: tenantId } }),
      this.prisma.dive_sites.count({ where: { locations: { tenant_id: tenantId } } }),
      this.prisma.boats.count({ where: { locations: { tenant_id: tenantId } } }),
      this.prisma.users.count({ where: { tenant_id: tenantId } }),
      this.prisma.customers.count({ where: { tenant_id: tenantId } }),
      this.estimateTenantStorageBytes(tenantId),
    ]);
    const tenant = await this.prisma.tenants.findUnique({ where: { id: tenantId } });
    const quotas = tenant ? this.getQuotas(tenant) : { locations: 20, dive_sites: 15, boats: 10, users: 20, customers: 500, storage_gb: 5 };
    const storageGb = quotas.storage_gb ?? 5;
    const authorizedBytes = storageGb * 1024 * 1024 * 1024;
    return {
      locations: { used: locations, authorized: quotas.locations },
      dive_sites: { used: diveSites, authorized: quotas.dive_sites },
      boats: { used: boats, authorized: quotas.boats },
      users: { used: users, authorized: quotas.users },
      customers: { used: customers, authorized: quotas.customers },
      storage: {
        usedBytes: storageBytes,
        usedMB: Math.round(storageBytes / 1024 / 1024 * 100) / 100,
        usedGB: Math.round(storageBytes / 1024 / 1024 / 1024 * 1000) / 1000,
        authorizedBytes,
        authorizedGB: storageGb,
        pricePerGbPerMonth: quotas.storage_price_per_gb_per_month ?? 0,
      },
    };
  }

  /** Get platform-level metrics: storage and load. */
  async getPlatformMetrics() {
    const [storageBytes, tenantCount, totalCustomers, totalBookings] = await Promise.all([
      this.prisma.$queryRaw<[{ pg_database_size: bigint }]>`SELECT pg_database_size(current_database()) as pg_database_size`.then((r) => Number(r[0]?.pg_database_size ?? 0)),
      this.prisma.tenants.count({ where: { is_active: true } }),
      this.prisma.customers.count(),
      this.prisma.bookings.count(),
    ]);
    return {
      storage: { usedBytes: storageBytes, usedMB: Math.round(storageBytes / 1024 / 1024 * 100) / 100 },
      tenants: tenantCount,
      totalCustomers,
      totalBookings,
    };
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenants.findUnique({
      where: { id },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    return tenant;
  }

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenants.findUnique({
      where: { slug },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant with slug "${slug}" not found`);
    }
    return tenant;
  }

  /**
   * Resolve tenant from ID or slug. Returns null if not found.
   */
  async resolve(tenantId?: string | null, tenantSlug?: string | null): Promise<{ id: string; slug: string } | null> {
    if (tenantId) {
      const t = await this.prisma.tenants.findFirst({
        where: { id: tenantId, is_active: true },
      });
      return t ? { id: t.id, slug: t.slug } : null;
    }
    if (tenantSlug) {
      const t = await this.prisma.tenants.findFirst({
        where: { slug: tenantSlug, is_active: true },
      });
      return t ? { id: t.id, slug: t.slug } : null;
    }
    return null;
  }

  /**
   * Get default tenant (slug 'default'). Used when no tenant context is provided.
   */
  async getDefaultTenant(): Promise<{ id: string; slug: string } | null> {
    return this.resolve(null, 'default');
  }

  async create(data: {
    name: string;
    slug?: string;
    domain?: string;
    settings?: object;
    numberOfLocations?: number;
    locationType?: string;
  }) {
    const slug = data.slug?.trim() || slugify(data.name);
    const existing = await this.prisma.tenants.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ConflictException(`Tenant with slug "${slug}" already exists`);
    }

    const numLocations = Math.max(1, Math.min(20, data.numberOfLocations ?? 1));
    const defaultQuotas = {
      locations: numLocations,
      dive_sites: 15,
      boats: 10,
      users: 20,
      customers: 500,
    };
    const settings = {
      ...((data.settings as any) || {}),
      quotas: { ...defaultQuotas, ...((data.settings as any)?.quotas || {}) },
    };
    const tenant = await this.prisma.tenants.create({
      data: {
        slug,
        name: data.name,
        domain: data.domain ?? null,
        settings,
        is_active: true,
      },
    });

    // Create initial locations for the tenant
    const num = numLocations;
    const locationType = data.locationType || 'diving';
    for (let i = 1; i <= num; i++) {
      await this.prisma.locations.create({
        data: {
          tenant_id: tenant.id,
          name: num === 1 ? data.name : `${data.name} - Location ${i}`,
          type: locationType,
          address: {},
          contact_info: {},
          settings: {},
          is_active: true,
        },
      });
    }

    return this.prisma.tenants.findUnique({
      where: { id: tenant.id },
      include: { locations: true },
    });
  }

  async update(id: string, data: { slug?: string; name?: string; domain?: string; is_active?: boolean; settings?: object }) {
    await this.findOne(id);
    const updateData: any = {};
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.domain !== undefined) updateData.domain = data.domain;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.settings !== undefined) updateData.settings = data.settings;
    return this.prisma.tenants.update({
      where: { id },
      data: updateData,
    });
  }

  /** Soft delete (deactivate) or hard delete tenant. For demo: soft delete by default. */
  async delete(id: string, hard = false) {
    const tenant = await this.findOne(id);
    if (hard) {
      await this.prisma.tenants.delete({ where: { id } });
      return { deleted: true };
    }
    await this.prisma.tenants.update({
      where: { id },
      data: { is_active: false },
    });
    return { deactivated: true };
  }
}
