import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateBreachDto {
  breachType: string;
  severity?: string;
  description: string;
  occurredAt?: Date;
  affectedDataTypes?: string[];
  affectedCustomerIds?: string[];
  rootCause?: string;
  containmentMeasures?: string;
  mitigationActions?: string;
  reportedBy?: string;
  assignedTo?: string;
  notes?: string;
}

@Injectable()
export class BreachesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new data breach record
   * Automatically sets 72-hour notification deadline
   */
  async createBreach(dto: CreateBreachDto) {
    // Calculate notification deadline (72 hours from detection)
    const notificationDeadline = new Date();
    notificationDeadline.setHours(notificationDeadline.getHours() + 72);

    // Count affected customers if IDs provided
    const affectedCustomersCount = dto.affectedCustomerIds?.length || 0;

    return (this.prisma as any).data_breaches.create({
      data: {
        breach_type: dto.breachType as any,
        severity: (dto.severity || 'medium') as any,
        description: dto.description,
        occurred_at: dto.occurredAt || null,
        affected_data_types: dto.affectedDataTypes || [],
        affected_customers_count: affectedCustomersCount,
        affected_customer_ids: dto.affectedCustomerIds || [],
        root_cause: dto.rootCause || null,
        containment_measures: dto.containmentMeasures || null,
        mitigation_actions: dto.mitigationActions || null,
        status: 'detected',
        reported_by: dto.reportedBy || null,
        assigned_to: dto.assignedTo || null,
        notes: dto.notes || null,
        notification_deadline: notificationDeadline,
        // Determine if customer notification is required based on severity and data types
        customer_notification_required: this.requiresCustomerNotification(
          dto.severity || 'medium',
          dto.affectedDataTypes || []
        ),
      },
    });
  }

  /**
   * Get all breach records
   */
  async getAllBreaches(filters?: {
    status?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.severity) {
      where.severity = filters.severity;
    }

    const [breaches, total] = await Promise.all([
      (this.prisma as any).data_breaches.findMany({
        where,
        orderBy: { detected_at: 'desc' },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
      }),
      (this.prisma as any).data_breaches.count({ where }),
    ]);

    return {
      breaches,
      total,
      limit: filters?.limit || 100,
      offset: filters?.offset || 0,
    };
  }

  /**
   * Get a specific breach
   */
  async getBreach(breachId: string) {
    const breach = await (this.prisma as any).data_breaches.findUnique({
      where: { id: breachId },
    });

    if (!breach) {
      throw new NotFoundException(`Breach with ID ${breachId} not found`);
    }

    return breach;
  }

  /**
   * Update breach status
   */
  async updateBreachStatus(
    breachId: string,
    status: string,
    updates?: {
      authorityNotificationDate?: Date;
      authorityName?: string;
      customerNotificationDate?: Date;
      customersNotifiedCount?: number;
      resolvedAt?: Date;
    },
  ) {
    const updateData: any = {
      status,
      updated_at: new Date(),
    };

    if (updates?.authorityNotificationDate) {
      updateData.authority_notification_date = updates.authorityNotificationDate;
      updateData.reported_to_authority = true;
    }
    if (updates?.authorityName) {
      updateData.authority_name = updates.authorityName;
    }
    if (updates?.customerNotificationDate) {
      updateData.customer_notification_date = updates.customerNotificationDate;
    }
    if (updates?.customersNotifiedCount !== undefined) {
      updateData.customers_notified_count = updates.customersNotifiedCount;
    }
    if (updates?.resolvedAt) {
      updateData.resolved_at = updates.resolvedAt;
    }

    return (this.prisma as any).data_breaches.update({
      where: { id: breachId },
      data: updateData,
    });
  }

  /**
   * Get breaches that are overdue for notification (past 72-hour deadline)
   */
  async getOverdueBreaches() {
    const now = new Date();
    
    return (this.prisma as any).data_breaches.findMany({
      where: {
        notification_deadline: {
          lt: now,
        },
        reported_to_authority: false,
        status: {
          in: ['detected', 'assessed'],
        },
      },
      orderBy: { notification_deadline: 'asc' },
    });
  }

  /**
   * Get breaches requiring customer notification
   */
  async getBreachesRequiringCustomerNotification() {
    return (this.prisma as any).data_breaches.findMany({
      where: {
        customer_notification_required: true,
        customer_notification_date: null,
        status: {
          in: ['assessed', 'reported'],
        },
      },
      orderBy: { detected_at: 'desc' },
    });
  }

  /**
   * Get breach statistics
   */
  async getBreachStatistics() {
    const [
      total,
      detected,
      assessed,
      reported,
      resolved,
      overdue,
      requiringCustomerNotification,
    ] = await Promise.all([
      (this.prisma as any).data_breaches.count(),
      (this.prisma as any).data_breaches.count({ where: { status: 'detected' } }),
      (this.prisma as any).data_breaches.count({ where: { status: 'assessed' } }),
      (this.prisma as any).data_breaches.count({ where: { status: 'reported' } }),
      (this.prisma as any).data_breaches.count({ where: { status: 'resolved' } }),
      (this.prisma as any).data_breaches.count({
        where: {
          notification_deadline: { lt: new Date() },
          reported_to_authority: false,
          status: { in: ['detected', 'assessed'] },
        },
      }),
      (this.prisma as any).data_breaches.count({
        where: {
          customer_notification_required: true,
          customer_notification_date: null,
        },
      }),
    ]);

    return {
      total,
      detected,
      assessed,
      reported,
      resolved,
      overdue,
      requiringCustomerNotification,
    };
  }

  /**
   * Determine if customer notification is required
   * Required for high-risk breaches affecting personal data
   */
  private requiresCustomerNotification(
    severity: string,
    affectedDataTypes: string[],
  ): boolean {
    // High or critical severity always requires notification
    if (severity === 'high' || severity === 'critical') {
      return true;
    }

    // Medium severity with sensitive data types requires notification
    if (severity === 'medium') {
      const sensitiveTypes = ['medical_data', 'financial_data', 'customer_data'];
      return affectedDataTypes.some((type) => sensitiveTypes.includes(type));
    }

    return false;
  }
}

