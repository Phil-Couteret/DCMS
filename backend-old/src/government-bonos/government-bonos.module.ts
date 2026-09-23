import { Module } from '@nestjs/common';
import { GovernmentBonosController } from './government-bonos.controller';
import { GovernmentBonosService } from './government-bonos.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [GovernmentBonosController],
  providers: [GovernmentBonosService, PrismaService],
  exports: [GovernmentBonosService],
})
export class GovernmentBonosModule {}

