import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { FinancialController } from './financial.controller.js';
import { FinancialService } from './financial.service.js';

@Module({
  imports: [SettingsModule],
  controllers: [FinancialController, DashboardController],
  providers: [FinancialService, DashboardService],
})
export class FinancialModule {}
