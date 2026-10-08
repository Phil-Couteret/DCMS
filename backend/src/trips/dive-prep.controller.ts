import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { StaffAuthGuard } from '../auth/staff-auth.guard.js';
import { DivePrepService } from './dive-prep.service.js';
import { DivePrepDateDto, DivePrepSlotDto } from './dto/dive-prep-query.dto.js';

// Preparing a day's outings: who goes on which trip, with which crew, where,
// and the post-dive record.
@Controller('dive-prep')
@UseGuards(StaffAuthGuard)
export class DivePrepController {
  constructor(private readonly prep: DivePrepService) {}

  @Get()
  slot(@Query() q: DivePrepSlotDto) {
    return this.prep.slot(q.date, q.timeSlot);
  }

  @Post('auto-assign')
  autoAssign(@Body() dto: DivePrepSlotDto) {
    return this.prep.autoAssign(dto.date, dto.timeSlot);
  }

  @Get('compliance')
  compliance(@Query() q: DivePrepDateDto) {
    return this.prep.compliance(q.date);
  }
}
