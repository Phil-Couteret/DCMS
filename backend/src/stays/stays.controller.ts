import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateStayCostDto } from './dto/create-stay-cost.dto.js';
import { UpdateStayCostDto } from './dto/update-stay-cost.dto.js';
import { StaysService } from './stays.service.js';

// A customer has at most one open stay, so stays are addressed by customer.
@Controller('stays')
@UseGuards(JwtAuthGuard)
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

  @Post('customer/:customerId/bill')
  bill(@Param('customerId', ParseUUIDPipe) customerId: string) {
    return this.stays.bill(customerId);
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
