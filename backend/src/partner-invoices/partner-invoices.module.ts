import { Module } from '@nestjs/common';
import { PartnerInvoicesController } from './partner-invoices.controller';
import { PartnerInvoicesService } from './partner-invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { PartnerAuthModule } from '../partner-auth/partner-auth.module';

@Module({
  imports: [PartnerAuthModule],
  controllers: [PartnerInvoicesController],
  providers: [PartnerInvoicesService, PrismaService],
  exports: [PartnerInvoicesService],
})
export class PartnerInvoicesModule {}
