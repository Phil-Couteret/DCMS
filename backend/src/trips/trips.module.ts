import { Module } from '@nestjs/common';
import { DivePrepController } from './dive-prep.controller.js';
import { DivePrepService } from './dive-prep.service.js';
import { TripsController } from './trips.controller.js';
import { TripsService } from './trips.service.js';

@Module({
  controllers: [TripsController, DivePrepController],
  providers: [TripsService, DivePrepService],
})
export class TripsModule {}
