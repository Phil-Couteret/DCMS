import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiSecurity } from '@nestjs/swagger';
import { PartnerAuthGuard } from '../common/guards/partner-auth.guard';
import { Partner } from '../common/decorators/partner.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { LocationsService } from '../locations/locations.service';
import { DiveSitesService } from '../dive-sites/dive-sites.service';

@ApiTags('partner')
@ApiSecurity('api-key')
@Controller('partner')
@UseGuards(PartnerAuthGuard)
export class PartnerAvailabilityController {
  constructor(
    private prisma: PrismaService,
    private locationsService: LocationsService,
    private diveSitesService: DiveSitesService,
  ) {}

  @Get('locations')
  @ApiOperation({ summary: 'Get available locations for the partner' })
  @ApiResponse({ status: 200, description: 'List of available locations' })
  async getLocations(@Partner() partner: any) {
    const allLocations = await this.locationsService.findAll();
    
    // Filter by allowed locations if partner has restrictions
    if (partner.allowed_locations && partner.allowed_locations.length > 0) {
      return allLocations.filter(loc => partner.allowed_locations.includes(loc.id));
    }
    
    return allLocations;
  }

  @Get('dive-sites')
  @ApiOperation({ summary: 'Get dive sites for partner locations' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location ID' })
  @ApiResponse({ status: 200, description: 'List of dive sites' })
  async getDiveSites(
    @Query('locationId') locationId?: string,
    @Partner() partner?: any,
  ) {
    const allDiveSites = await this.diveSitesService.findAll();
    
    // Filter by allowed locations if partner has restrictions
    if (partner.allowed_locations && partner.allowed_locations.length > 0) {
      if (locationId && !partner.allowed_locations.includes(locationId)) {
        return [];
      }
      return allDiveSites.filter(site => partner.allowed_locations.includes(site.location_id));
    }
    
    if (locationId) {
      return allDiveSites.filter(site => site.location_id === locationId);
    }
    
    return allDiveSites;
  }

  @Get('availability')
  @ApiOperation({ summary: 'Check availability for a date' })
  @ApiQuery({ name: 'date', required: true, description: 'Date to check (YYYY-MM-DD)' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location ID' })
  @ApiResponse({ status: 200, description: 'Availability information' })
  async getAvailability(
    @Query('date') date: string,
    @Query('locationId') locationId?: string,
    @Partner() partner?: any,
  ) {
    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);

    // Get all bookings for the date
    const bookings = await this.prisma.bookings.findMany({
      where: {
        booking_date: bookingDate,
        ...(locationId && { location_id: locationId }),
      },
      include: {
        locations: true,
        boats: true,
      },
    });

    // Get boats and their capacities
    const boats = await this.prisma.boats.findMany({
      where: {
        is_active: true,
        ...(locationId && { location_id: locationId }),
      },
    });

    // Calculate availability per boat
    const boatAvailability = boats.map(boat => {
      const boatBookings = bookings.filter(b => b.boat_id === boat.id);
      const totalBooked = boatBookings.reduce((sum, b) => sum + (b.number_of_dives || 1), 0);
      const available = Math.max(0, boat.capacity - totalBooked);

      return {
        boatId: boat.id,
        boatName: boat.name,
        capacity: boat.capacity,
        booked: totalBooked,
        available: available,
      };
    });

    return {
      date: date,
      locationId: locationId || null,
      boatAvailability: boatAvailability,
      totalBookings: bookings.length,
    };
  }
}

