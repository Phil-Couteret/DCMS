import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { activity_type, booking_status, payment_method, payment_status } from '@prisma/client';

export interface CreateBookingDto {
  customerId: string;
  locationId: string;
  boatId?: string;
  diveSiteId?: string;
  staffPrimaryId?: string;
  bookingDate: Date | string;
  activityType: activity_type;
  numberOfDives?: number;
  price: number;
  discount?: number;
  totalPrice: number;
  paymentMethod?: payment_method;
  paymentStatus?: payment_status;
  status?: booking_status;
  specialRequirements?: string;
  equipmentNeeded?: any;
  bonoId?: string;
  stayId?: string;
}

export interface UpdateBookingDto {
  customerId?: string;
  locationId?: string;
  boatId?: string;
  diveSiteId?: string;
  staffPrimaryId?: string;
  bookingDate?: Date | string;
  activityType?: activity_type;
  numberOfDives?: number;
  price?: number;
  discount?: number;
  totalPrice?: number;
  paymentMethod?: payment_method;
  paymentStatus?: payment_status;
  status?: booking_status;
  specialRequirements?: string;
  equipmentNeeded?: any;
  bonoId?: string;
  stayId?: string;
}

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Maps frontend activity type values to valid Prisma enum values
   */
  private mapActivityType(frontendType: string): activity_type {
    const mapping: Record<string, activity_type> = {
      'scuba_diving': 'diving',
      'discover_scuba': 'discovery',
      'discover': 'discovery', // Common shorthand
      'dive_course': 'specialty',
      'snorkeling': 'snorkeling',
      'try_dive': 'try_dive',
      'diving': 'diving',
      'discovery': 'discovery',
      'specialty': 'specialty',
    };

    const mapped = mapping[frontendType];
    if (!mapped) {
      // Default to diving if unknown type
      console.warn(`[BookingsService] Unknown activity type "${frontendType}", defaulting to "diving"`);
      return 'diving';
    }
    return mapped;
  }

  async findAll() {
    return this.prisma.bookings.findMany({
      orderBy: { booking_date: 'desc' },
      include: {
        customers: true,
        locations: true,
        boats: true,
        dive_sites: true,
      },
    });
  }

  async findByDate(date: Date | string) {
    const bookingDate = typeof date === 'string' ? new Date(date) : date;
    return this.prisma.bookings.findMany({
      where: { booking_date: bookingDate },
      include: {
        customers: true,
        locations: true,
        boats: true,
        dive_sites: true,
      },
      orderBy: { booking_date: 'asc' },
    });
  }

  async findByCustomer(customerId: string) {
    return this.prisma.bookings.findMany({
      where: { customer_id: customerId },
      include: {
        locations: true,
        boats: true,
        dive_sites: true,
      },
      orderBy: { booking_date: 'desc' },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id },
      include: {
        customers: true,
        locations: true,
        boats: true,
        dive_sites: true,
        staff: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return booking;
  }

  async create(dto: CreateBookingDto) {
    // Verify customer and location exist
    const customer = await this.prisma.customers.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
    }

    const location = await this.prisma.locations.findUnique({
      where: { id: dto.locationId },
    });
    if (!location) {
      throw new NotFoundException(`Location with ID ${dto.locationId} not found`);
    }

    try {
      // Handle equipment_needed: can be object (bike rental) or array (diving)
      const equipmentNeeded = dto.equipmentNeeded !== undefined ? dto.equipmentNeeded : [];
      
      // Map "account" payment method to "deferred" (valid enum value)
      // "account" is used in frontend for known customers with account-based payment
      let paymentMethod: payment_method | null = dto.paymentMethod || null;
      if (paymentMethod === 'account' as any) {
        paymentMethod = 'deferred';
      }
      
      // Map frontend activity type to valid Prisma enum value
      const mappedActivityType = this.mapActivityType(dto.activityType as any);
      
      return await this.prisma.bookings.create({
        data: {
          customer_id: dto.customerId,
          location_id: dto.locationId,
          boat_id: dto.boatId || null,
          dive_site_id: dto.diveSiteId || null,
          staff_primary_id: dto.staffPrimaryId || null,
          booking_date: typeof dto.bookingDate === 'string' ? new Date(dto.bookingDate) : dto.bookingDate,
          activity_type: mappedActivityType,
          number_of_dives: dto.numberOfDives || 1,
          price: dto.price,
          discount: dto.discount || 0,
          total_price: dto.totalPrice,
          payment_method: paymentMethod,
          payment_status: dto.paymentStatus || 'pending',
          status: dto.status || 'pending',
          special_requirements: dto.specialRequirements || null,
          equipment_needed: equipmentNeeded,
          bono_id: dto.bonoId || null,
          stay_id: dto.stayId || null,
        },
        include: {
          customers: true,
          locations: true,
        },
      });
    } catch (error) {
      console.error('[BookingsService] Error creating booking:', error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateBookingDto) {
    const booking = await this.findOne(id);

    // Map "account" payment method to "deferred" (valid enum value)
    let paymentMethod: payment_method | null | undefined = dto.paymentMethod;
    if (paymentMethod === 'account' as any) {
      paymentMethod = 'deferred';
    }

    // Map activity type if provided
    const updateData: any = {
      ...(dto.customerId !== undefined && { customer_id: dto.customerId }),
      ...(dto.locationId !== undefined && { location_id: dto.locationId }),
      ...(dto.boatId !== undefined && { boat_id: dto.boatId || null }),
      ...(dto.diveSiteId !== undefined && { dive_site_id: dto.diveSiteId || null }),
      ...(dto.staffPrimaryId !== undefined && { staff_primary_id: dto.staffPrimaryId || null }),
      ...(dto.bookingDate !== undefined && { 
        booking_date: typeof dto.bookingDate === 'string' ? new Date(dto.bookingDate) : dto.bookingDate 
      }),
    };
    
    if (dto.activityType !== undefined) {
      updateData.activity_type = this.mapActivityType(dto.activityType as any);
    }

    return this.prisma.bookings.update({
      where: { id },
      data: {
        ...updateData,
        ...(dto.numberOfDives !== undefined && { number_of_dives: dto.numberOfDives }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.discount !== undefined && { discount: dto.discount }),
        ...(dto.totalPrice !== undefined && { total_price: dto.totalPrice }),
        ...(paymentMethod !== undefined && { payment_method: paymentMethod || null }),
        ...(dto.paymentStatus !== undefined && { payment_status: dto.paymentStatus }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.specialRequirements !== undefined && { special_requirements: dto.specialRequirements }),
        ...(dto.equipmentNeeded !== undefined && { equipment_needed: dto.equipmentNeeded }),
        ...(dto.bonoId !== undefined && { bono_id: dto.bonoId || null }),
        ...(dto.stayId !== undefined && { stay_id: dto.stayId || null }),
      },
      include: {
        customers: true,
        locations: true,
      },
    });
  }

  async remove(id: string) {
    const booking = await this.findOne(id);
    
    return this.prisma.bookings.delete({
      where: { id },
    });
  }
}

