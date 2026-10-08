import { Body, Controller, Delete, Get, Param, ParseBoolPipe, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard.js';
import { StaffAuthGuard } from '../auth/staff-auth.guard.js';
import { SaveLocationDto } from './dto/location.dto.js';
import { LocationsService } from './locations.service.js';

// The center's locations. Staff read them (selectors, filters); admins
// manage them.
@Controller('locations')
@UseGuards(StaffAuthGuard)
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  // ?active=true: only those offered in selection lists.
  @Get()
  findAll(@Query('active', new ParseBoolPipe({ optional: true })) active?: boolean) {
    return this.locations.findAll({ active });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.locations.findOne(id);
  }

  @Post()
  @UseGuards(AdminAuthGuard)
  create(@Body() dto: SaveLocationDto) {
    return this.locations.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SaveLocationDto) {
    return this.locations.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.locations.remove(id);
  }
}
