import { Module } from '@nestjs/common';
import { BreachesController } from './breaches.controller';
import { BreachesService } from './breaches.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [BreachesController],
  providers: [BreachesService, PrismaService],
  exports: [BreachesService],
})
export class BreachesModule {}

