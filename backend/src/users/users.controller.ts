import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { SetPasswordDto } from './dto/set-password.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { Throttle } from '@nestjs/throttler';
import { TenantThrottlerGuard } from '../tenant/tenant-throttler.guard.js';
import { InviteStaffDto } from './dto/invite-staff.dto.js';
import { StaffInvitationsService } from './staff-invitations.service.js';
import { UsersService } from './users.service.js';

// Login accounts. Admins only.
@Controller('users')
@UseGuards(AdminAuthGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly invitations: StaffInvitationsService,
  ) {}

  @Get()
  findAll(@Query('role') role?: string) {
    return this.users.list({ role });
  }

  // Staff invitations (declared before ':id' so the paths are not taken for
  // an id). Sending is rate limited per center: each one emails someone.
  @Get('invitations')
  listInvitations() {
    return this.invitations.list();
  }

  @Post('invite')
  @UseGuards(TenantThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60 * 60_000 } })
  invite(@Body() dto: InviteStaffDto, @CurrentUser() actor: { id: string }) {
    return this.invitations.invite(dto, actor.id);
  }

  @Post('invitations/:id/resend')
  @HttpCode(200)
  @UseGuards(TenantThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60 * 60_000 } })
  resendInvitation(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: { id: string }) {
    return this.invitations.resend(id, actor.id);
  }

  @Delete('invitations/:id')
  cancelInvitation(@Param('id', ParseUUIDPipe) id: string) {
    return this.invitations.cancel(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.createAccount(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: { id: string },
  ) {
    return this.users.update(id, dto, actor.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: { id: string }) {
    return this.users.remove(id, actor.id);
  }

  // Sets any user's password without the old one.
  @Post(':id/change-password')
  @HttpCode(200)
  setPassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetPasswordDto) {
    return this.users.setPassword(id, dto.password);
  }
}
