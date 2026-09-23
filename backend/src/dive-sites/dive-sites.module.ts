import { Module } from '@nestjs/common';
import { DiveSitesController } from './dive-sites.controller.js';
import { DiveSitesService } from './dive-sites.service.js';

@Module({
  controllers: [DiveSitesController],
  providers: [DiveSitesService],
})
export class DiveSitesModule {}
