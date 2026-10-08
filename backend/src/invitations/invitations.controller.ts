import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TenantThrottlerGuard } from '../tenant/tenant-throttler.guard.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import { InvitationsService } from './invitations.service.js';

// The public side of an invitation: the link's page reads it, then accepts
// it. The token is the only credential (256 random bits); accepting with an
// existing account also checks its password, so it is rate limited.
@Controller('invitations')
@UseGuards(TenantThrottlerGuard)
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get(':token')
  @Throttle({ default: { limit: 30, ttl: 15 * 60_000 } })
  preview(@Param('token') token: string) {
    return this.invitations.preview(token);
  }

  @Post(':token/accept')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  accept(@Param('token') token: string, @Body() dto: AcceptInvitationDto) {
    return this.invitations.accept(token, dto);
  }
}
