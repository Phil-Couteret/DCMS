import { Controller, Get, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../staff/optional-jwt-auth.guard.js';
import { TenantConfig } from '../tenant/tenant-config.service.js';
import { PricingService } from './pricing.service.js';
import { SettingsService } from './settings.service.js';

// The public site's view of a center. Public, read-only. A token names the
// tenant; without one, X-Tenant-ID does.
@Controller()
export class PublicPricingController {
  constructor(
    private readonly pricing: PricingService,
    private readonly settings: SettingsService,
    private readonly config: TenantConfig,
  ) {}

  // Catalogue prices, net of tax, with the dive packs and add-ons. The stay
  // tiers are left out: they are not advertised.
  @Get('pricing')
  @UseGuards(OptionalJwtAuthGuard)
  async get() {
    const [{ activities, equipment, addOns, divePacks }, currency] = await Promise.all([
      this.pricing.view(),
      this.config.currency(),
    ]);
    return { currency, activities, equipment, addOns, divePacks };
  }

  // Name, contact details, branding (logo, colours) and regional settings.
  @Get('center')
  @UseGuards(OptionalJwtAuthGuard)
  center() {
    return this.settings.publicView();
  }
}
