import { Module } from '@nestjs/common';
import { SuperadminController } from './superadmin.controller.js';
import { SuperadminService } from './superadmin.service.js';

@Module({
  controllers: [SuperadminController],
  providers: [SuperadminService],
})
export class SuperadminModule {}
