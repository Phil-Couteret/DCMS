import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { UserPrincipal } from '../auth/jwt.strategy.js';
import { CreateInvitationDto } from '../invitations/dto/create-invitation.dto.js';
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

  @Get('overview')
  overview() {
    return this.superadmin.overview();
  }

  @Get('tenants/:id/invitations')
  invitations(@Param('id', ParseUUIDPipe) id: string) {
    return this.superadmin.listInvitations(id);
  }

  // Invites someone (by default the center's admin) by email.
  @Post('tenants/:id/invitations')
  invite(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateInvitationDto, @CurrentUser() actor: UserPrincipal) {
    return this.superadmin.invite(id, dto, actor.id);
  }

  @Get('audit-log')
  auditLog() {
    return this.superadmin.auditLog();
  }
}
