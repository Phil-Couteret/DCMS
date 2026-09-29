import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module.js';
import { FinancialController } from './financial.controller.js';
import { FinancialService } from './financial.service.js';

@Module({
  imports: [SettingsModule],
  controllers: [FinancialController],
  providers: [FinancialService],
})
export class FinancialModule {}
