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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DsarService } from './dsar.service';
import { CreateDsarDto } from './dto/create-dsar.dto';
import { UpdateDsarStatusDto } from './dto/update-dsar-status.dto';

@ApiTags('dsar')
@Controller('customers/:customerId/dsar')
export class DsarController {
  constructor(private readonly dsarService: DsarService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new DSAR request' })
  @ApiParam({ name: 'customerId', description: 'Customer UUID' })
  @ApiResponse({ status: 201, description: 'DSAR request created' })
  async createDsar(
    @Param('customerId') customerId: string,
    @Body() createDsarDto: CreateDsarDto,
  ) {
    return this.dsarService.createDsar({
      customerId,
      ...createDsarDto,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all DSAR requests for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer UUID' })
  async getCustomerDsars(@Param('customerId') customerId: string) {
    return this.dsarService.getCustomerDsars(customerId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get DSAR statistics for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer UUID' })
  async getDsarStatistics(@Param('customerId') customerId: string) {
    return this.dsarService.getDsarStatistics(customerId);
  }

  @Get('requests/:dsarId')
  @ApiOperation({ summary: 'Get a specific DSAR request' })
  @ApiParam({ name: 'customerId', description: 'Customer UUID' })
  @ApiParam({ name: 'dsarId', description: 'DSAR request UUID' })
  async getDsar(@Param('customerId') customerId: string, @Param('dsarId') dsarId: string) {
    return this.dsarService.getDsar(dsarId, customerId);
  }

  @Patch('requests/:dsarId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update DSAR request status' })
  @ApiParam({ name: 'dsarId', description: 'DSAR request UUID' })
  async updateDsarStatus(
    @Param('dsarId') dsarId: string,
    @Body() updateDto: UpdateDsarStatusDto,
  ) {
    return this.dsarService.updateDsarStatus(
      dsarId,
      updateDto.status,
      updateDto.responseData,
      updateDto.rejectionReason,
    );
  }

  @Patch('requests/:dsarId/delivered')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark DSAR response as delivered' })
  @ApiParam({ name: 'dsarId', description: 'DSAR request UUID' })
  async markDsarDelivered(
    @Param('dsarId') dsarId: string,
    @Body('deliveryMethod') deliveryMethod?: string,
  ) {
    return this.dsarService.markDsarDelivered(dsarId, deliveryMethod);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue DSAR requests (admin only)' })
  async getOverdueDsars() {
    return this.dsarService.getOverdueDsars();
  }
}

