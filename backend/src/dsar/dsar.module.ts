import { Module } from '@nestjs/common';
import { DsarController } from './dsar.controller';
import { DsarService } from './dsar.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [DsarController],
  providers: [DsarService, PrismaService],
  exports: [DsarService],
})
export class DsarModule {}

