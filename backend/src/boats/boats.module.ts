import { Module } from '@nestjs/common';
import { BoatsController } from './boats.controller';
import { BoatsService } from './boats.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [BoatsController],
  providers: [BoatsService, PrismaService],
  exports: [BoatsService],
})
export class BoatsModule {}

