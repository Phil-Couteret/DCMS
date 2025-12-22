import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { customer_type } from '@prisma/client';

export interface CreateCustomerDto {
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

export interface UpdateCustomerDto {
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
  isActive?: boolean;
}

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.customers.findMany({
      where: { 
        deleted_at: null,
        is_active: true 
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customers.findUnique({
      where: { id },
      include: {
        customer_certifications: true,
        customer_consents: true,
        bookings: {
          take: 10,
          orderBy: { booking_date: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async findByEmail(email: string) {
    return this.prisma.customers.findFirst({
      where: { 
        email: email.toLowerCase(),
        deleted_at: null 
      },
      include: {
        customer_certifications: true,
        customer_consents: {
          where: { is_active: true },
        },
      },
    });
  }

  async search(query: string) {
    const searchTerm = query.toLowerCase();
    return this.prisma.customers.findMany({
      where: {
        deleted_at: null,
        is_active: true,
        OR: [
          { first_name: { contains: searchTerm, mode: 'insensitive' } },
          { last_name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: query } },
        ],
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  async create(dto: CreateCustomerDto) {
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
        is_active: true,
      },
    });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const customer = await this.findOne(id);

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
        ...(dto.isActive !== undefined && { is_active: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    const customer = await this.findOne(id);
    
    // Soft delete by setting deleted_at timestamp
    return this.prisma.customers.update({
      where: { id },
      data: { 
        deleted_at: new Date(),
        is_active: false,
      },
    });
  }
}

