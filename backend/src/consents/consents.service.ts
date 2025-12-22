import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { consent_type, consent_method } from '@prisma/client';

export interface CreateConsentDto {
  customerId: string;
  consentType: consent_type;
  consentGiven: boolean;
  consentMethod?: consent_method;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ConsentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all consents for a customer
   */
  async getCustomerConsents(customerId: string) {
    return this.prisma.customer_consents.findMany({
      where: { customer_id: customerId },
      orderBy: { consent_date: 'desc' },
    });
  }

  /**
   * Get active consents for a customer
   */
  async getActiveConsents(customerId: string) {
    return this.prisma.customer_consents.findMany({
      where: {
        customer_id: customerId,
        is_active: true,
        consent_given: true,
      },
      orderBy: { consent_date: 'desc' },
    });
  }

  /**
   * Check if customer has active consent for a specific type
   */
  async hasConsent(customerId: string, consentType: consent_type): Promise<boolean> {
    const consent = await this.prisma.customer_consents.findFirst({
      where: {
        customer_id: customerId,
        consent_type: consentType,
        is_active: true,
        consent_given: true,
      },
      orderBy: { consent_date: 'desc' },
    });

    return !!consent;
  }

  /**
   * Record consent for a customer
   */
  async recordConsent(dto: CreateConsentDto) {
    // Verify customer exists
    const customer = await this.prisma.customers.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
    }

    // If withdrawing consent, mark previous active consents as withdrawn
    if (!dto.consentGiven && dto.consentType !== 'data_processing') {
      // Data processing is necessary for service, but others can be withdrawn
      await this.prisma.customer_consents.updateMany({
        where: {
          customer_id: dto.customerId,
          consent_type: dto.consentType,
          is_active: true,
          consent_given: true,
        },
        data: {
          is_active: false,
          withdrawal_date: new Date(),
        },
      });
    }

    // Create new consent record
    return this.prisma.customer_consents.create({
      data: {
        customer_id: dto.customerId,
        consent_type: dto.consentType,
        consent_given: dto.consentGiven,
        consent_method: dto.consentMethod || 'online',
        ip_address: dto.ipAddress || null,
        user_agent: dto.userAgent || null,
        is_active: true,
      },
    });
  }

  /**
   * Withdraw consent for a customer
   */
  async withdrawConsent(customerId: string, consentType: consent_type) {
    if (consentType === 'data_processing') {
      throw new BadRequestException('Data processing consent cannot be withdrawn while account is active');
    }

    return this.recordConsent({
      customerId,
      consentType,
      consentGiven: false,
      consentMethod: 'online',
    });
  }

  /**
   * Delete all consents for a customer (when account is deleted)
   */
  async deleteCustomerConsents(customerId: string) {
    // Consents will be automatically deleted due to ON DELETE CASCADE
    // But we can also explicitly delete them
    return this.prisma.customer_consents.deleteMany({
      where: { customer_id: customerId },
    });
  }

  /**
   * Get consent history for a customer (for data export)
   */
  async getConsentHistory(customerId: string) {
    return this.getCustomerConsents(customerId);
  }
}

