import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { activity_type, booking_status, payment_method, payment_status, booking_source } from '@prisma/client';

export interface CreatePartnerBookingDto {
  customerId?: string; // Optional - can create customer inline
  customer?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    dob?: Date | string;
    nationality?: string;
  };
  locationId: string;
  boatId?: string;
  diveSiteId?: string;
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
}

export interface UpdatePartnerBookingDto {
  bookingDate?: Date | string;
  activityType?: activity_type;
  numberOfDives?: number;
  price?: number;
  discount?: number;
  totalPrice?: number;
  paymentStatus?: payment_status;
  status?: booking_status;
  specialRequirements?: string;
  equipmentNeeded?: any;
}

@Injectable()
export class PartnerBookingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(partnerId: string) {
    return this.prisma.bookings.findMany({
      where: { created_by_partner_id: partnerId },
      include: {
        customers: true,
        locations: true,
        boats: true,
        dive_sites: true,
      },
      orderBy: { booking_date: 'desc' },
    });
  }

  async findByDate(date: Date | string, partnerId: string) {
    const bookingDate = typeof date === 'string' ? new Date(date) : date;
    return this.prisma.bookings.findMany({
      where: { 
        booking_date: bookingDate,
        created_by_partner_id: partnerId,
      },
      include: {
        customers: true,
        locations: true,
        boats: true,
        dive_sites: true,
      },
      orderBy: { booking_date: 'asc' },
    });
  }

  async findOne(id: string, partnerId: string) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id },
      include: {
        customers: true,
        locations: true,
        boats: true,
        dive_sites: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Verify partner created this booking
    if (booking.created_by_partner_id !== partnerId) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return booking;
  }

  async create(dto: CreatePartnerBookingDto, partnerId: string) {
    // Verify location exists and is allowed
    const location = await this.prisma.location.findUnique({
      where: { id: dto.locationId },
    });
    if (!location) {
      throw new NotFoundException(`Location with ID ${dto.locationId} not found`);
    }

    // Check if location is allowed for this partner
    const partner = await this.prisma.partners.findUnique({
      where: { id: partnerId },
    });
    if (partner && partner.allowed_locations.length > 0) {
      if (!partner.allowed_locations.includes(dto.locationId)) {
        throw new ForbiddenException(`Location ${dto.locationId} is not allowed for this partner`);
      }
    }

    let customerId = dto.customerId;

    // Create customer if not provided
    if (!customerId && dto.customer) {
      const customerData = dto.customer;
      const customer = await this.prisma.customers.create({
        data: {
          first_name: customerData.firstName,
          last_name: customerData.lastName,
          email: customerData.email?.toLowerCase() || null,
          phone: customerData.phone || null,
          dob: customerData.dob ? new Date(customerData.dob) : null,
          nationality: customerData.nationality || null,
          source: 'partner' as booking_source,
          partner_id: partnerId,
          created_by_partner_id: partnerId,
          is_active: true,
        },
      });
      customerId = customer.id;
    }

    if (!customerId) {
      throw new BadRequestException('Either customerId or customer data must be provided');
    }

    // Verify customer exists and was created by this partner
    const customer = await this.prisma.customers.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }
    if (customer.created_by_partner_id !== partnerId) {
      throw new ForbiddenException('You can only create bookings for customers you created');
    }

    try {
      const equipmentNeeded = dto.equipmentNeeded !== undefined ? dto.equipmentNeeded : [];
      
      // Map "account" payment method to "deferred"
      let paymentMethod: payment_method | null = dto.paymentMethod || null;
      if (paymentMethod === 'account' as any) {
        paymentMethod = 'deferred';
      }
      
      return await this.prisma.bookings.create({
        data: {
          customer_id: customerId,
          location_id: dto.locationId,
          boat_id: dto.boatId || null,
          dive_site_id: dto.diveSiteId || null,
          booking_date: typeof dto.bookingDate === 'string' ? new Date(dto.bookingDate) : dto.bookingDate,
          activity_type: dto.activityType,
          number_of_dives: dto.numberOfDives || 1,
          price: dto.price,
          discount: dto.discount || 0,
          total_price: dto.totalPrice,
          payment_method: paymentMethod,
          payment_status: dto.paymentStatus || 'pending',
          status: dto.status || 'pending',
          special_requirements: dto.specialRequirements || null,
          equipment_needed: equipmentNeeded,
          source: 'partner' as booking_source,
          partner_id: partnerId,
          created_by_partner_id: partnerId,
        },
        include: {
          customers: true,
          locations: true,
        },
      });
    } catch (error) {
      console.error('[PartnerBookingsService] Error creating booking:', error);
      throw error;
    }
  }

  async update(id: string, dto: UpdatePartnerBookingDto, partnerId: string) {
    // Verify partner owns this booking
    await this.findOne(id, partnerId);

    // Payment method is not updatable by partners (handled by dive center)

    return this.prisma.bookings.update({
      where: { id },
      data: {
        ...(dto.bookingDate !== undefined && { 
          booking_date: typeof dto.bookingDate === 'string' ? new Date(dto.bookingDate) : dto.bookingDate 
        }),
        ...(dto.activityType !== undefined && { activity_type: dto.activityType }),
        ...(dto.numberOfDives !== undefined && { number_of_dives: dto.numberOfDives }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.discount !== undefined && { discount: dto.discount }),
        ...(dto.totalPrice !== undefined && { total_price: dto.totalPrice }),
        ...(dto.paymentStatus !== undefined && { payment_status: dto.paymentStatus }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.specialRequirements !== undefined && { special_requirements: dto.specialRequirements }),
        ...(dto.equipmentNeeded !== undefined && { equipment_needed: dto.equipmentNeeded }),
      },
      include: {
        customers: true,
        locations: true,
      },
    });
  }

  async cancel(id: string, partnerId: string) {
    const booking = await this.findOne(id, partnerId);

    return this.prisma.bookings.update({
      where: { id },
      data: {
        status: 'cancelled' as booking_status,
        payment_status: booking.payment_status === 'paid' ? 'refunded' : booking.payment_status,
      },
      include: {
        customers: true,
        locations: true,
      },
    });
  }

  async remove(id: string, partnerId: string) {
    await this.findOne(id, partnerId);
    return this.prisma.bookings.delete({
      where: { id },
    });
  }
}

