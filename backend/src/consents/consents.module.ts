import { Module } from '@nestjs/common';
import { ConsentsController } from './consents.controller';
import { ConsentsService } from './consents.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [ConsentsController],
  providers: [ConsentsService, PrismaService],
  exports: [ConsentsService],
})
export class ConsentsModule {}

