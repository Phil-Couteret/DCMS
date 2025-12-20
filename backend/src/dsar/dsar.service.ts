import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateDsarDto {
  customerId: string;
  requestType?: string;
  requestedBy?: string;
  requestDetails?: any;
  responseFormat?: string;
  responseDeliveryMethod?: string;
}

@Injectable()
export class DsarService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new DSAR request
   * Automatically sets 30-day deadline
   */
  async createDsar(dto: CreateDsarDto) {
    // Verify customer exists
    const customer = await this.prisma.customers.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
    }

    // Calculate deadline (30 days from now)
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);

    return this.prisma.data_subject_access_requests.create({
      data: {
        customer_id: dto.customerId,
        request_type: dto.requestType || 'access',
        status: 'pending',
        deadline,
        requested_by: dto.requestedBy || customer.email || null,
        request_details: dto.requestDetails || {},
        response_format: dto.responseFormat || 'json',
        response_delivery_method: dto.responseDeliveryMethod || 'portal',
      },
    });
  }

  /**
   * Get DSAR requests for a customer
   */
  async getCustomerDsars(customerId: string) {
    return this.prisma.data_subject_access_requests.findMany({
      where: { customer_id: customerId },
      orderBy: { requested_at: 'desc' },
    });
  }

  /**
   * Get a specific DSAR request
   */
  async getDsar(dsarId: string) {
    const dsar = await this.prisma.data_subject_access_requests.findUnique({
      where: { id: dsarId },
      include: {
        customers: true,
      },
    });

    if (!dsar) {
      throw new NotFoundException(`DSAR request with ID ${dsarId} not found`);
    }

    return dsar;
  }

  /**
   * Update DSAR status
   */
  async updateDsarStatus(
    dsarId: string,
    status: string,
    responseData?: any,
    rejectionReason?: string,
  ) {
    const updateData: any = {
      status,
      updated_at: new Date(),
    };

    if (status === 'completed') {
      updateData.completed_at = new Date();
      if (responseData) {
        updateData.response_data = responseData;
      }
    }

    if (status === 'rejected' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    return this.prisma.data_subject_access_requests.update({
      where: { id: dsarId },
      data: updateData,
    });
  }

  /**
   * Mark DSAR response as delivered
   */
  async markDsarDelivered(dsarId: string, deliveryMethod?: string) {
    return this.prisma.data_subject_access_requests.update({
      where: { id: dsarId },
      data: {
        response_delivered_at: new Date(),
        response_delivery_method: deliveryMethod || 'portal',
        status: 'completed',
      },
    });
  }

  /**
   * Get overdue DSAR requests (past deadline and still pending/in_progress)
   */
  async getOverdueDsars() {
    return this.prisma.data_subject_access_requests.findMany({
      where: {
        deadline: {
          lt: new Date(),
        },
        status: {
          in: ['pending', 'in_progress'],
        },
      },
      include: {
        customers: true,
      },
      orderBy: { deadline: 'asc' },
    });
  }

  /**
   * Get DSAR statistics
   */
  async getDsarStatistics(customerId?: string) {
    const where = customerId ? { customer_id: customerId } : {};

    const [total, pending, completed, overdue] = await Promise.all([
      this.prisma.data_subject_access_requests.count({ where }),
      this.prisma.data_subject_access_requests.count({
        where: { ...where, status: 'pending' },
      }),
      this.prisma.data_subject_access_requests.count({
        where: { ...where, status: 'completed' },
      }),
      this.prisma.data_subject_access_requests.count({
        where: {
          ...where,
          deadline: { lt: new Date() },
          status: { in: ['pending', 'in_progress'] },
        },
      }),
    ]);

    return {
      total,
      pending,
      completed,
      overdue,
    };
  }
}

