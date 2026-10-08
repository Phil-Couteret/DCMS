import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StaffAuthGuard } from '../auth/staff-auth.guard.js';
import { OptionalJwtAuthGuard } from '../staff/optional-jwt-auth.guard.js';
import { DiveSitesService } from './dive-sites.service.js';
import { CreateDiveSiteDto } from './dto/create-dive-site.dto.js';
import { UpdateDiveSiteDto } from './dto/update-dive-site.dto.js';

@Controller('dive-sites')
export class DiveSitesController {
  constructor(private readonly diveSites: DiveSitesService) {}

  // Public. A staff token names the tenant; without one, X-Tenant-ID does.
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Query('requiredCertLevel', new ParseIntPipe({ optional: true }))
    requiredCertLevel?: number,
    @Query('difficultyLevel', new ParseIntPipe({ optional: true }))
    difficultyLevel?: number,
  ) {
    return this.diveSites.findAll({ requiredCertLevel, difficultyLevel });
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.diveSites.findOne(id);
  }

  @Post()
  @UseGuards(StaffAuthGuard)
  create(@Body() dto: CreateDiveSiteDto) {
    return this.diveSites.create(dto);
  }

  @Patch(':id')
  @UseGuards(StaffAuthGuard)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDiveSiteDto) {
    return this.diveSites.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(StaffAuthGuard)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.diveSites.remove(id);
  }
}
