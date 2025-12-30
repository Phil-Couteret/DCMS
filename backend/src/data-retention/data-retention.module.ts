import { Module } from '@nestjs/common';
import { DataRetentionService } from './data-retention.service';
import { DataRetentionController } from './data-retention.controller';
import { DataRetentionScheduler } from './data-retention.scheduler';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [DataRetentionService, DataRetentionScheduler, PrismaService],
  controllers: [DataRetentionController],
  exports: [DataRetentionService, DataRetentionScheduler],
})
export class DataRetentionModule {}

