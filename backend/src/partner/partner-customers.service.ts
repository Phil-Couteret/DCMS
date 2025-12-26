import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { customer_type, booking_source } from '@prisma/client';

export interface CreatePartnerCustomerDto {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dob?: Date | string;
  nationality?: string;
  address?: any;
  customerType?: customer_type;
  preferences?: any;
  medicalConditions?: any;
  restrictions?: any;
  notes?: string;
}

export interface UpdatePartnerCustomerDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dob?: Date | string;
  nationality?: string;
  address?: any;
  customerType?: customer_type;
  preferences?: any;
  medicalConditions?: any;
  restrictions?: any;
  notes?: string;
}

@Injectable()
export class PartnerCustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(partnerId: string) {
    return this.prisma.customers.findMany({
      where: { 
        created_by_partner_id: partnerId,
        deleted_at: null,
      },
      orderBy: { created_at: 'desc' },
      include: {
        bookings: {
          where: { created_by_partner_id: partnerId },
          take: 5,
          orderBy: { booking_date: 'desc' },
        },
      },
    });
  }

  async findOne(id: string, partnerId: string) {
    const customer = await this.prisma.customers.findUnique({
      where: { id },
      include: {
        bookings: {
          where: { created_by_partner_id: partnerId },
          orderBy: { booking_date: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // Verify partner created this customer
    if (customer.created_by_partner_id !== partnerId) {
      throw new ForbiddenException('You do not have access to this customer');
    }

    return customer;
  }

  async findByEmail(email: string, partnerId: string) {
    return this.prisma.customers.findFirst({
      where: { 
        email: email.toLowerCase(),
        created_by_partner_id: partnerId,
        deleted_at: null,
      },
    });
  }

  async create(dto: CreatePartnerCustomerDto, partnerId: string) {
    // Check if customer already exists with same email (by this partner)
    if (dto.email) {
      const existing = await this.findByEmail(dto.email, partnerId);
      if (existing) {
        return existing; // Return existing customer if found
      }
    }

    return this.prisma.customers.create({
      data: {
        first_name: dto.firstName,
        last_name: dto.lastName,
        email: dto.email?.toLowerCase() || null,
        phone: dto.phone || null,
        dob: dto.dob ? new Date(dto.dob) : null,
        nationality: dto.nationality || null,
        address: dto.address || {},
        customer_type: dto.customerType || null,
        preferences: dto.preferences || {},
        medical_conditions: dto.medicalConditions || [],
        restrictions: dto.restrictions || {},
        notes: dto.notes || null,
        source: 'partner' as booking_source,
        partner_id: partnerId,
        created_by_partner_id: partnerId,
        is_active: true,
      },
    });
  }

  async update(id: string, dto: UpdatePartnerCustomerDto, partnerId: string) {
    // Verify partner owns this customer
    await this.findOne(id, partnerId);

    return this.prisma.customers.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { first_name: dto.firstName }),
        ...(dto.lastName !== undefined && { last_name: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email?.toLowerCase() || null }),
        ...(dto.phone !== undefined && { phone: dto.phone || null }),
        ...(dto.dob !== undefined && { dob: dto.dob ? new Date(dto.dob) : null }),
        ...(dto.nationality !== undefined && { nationality: dto.nationality || null }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.customerType !== undefined && { customer_type: dto.customerType }),
        ...(dto.preferences !== undefined && { preferences: dto.preferences }),
        ...(dto.medicalConditions !== undefined && { medical_conditions: dto.medicalConditions }),
        ...(dto.restrictions !== undefined && { restrictions: dto.restrictions }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }
}

