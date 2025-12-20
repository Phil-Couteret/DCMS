import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';

class CreateAuditLogDto {
  userType: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

@ApiTags('audit')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an audit log entry' })
  @ApiResponse({ status: 201, description: 'Audit log created' })
  async createAuditLog(@Body() createAuditLogDto: CreateAuditLogDto) {
    return this.auditService.createAuditLog(createAuditLogDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get audit logs with filters' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'userType', required: false, description: 'Filter by user type' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action' })
  @ApiQuery({ name: 'resourceType', required: false, description: 'Filter by resource type' })
  @ApiQuery({ name: 'resourceId', required: false, description: 'Filter by resource ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  async getAuditLogs(
    @Query('userId') userId?: string,
    @Query('userType') userType?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditService.getAuditLogs({
      userId,
      userType,
      action,
      resourceType,
      resourceId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('resource/:resourceType/:resourceId')
  @ApiOperation({ summary: 'Get audit logs for a specific resource' })
  @ApiResponse({ status: 200, description: 'List of audit logs' })
  async getResourceAuditLogs(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getResourceAuditLogs(
      resourceType,
      resourceId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get audit logs for a specific user' })
  @ApiResponse({ status: 200, description: 'List of audit logs' })
  async getUserAuditLogs(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getUserAuditLogs(userId, limit ? parseInt(limit, 10) : 100);
  }
}

