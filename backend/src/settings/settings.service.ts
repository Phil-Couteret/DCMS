import { ForbiddenException, Injectable } from '@nestjs/common';
import { DEFAULT_SETTINGS } from '../config/tenant-defaults.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantConfig } from '../tenant/tenant-config.service.js';
import { TenantContext } from '../tenant/tenant-context.service.js';
import { TenantsService } from '../tenant/tenants.service.js';
import { UpdatePricingDto } from './dto/update-pricing.dto.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { PricingService } from './pricing.service.js';

// Used when a tenant has no settings row; every tenant gets one when it is
// created (migration tenant_configuration for those before).
const DEFAULT_TAX_RATE = new Prisma.Decimal(DEFAULT_SETTINGS.taxRate);

// Settings that change how the whole center works (its days, money,
// branding and invoice series): admins only.
const ADMIN_FIELDS = [
  'timeZone',
  'currency',
  'defaultLanguage',
  'logoUrl',
  'primaryColor',
  'accentColor',
  'invoicePrefix',
  'partnerInvoicePrefix',
] as const;

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prices: PricingService,
    private readonly tenant: TenantContext,
    private readonly config: TenantConfig,
    private readonly tenants: TenantsService,
  ) {}

  // One row per tenant.
  async get() {
    const tenantId = await this.tenants.resolve();
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
        taxName: DEFAULT_SETTINGS.taxName,
        timeZone: DEFAULT_SETTINGS.timeZone,
        currency: DEFAULT_SETTINGS.currency,
        defaultLanguage: DEFAULT_SETTINGS.defaultLanguage,
        logoUrl: null,
        primaryColor: null,
        accentColor: null,
        invoicePrefix: DEFAULT_SETTINGS.invoicePrefix,
        partnerInvoicePrefix: DEFAULT_SETTINGS.partnerInvoicePrefix,
        updatedAt: null,
      }
    );
  }

  async update(dto: UpdateSettingsDto, isAdmin: boolean) {
    if (!isAdmin) {
      const current = await this.get();
      const changed = ADMIN_FIELDS.filter((k) => {
        const v = dto[k];
        return v !== undefined && String(v ?? '').toLowerCase() !== String(current[k] ?? '').toLowerCase();
      });
      if (changed.length > 0) throw new ForbiddenException(`Only an admin can change ${changed.join(', ')}`);
    }
    const data = {
      name: dto.name.trim(),
      legalName: dto.legalName?.trim() || null,
      address: dto.address?.trim() || null,
      phone: dto.phone?.trim() || null,
      email: dto.email?.trim().toLowerCase() || null,
      website: dto.website?.trim() || null,
      // Left out, these keep their current values.
      ...(dto.taxRate !== undefined && { taxRate: new Prisma.Decimal(dto.taxRate) }),
      ...(dto.taxName !== undefined && { taxName: dto.taxName.trim() }),
      ...(dto.timeZone !== undefined && { timeZone: dto.timeZone }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.defaultLanguage !== undefined && { defaultLanguage: dto.defaultLanguage }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl?.trim() || null }),
      ...(dto.primaryColor !== undefined && { primaryColor: dto.primaryColor?.toLowerCase() ?? null }),
      ...(dto.accentColor !== undefined && { accentColor: dto.accentColor?.toLowerCase() ?? null }),
      ...(dto.invoicePrefix !== undefined && { invoicePrefix: dto.invoicePrefix }),
      ...(dto.partnerInvoicePrefix !== undefined && { partnerInvoicePrefix: dto.partnerInvoicePrefix }),
    };
    const tenantId = this.tenant.tenantId;
    const row = await this.prisma.centerSettings.upsert({ where: { tenantId }, create: data, update: data });
    this.config.forget(tenantId);
    return row;
  }

  // What the public site shows of the center: its name, contact details,
  // branding and regional settings. Never the tax or numbering details.
  async publicView() {
    const s = await this.get();
    return {
      name: s.name,
      address: s.address,
      phone: s.phone,
      email: s.email,
      website: s.website,
      timeZone: s.timeZone,
      currency: s.currency,
      defaultLanguage: s.defaultLanguage,
      logoUrl: s.logoUrl,
      primaryColor: s.primaryColor,
      accentColor: s.accentColor,
    };
  }

  // The tax added to net prices on invoices; taxRate is a percentage.
  async tax() {
    const row = await this.prisma.centerSettings.findUnique({
      where: { tenantId: this.tenant.tenantId },
      select: { taxRate: true, taxName: true },
    });
    return row ?? { taxRate: DEFAULT_TAX_RATE, taxName: DEFAULT_SETTINGS.taxName };
  }

  // The price list invoices are built from, with the tax that is added to
  // it; taxRate is a percentage.
  async pricing() {
    const [{ taxRate, taxName }, prices, currency] = await Promise.all([
      this.tax(),
      this.prices.view(),
      this.config.currency(),
    ]);
    return { currency, taxName, taxRate: taxRate.toNumber(), ...prices };
  }

  async updatePricing(dto: UpdatePricingDto) {
    await this.prices.update(dto);
    return this.pricing();
  }
}
