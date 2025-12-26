import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateStaffDto {
  locationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  certifications?: any;
  emergencyContact?: any;
  employmentStartDate?: string;
  isActive?: boolean;
}

export interface UpdateStaffDto {
  locationId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  certifications?: any;
  emergencyContact?: any;
  employmentStartDate?: string;
  isActive?: boolean;
}

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.staff.findMany({
      where: { is_active: true },
      include: {
        locations: true,
      },
      orderBy: { first_name: 'asc' },
    });
  }

  async findByLocation(locationId: string) {
    return this.prisma.staff.findMany({
      where: { 
        location_id: locationId,
        is_active: true 
      },
      include: {
        locations: true,
      },
      orderBy: { first_name: 'asc' },
    });
  }

  async findOne(id: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: {
        locations: true,
      },
    });

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }

    return staff;
  }

  async create(createStaffDto: CreateStaffDto) {
    return this.prisma.staff.create({
      data: {
        location_id: createStaffDto.locationId,
        first_name: createStaffDto.firstName,
        last_name: createStaffDto.lastName,
        email: createStaffDto.email,
        phone: createStaffDto.phone,
        role: createStaffDto.role as any,
        certifications: createStaffDto.certifications || [],
        emergency_contact: createStaffDto.emergencyContact || {},
        employment_start_date: createStaffDto.employmentStartDate ? new Date(createStaffDto.employmentStartDate) : null,
        is_active: createStaffDto.isActive !== undefined ? createStaffDto.isActive : true,
      },
      include: {
        locations: true,
      },
    });
  }

  async update(id: string, updateStaffDto: UpdateStaffDto) {
    await this.findOne(id); // Check if exists

    const updateData: any = {};
    if (updateStaffDto.locationId !== undefined) updateData.location_id = updateStaffDto.locationId;
    if (updateStaffDto.firstName !== undefined) updateData.first_name = updateStaffDto.firstName;
    if (updateStaffDto.lastName !== undefined) updateData.last_name = updateStaffDto.lastName;
    if (updateStaffDto.email !== undefined) updateData.email = updateStaffDto.email;
    if (updateStaffDto.phone !== undefined) updateData.phone = updateStaffDto.phone;
    if (updateStaffDto.role !== undefined) updateData.role = updateStaffDto.role;
    if (updateStaffDto.certifications !== undefined) updateData.certifications = updateStaffDto.certifications;
    if (updateStaffDto.emergencyContact !== undefined) updateData.emergency_contact = updateStaffDto.emergencyContact;
    if (updateStaffDto.employmentStartDate !== undefined) updateData.employment_start_date = updateStaffDto.employmentStartDate ? new Date(updateStaffDto.employmentStartDate) : null;
    if (updateStaffDto.isActive !== undefined) updateData.is_active = updateStaffDto.isActive;

    return this.prisma.staff.update({
      where: { id },
      data: updateData,
      include: {
        locations: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    return this.prisma.staff.update({
      where: { id },
      data: { is_active: false },
    });
  }
}

