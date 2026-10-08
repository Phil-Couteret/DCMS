import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service.js';
import { PublicPricingController } from './public-pricing.controller.js';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';

@Module({
  controllers: [SettingsController, PublicPricingController],
  providers: [SettingsService, PricingService],
  exports: [SettingsService, PricingService],
})
export class SettingsModule {}
