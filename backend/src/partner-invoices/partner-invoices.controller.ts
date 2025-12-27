import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import {
  PartnerInvoicesService,
  CreatePartnerInvoiceDto,
  UpdatePartnerInvoiceDto,
} from './partner-invoices.service';
import { JwtPartnerGuard } from '../partner-auth/jwt-partner.guard';
import { Partner } from '../common/decorators/partner.decorator';

@ApiTags('partner-invoices')
@Controller('partner-invoices')
export class PartnerInvoicesController {
  constructor(private readonly partnerInvoicesService: PartnerInvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all partner invoices' })
  @ApiQuery({ name: 'partnerId', required: false, description: 'Filter by partner ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiResponse({ status: 200, description: 'List of partner invoices' })
  async findAll(
    @Query('partnerId') partnerId?: string,
    @Query('status') status?: string,
  ) {
    return this.partnerInvoicesService.findAll(partnerId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a partner invoice by ID' })
  @ApiParam({ name: 'id', description: 'Partner invoice UUID' })
  @ApiResponse({ status: 200, description: 'Partner invoice found' })
  @ApiResponse({ status: 404, description: 'Partner invoice not found' })
  async findOne(@Param('id') id: string) {
    return this.partnerInvoicesService.findOne(id);
  }

  @Get('partner/:partnerId')
  @ApiOperation({ summary: 'Get all invoices for a specific partner' })
  @ApiParam({ name: 'partnerId', description: 'Partner UUID' })
  @ApiResponse({ status: 200, description: 'List of partner invoices' })
  async findByPartner(@Param('partnerId') partnerId: string) {
    return this.partnerInvoicesService.findByPartner(partnerId);
  }

  @Get('my-invoices')
  @UseGuards(JwtPartnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all invoices for the authenticated partner' })
  @ApiResponse({ status: 200, description: 'List of partner invoices' })
  async getMyInvoices(@Partner() partner: any) {
    return this.partnerInvoicesService.findByPartner(partner.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new partner invoice' })
  @ApiResponse({ status: 201, description: 'Partner invoice created' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async create(@Body() createPartnerInvoiceDto: CreatePartnerInvoiceDto) {
    return this.partnerInvoicesService.create(createPartnerInvoiceDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a partner invoice' })
  @ApiParam({ name: 'id', description: 'Partner invoice UUID' })
  @ApiResponse({ status: 200, description: 'Partner invoice updated' })
  @ApiResponse({ status: 404, description: 'Partner invoice not found' })
  async update(
    @Param('id') id: string,
    @Body() updatePartnerInvoiceDto: UpdatePartnerInvoiceDto,
  ) {
    return this.partnerInvoicesService.update(id, updatePartnerInvoiceDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a partner invoice' })
  @ApiParam({ name: 'id', description: 'Partner invoice UUID' })
  @ApiResponse({ status: 200, description: 'Partner invoice deleted' })
  @ApiResponse({ status: 404, description: 'Partner invoice not found' })
  async remove(@Param('id') id: string) {
    return this.partnerInvoicesService.remove(id);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Mark invoice as paid' })
  @ApiParam({ name: 'id', description: 'Partner invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice marked as paid' })
  async markAsPaid(@Param('id') id: string, @Body() body: { paidAmount?: number }) {
    return this.partnerInvoicesService.update(id, {
      paidAmount: body.paidAmount,
      status: 'paid',
    });
  }
}
