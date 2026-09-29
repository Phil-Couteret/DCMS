import { Injectable } from '@nestjs/common';
import {
  ACTIVITY_NAMES,
  ACTIVITY_PRICES,
  EQUIPMENT_PRICES,
  FULL_PACKAGE_PRICE,
  IGIC_RATE,
} from '../config/prices.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';

const ID = 'center';

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
    };
    return this.prisma.centerSettings.upsert({ where: { id: ID }, create: { id: ID, ...data }, update: data });
  }

  // The price list invoices are built from (config/prices.ts). Read-only:
  // prices change in code, together with the public site's catalogue.
  pricing() {
    return {
      currency: 'EUR',
      taxName: 'IGIC',
      taxRate: IGIC_RATE,
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
