import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { StaffAuthGuard } from '../auth/staff-auth.guard.js';
import { assertIsoDate } from '../financial/financial.service.js';
import { PartnerInvoiceStatus } from '../generated/prisma/enums.js';
import { CreatePartnerDto } from './dto/create-partner.dto.js';
import { CreatePartnerInvoiceDto, RecordPartnerPaymentDto } from './dto/partner-invoice.dto.js';
import { UpdatePartnerDto } from './dto/update-partner.dto.js';
import { PartnersService } from './partners.service.js';

// Staff: partner accounts and what partners owe.
@Controller('partners')
@UseGuards(StaffAuthGuard)
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Get()
  findAll() {
    return this.partners.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePartnerDto) {
    return this.partners.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePartnerDto) {
    return this.partners.update(id, dto);
  }

  @Post(':id/regenerate-credentials')
  regenerate(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.regenerateCredentials(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.remove(id);
  }

  // What an invoice for these dates would hold.
  @Get(':id/invoice-preview')
  preview(@Param('id', ParseUUIDPipe) id: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.partners.preview(id, assertIsoDate(from, 'from'), assertIsoDate(to, 'to'));
  }

  @Post(':id/invoices')
  createInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePartnerInvoiceDto,
    @CurrentUser() user: { email: string },
  ) {
    return this.partners.createInvoice(id, dto.from, dto.to, user.email);
  }
}

@Controller('partner-invoices')
@UseGuards(StaffAuthGuard)
export class PartnerInvoicesController {
  constructor(private readonly partners: PartnersService) {}

  @Get()
  findAll(
    @Query('partnerId', new ParseUUIDPipe({ optional: true })) partnerId?: string,
    @Query('status', new ParseEnumPipe(PartnerInvoiceStatus, { optional: true })) status?: PartnerInvoiceStatus,
  ) {
    return this.partners.findInvoices({ partnerId, status });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.findInvoice(id);
  }

  @Patch(':id/payment')
  recordPayment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RecordPartnerPaymentDto) {
    return this.partners.recordPayment(id, dto.paidAmount);
  }

  @Delete(':id')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.cancelInvoice(id);
  }
}
