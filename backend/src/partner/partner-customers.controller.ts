import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiSecurity } from '@nestjs/swagger';
import { PartnerCustomersService, CreatePartnerCustomerDto, UpdatePartnerCustomerDto } from './partner-customers.service';
import { PartnerAuthGuard } from '../common/guards/partner-auth.guard';
import { Partner } from '../common/decorators/partner.decorator';

@ApiTags('partner')
@ApiSecurity('api-key')
@Controller('partner/customers')
@UseGuards(PartnerAuthGuard)
export class PartnerCustomersController {
  constructor(private readonly partnerCustomersService: PartnerCustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all customers created by the partner' })
  @ApiResponse({ status: 200, description: 'List of partner customers' })
  async findAll(@Partner() partner: any) {
    return this.partnerCustomersService.findAll(partner.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by ID (only if created by partner)' })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'Customer found' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(@Param('id') id: string, @Partner() partner: any) {
    return this.partnerCustomersService.findOne(id, partner.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, description: 'Customer created' })
  async create(@Body() createDto: CreatePartnerCustomerDto, @Partner() partner: any) {
    return this.partnerCustomersService.create(createDto, partner.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a customer (only if created by partner)' })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'Customer updated' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePartnerCustomerDto,
    @Partner() partner: any,
  ) {
    return this.partnerCustomersService.update(id, updateDto, partner.id);
  }
}

