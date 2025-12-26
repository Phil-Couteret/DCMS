import { Module } from '@nestjs/common';
import { DiveSitesController } from './dive-sites.controller';
import { DiveSitesService } from './dive-sites.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [DiveSitesController],
  providers: [DiveSitesService, PrismaService],
  exports: [DiveSitesService],
})
export class DiveSitesModule {}

