import { Module } from '@nestjs/common';
import { ScheduleSlotGuidesController } from './schedule-slot-guides.controller';
import { ScheduleSlotGuidesService } from './schedule-slot-guides.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [ScheduleSlotGuidesController],
  providers: [ScheduleSlotGuidesService, PrismaService],
  exports: [ScheduleSlotGuidesService],
})
export class ScheduleSlotGuidesModule {}
