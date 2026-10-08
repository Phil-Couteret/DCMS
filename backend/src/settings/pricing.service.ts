import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ACTIVITY_KEYS,
  EQUIPMENT_ITEMS,
  FULL_PACKAGE_KEY,
  type ActivityKey,
  type EquipmentKey,
  type PriceList,
} from '../config/catalogue.js';
import { ActivityType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantContext } from '../tenant/tenant-context.service.js';
import { UpdatePricingDto } from './dto/update-pricing.dto.js';

const ACTIVITY_ENTRIES = Object.entries(ACTIVITY_KEYS) as [ActivityKey, ActivityType][];
const EQUIPMENT_KEYS = Object.keys(EQUIPMENT_ITEMS) as EquipmentKey[];

// The price list in the database. Read on every invoice, so a change applies
// to the next invoice at once; invoices already issued keep their prices.
@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContext,
  ) {}

  async current(): Promise<PriceList> {
    const [activities, equipment, tiers] = await this.prisma.$transaction([
      this.prisma.activityPrice.findMany(),
      this.prisma.equipmentPrice.findMany(),
      this.prisma.funDiveTier.findMany({ orderBy: { minDives: 'asc' } }),
    ]);
    const activityPrice = new Map(activities.map((a) => [a.activityType, a.price.toNumber()]));
    const equipmentPrice = new Map(equipment.map((e) => [e.key, e.price.toNumber()]));
    // The migration fills every row and saves replace them all, so a gap is
    // a broken database rather than a price of 0.
    const required = (key: string) => {
      const price = equipmentPrice.get(key);
      if (price === undefined) throw new Error(`EquipmentPrice ${key} is missing`);
      return price;
    };
    if (tiers.length === 0) throw new Error('FunDiveTier is empty');
    return {
      activities: Object.fromEntries(
        Object.values(ActivityType).map((t) => [t, activityPrice.get(t) ?? null]),
      ) as PriceList['activities'],
      equipment: Object.fromEntries(EQUIPMENT_KEYS.map((k) => [k, required(k)])) as PriceList['equipment'],
      fullPackage: required(FULL_PACKAGE_KEY),
      funDiveTiers: tiers.map((t) => ({
        minDives: t.minDives,
        tourist: t.tourist.toNumber(),
        local: t.local.toNumber(),
        recurrent: t.recurrent.toNumber(),
      })),
    };
  }

  // The price list in the API's shape: activities and equipment by key.
  async view() {
    const prices = await this.current();
    return {
      activities: Object.fromEntries(ACTIVITY_ENTRIES.map(([key, type]) => [key, prices.activities[type]])) as Record<
        ActivityKey,
        number | null
      >,
      equipment: { ...prices.equipment, fullPackage: prices.fullPackage },
      funDiveTiers: prices.funDiveTiers,
    };
  }

  // Replaces the whole price list in one transaction.
  async update(dto: UpdatePricingDto) {
    const tiers = [...dto.funDiveTiers].sort((a, b) => a.minDives - b.minDives);
    if (tiers[0].minDives !== 1) throw new BadRequestException('The first fun dive tier must start at 1 dive');
    if (new Set(tiers.map((t) => t.minDives)).size !== tiers.length) {
      throw new BadRequestException('Two fun dive tiers start at the same number of dives');
    }
    const priced = ACTIVITY_ENTRIES.filter(([key]) => dto.activities[key] !== null);
    const equipment = [...EQUIPMENT_KEYS, FULL_PACKAGE_KEY] as (keyof typeof dto.equipment)[];
    const tenantId = this.tenant.tenantId;

    await this.prisma.$transaction([
      this.prisma.activityPrice.deleteMany({
        where: { activityType: { notIn: priced.map(([, type]) => type) } },
      }),
      ...priced.map(([key, activityType]) =>
        this.prisma.activityPrice.upsert({
          where: { tenantId_activityType: { tenantId, activityType } },
          create: { activityType, price: dto.activities[key]! },
          update: { price: dto.activities[key]! },
        }),
      ),
      ...equipment.map((key) =>
        this.prisma.equipmentPrice.upsert({
          where: { tenantId_key: { tenantId, key } },
          create: { key, price: dto.equipment[key] },
          update: { price: dto.equipment[key] },
        }),
      ),
      this.prisma.funDiveTier.deleteMany({ where: { minDives: { notIn: tiers.map((t) => t.minDives) } } }),
      ...tiers.map(({ minDives, tourist, local, recurrent }) =>
        this.prisma.funDiveTier.upsert({
          where: { tenantId_minDives: { tenantId, minDives } },
          create: { minDives, tourist, local, recurrent },
          update: { tourist, local, recurrent },
        }),
      ),
    ]);
    return this.view();
  }
}
