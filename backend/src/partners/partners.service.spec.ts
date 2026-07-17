// bcrypt ships a native binary; jest.mock replaces the module before
// PartnersService imports it, so this spec never touches the real binding.
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-secret'),
  compare: jest.fn().mockResolvedValue(true),
}));

import { PartnersService } from './partners.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

const rawPartner = {
  id: '33333333-3333-4333-8333-333333333333',
  tenant_id: null,
  name: 'Test Partner',
  company_name: 'Test Co',
  contact_email: 'partner@example.com',
  contact_phone: null,
  webhook_url: null,
  commission_rate: 10,
  allowed_locations: [],
  api_key: 'dcms_partner_abc123',
  api_secret_hash: '$2b$10$supersecretapisecrethash',
  settings: {},
  is_active: true,
  created_at: new Date(),
};

function makePrismaMock(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    partners: {
      findMany: overrides.findMany ?? jest.fn().mockResolvedValue([rawPartner]),
      findFirst: overrides.findFirst ?? jest.fn().mockResolvedValue(rawPartner),
      findUnique: overrides.findUnique ?? jest.fn().mockResolvedValue(null),
      create: overrides.create ?? jest.fn().mockResolvedValue(rawPartner),
      update: overrides.update ?? jest.fn().mockResolvedValue(rawPartner),
      delete: overrides.delete ?? jest.fn().mockResolvedValue(rawPartner),
    },
  } as unknown as PrismaService;
}

function makeService(prisma: PrismaService) {
  const tenantContext = { getTenantId: () => null } as unknown as TenantContextService;
  return new PartnersService(prisma, tenantContext);
}

describe('PartnersService - api_secret_hash never leaves the service', () => {
  it('findAll() strips api_secret_hash from every partner', async () => {
    const service = makeService(makePrismaMock());
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('api_secret_hash');
  });

  it('findOne() strips api_secret_hash', async () => {
    const service = makeService(makePrismaMock());
    const result = await service.findOne(rawPartner.id);
    expect(result).not.toHaveProperty('api_secret_hash');
  });

  it('create() strips api_secret_hash but still returns the one-time plaintext apiSecret', async () => {
    const prisma = makePrismaMock({
      findFirst: jest.fn().mockResolvedValue(null), // no existing partner with this email
      create: jest.fn().mockResolvedValue(rawPartner),
    });
    const service = makeService(prisma);
    const result = await service.create({
      name: 'Test Partner',
      companyName: 'Test Co',
      contactEmail: 'new-partner@example.com',
      commissionRate: 10,
    } as any);
    expect(result).not.toHaveProperty('api_secret_hash');
    expect(result).toHaveProperty('apiSecret');
    expect(typeof result.apiSecret).toBe('string');
  });

  it('update() strips api_secret_hash from the returned partner', async () => {
    const service = makeService(makePrismaMock());
    const result = await service.update(rawPartner.id, { name: 'Renamed Partner' } as any);
    expect(result).not.toHaveProperty('api_secret_hash');
  });

  it('regenerateApiKey() strips api_secret_hash but returns the new plaintext apiSecret', async () => {
    const service = makeService(makePrismaMock());
    const result = await service.regenerateApiKey(rawPartner.id);
    expect(result).not.toHaveProperty('api_secret_hash');
    expect(result).toHaveProperty('apiSecret');
  });

  it('remove() strips api_secret_hash from the returned partner', async () => {
    const service = makeService(makePrismaMock());
    const result = await service.remove(rawPartner.id);
    expect(result).not.toHaveProperty('api_secret_hash');
  });
});
