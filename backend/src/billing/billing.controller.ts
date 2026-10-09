import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { StaffAuthGuard } from '../auth/staff-auth.guard.js';
import { TenantThrottlerGuard } from '../tenant/tenant-throttler.guard.js';
import { EmailInvoiceDto } from './dto/email-invoice.dto.js';
import { InvoiceStatus } from '../generated/prisma/enums.js';
import { BillingService } from './billing.service.js';
import { AddPaymentDto } from './dto/add-payment.dto.js';
import { AddRefundDto } from './dto/add-refund.dto.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import { UpdateInvoiceDto } from './dto/update-invoice.dto.js';

@Controller('billing')
@UseGuards(StaffAuthGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  findAll(
    @Query('status', new ParseEnumPipe(InvoiceStatus, { optional: true })) status?: InvoiceStatus,
    @Query('customerId', new ParseUUIDPipe({ optional: true })) customerId?: string,
  ) {
    return this.billing.findAll({ status, customerId });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.billing.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.billing.create(dto);
  }

  // Builds the whole invoice from the booking and the server price list.
  @Post('from-booking/:bookingId')
  createFromBooking(@Param('bookingId', ParseUUIDPipe) bookingId: string) {
    return this.billing.createFromBooking(bookingId);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInvoiceDto) {
    return this.billing.update(id, dto);
  }

  @Post(':id/payments')
  addPayment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddPaymentDto) {
    return this.billing.addPayment(id, dto);
  }

  @Post(':id/payments/:paymentId/refunds')
  addRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: AddRefundDto,
  ) {
    return this.billing.addRefund(id, paymentId, dto);
  }

  // Cancels rather than deletes: invoice numbers must never disappear.
  // Emails the rendered invoice to the customer. Rate limited per center
  // and IP: it sends mail to an outside address.
  @Post(':id/email')
  @HttpCode(200)
  @UseGuards(TenantThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60 * 60_000 } })
  email(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EmailInvoiceDto) {
    return this.billing.emailInvoice(id, dto);
  }

  @Delete(':id')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.billing.cancel(id);
  }
}
