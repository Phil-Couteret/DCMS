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
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { InvoiceStatus } from '../generated/prisma/enums.js';
import { BillingService } from './billing.service.js';
import { AddPaymentDto } from './dto/add-payment.dto.js';
import { AddRefundDto } from './dto/add-refund.dto.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import { UpdateInvoiceDto } from './dto/update-invoice.dto.js';

@Controller('billing')
@UseGuards(JwtAuthGuard)
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
  @Delete(':id')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.billing.cancel(id);
  }
}
