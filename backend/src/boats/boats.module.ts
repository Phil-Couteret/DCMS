import { Module } from '@nestjs/common';
import { BoatsController } from './boats.controller.js';
import { BoatsService } from './boats.service.js';

@Module({
  controllers: [BoatsController],
  providers: [BoatsService],
})
export class BoatsModule {}
