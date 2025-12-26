import { Module } from '@nestjs/common';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PartnersController],
  providers: [PartnersService, PrismaService],
  exports: [PartnersService],
})
export class PartnersModule {}

