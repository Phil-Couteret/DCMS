import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { PartnerLoginDto } from './dto/partner-login.dto.js';
import { PartnerBookingDto, PartnerCustomerDto } from './dto/portal.dto.js';
import type { PartnerPrincipal } from './partner-jwt.strategy.js';
import { PartnerJwtGuard } from './partner-jwt.guard.js';
import { PartnersService } from './partners.service.js';
import { PortalService } from './portal.service.js';

@Controller('partner-auth')
@UseGuards(ThrottlerGuard)
export class PartnerAuthController {
  constructor(private readonly partners: PartnersService) {}

  // The API secret is the partner's password: slow down guessing.
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  login(@Body() dto: PartnerLoginDto) {
    return this.partners.login(dto);
  }
}

// The partner portal. Only partner tokens open these routes, and every query
// is limited to the signed-in partner.
@Controller('partner')
@UseGuards(PartnerJwtGuard)
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  @Get('me')
  me(@CurrentUser() p: PartnerPrincipal) {
    return this.portal.me(p.partnerId);
  }

  @Get('customers')
  customers(@CurrentUser() p: PartnerPrincipal) {
    return this.portal.customers(p.partnerId);
  }

  @Post('customers')
  createCustomer(@CurrentUser() p: PartnerPrincipal, @Body() dto: PartnerCustomerDto) {
    return this.portal.createCustomer(p.partnerId, dto);
  }

  @Get('bookings')
  bookings(@CurrentUser() p: PartnerPrincipal) {
    return this.portal.bookings(p.partnerId);
  }

  @Post('bookings')
  createBooking(@CurrentUser() p: PartnerPrincipal, @Body() dto: PartnerBookingDto) {
    return this.portal.createBooking(p.partnerId, dto);
  }

  @Get('invoices')
  invoices(@CurrentUser() p: PartnerPrincipal) {
    return this.portal.invoices(p.partnerId);
  }

  @Get('invoices/:id')
  invoice(@CurrentUser() p: PartnerPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.portal.invoice(p.partnerId, id);
  }
}
