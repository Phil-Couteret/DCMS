import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TenantThrottlerGuard } from '../tenant/tenant-throttler.guard.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { SelectTenantDto, SwitchTenantDto } from './dto/select-tenant.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { UserPrincipal } from './jwt.strategy.js';

const MINUTE = 60_000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  // Rate limited per client IP and tenant (TenantThrottlerGuard): each
  // limit slows down password guessing or account spam without getting in
  // the way of a person.
  @Post('register')
  @UseGuards(TenantThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 * MINUTE } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(TenantThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 15 * MINUTE } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  // Second step of a login with several centers: the selectionToken from
  // the login reply and the chosen tenant (null: the superadmin console).
  @Post('select-tenant')
  @HttpCode(200)
  @UseGuards(TenantThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 15 * MINUTE } })
  selectTenant(@Body() dto: SelectTenantDto) {
    return this.auth.selectTenant(dto.selectionToken, dto.tenantId);
  }

  // "Switch center": a new token for another of the account's centers.
  @Post('switch-tenant')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  switchTenant(@CurrentUser() user: UserPrincipal, @Body() dto: SwitchTenantDto) {
    return this.auth.switchTenant(user.id, dto.tenantId);
  }

  @Get('tenants')
  @UseGuards(JwtAuthGuard)
  tenants(@CurrentUser() user: UserPrincipal) {
    return this.auth.availableTenants(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: UserPrincipal) {
    return this.auth.me(user);
  }

  // Any signed-in user (staff or customer) changing their own password.
  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, TenantThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * MINUTE } })
  changePassword(@CurrentUser() user: { id: string }, @Body() dto: ChangePasswordDto) {
    return this.users.changeOwnPassword(user.id, dto.currentPassword, dto.newPassword);
  }
}
