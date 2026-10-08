import { Controller, Get } from '@nestjs/common';
import { PricingService } from './pricing.service.js';

// The public site's catalogue prices, net of tax. Public, read-only. The
// stay tiers are left out: they are not advertised.
@Controller('pricing')
export class PublicPricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  async get() {
    const { activities, equipment } = await this.pricing.view();
    return { currency: 'EUR', activities, equipment };
  }
}
