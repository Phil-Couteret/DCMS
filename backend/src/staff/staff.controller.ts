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
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard.js';
import { isStaffRole, StaffAuthGuard } from '../auth/staff-auth.guard.js';
import { StaffStatus, StaffType } from '../generated/prisma/enums.js';
import { CreateQualificationDto, UpdateQualificationDto } from './dto/create-qualification.dto.js';
import { SetStaffStatusDto } from './dto/set-status.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { SetAvailabilityDto } from './dto/set-availability.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard.js';
import { StaffService } from './staff.service.js';

@Controller('staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  // Public, but phone is only included for a staff token.
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Req() req: { user?: { role?: string } },
    @Query('type', new ParseEnumPipe(StaffType, { optional: true })) type?: StaffType,
    @Query('status', new ParseEnumPipe(StaffStatus, { optional: true }))
    status?: StaffStatus,
  ) {
    return this.staff.findAll({ type, status }, isStaffRole(req.user?.role));
  }

  // Public, but phone is only included for a staff token.
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: { user?: { role?: string } }) {
    return this.staff.findOne(id, isStaffRole(req.user?.role));
  }

  // Profiles and qualifications are managed by admins; status and
  // availability by any staff member.
  @Post()
  @UseGuards(AdminAuthGuard)
  create(@Body() dto: CreateStaffDto) {
    return this.staff.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStaffDto) {
    return this.staff.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.staff.remove(id);
  }

  @Post(':id/qualifications')
  @UseGuards(AdminAuthGuard)
  addQualification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateQualificationDto,
  ) {
    return this.staff.addQualification(id, dto);
  }

  @Patch(':id/qualifications/:qualificationId')
  @UseGuards(AdminAuthGuard)
  updateQualification(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('qualificationId', ParseUUIDPipe) qualificationId: string,
    @Body() dto: UpdateQualificationDto,
  ) {
    return this.staff.updateQualification(id, qualificationId, dto);
  }

  @Delete(':id/qualifications/:qualificationId')
  @UseGuards(AdminAuthGuard)
  removeQualification(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('qualificationId', ParseUUIDPipe) qualificationId: string,
  ) {
    return this.staff.removeQualification(id, qualificationId);
  }

  @Patch(':id/status')
  @UseGuards(StaffAuthGuard)
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetStaffStatusDto) {
    return this.staff.update(id, { status: dto.status });
  }

  @Put(':id/availability')
  @UseGuards(StaffAuthGuard)
  setAvailability(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetAvailabilityDto) {
    return this.staff.setAvailability(id, dto);
  }
}
