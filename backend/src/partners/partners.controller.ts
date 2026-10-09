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
import { AdminAuthGuard } from '../auth/admin-auth.guard.js';
import { StaffAuthGuard } from '../auth/staff-auth.guard.js';
import { assertIsoDate } from '../financial/financial.service.js';
import { PartnerInvoiceStatus, Role } from '../generated/prisma/enums.js';
import { CreatePartnerDto } from './dto/create-partner.dto.js';
import { CreatePartnerInvoiceDto, RecordPartnerPaymentDto } from './dto/partner-invoice.dto.js';
import { UpdatePartnerDto } from './dto/update-partner.dto.js';
import { PartnersService } from './partners.service.js';

// Partner accounts and what partners owe: admins only, except the list,
// which the booking form needs to offer partners to any staff member.
@Controller('partners')
@UseGuards(StaffAuthGuard)
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  // Admins get the whole record (API key, commission, amount owed); other
  // staff only what the booking form needs.
  @Get()
  findAll(@CurrentUser() user: { role: string }) {
    return user.role === Role.ADMIN ? this.partners.findAll() : this.partners.options();
  }

  @UseGuards(AdminAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.findOne(id);
  }

  @UseGuards(AdminAuthGuard)
  @Post()
  create(@Body() dto: CreatePartnerDto) {
    return this.partners.create(dto);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePartnerDto) {
    return this.partners.update(id, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Post(':id/regenerate-credentials')
  regenerate(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.regenerateCredentials(id);
  }

  @UseGuards(AdminAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.remove(id);
  }

  // What an invoice for these dates would hold.
  @UseGuards(AdminAuthGuard)
  @Get(':id/invoice-preview')
  preview(@Param('id', ParseUUIDPipe) id: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.partners.preview(id, assertIsoDate(from, 'from'), assertIsoDate(to, 'to'));
  }

  @UseGuards(AdminAuthGuard)
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
@UseGuards(AdminAuthGuard)
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
