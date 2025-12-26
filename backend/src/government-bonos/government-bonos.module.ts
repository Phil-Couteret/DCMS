import { Module } from '@nestjs/common';
import { GovernmentBonosController } from './government-bonos.controller';
import { GovernmentBonosService } from './government-bonos.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [GovernmentBonosController],
  providers: [GovernmentBonosService, PrismaService],
  exports: [GovernmentBonosService],
})
export class GovernmentBonosModule {}

