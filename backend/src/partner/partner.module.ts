import { Module } from '@nestjs/common';
import { PartnerCustomersController } from './partner-customers.controller';
import { PartnerCustomersService } from './partner-customers.service';
import { PartnerBookingsController } from './partner-bookings.controller';
import { PartnerBookingsService } from './partner-bookings.service';
import { PartnerAvailabilityController } from './partner-availability.controller';
import { PrismaService } from '../prisma/prisma.service';
import { LocationsModule } from '../locations/locations.module';
import { DiveSitesModule } from '../dive-sites/dive-sites.module';

@Module({
  imports: [LocationsModule, DiveSitesModule],
  controllers: [PartnerCustomersController, PartnerBookingsController, PartnerAvailabilityController],
  providers: [PartnerCustomersService, PartnerBookingsService, PrismaService],
  exports: [PartnerCustomersService, PartnerBookingsService],
})
export class PartnerModule {}

