import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export interface CreatePartnerDto {
  name: string;
  companyName: string;
  contactEmail: string;
  contactPhone?: string;
  webhookUrl?: string;
  commissionRate?: number;
  allowedLocations?: string[];
  settings?: any;
}

export interface UpdatePartnerDto {
  name?: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  webhookUrl?: string;
  commissionRate?: number;
  allowedLocations?: string[];
  isActive?: boolean;
  settings?: any;
}

@Injectable()
export class PartnersService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
  ) {}

  private tenantFilter() {
    const tenantId = this.tenantContext.getTenantId();
    return tenantId ? { tenant_id: tenantId } : {};
  }

  async findAll() {
    return this.prisma.partners.findMany({
      where: this.tenantFilter(),
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const partner = await this.prisma.partners.findFirst({
      where: { id, ...this.tenantFilter() },
    });

    if (!partner) {
      throw new NotFoundException(`Partner with ID ${id} not found`);
    }

    return partner;
  }

  async findByApiKey(apiKey: string) {
    return this.prisma.partners.findUnique({
      where: { api_key: apiKey },
    });
  }

  async create(createPartnerDto: CreatePartnerDto) {
    const tenantId = this.tenantContext.getTenantId();
    const existing = await this.prisma.partners.findFirst({
      where: { contact_email: createPartnerDto.contactEmail, ...this.tenantFilter() },
    });

    if (existing) {
      throw new ConflictException(`Partner with email ${createPartnerDto.contactEmail} already exists`);
    }

    // Generate API key
    const apiKey = this.generateApiKey();
    
    // Generate API secret and hash it
    const apiSecret = this.generateApiSecret();
    const apiSecretHash = await bcrypt.hash(apiSecret, 10);

    const partner = await this.prisma.partners.create({
      data: {
        ...(tenantId && { tenant_id: tenantId }),
        name: createPartnerDto.name,
        company_name: createPartnerDto.companyName,
        contact_email: createPartnerDto.contactEmail,
        contact_phone: createPartnerDto.contactPhone,
        webhook_url: createPartnerDto.webhookUrl,
        commission_rate: createPartnerDto.commissionRate,
        allowed_locations: createPartnerDto.allowedLocations || [],
        api_key: apiKey,
        api_secret_hash: apiSecretHash,
        settings: createPartnerDto.settings || {},
        is_active: true,
      },
    });

    // Return partner with API secret (only shown once)
    return {
      ...partner,
      apiSecret, // Include the plain secret only on creation
    };
  }

  async update(id: string, updatePartnerDto: UpdatePartnerDto) {
    await this.findOne(id); // Check if exists

    const updateData: any = {};
    if (updatePartnerDto.name !== undefined) updateData.name = updatePartnerDto.name;
    if (updatePartnerDto.companyName !== undefined) updateData.company_name = updatePartnerDto.companyName;
    if (updatePartnerDto.contactEmail !== undefined) {
      // Check if email is already used by another partner
      const existing = await this.prisma.partners.findUnique({
        where: { contact_email: updatePartnerDto.contactEmail },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Partner with email ${updatePartnerDto.contactEmail} already exists`);
      }
      updateData.contact_email = updatePartnerDto.contactEmail;
    }
    if (updatePartnerDto.contactPhone !== undefined) updateData.contact_phone = updatePartnerDto.contactPhone;
    if (updatePartnerDto.webhookUrl !== undefined) updateData.webhook_url = updatePartnerDto.webhookUrl;
    if (updatePartnerDto.commissionRate !== undefined) updateData.commission_rate = updatePartnerDto.commissionRate;
    if (updatePartnerDto.allowedLocations !== undefined) updateData.allowed_locations = updatePartnerDto.allowedLocations;
    if (updatePartnerDto.isActive !== undefined) updateData.is_active = updatePartnerDto.isActive;
    if (updatePartnerDto.settings !== undefined) updateData.settings = updatePartnerDto.settings;

    return this.prisma.partners.update({
      where: { id },
      data: updateData,
    });
  }

  async regenerateApiKey(id: string) {
    await this.findOne(id);

    const apiKey = this.generateApiKey();
    const apiSecret = this.generateApiSecret();
    const apiSecretHash = await bcrypt.hash(apiSecret, 10);

    const partner = await this.prisma.partners.update({
      where: { id },
      data: {
        api_key: apiKey,
        api_secret_hash: apiSecretHash,
      },
    });

    return {
      ...partner,
      apiSecret, // Include the plain secret only when regenerating
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.partners.delete({
      where: { id },
    });
  }

  private generateApiKey(): string {
    // Generate a random API key (e.g., "dcms_partner_" + 32 random hex chars)
    return `dcms_partner_${crypto.randomBytes(16).toString('hex')}`;
  }

  private generateApiSecret(): string {
    // Generate a random API secret (64 random hex chars)
    return crypto.randomBytes(32).toString('hex');
  }
}

