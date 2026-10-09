import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { StaffAuthGuard } from '../auth/staff-auth.guard.js';
import { BillStayDto } from './dto/bill-stay.dto.js';
import { CreateStayCostDto } from './dto/create-stay-cost.dto.js';
import { QuoteBookingDto } from './dto/quote-booking.dto.js';
import { UpdateStayCostDto } from './dto/update-stay-cost.dto.js';
import { StaysService } from './stays.service.js';

// A customer has at most one open stay, so stays are addressed by customer.
@Controller('stays')
@UseGuards(StaffAuthGuard)
export class StaysController {
  constructor(private readonly stays: StaysService) {}

  @Get()
  findAll() {
    return this.stays.findAll();
  }

  @Get('customer/:customerId')
  findOne(@Param('customerId', ParseUUIDPipe) customerId: string) {
    return this.stays.findOne(customerId);
  }

  @Post('customer/:customerId/costs')
  addCost(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreateStayCostDto,
    @CurrentUser() user: { email: string },
  ) {
    return this.stays.addCost(customerId, dto, user.email);
  }

  // The dive insurance the stay needs, added to it as an extra cost.
  @Post('customer/:customerId/insurance')
  addInsurance(@Param('customerId', ParseUUIDPipe) customerId: string, @CurrentUser() user: { email: string }) {
    return this.stays.addInsurance(customerId, user.email);
  }

  // A booking priced before it is saved (the booking form's live price).
  @Post('quote')
  @HttpCode(200)
  quote(@Body() dto: QuoteBookingDto) {
    return this.stays.quote(dto);
  }

  @Post('customer/:customerId/bill')
  bill(@Param('customerId', ParseUUIDPipe) customerId: string, @Body() dto: BillStayDto) {
    return this.stays.bill(customerId, dto.usePack ?? false);
  }

  @Patch('costs/:id')
  updateCost(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStayCostDto) {
    return this.stays.updateCost(id, dto);
  }

  @Delete('costs/:id')
  removeCost(@Param('id', ParseUUIDPipe) id: string) {
    return this.stays.removeCost(id);
  }
}
