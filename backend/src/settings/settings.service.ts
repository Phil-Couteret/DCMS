import { Injectable } from '@nestjs/common';
import {
  ACTIVITY_NAMES,
  ACTIVITY_PRICES,
  EQUIPMENT_PRICES,
  FULL_PACKAGE_PRICE,
} from '../config/prices.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';

const ID = 'center';

// Used until the settings are first saved; the same as the column defaults.
const DEFAULT_TAX_RATE = new Prisma.Decimal('7.00');
const DEFAULT_TAX_NAME = 'IGIC';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // Before the first save there is no row; empty values are returned instead.
  async get() {
    const row = await this.prisma.centerSettings.findUnique({ where: { id: ID } });
    return (
      row ?? {
        id: ID,
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
    return this.prisma.centerSettings.upsert({ where: { id: ID }, create: { id: ID, ...data }, update: data });
  }

  // The tax added to net prices on invoices; taxRate is a percentage.
  async tax() {
    const row = await this.prisma.centerSettings.findUnique({
      where: { id: ID },
      select: { taxRate: true, taxName: true },
    });
    return row ?? { taxRate: DEFAULT_TAX_RATE, taxName: DEFAULT_TAX_NAME };
  }

  // The price list invoices are built from (config/prices.ts). Read-only:
  // prices change in code, together with the public site's catalogue. The tax
  // comes from the settings; taxRate is a percentage.
  async pricing() {
    const { taxRate, taxName } = await this.tax();
    return {
      currency: 'EUR',
      taxName,
      taxRate: taxRate.toNumber(),
      activities: Object.entries(ACTIVITY_NAMES).map(([activityType, name]) => ({
        activityType,
        name,
        price: ACTIVITY_PRICES[activityType as keyof typeof ACTIVITY_PRICES] ?? null,
      })),
      equipment: Object.entries(EQUIPMENT_PRICES).map(([key, { name, price }]) => ({ key, name, price })),
      fullEquipmentPackage: FULL_PACKAGE_PRICE,
    };
  }
}
