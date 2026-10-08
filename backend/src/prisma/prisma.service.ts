import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { tenantExtension } from './tenant-extension.js';
import { TenantPool } from './tenant-pool.js';

// The Prisma client every service uses. Its queries on tenant-scoped models
// are filtered by the current request's tenant (tenant-extension.ts).
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    // TenantPool sets the tenant for row-level security before each
    // statement (migration enable_row_level_security).
    super({
      adapter: new PrismaPg(new TenantPool({ connectionString: config.getOrThrow<string>('DATABASE_URL') })),
    });
    // The extended client keeps the PrismaClient API (and these lifecycle
    // hooks); only its queries change. Returned in place of `this` so that
    // injecting PrismaService always gives the scoped client.
    // Tests only: DCMS_APP_TENANT_FILTER=off leaves out the extension, to
    // prove that row-level security alone keeps tenants apart (package.json
    // test:e2e:rls). Rows then get their tenant from the column default,
    // app.tenant_id. Never honoured outside NODE_ENV=test.
    const filterOff = process.env.NODE_ENV === 'test' && process.env.DCMS_APP_TENANT_FILTER === 'off';
    const scoped = filterOff ? this : this.$extends(tenantExtension(this));
    Object.assign(scoped, {
      onModuleInit: () => this.$connect(),
      onModuleDestroy: () => this.$disconnect(),
    });
    return scoped as unknown as PrismaService;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
