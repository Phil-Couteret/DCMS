import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { StaffAuthGuard } from '../auth/staff-auth.guard.js';
import { CustomerCertificationsService } from './customer-certifications.service.js';
import { CreateCertificationDto } from './dto/create-certification.dto.js';
import { UpdateCertificationDto } from './dto/update-certification.dto.js';

@Controller('customers/:id/certifications')
@UseGuards(StaffAuthGuard)
export class CustomerCertificationsController {
  constructor(private readonly certifications: CustomerCertificationsService) {}

  @Get()
  findAll(@Param('id', ParseUUIDPipe) id: string) {
    return this.certifications.findAll(id);
  }

  @Post()
  create(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateCertificationDto) {
    return this.certifications.create(id, dto);
  }

  @Patch(':certId')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('certId', ParseUUIDPipe) certId: string,
    @Body() dto: UpdateCertificationDto,
    @CurrentUser() user: { email: string },
  ) {
    return this.certifications.update(id, certId, dto, user.email);
  }

  @Delete(':certId')
  remove(@Param('id', ParseUUIDPipe) id: string, @Param('certId', ParseUUIDPipe) certId: string) {
    return this.certifications.remove(id, certId);
  }
}
