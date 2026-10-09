import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { isUUID } from 'class-validator';
import { StaffAuthGuard } from '../auth/staff-auth.guard.js';
import type { UploadedFileData } from '../common/csv.js';
import { TankStatus } from '../generated/prisma/enums.js';
import { CreateTankDto } from './dto/create-tank.dto.js';
import { UpdateTankDto } from './dto/update-tank.dto.js';
import { TanksService } from './tanks.service.js';

// Staff only, as equipment.
@Controller('tanks')
@UseGuards(StaffAuthGuard)
export class TanksController {
  constructor(private readonly tanks: TanksService) {}

  @Get()
  findAll(
    @Query('locationId', new ParseUUIDPipe({ optional: true })) locationId?: string,
    @Query('status', new ParseEnumPipe(TankStatus, { optional: true })) status?: TankStatus,
  ) {
    return this.tanks.findAll({ locationId, status });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tanks.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTankDto) {
    return this.tanks.create(dto);
  }

  // multipart/form-data: "file" (the CSV, at most 2 MB) and optionally
  // "locationId" for rows without a location column.
  @Post('import')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2_000_000, files: 1 } }))
  import(@UploadedFile() file: UploadedFileData | undefined, @Body('locationId') locationId?: string) {
    if (locationId && !isUUID(locationId)) throw new BadRequestException('locationId must be a UUID');
    return this.tanks.import(file, locationId || undefined);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTankDto) {
    return this.tanks.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tanks.remove(id);
  }
}
