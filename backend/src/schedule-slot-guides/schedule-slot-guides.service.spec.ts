import { NotFoundException } from '@nestjs/common';
import { ScheduleSlotGuidesService } from './schedule-slot-guides.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

// Phase 6.17 (roadmap): who's covering a Schedule slot (Mole time-slot or
// boat session), independent of any specific booking - previously never
// persisted at all (Schedule's `slotGuides` state was rebuilt from nothing
// on every reload). Covers tenant scoping, the location existence check in
// create(), and that update()/create() only touch the fields actually
// provided - same pattern as bookings.service.spec.ts.

const rawLocation = { id: 'loc-1', tenant_id: 'tenant-1' };
const rawRecord = {
  id: 'slot-guide-1',
  tenant_id: 'tenant-1',
  location_id: 'loc-1',
  date: new Date('2026-08-10'),
  slot_type: 'mole',
  slot_key: 'mole-2026-08-10-09-00',
  boat_id: null,
  guide_ids: ['staff-1'],
};

function makePrismaMock(overrides: Partial<Record<string, any>> = {}) {
  return {
    schedule_slot_guides: {
      findMany: overrides.findMany ?? jest.fn().mockResolvedValue([rawRecord]),
      findFirst: overrides.findFirst ?? jest.fn().mockResolvedValue(rawRecord),
      create: overrides.create ?? jest.fn().mockResolvedValue(rawRecord),
      update: overrides.update ?? jest.fn().mockResolvedValue(rawRecord),
      delete: overrides.delete ?? jest.fn().mockResolvedValue(rawRecord),
    },
    locations: {
      findFirst: overrides.locationsFindFirst ?? jest.fn().mockResolvedValue(rawLocation),
    },
  } as unknown as PrismaService;
}

function makeService(prisma: PrismaService, tenantId: string | null = null) {
  const tenantContext = { getTenantId: () => tenantId } as unknown as TenantContextService;
  return new ScheduleSlotGuidesService(prisma, tenantContext);
}

const baseCreateDto = () => ({
  locationId: 'loc-1',
  date: '2026-08-10',
  slotType: 'mole',
  slotKey: 'mole-2026-08-10-09-00',
  guideIds: ['staff-1'],
});

describe('ScheduleSlotGuidesService - tenant scoping', () => {
  it('findAll() scopes to the current tenant when one is set', async () => {
    const findMany = jest.fn().mockResolvedValue([rawRecord]);
    const service = makeService(makePrismaMock({ findMany }), 'tenant-1');
    await service.findAll();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenant_id: 'tenant-1' }) }),
    );
  });

  it('findAll() applies no tenant filter for a superadmin (no tenant in context)', async () => {
    const findMany = jest.fn().mockResolvedValue([rawRecord]);
    const service = makeService(makePrismaMock({ findMany }), null);
    await service.findAll();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});

describe('ScheduleSlotGuidesService - findByLocationAndDate()', () => {
  it('filters by both locationId and date when both are provided', async () => {
    const findMany = jest.fn().mockResolvedValue([rawRecord]);
    const service = makeService(makePrismaMock({ findMany }));
    await service.findByLocationAndDate('loc-1', '2026-08-10');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ location_id: 'loc-1', date: new Date('2026-08-10') }),
      }),
    );
  });
});

describe('ScheduleSlotGuidesService - findOne', () => {
  it('throws NotFoundException when the record does not exist (or belongs to another tenant)', async () => {
    const service = makeService(
      makePrismaMock({ findFirst: jest.fn().mockResolvedValue(null) }),
    );
    await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
  });
});

describe('ScheduleSlotGuidesService - create()', () => {
  it('throws NotFoundException when the location does not exist', async () => {
    const service = makeService(
      makePrismaMock({ locationsFindFirst: jest.fn().mockResolvedValue(null) }),
    );
    await expect(service.create(baseCreateDto() as any)).rejects.toThrow(NotFoundException);
  });

  it('defaults boatId to null for Mole slots', async () => {
    const create = jest.fn().mockResolvedValue(rawRecord);
    const service = makeService(makePrismaMock({ create }));
    await service.create(baseCreateDto() as any);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ boat_id: null, slot_type: 'mole' }) }),
    );
  });

  it('persists boatId for boat slots', async () => {
    const create = jest.fn().mockResolvedValue(rawRecord);
    const service = makeService(makePrismaMock({ create }));
    await service.create({
      ...baseCreateDto(),
      slotType: 'boat',
      slotKey: 'boat-boat-1-2026-08-10-morning',
      boatId: 'boat-1',
    } as any);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ boat_id: 'boat-1', slot_type: 'boat' }) }),
    );
  });
});

describe('ScheduleSlotGuidesService - update()', () => {
  it('only includes fields that were actually provided (partial update)', async () => {
    const update = jest.fn().mockResolvedValue(rawRecord);
    const service = makeService(makePrismaMock({ update }));
    await service.update('slot-guide-1', { guideIds: ['staff-2'] } as any);
    const dataArg = update.mock.calls[0][0].data;
    expect(dataArg).toEqual({ guide_ids: ['staff-2'] });
  });

  it('404s before attempting the update when the record does not exist', async () => {
    const service = makeService(
      makePrismaMock({ findFirst: jest.fn().mockResolvedValue(null) }),
    );
    await expect(service.update('missing-id', { guideIds: [] } as any)).rejects.toThrow(NotFoundException);
  });
});

describe('ScheduleSlotGuidesService - remove()', () => {
  it('404s before attempting the delete when the record does not exist', async () => {
    const service = makeService(
      makePrismaMock({ findFirst: jest.fn().mockResolvedValue(null) }),
    );
    await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);
  });

  it('deletes the record when it exists', async () => {
    const del = jest.fn().mockResolvedValue(rawRecord);
    const service = makeService(makePrismaMock({ delete: del }));
    await service.remove('slot-guide-1');
    expect(del).toHaveBeenCalledWith({ where: { id: 'slot-guide-1' } });
  });
});
