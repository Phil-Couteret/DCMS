import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PartnerAuthService, PartnerLoginDto } from './partner-auth.service';
import { Public } from '../common/decorators/public.decorator';

// Login endpoint for partners - not admin-authenticated by definition.
@Public()
@ApiTags('partner-auth')
@Controller('partner-auth')
export class PartnerAuthController {
  constructor(private readonly partnerAuthService: PartnerAuthService) {}

  // Same tighter credential-endpoint limit as users.controller.ts's login
  // routes (see LOGIN_THROTTLE there) - this is an API key/secret check,
  // same brute-force exposure.
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Partner login with API key and secret' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: PartnerLoginDto) {
    return this.partnerAuthService.login(loginDto);
  }
}
