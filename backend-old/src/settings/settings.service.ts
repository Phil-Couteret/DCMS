import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

export { CreateSettingDto, UpdateSettingDto };

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
  ) {}

  private tenantFilter() {
    const tenantId = this.tenantContext.getTenantId();
    return tenantId ? { tenant_id: tenantId } : {};
  }

  async findAll() {
    return this.prisma.settings.findMany({
      where: this.tenantFilter(),
      orderBy: { key: 'asc' },
    });
  }

  async findOne(id: string) {
    const setting = await this.prisma.settings.findFirst({
      where: { id, ...this.tenantFilter() },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with ID ${id} not found`);
    }

    return setting;
  }

  async findByKey(key: string) {
    return this.prisma.settings.findUnique({
      where: { key },
    });
  }

  async getDefaultSettings() {
    // Return the first settings record (assuming there's one default settings object)
    const settings = await this.prisma.settings.findFirst({
      where: { key: 'default', ...this.tenantFilter() },
    });
    
    if (settings) {
      return [settings];
    }
    
    // If no default settings exist, return all settings
    return this.findAll();
  }

  async create(createSettingDto: CreateSettingDto) {
    return this.prisma.settings.create({
      data: {
        tenant_id: this.tenantContext.getTenantId() ?? null,
        key: createSettingDto.key,
        value: createSettingDto.value || {},
        description: createSettingDto.description,
      },
    });
  }

  async update(id: string, updateSettingDto: UpdateSettingDto) {
    await this.findOne(id); // Check if exists

    const updateData: any = {};
    if (updateSettingDto.key !== undefined) updateData.key = updateSettingDto.key;
    if (updateSettingDto.value !== undefined) updateData.value = updateSettingDto.value;
    if (updateSettingDto.description !== undefined) updateData.description = updateSettingDto.description;

    return this.prisma.settings.update({
      where: { id },
      data: updateData,
    });
  }

  async updateByKey(key: string, updateSettingDto: UpdateSettingDto) {
    const existing = await this.findByKey(key);
    if (!existing) {
      // Create if doesn't exist
      return this.create({
        key,
        value: updateSettingDto.value || {},
        description: updateSettingDto.description,
      });
    }

    return this.update(existing.id, updateSettingDto);
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    return this.prisma.settings.delete({
      where: { id },
    });
  }
}

