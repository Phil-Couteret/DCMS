import { Controller, Get, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { StaffAuthGuard } from '../auth/staff-auth.guard.js';
import { DashboardService } from './dashboard.service.js';

// The backoffice dashboard. Revenue is for admins (null for others).
@Controller('dashboard')
@UseGuards(StaffAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('overview')
  overview(
    @CurrentUser() user: { role: string },
    @Query('locationId', new ParseUUIDPipe({ optional: true })) locationId?: string,
  ) {
    return this.dashboard.overview(user.role === 'ADMIN', locationId);
  }
}
