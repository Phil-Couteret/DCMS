import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditLogDto {
  userType: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create an audit log entry
   */
  async createAuditLog(dto: CreateAuditLogDto) {
    return this.prisma.audit_logs.create({
      data: {
        user_type: dto.userType,
        user_id: dto.userId || null,
        action: dto.action,
        resource_type: dto.resourceType,
        resource_id: dto.resourceId || null,
        details: dto.details || {},
        ip_address: dto.ipAddress || null,
        user_agent: dto.userAgent || null,
      },
    });
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(filters: {
    userId?: string;
    userType?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.userId) {
      where.user_id = filters.userId;
    }
    if (filters.userType) {
      where.user_type = filters.userType;
    }
    if (filters.action) {
      where.action = filters.action;
    }
    if (filters.resourceType) {
      where.resource_type = filters.resourceType;
    }
    if (filters.resourceId) {
      where.resource_id = filters.resourceId;
    }
    if (filters.startDate || filters.endDate) {
      where.created_at = {};
      if (filters.startDate) {
        where.created_at.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.created_at.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.audit_logs.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
      }),
      this.prisma.audit_logs.count({ where }),
    ]);

    return {
      logs,
      total,
      limit: filters.limit || 100,
      offset: filters.offset || 0,
    };
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceAuditLogs(resourceType: string, resourceId: string, limit = 50) {
    return this.prisma.audit_logs.findMany({
      where: {
        resource_type: resourceType,
        resource_id: resourceId,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(userId: string, limit = 100) {
    return this.prisma.audit_logs.findMany({
      where: {
        user_id: userId,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }
}

