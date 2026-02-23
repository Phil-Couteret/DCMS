import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
export interface CreateLocationDto {
  name: string;
  type: string;
  address: any;
  contactInfo?: any;
  settings?: any;
  isActive?: boolean;
}

export interface UpdateLocationDto {
  name?: string;
  type?: string;
  address?: any;
  contactInfo?: any;
  settings?: any;
  isActive?: boolean;
}

@Injectable()
export class LocationsService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
  ) {}

  private tenantFilter() {
    const tenantId = this.tenantContext.getTenantId();
    return tenantId ? { tenant_id: tenantId } : {};
  }

  async findAll(includeInactive: boolean = false) {
    const baseWhere = includeInactive ? {} : { is_active: true };
    const where = { ...baseWhere, ...this.tenantFilter() };
    return this.prisma.locations.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const location = await this.prisma.locations.findFirst({
      where: { id, ...this.tenantFilter() },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return location;
  }

  async create(dto: CreateLocationDto) {
    const tenantId = this.tenantContext.getTenantId();
    const data: any = {
      name: dto.name,
      type: dto.type,
      address: dto.address || {},
      contact_info: dto.contactInfo || {},
      settings: dto.settings || {},
      is_active: dto.isActive !== undefined ? dto.isActive : true,
      ...(tenantId && { tenant_id: tenantId }),
    };
    
    if ((dto as any).id) {
      data.id = (dto as any).id;
    }
    
    return this.prisma.locations.create({
      data,
    });
  }

  async update(id: string, dto: UpdateLocationDto) {
    const location = await this.findOne(id);

    return this.prisma.locations.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.contactInfo !== undefined && { contact_info: dto.contactInfo }),
        ...(dto.settings !== undefined && { settings: dto.settings }),
        ...(dto.isActive !== undefined && { is_active: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    const location = await this.findOne(id);
    
    // Soft delete by setting isActive to false (Prisma uses camelCase)
    return this.prisma.locations.update({
      where: { id },
      data: { is_active: false },
    });
  }
}

