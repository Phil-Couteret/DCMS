import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BreachesService } from './breaches.service';

class CreateBreachDto {
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

class UpdateBreachStatusDto {
  status: string;
  authorityNotificationDate?: Date;
  authorityName?: string;
  customerNotificationDate?: Date;
  customersNotifiedCount?: number;
  resolvedAt?: Date;
}

@ApiTags('breaches')
@Controller('breaches')
export class BreachesController {
  constructor(private readonly breachesService: BreachesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new data breach record' })
  @ApiResponse({ status: 201, description: 'Breach record created' })
  async createBreach(@Body() createBreachDto: CreateBreachDto) {
    return this.breachesService.createBreach(createBreachDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all breach records with optional filters' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  async getAllBreaches(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.breachesService.getAllBreaches({
      status,
      severity,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get breach statistics' })
  async getBreachStatistics() {
    return this.breachesService.getBreachStatistics();
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get breaches overdue for notification (past 72-hour deadline)' })
  async getOverdueBreaches() {
    return this.breachesService.getOverdueBreaches();
  }

  @Get('requiring-customer-notification')
  @ApiOperation({ summary: 'Get breaches requiring customer notification' })
  async getBreachesRequiringCustomerNotification() {
    return this.breachesService.getBreachesRequiringCustomerNotification();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific breach record' })
  @ApiParam({ name: 'id', description: 'Breach UUID' })
  async getBreach(@Param('id') id: string) {
    return this.breachesService.getBreach(id);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update breach status' })
  @ApiParam({ name: 'id', description: 'Breach UUID' })
  async updateBreachStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateBreachStatusDto,
  ) {
    return this.breachesService.updateBreachStatus(id, updateDto.status, {
      authorityNotificationDate: updateDto.authorityNotificationDate,
      authorityName: updateDto.authorityName,
      customerNotificationDate: updateDto.customerNotificationDate,
      customersNotifiedCount: updateDto.customersNotifiedCount,
      resolvedAt: updateDto.resolvedAt,
    });
  }
}

