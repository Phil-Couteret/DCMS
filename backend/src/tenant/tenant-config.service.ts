import { Injectable } from '@nestjs/common';
import { DEFAULT_SETTINGS } from '../config/tenant-defaults.js';
import { Language } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantsService } from './tenants.service.js';

const CACHE_MS = 30_000;

export interface CenterConfig {
  timeZone: string;
  currency: string;
  defaultLanguage: Language;
  invoicePrefix: string;
  partnerInvoicePrefix: string;
}

// The current tenant's regional settings (CenterSettings), which services
// need on many requests: its time zone, currency, default language and
// invoice prefixes. Cached for 30 seconds per tenant; SettingsService
// forgets a tenant when its settings are saved.
@Injectable()
export class TenantConfig {
  private cache = new Map<string, { value: CenterConfig; at: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
  ) {}

  async get(): Promise<CenterConfig> {
    const tenantId = this.tenants.resolve();
    const hit = this.cache.get(tenantId);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
    const row = await this.prisma.centerSettings.findUnique({
      where: { tenantId },
      select: { timeZone: true, currency: true, defaultLanguage: true, invoicePrefix: true, partnerInvoicePrefix: true },
    });
    const value: CenterConfig = row ?? {
      timeZone: DEFAULT_SETTINGS.timeZone,
      currency: DEFAULT_SETTINGS.currency,
      defaultLanguage: DEFAULT_SETTINGS.defaultLanguage,
      invoicePrefix: DEFAULT_SETTINGS.invoicePrefix,
      partnerInvoicePrefix: DEFAULT_SETTINGS.partnerInvoicePrefix,
    };
    this.cache.set(tenantId, { value, at: Date.now() });
    return value;
  }

  async timeZone() {
    return (await this.get()).timeZone;
  }

  async currency() {
    return (await this.get()).currency;
  }

  forget(tenantId: string) {
    this.cache.delete(tenantId);
  }
}
