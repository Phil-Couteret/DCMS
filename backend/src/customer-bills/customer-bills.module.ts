import { Module } from '@nestjs/common';
import { CustomerBillsService } from './customer-bills.service';
import { CustomerBillsController } from './customer-bills.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [CustomerBillsController],
  providers: [CustomerBillsService, PrismaService],
  exports: [CustomerBillsService],
})
export class CustomerBillsModule {}

