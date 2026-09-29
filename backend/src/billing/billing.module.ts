import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { SettingsModule } from '../settings/settings.module.js';

@Module({
  imports: [SettingsModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
