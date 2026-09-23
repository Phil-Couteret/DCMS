// bcrypt ships a native binary; jest.mock replaces the module before
// UsersService imports it, so this spec never touches the real binding.
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { TenantContextService } from '../tenant/tenant-context.service';

const rawUser = {
  id: '11111111-1111-4111-8111-111111111111',
  username: 'jdoe',
  name: 'Jane Doe',
  email: 'jane@example.com',
  password_hash: '$2b$10$supersecrethash',
  role: 'admin',
  permissions: [],
  location_access: [],
  is_active: true,
  tenant_id: '22222222-2222-4222-8222-222222222222',
  created_at: new Date(),
};

function makePrismaMock(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    users: {
      findMany: overrides.findMany ?? jest.fn().mockResolvedValue([rawUser]),
      findUnique: overrides.findUnique ?? jest.fn().mockResolvedValue(rawUser),
      create: overrides.create ?? jest.fn().mockResolvedValue(rawUser),
      update: overrides.update ?? jest.fn().mockResolvedValue(rawUser),
      delete: overrides.delete ?? jest.fn().mockResolvedValue(rawUser),
    },
    // A regular (non-superadmin) user with only their primary tenant_id
    // and no extra memberships - the common case, one tenant option.
    user_tenant_memberships: {
      findMany: overrides.findManyMemberships ?? jest.fn().mockResolvedValue([]),
    },
    tenants: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: overrides.findManyTenants ?? jest.fn().mockResolvedValue([]),
    },
  } as unknown as PrismaService;
}

function makeService(prisma: PrismaService) {
  const authService = { signAdminToken: jest.fn().mockReturnValue('fake-jwt') } as unknown as AuthService;
  const tenantContext = { getTenantId: () => null } as unknown as TenantContextService;
  return new UsersService(prisma, authService, tenantContext);
}

describe('UsersService - password_hash never leaves the service', () => {
  it('findAll() strips password_hash from every user', async () => {
    const service = makeService(makePrismaMock());
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('password_hash');
  });

  it('findOne() strips password_hash', async () => {
    const service = makeService(makePrismaMock());
    const result = await service.findOne(rawUser.id);
    expect(result).not.toHaveProperty('password_hash');
  });

  it('create() strips password_hash from the returned user', async () => {
    const prisma = makePrismaMock({
      findUnique: jest.fn().mockResolvedValue(null), // no existing username/email
      create: jest.fn().mockResolvedValue(rawUser),
    });
    const service = makeService(prisma);
    const result = await service.create({
      username: 'jdoe',
      password: 'plaintext-password',
      name: 'Jane Doe',
    } as any);
    expect(result).not.toHaveProperty('password_hash');
  });

  it('update() strips password_hash from the returned user', async () => {
    const service = makeService(makePrismaMock());
    const result = await service.update(rawUser.id, { name: 'Jane Updated' } as any);
    expect(result).not.toHaveProperty('password_hash');
  });

  it('remove() strips password_hash from the returned user', async () => {
    const service = makeService(makePrismaMock());
    const result = await service.remove(rawUser.id);
    expect(result).not.toHaveProperty('password_hash');
  });

  it('login() strips password_hash from the returned user payload', async () => {
    const prisma = makePrismaMock({
      findUnique: jest.fn().mockResolvedValue(rawUser),
    });
    const service = makeService(prisma);
    const result = await service.login({ username: 'jdoe', password: 'plaintext-password' } as any);
    if (!('access_token' in result)) {
      throw new Error('Expected a single-tenant login to issue a token, not a tenant-selection prompt');
    }
    expect(result.user).not.toHaveProperty('password_hash');
    expect(result.access_token).toBe('fake-jwt');
  });
});

describe('UsersService - multi-tenant membership login', () => {
  const tenantAId = '22222222-2222-4222-8222-222222222222';
  const tenantBId = '33333333-3333-4333-8333-333333333333';

  const membershipB = {
    tenant_id: tenantBId,
    role: 'admin',
    permissions: ['bookings'],
    location_access: [],
    is_active: true,
  };

  it('login() prompts for tenant selection (no token yet) when the user has 2+ tenants and none was specified', async () => {
    const prisma = makePrismaMock({
      findUnique: jest.fn().mockResolvedValue(rawUser), // primary tenant = tenantAId
      findManyMemberships: jest.fn().mockResolvedValue([membershipB]),
    });
    const service = makeService(prisma);
    const result = await service.login({ username: 'jdoe', password: 'plaintext-password' } as any);

    expect('requiresTenantSelection' in result && result.requiresTenantSelection).toBe(true);
    if (!('tenants' in result)) throw new Error('Expected a tenant list');
    const ids = result.tenants.map((t) => t.tenantId);
    expect(ids).toEqual(expect.arrayContaining([tenantAId, tenantBId]));
  });

  it('selectTenant() issues a token scoped to the chosen tenant, using that membership\'s own role/permissions', async () => {
    const prisma = makePrismaMock({
      findUnique: jest.fn().mockResolvedValue(rawUser),
      findManyMemberships: jest.fn().mockResolvedValue([membershipB]),
    });
    const service = makeService(prisma);
    const result = await service.selectTenant({
      username: 'jdoe',
      password: 'plaintext-password',
      tenantId: tenantBId,
    } as any);

    expect(result.user.tenant_id).toBe(tenantBId);
    expect(result.user.permissions).toEqual(['bookings']);
    expect(result.access_token).toBe('fake-jwt');
  });

  it('selectTenant() rejects a tenantId the user has no membership for', async () => {
    const prisma = makePrismaMock({
      findUnique: jest.fn().mockResolvedValue(rawUser),
      findManyMemberships: jest.fn().mockResolvedValue([membershipB]),
    });
    const service = makeService(prisma);

    await expect(
      service.selectTenant({
        username: 'jdoe',
        password: 'plaintext-password',
        tenantId: '99999999-9999-4999-8999-999999999999',
      } as any),
    ).rejects.toThrow('User does not belong to this tenant');
  });
});
