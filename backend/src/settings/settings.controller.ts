import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AdminAuthGuard } from '../auth/admin-auth.guard.js';
import { StaffAuthGuard } from '../auth/staff-auth.guard.js';
import { UpdatePricingDto } from './dto/update-pricing.dto.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { SettingsService } from './settings.service.js';

@Controller('settings')
@UseGuards(StaffAuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.get();
  }

  // Any staff member can edit the contact details; the regional, branding
  // and numbering fields need an admin (see SettingsService.update).
  @Put()
  update(@Body() dto: UpdateSettingsDto, @CurrentUser() user: { role: string }) {
    return this.settings.update(dto, user.role === 'ADMIN');
  }

  @Get('pricing')
  pricing() {
    return this.settings.pricing();
  }

  // Replaces the whole price list. Admins only.
  @Put('pricing')
  @UseGuards(AdminAuthGuard)
  updatePricing(@Body() dto: UpdatePricingDto) {
    return this.settings.updatePricing(dto);
  }
}
