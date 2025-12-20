import { Module } from '@nestjs/common';
import { BreachesController } from './breaches.controller';
import { BreachesService } from './breaches.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [BreachesController],
  providers: [BreachesService, PrismaService],
  exports: [BreachesService],
})
export class BreachesModule {}

