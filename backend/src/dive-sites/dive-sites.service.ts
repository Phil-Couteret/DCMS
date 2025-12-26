import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateDiveSiteDto {
  locationId: string;
  name: string;
  type: string;
  depthRange?: any;
  difficultyLevel?: string;
  conditions?: any;
  isActive?: boolean;
}

export interface UpdateDiveSiteDto {
  locationId?: string;
  name?: string;
  type?: string;
  depthRange?: any;
  difficultyLevel?: string;
  conditions?: any;
  isActive?: boolean;
}

@Injectable()
export class DiveSitesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.dive_sites.findMany({
      where: { is_active: true },
      include: {
        locations: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findByLocation(locationId: string) {
    return this.prisma.dive_sites.findMany({
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
    const diveSite = await this.prisma.dive_sites.findUnique({
      where: { id },
      include: {
        locations: true,
      },
    });

    if (!diveSite) {
      throw new NotFoundException(`Dive site with ID ${id} not found`);
    }

    return diveSite;
  }

  async create(createDiveSiteDto: CreateDiveSiteDto) {
    return this.prisma.dive_sites.create({
      data: {
        location_id: createDiveSiteDto.locationId,
        name: createDiveSiteDto.name,
        type: createDiveSiteDto.type as any,
        depth_range: createDiveSiteDto.depthRange || {},
        difficulty_level: createDiveSiteDto.difficultyLevel || 'beginner',
        conditions: createDiveSiteDto.conditions || {},
        is_active: createDiveSiteDto.isActive !== undefined ? createDiveSiteDto.isActive : true,
      },
      include: {
        locations: true,
      },
    });
  }

  async update(id: string, updateDiveSiteDto: UpdateDiveSiteDto) {
    await this.findOne(id); // Check if exists

    const updateData: any = {};
    if (updateDiveSiteDto.locationId !== undefined) updateData.location_id = updateDiveSiteDto.locationId;
    if (updateDiveSiteDto.name !== undefined) updateData.name = updateDiveSiteDto.name;
    if (updateDiveSiteDto.type !== undefined) updateData.type = updateDiveSiteDto.type;
    if (updateDiveSiteDto.depthRange !== undefined) updateData.depth_range = updateDiveSiteDto.depthRange;
    if (updateDiveSiteDto.difficultyLevel !== undefined) updateData.difficulty_level = updateDiveSiteDto.difficultyLevel;
    if (updateDiveSiteDto.conditions !== undefined) updateData.conditions = updateDiveSiteDto.conditions;
    if (updateDiveSiteDto.isActive !== undefined) updateData.is_active = updateDiveSiteDto.isActive;

    return this.prisma.dive_sites.update({
      where: { id },
      data: updateData,
      include: {
        locations: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    return this.prisma.dive_sites.update({
      where: { id },
      data: { is_active: false },
    });
  }
}

