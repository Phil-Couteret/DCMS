import { NotFoundException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

// Phase 6.6 (roadmap item 6, targeted test-coverage expansion): Bookings is
// the most central business entity in DCMS - every booking sets the price
// customers are charged and every location's revenue - yet it had zero
// tests. This covers the logic that isn't just a Prisma passthrough:
// activity-type mapping (including the "unknown type silently defaults to
// diving" fallback), the "account" -> "deferred" payment-method remap
// (twice - create and update independently reimplement it), tenant
// scoping (tenantFilter()), and the customer/location existence checks in
// create().

const rawCustomer = { id: 'cust-1', tenant_id: 'tenant-1' };
const rawLocation = { id: 'loc-1', tenant_id: 'tenant-1' };
const rawBooking = {
  id: 'booking-1',
  tenant_id: 'tenant-1',
  customer_id: 'cust-1',
  location_id: 'loc-1',
  booking_date: new Date('2026-08-10'),
  activity_type: 'diving',
  number_of_dives: 1,
  price: 46,
  total_price: 46,
  status: 'pending',
};

function makePrismaMock(overrides: Partial<Record<string, any>> = {}) {
  return {
    bookings: {
      findMany: overrides.bookingsFindMany ?? jest.fn().mockResolvedValue([rawBooking]),
      findFirst: overrides.bookingsFindFirst ?? jest.fn().mockResolvedValue(rawBooking),
      create: overrides.bookingsCreate ?? jest.fn().mockResolvedValue(rawBooking),
      update: overrides.bookingsUpdate ?? jest.fn().mockResolvedValue(rawBooking),
      delete: overrides.bookingsDelete ?? jest.fn().mockResolvedValue(rawBooking),
    },
    customers: {
      findFirst: overrides.customersFindFirst ?? jest.fn().mockResolvedValue(rawCustomer),
    },
    locations: {
      findFirst: overrides.locationsFindFirst ?? jest.fn().mockResolvedValue(rawLocation),
    },
  } as unknown as PrismaService;
}

function makeService(prisma: PrismaService, tenantId: string | null = null) {
  const tenantContext = { getTenantId: () => tenantId } as unknown as TenantContextService;
  return new BookingsService(prisma, tenantContext);
}

const baseCreateDto = () => ({
  customerId: 'cust-1',
  locationId: 'loc-1',
  bookingDate: '2026-08-10',
  activityType: 'diving',
  price: 46,
  totalPrice: 46,
});

describe('BookingsService - tenant scoping', () => {
  it('findAll() scopes to the current tenant when one is set', async () => {
    const findMany = jest.fn().mockResolvedValue([rawBooking]);
    const service = makeService(makePrismaMock({ bookingsFindMany: findMany }), 'tenant-1');
    await service.findAll();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenant_id: 'tenant-1' }) }),
    );
  });

  it('findAll() applies no tenant filter for a superadmin (no tenant in context)', async () => {
    const findMany = jest.fn().mockResolvedValue([rawBooking]);
    const service = makeService(makePrismaMock({ bookingsFindMany: findMany }), null);
    await service.findAll();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});

// Phase 6.8 (roadmap item 10): pagination is opt-in - omitting skip/take
// must keep findMany() exactly as it was (no skip/take keys at all), since
// dataService.getAll() on the frontend never passes them and still expects
// the full unbounded array.
describe('BookingsService - pagination (roadmap item 10, opt-in only)', () => {
  it('findAll() passes no skip/take to Prisma when pagination is omitted', async () => {
    const findMany = jest.fn().mockResolvedValue([rawBooking]);
    const service = makeService(makePrismaMock({ bookingsFindMany: findMany }));
    await service.findAll();
    const arg = findMany.mock.calls[0][0];
    expect(arg).not.toHaveProperty('skip');
    expect(arg).not.toHaveProperty('take');
  });

  it('findAll() forwards skip/take through to Prisma when provided', async () => {
    const findMany = jest.fn().mockResolvedValue([rawBooking]);
    const service = makeService(makePrismaMock({ bookingsFindMany: findMany }));
    await service.findAll({ skip: 20, take: 50 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 50 }),
    );
  });

  it('findByDate() and findByCustomer() also forward skip/take when provided', async () => {
    const findMany = jest.fn().mockResolvedValue([rawBooking]);
    const service = makeService(makePrismaMock({ bookingsFindMany: findMany }));

    await service.findByDate('2026-08-10', { take: 10 });
    expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 10 }));

    await service.findByCustomer('cust-1', { skip: 5 });
    expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 5 }));
  });
});

describe('BookingsService - findOne', () => {
  it('returns the booking when found', async () => {
    const service = makeService(makePrismaMock());
    const result = await service.findOne('booking-1');
    expect(result).toEqual(rawBooking);
  });

  it('throws NotFoundException when the booking does not exist (or belongs to another tenant)', async () => {
    const service = makeService(
      makePrismaMock({ bookingsFindFirst: jest.fn().mockResolvedValue(null) }),
    );
    await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
  });
});

describe('BookingsService - create() validation', () => {
  it('throws NotFoundException when the customer does not exist', async () => {
    const service = makeService(
      makePrismaMock({ customersFindFirst: jest.fn().mockResolvedValue(null) }),
    );
    await expect(service.create(baseCreateDto() as any)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when the location does not exist', async () => {
    const service = makeService(
      makePrismaMock({ locationsFindFirst: jest.fn().mockResolvedValue(null) }),
    );
    await expect(service.create(baseCreateDto() as any)).rejects.toThrow(NotFoundException);
  });

  it('scopes the customer/location existence checks to the current tenant', async () => {
    const customersFindFirst = jest.fn().mockResolvedValue(rawCustomer);
    const locationsFindFirst = jest.fn().mockResolvedValue(rawLocation);
    const service = makeService(
      makePrismaMock({ customersFindFirst, locationsFindFirst }),
      'tenant-1',
    );
    await service.create(baseCreateDto() as any);
    expect(customersFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'cust-1', tenant_id: 'tenant-1' }) }),
    );
    expect(locationsFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'loc-1', tenant_id: 'tenant-1' }) }),
    );
  });
});

describe('BookingsService - create() activity type mapping', () => {
  const cases: Array<[string, string]> = [
    ['scuba_diving', 'diving'],
    ['discover_scuba', 'discovery'],
    ['discover', 'discovery'],
    ['dive_course', 'specialty'],
    ['snorkeling', 'snorkeling'],
    ['try_dive', 'try_dive'],
    // Already-valid enum values pass through unchanged.
    ['diving', 'diving'],
    ['discovery', 'discovery'],
    ['specialty', 'specialty'],
  ];

  it.each(cases)('maps frontend activityType "%s" to Prisma enum "%s"', async (input, expected) => {
    const create = jest.fn().mockResolvedValue(rawBooking);
    const service = makeService(makePrismaMock({ bookingsCreate: create }));
    await service.create({ ...baseCreateDto(), activityType: input } as any);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ activity_type: expected }) }),
    );
  });

  it('defaults an unrecognized activityType to "diving" rather than rejecting the booking', async () => {
    // This is a deliberate product decision (see the Logger.warn in
    // mapActivityType), not an oversight - locking it down so a future
    // "let's just throw instead" refactor is a visible, intentional
    // change rather than an accidental one.
    const create = jest.fn().mockResolvedValue(rawBooking);
    const service = makeService(makePrismaMock({ bookingsCreate: create }));
    await service.create({ ...baseCreateDto(), activityType: 'paragliding' } as any);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ activity_type: 'diving' }) }),
    );
  });
});

describe('BookingsService - "account" payment method remap', () => {
  it('create() remaps "account" to "deferred" (there is no "account" value in the payment_method enum)', async () => {
    const create = jest.fn().mockResolvedValue(rawBooking);
    const service = makeService(makePrismaMock({ bookingsCreate: create }));
    await service.create({ ...baseCreateDto(), paymentMethod: 'account' } as any);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ payment_method: 'deferred' }) }),
    );
  });

  it('update() also remaps "account" to "deferred"', async () => {
    const update = jest.fn().mockResolvedValue(rawBooking);
    const service = makeService(makePrismaMock({ bookingsUpdate: update }));
    await service.update('booking-1', { paymentMethod: 'account' } as any);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ payment_method: 'deferred' }) }),
    );
  });

  it('create() leaves other payment methods untouched', async () => {
    const create = jest.fn().mockResolvedValue(rawBooking);
    const service = makeService(makePrismaMock({ bookingsCreate: create }));
    await service.create({ ...baseCreateDto(), paymentMethod: 'cash' } as any);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ payment_method: 'cash' }) }),
    );
  });
});

describe('BookingsService - update()', () => {
  it('404s via findOne() before attempting the update when the booking does not exist', async () => {
    const service = makeService(
      makePrismaMock({ bookingsFindFirst: jest.fn().mockResolvedValue(null) }),
    );
    await expect(service.update('missing-id', { status: 'confirmed' } as any)).rejects.toThrow(NotFoundException);
  });

  it('only includes fields that were actually provided (partial update)', async () => {
    const update = jest.fn().mockResolvedValue(rawBooking);
    const service = makeService(makePrismaMock({ bookingsUpdate: update }));
    await service.update('booking-1', { status: 'confirmed' } as any);
    const dataArg = update.mock.calls[0][0].data;
    expect(dataArg).toEqual({ status: 'confirmed' });
    expect(dataArg).not.toHaveProperty('price');
    expect(dataArg).not.toHaveProperty('customer_id');
  });

  it('maps activityType on update the same way as on create', async () => {
    const update = jest.fn().mockResolvedValue(rawBooking);
    const service = makeService(makePrismaMock({ bookingsUpdate: update }));
    await service.update('booking-1', { activityType: 'discover_scuba' } as any);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ activity_type: 'discovery' }) }),
    );
  });
});

describe('BookingsService - remove()', () => {
  it('404s via findOne() before attempting the delete when the booking does not exist', async () => {
    const service = makeService(
      makePrismaMock({ bookingsFindFirst: jest.fn().mockResolvedValue(null) }),
    );
    await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);
  });

  it('deletes the booking when it exists', async () => {
    const del = jest.fn().mockResolvedValue(rawBooking);
    const service = makeService(makePrismaMock({ bookingsDelete: del }));
    await service.remove('booking-1');
    expect(del).toHaveBeenCalledWith({ where: { id: 'booking-1' } });
  });
});
