import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateBoatDto {
  locationId: string;
  name: string;
  capacity: number;
  equipmentOnboard?: any;
  maintenanceSchedule?: any;
  isActive?: boolean;
}

export interface UpdateBoatDto {
  locationId?: string;
  name?: string;
  capacity?: number;
  equipmentOnboard?: any;
  maintenanceSchedule?: any;
  isActive?: boolean;
}

@Injectable()
export class BoatsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.boats.findMany({
      where: { is_active: true },
      include: {
        locations: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findByLocation(locationId: string) {
    return this.prisma.boats.findMany({
      where: { 
        location_id: locationId,
        is_active: true 
      },
      include: {
        locations: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const boat = await this.prisma.boats.findUnique({
      where: { id },
      include: {
        locations: true,
      },
    });

    if (!boat) {
      throw new NotFoundException(`Boat with ID ${id} not found`);
    }

    return boat;
  }

  async create(dto: CreateBoatDto) {
    // Verify location exists
    const location = await this.prisma.location.findUnique({
      where: { id: dto.locationId },
    });
    if (!location) {
      throw new NotFoundException(`Location with ID ${dto.locationId} not found`);
    }

    return this.prisma.boats.create({
      data: {
        location_id: dto.locationId,
        name: dto.name,
        capacity: dto.capacity,
        equipment_onboard: dto.equipmentOnboard || [],
        maintenance_schedule: dto.maintenanceSchedule || {},
        is_active: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        locations: true,
      },
    });
  }

  async update(id: string, dto: UpdateBoatDto) {
    const boat = await this.findOne(id);

    if (dto.locationId) {
      const location = await this.prisma.location.findUnique({
        where: { id: dto.locationId },
      });
      if (!location) {
        throw new NotFoundException(`Location with ID ${dto.locationId} not found`);
      }
    }

    return this.prisma.boats.update({
      where: { id },
      data: {
        ...(dto.locationId !== undefined && { location_id: dto.locationId }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.equipmentOnboard !== undefined && { equipment_onboard: dto.equipmentOnboard }),
        ...(dto.maintenanceSchedule !== undefined && { maintenance_schedule: dto.maintenanceSchedule }),
        ...(dto.isActive !== undefined && { is_active: dto.isActive }),
      },
      include: {
        locations: true,
      },
    });
  }

  async remove(id: string) {
    const boat = await this.findOne(id);
    
    // Soft delete by setting is_active to false
    return this.prisma.boats.update({
      where: { id },
      data: { is_active: false },
    });
  }
}

