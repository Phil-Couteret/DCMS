import { Module } from '@nestjs/common';
import { BoatPrepsController } from './boat-preps.controller';
import { BoatPrepsService } from './boat-preps.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [BoatPrepsController],
  providers: [BoatPrepsService, PrismaService],
  exports: [BoatPrepsService],
})
export class BoatPrepsModule {}

