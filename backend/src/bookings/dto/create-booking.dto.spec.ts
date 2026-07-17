import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBookingDto } from './create-booking.dto';

// Mirrors the global ValidationPipe options in main.ts (whitelist,
// forbidNonWhitelisted, transform) so this test actually exercises the
// same validation behavior a real request would hit.
async function validatePayload(payload: Record<string, unknown>) {
  const instance = plainToInstance(CreateBookingDto, payload, {
    excludeExtraneousValues: false,
  });
  return validate(instance, { whitelist: true, forbidNonWhitelisted: true });
}

const validPayload = {
  customerId: '11111111-1111-4111-8111-111111111111',
  locationId: '22222222-2222-4222-8222-222222222222',
  bookingDate: '2026-08-01',
  activityType: 'diving',
  price: 50,
  totalPrice: 50,
};

describe('CreateBookingDto validation', () => {
  it('accepts a valid payload', async () => {
    const errors = await validatePayload(validPayload);
    expect(errors).toHaveLength(0);
  });

  it('accepts frontend activityType aliases (not a strict enum - see comment in the DTO)', async () => {
    const errors = await validatePayload({ ...validPayload, activityType: 'scuba_diving' });
    expect(errors).toHaveLength(0);
  });

  it('rejects a missing required field (customerId)', async () => {
    const { customerId, ...rest } = validPayload;
    const errors = await validatePayload(rest);
    expect(errors.some((e) => e.property === 'customerId')).toBe(true);
  });

  it('rejects a non-UUID customerId', async () => {
    const errors = await validatePayload({ ...validPayload, customerId: 'not-a-uuid' });
    expect(errors.some((e) => e.property === 'customerId')).toBe(true);
  });

  it('rejects an invalid paymentMethod enum value', async () => {
    const errors = await validatePayload({ ...validPayload, paymentMethod: 'bitcoin' });
    expect(errors.some((e) => e.property === 'paymentMethod')).toBe(true);
  });

  it('rejects negative price', async () => {
    const errors = await validatePayload({ ...validPayload, price: -10 });
    expect(errors.some((e) => e.property === 'price')).toBe(true);
  });

  it('rejects an unexpected extra field (forbidNonWhitelisted)', async () => {
    const errors = await validatePayload({ ...validPayload, notARealField: 'x' });
    expect(errors.length).toBeGreaterThan(0);
  });
});
