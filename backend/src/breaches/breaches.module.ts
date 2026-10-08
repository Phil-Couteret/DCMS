import { Module } from '@nestjs/common';
import { BreachesController } from './breaches.controller.js';
import { BreachesService } from './breaches.service.js';

@Module({
  controllers: [BreachesController],
  providers: [BreachesService],
})
export class BreachesModule {}
