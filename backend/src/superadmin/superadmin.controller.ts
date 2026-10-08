import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { UserPrincipal } from '../auth/jwt.strategy.js';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto.js';
import { SuperadminGuard } from './superadmin.guard.js';
import { SuperadminService } from './superadmin.service.js';

// The platform console: tenants across the whole platform. Superadmins only.
@Controller('superadmin')
@UseGuards(SuperadminGuard)
export class SuperadminController {
  constructor(private readonly superadmin: SuperadminService) {}

  @Get('tenants')
  list() {
    return this.superadmin.listTenants();
  }

  @Post('tenants')
  create(@Body() dto: CreateTenantDto, @CurrentUser() actor: UserPrincipal) {
    return this.superadmin.createTenant(dto, actor.id);
  }

  @Get('tenants/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.superadmin.getTenant(id);
  }

  @Patch('tenants/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto, @CurrentUser() actor: UserPrincipal) {
    return this.superadmin.updateTenant(id, dto, actor.id);
  }

  @Get('tenants/:id/stats')
  stats(@Param('id', ParseUUIDPipe) id: string) {
    return this.superadmin.tenantStats(id);
  }

  @Get('audit-log')
  auditLog() {
    return this.superadmin.auditLog();
  }
}
