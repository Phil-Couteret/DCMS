import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { location_type } from '@prisma/client';

export interface CreateLocationDto {
  name: string;
  type: location_type;
  address: any;
  contactInfo?: any;
  settings?: any;
  isActive?: boolean;
}

export interface UpdateLocationDto {
  name?: string;
  type?: location_type;
  address?: any;
  contactInfo?: any;
  settings?: any;
  isActive?: boolean;
}

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.location.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const location = await this.prisma.location.findUnique({
      where: { id },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return location;
  }

  async create(dto: CreateLocationDto) {
    // If ID is provided, use it (for migrations)
    const data: any = {
      name: dto.name,
      type: dto.type,
        address: dto.address || {},
        contactInfo: dto.contactInfo || {},
        settings: dto.settings || {},
        isActive: dto.isActive !== undefined ? dto.isActive : true,
    };
    
    if ((dto as any).id) {
      data.id = (dto as any).id;
    }
    
    return this.prisma.location.create({
      data,
    });
  }

  async update(id: string, dto: UpdateLocationDto) {
    const location = await this.findOne(id);

    return this.prisma.location.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.contactInfo !== undefined && { contactInfo: dto.contactInfo }),
        ...(dto.settings !== undefined && { settings: dto.settings }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    const location = await this.findOne(id);
    
    // Soft delete by setting isActive to false (Prisma uses camelCase)
    return this.prisma.location.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

