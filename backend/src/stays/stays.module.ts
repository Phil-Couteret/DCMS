import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { StaysController } from './stays.controller.js';
import { StaysService } from './stays.service.js';

@Module({
  imports: [BillingModule, SettingsModule],
  controllers: [StaysController],
  providers: [StaysService],
})
export class StaysModule {}
