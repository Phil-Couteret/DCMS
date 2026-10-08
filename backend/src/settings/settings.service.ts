import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantContext } from '../tenant/tenant-context.service.js';
import { UpdatePricingDto } from './dto/update-pricing.dto.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { PricingService } from './pricing.service.js';

// Used until the settings are first saved; the same as the column defaults.
const DEFAULT_TAX_RATE = new Prisma.Decimal('7.00');
const DEFAULT_TAX_NAME = 'IGIC';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prices: PricingService,
    private readonly tenant: TenantContext,
  ) {}

  // One row per tenant. Before its first save there is no row; empty values
  // are returned instead.
  async get() {
    const tenantId = this.tenant.tenantId;
    const row = await this.prisma.centerSettings.findUnique({ where: { tenantId } });
    return (
      row ?? {
        tenantId,
        name: '',
        legalName: null,
        address: null,
        phone: null,
        email: null,
        website: null,
        taxRate: DEFAULT_TAX_RATE,
        taxName: DEFAULT_TAX_NAME,
        updatedAt: null,
      }
    );
  }

  update(dto: UpdateSettingsDto) {
    const data = {
      name: dto.name.trim(),
      legalName: dto.legalName?.trim() || null,
      address: dto.address?.trim() || null,
      phone: dto.phone?.trim() || null,
      email: dto.email?.trim().toLowerCase() || null,
      website: dto.website?.trim() || null,
      // Left out, the tax fields keep their current values.
      ...(dto.taxRate !== undefined && { taxRate: new Prisma.Decimal(dto.taxRate) }),
      ...(dto.taxName !== undefined && { taxName: dto.taxName.trim() }),
    };
    const tenantId = this.tenant.tenantId;
    return this.prisma.centerSettings.upsert({ where: { tenantId }, create: data, update: data });
  }

  // The tax added to net prices on invoices; taxRate is a percentage.
  async tax() {
    const row = await this.prisma.centerSettings.findUnique({
      where: { tenantId: this.tenant.tenantId },
      select: { taxRate: true, taxName: true },
    });
    return row ?? { taxRate: DEFAULT_TAX_RATE, taxName: DEFAULT_TAX_NAME };
  }

  // The price list invoices are built from, with the tax that is added to
  // it; taxRate is a percentage.
  async pricing() {
    const [{ taxRate, taxName }, prices] = await Promise.all([this.tax(), this.prices.view()]);
    return { currency: 'EUR', taxName, taxRate: taxRate.toNumber(), ...prices };
  }

  async updatePricing(dto: UpdatePricingDto) {
    await this.prices.update(dto);
    return this.pricing();
  }
}
