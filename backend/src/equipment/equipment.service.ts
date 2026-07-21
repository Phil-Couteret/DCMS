import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { equipment_type } from '@prisma/client';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';

export { CreateEquipmentDto, UpdateEquipmentDto };

@Injectable()
export class EquipmentService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
  ) {}

  private tenantFilter() {
    const tenantId = this.tenantContext.getTenantId();
    return tenantId ? { tenant_id: tenantId } : {};
  }

  async findAll() {
    return this.prisma.equipment.findMany({
      where: { is_active: true, ...this.tenantFilter() },
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
        is_active: true,
        ...this.tenantFilter(),
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
        ...this.tenantFilter(),
        ...(category && { category }),
      },
      include: {
        locations: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const equipment = await this.prisma.equipment.findFirst({
      where: { id, ...this.tenantFilter() },
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
    // Verify location exists (and belongs to this tenant, when scoped)
    const location = await this.prisma.locations.findFirst({
      where: { id: dto.locationId, ...this.tenantFilter() },
    });
    if (!location) {
      throw new NotFoundException(`Location with ID ${dto.locationId} not found`);
    }

    return this.prisma.equipment.create({
      data: {
        tenant_id: this.tenantContext.getTenantId() ?? location.tenant_id ?? null,
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
      const location = await this.prisma.locations.findFirst({
        where: { id: dto.locationId, ...this.tenantFilter() },
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

