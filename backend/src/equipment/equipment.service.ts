import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { equipment_type } from '@prisma/client';

export interface CreateEquipmentDto {
  locationId: string;
  name: string;
  category: equipment_type;
  type: equipment_type;
  size?: string;
  condition?: string;
  serialNumber?: string;
  isAvailable?: boolean;
}

export interface UpdateEquipmentDto {
  locationId?: string;
  name?: string;
  category?: equipment_type;
  type?: equipment_type;
  size?: string;
  condition?: string;
  serialNumber?: string;
  isAvailable?: boolean;
  isActive?: boolean;
}

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.equipment.findMany({
      where: { is_active: true },
      include: {
        locations: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findByLocation(locationId: string) {
    return this.prisma.equipment.findMany({
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

  async findAvailable(category?: equipment_type) {
    return this.prisma.equipment.findMany({
      where: { 
        is_available: true,
        is_active: true,
        ...(category && { category }),
      },
      include: {
        locations: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
      include: {
        locations: true,
      },
    });

    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${id} not found`);
    }

    return equipment;
  }

  async create(dto: CreateEquipmentDto) {
    // Verify location exists
    const location = await this.prisma.location.findUnique({
      where: { id: dto.locationId },
    });
    if (!location) {
      throw new NotFoundException(`Location with ID ${dto.locationId} not found`);
    }

    return this.prisma.equipment.create({
      data: {
        location_id: dto.locationId,
        name: dto.name,
        category: dto.category,
        type: dto.type,
        size: dto.size || null,
        condition: dto.condition || null,
        serial_number: dto.serialNumber || null,
        is_available: dto.isAvailable !== undefined ? dto.isAvailable : true,
        is_active: true,
      },
      include: {
        locations: true,
      },
    });
  }

  async update(id: string, dto: UpdateEquipmentDto) {
    const equipment = await this.findOne(id);

    if (dto.locationId) {
      const location = await this.prisma.location.findUnique({
        where: { id: dto.locationId },
      });
      if (!location) {
        throw new NotFoundException(`Location with ID ${dto.locationId} not found`);
      }
    }

    return this.prisma.equipment.update({
      where: { id },
      data: {
        ...(dto.locationId !== undefined && { location_id: dto.locationId }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.size !== undefined && { size: dto.size || null }),
        ...(dto.condition !== undefined && { condition: dto.condition || null }),
        ...(dto.serialNumber !== undefined && { serial_number: dto.serialNumber || null }),
        ...(dto.isAvailable !== undefined && { is_available: dto.isAvailable }),
        ...(dto.isActive !== undefined && { is_active: dto.isActive }),
      },
      include: {
        locations: true,
      },
    });
  }

  async remove(id: string) {
    const equipment = await this.findOne(id);
    
    // Soft delete by setting is_active to false
    return this.prisma.equipment.update({
      where: { id },
      data: { is_active: false },
    });
  }
}

