import { Module } from '@nestjs/common';
import { DiveLogsController } from './dive-logs.controller.js';
import { DiveLogsService } from './dive-logs.service.js';

@Module({
  controllers: [DiveLogsController],
  providers: [DiveLogsService],
})
export class DiveLogsModule {}
