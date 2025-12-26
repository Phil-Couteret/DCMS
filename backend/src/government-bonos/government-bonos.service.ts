import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateGovernmentBonoDto {
  code: string;
  type: string;
  discountPercentage?: number;
  maxAmount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  currentUsage?: number;
  isActive?: boolean;
}

export interface UpdateGovernmentBonoDto {
  code?: string;
  type?: string;
  discountPercentage?: number;
  maxAmount?: number;
  validFrom?: string;
  validUntil?: string;
  usageLimit?: number;
  currentUsage?: number;
  isActive?: boolean;
}

@Injectable()
export class GovernmentBonosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.government_bonos.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const bono = await this.prisma.government_bonos.findUnique({
      where: { id },
    });

    if (!bono) {
      throw new NotFoundException(`Government bono with ID ${id} not found`);
    }

    return bono;
  }

  async findByCode(code: string) {
    return this.prisma.government_bonos.findUnique({
      where: { code },
    });
  }

  async create(createBonoDto: CreateGovernmentBonoDto) {
    return this.prisma.government_bonos.create({
      data: {
        code: createBonoDto.code,
        type: createBonoDto.type,
        discount_percentage: createBonoDto.discountPercentage,
        max_amount: createBonoDto.maxAmount,
        valid_from: new Date(createBonoDto.validFrom),
        valid_until: new Date(createBonoDto.validUntil),
        usage_limit: createBonoDto.usageLimit,
        current_usage: createBonoDto.currentUsage || 0,
        is_active: createBonoDto.isActive !== undefined ? createBonoDto.isActive : true,
      },
    });
  }

  async update(id: string, updateBonoDto: UpdateGovernmentBonoDto) {
    await this.findOne(id); // Check if exists

    const updateData: any = {};
    if (updateBonoDto.code !== undefined) updateData.code = updateBonoDto.code;
    if (updateBonoDto.type !== undefined) updateData.type = updateBonoDto.type;
    if (updateBonoDto.discountPercentage !== undefined) updateData.discount_percentage = updateBonoDto.discountPercentage;
    if (updateBonoDto.maxAmount !== undefined) updateData.max_amount = updateBonoDto.maxAmount;
    if (updateBonoDto.validFrom !== undefined) updateData.valid_from = new Date(updateBonoDto.validFrom);
    if (updateBonoDto.validUntil !== undefined) updateData.valid_until = new Date(updateBonoDto.validUntil);
    if (updateBonoDto.usageLimit !== undefined) updateData.usage_limit = updateBonoDto.usageLimit;
    if (updateBonoDto.currentUsage !== undefined) updateData.current_usage = updateBonoDto.currentUsage;
    if (updateBonoDto.isActive !== undefined) updateData.is_active = updateBonoDto.isActive;

    return this.prisma.government_bonos.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    return this.prisma.government_bonos.update({
      where: { id },
      data: { is_active: false },
    });
  }
}

