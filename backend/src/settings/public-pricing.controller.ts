import { Controller, Get, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../staff/optional-jwt-auth.guard.js';
import { PricingService } from './pricing.service.js';

// The public site's catalogue prices, net of tax. Public, read-only. The
// stay tiers are left out: they are not advertised.
@Controller('pricing')
export class PublicPricingController {
  constructor(private readonly pricing: PricingService) {}

  // A token names the tenant; without one, X-Tenant-ID does.
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async get() {
    const { activities, equipment } = await this.pricing.view();
    return { currency: 'EUR', activities, equipment };
  }
}
