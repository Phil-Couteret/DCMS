import type { Prisma } from '../generated/prisma/client.js';
import { ActivityType, Language } from '../generated/prisma/enums.js';

// What a new tenant starts with, and what is assumed for a tenant whose
// settings row is missing. The values are the first center's (Canary
// Islands, IGIC at 7%); onboarding can override the regional ones.
export const DEFAULT_SETTINGS = {
  timeZone: 'Atlantic/Canary',
  currency: 'EUR',
  defaultLanguage: Language.EN as Language,
  taxRate: '7.00',
  taxName: 'IGIC',
  invoicePrefix: 'INV',
  partnerInvoicePrefix: 'PINV',
};

// The price list a new tenant starts from, net of tax, in its currency.
// Staff adjust it in Settings → Pricing.
export const DEFAULT_PRICE_LIST = {
  activities: [
    [ActivityType.SNORKELING, 25],
    [ActivityType.DISCOVER_SCUBA, 60],
    [ActivityType.FUN_DIVE, 45],
    [ActivityType.OW_CERT, 350],
    [ActivityType.AOW_CERT, 280],
    [ActivityType.RESCUE_CERT, 320],
  ] as [ActivityType, number][],
  equipment: [
    ['wetsuit', 8],
    ['bcd', 10],
    ['regulator', 10],
    ['maskFins', 5],
    ['diveComputer', 12],
    ['fullPackage', 35],
  ] as [string, number][],
  funDiveTiers: [
    { minDives: 1, tourist: 46, local: 35, recurrent: 32 },
    { minDives: 3, tourist: 44, local: 35, recurrent: 32 },
    { minDives: 6, tourist: 42, local: 35, recurrent: 32 },
    { minDives: 9, tourist: 40, local: 35, recurrent: 32 },
    { minDives: 13, tourist: 38, local: 35, recurrent: 32 },
  ],
};

export interface TenantSetup {
  name: string;
  timeZone?: string;
  currency?: string;
  defaultLanguage?: Language;
  taxRate?: number;
  taxName?: string;
}

type Db = Pick<Prisma.TransactionClient, 'centerSettings' | 'activityPrice' | 'equipmentPrice' | 'funDiveTier'>;

// A new tenant's settings row and price list, so it can price and invoice
// from day one. Runs in the new tenant's context (runInTenant), inside the
// transaction that creates the tenant.
export async function seedTenantDefaults(db: Db, setup: TenantSetup) {
  await db.centerSettings.create({
    data: {
      name: setup.name,
      timeZone: setup.timeZone ?? DEFAULT_SETTINGS.timeZone,
      currency: setup.currency ?? DEFAULT_SETTINGS.currency,
      defaultLanguage: setup.defaultLanguage ?? DEFAULT_SETTINGS.defaultLanguage,
      taxRate: setup.taxRate ?? DEFAULT_SETTINGS.taxRate,
      taxName: setup.taxName ?? DEFAULT_SETTINGS.taxName,
    },
  });
  await db.activityPrice.createMany({
    data: DEFAULT_PRICE_LIST.activities.map(([activityType, price]) => ({ activityType, price })),
  });
  await db.equipmentPrice.createMany({ data: DEFAULT_PRICE_LIST.equipment.map(([key, price]) => ({ key, price })) });
  await db.funDiveTier.createMany({ data: DEFAULT_PRICE_LIST.funDiveTiers });
}

// Valid IANA time zones and ISO 4217 currencies, as this runtime knows them.
export const TIME_ZONES = new Set([...Intl.supportedValuesOf('timeZone'), 'UTC']);
export const CURRENCIES = new Set(Intl.supportedValuesOf('currency'));
