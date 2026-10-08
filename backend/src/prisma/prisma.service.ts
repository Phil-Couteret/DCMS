import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { tenantExtension } from './tenant-extension.js';

// The Prisma client every service uses. Its queries on tenant-scoped models
// are filtered by the current request's tenant (tenant-extension.ts).
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
      }),
    });
    // The extended client keeps the PrismaClient API (and these lifecycle
    // hooks); only its queries change. Returned in place of `this` so that
    // injecting PrismaService always gives the scoped client.
    const scoped = this.$extends(tenantExtension(this));
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
