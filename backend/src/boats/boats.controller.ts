import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StaffAuthGuard } from '../auth/staff-auth.guard.js';
import { BoatsService } from './boats.service.js';
import { CreateBoatDto } from './dto/create-boat.dto.js';
import { UpdateBoatDto } from './dto/update-boat.dto.js';

// Staff only, reads included: boats and equipment are internal records.
@Controller('boats')
@UseGuards(StaffAuthGuard)
export class BoatsController {
  constructor(private readonly boats: BoatsService) {}

  @Get()
  findAll(@Query('status') status?: string, @Query('locationId') locationId?: string) {
    return this.boats.findAll({ status, locationId });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.boats.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBoatDto) {
    return this.boats.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBoatDto) {
    return this.boats.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.boats.remove(id);
  }
}
