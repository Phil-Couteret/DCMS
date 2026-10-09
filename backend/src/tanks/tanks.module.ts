import { Module } from '@nestjs/common';
import { TanksController } from './tanks.controller.js';
import { TanksService } from './tanks.service.js';

@Module({
  controllers: [TanksController],
  providers: [TanksService],
})
export class TanksModule {}
