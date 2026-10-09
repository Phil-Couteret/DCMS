import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { FinancialController } from './financial.controller.js';
import { FinancialService } from './financial.service.js';

@Module({
  imports: [SettingsModule, MailModule],
  controllers: [FinancialController, DashboardController],
  providers: [FinancialService, DashboardService],
})
export class FinancialModule {}
