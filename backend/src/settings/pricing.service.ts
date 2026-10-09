import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ACTIVITY_KEYS,
  ADD_ON_KEYS,
  EQUIPMENT_ITEMS,
  INSURANCE_KEYS,
  FULL_PACKAGE_KEY,
  type ActivityKey,
  type EquipmentKey,
  type PriceList,
} from '../config/catalogue.js';
import { ActivityType, BookingAddOn, InsurancePeriod } from '../generated/prisma/enums.js';
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
    const [activities, equipment, tiers, addOns, packs, insurance] = await this.prisma.$transaction([
      this.prisma.activityPrice.findMany(),
      this.prisma.equipmentPrice.findMany(),
      this.prisma.funDiveTier.findMany({ orderBy: { minDives: 'asc' } }),
      this.prisma.addOnPrice.findMany(),
      this.prisma.divePack.findMany({ orderBy: { diveCount: 'asc' } }),
      this.prisma.insurancePrice.findMany(),
    ]);
    const insurancePrice = new Map(insurance.map((i) => [i.period, i.price.toNumber()]));
    const addOnPrice = new Map(addOns.map((a) => [a.addOn, a.price.toNumber()]));
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
      addOns: Object.fromEntries(
        Object.values(BookingAddOn).map((a) => {
          const price = addOnPrice.get(a);
          if (price === undefined) throw new Error(`AddOnPrice ${a} is missing`);
          return [a, price];
        }),
      ) as PriceList['addOns'],
      divePacks: packs.map((p) => ({ diveCount: p.diveCount, price: p.price.toNumber() })),
      insurance: Object.fromEntries(
        Object.values(InsurancePeriod).map((p) => {
          const price = insurancePrice.get(p);
          if (price === undefined) throw new Error(`InsurancePrice ${p} is missing`);
          return [p, price];
        }),
      ) as PriceList['insurance'],
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
      addOns: Object.fromEntries(Object.entries(ADD_ON_KEYS).map(([key, a]) => [key, prices.addOns[a]])) as Record<
        keyof typeof ADD_ON_KEYS,
        number
      >,
      divePacks: prices.divePacks,
      insurance: Object.fromEntries(Object.entries(INSURANCE_KEYS).map(([key, p]) => [key, prices.insurance[p]])) as Record<
        keyof typeof INSURANCE_KEYS,
        number
      >,
    };
  }

  // Replaces the whole price list in one transaction.
  async update(dto: UpdatePricingDto) {
    const tiers = [...dto.funDiveTiers].sort((a, b) => a.minDives - b.minDives);
    if (tiers[0].minDives !== 1) throw new BadRequestException('The first fun dive tier must start at 1 dive');
    if (new Set(tiers.map((t) => t.minDives)).size !== tiers.length) {
      throw new BadRequestException('Two fun dive tiers start at the same number of dives');
    }
    const packs = dto.divePacks && [...dto.divePacks].sort((a, b) => a.diveCount - b.diveCount);
    if (packs && new Set(packs.map((p) => p.diveCount)).size !== packs.length) {
      throw new BadRequestException('Two dive packs have the same number of dives');
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
      // Left out, add-on prices, insurance prices and packs stay as they are.
      ...(dto.insurance
        ? (Object.entries(INSURANCE_KEYS) as [keyof typeof INSURANCE_KEYS, InsurancePeriod][]).map(([key, period]) =>
            this.prisma.insurancePrice.upsert({
              where: { tenantId_period: { tenantId, period } },
              create: { period, price: dto.insurance![key] },
              update: { price: dto.insurance![key] },
            }),
          )
        : []),
      ...(dto.addOns
        ? (Object.entries(ADD_ON_KEYS) as [keyof typeof ADD_ON_KEYS, BookingAddOn][]).map(([key, addOn]) =>
            this.prisma.addOnPrice.upsert({
              where: { tenantId_addOn: { tenantId, addOn } },
              create: { addOn, price: dto.addOns![key] },
              update: { price: dto.addOns![key] },
            }),
          )
        : []),
      ...(packs
        ? [
            this.prisma.divePack.deleteMany({ where: { diveCount: { notIn: packs.map((p) => p.diveCount) } } }),
            ...packs.map(({ diveCount, price }) =>
              this.prisma.divePack.upsert({
                where: { tenantId_diveCount: { tenantId, diveCount } },
                create: { diveCount, price },
                update: { price },
              }),
            ),
          ]
        : []),
    ]);
    return this.view();
  }
}
