import { Module } from '@nestjs/common';
import { DiveSitesController } from './dive-sites.controller';
import { DiveSitesService } from './dive-sites.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [DiveSitesController],
  providers: [DiveSitesService, PrismaService],
  exports: [DiveSitesService],
})
export class DiveSitesModule {}

