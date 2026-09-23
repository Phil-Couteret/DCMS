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
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { BoatsService } from './boats.service.js';
import { CreateBoatDto } from './dto/create-boat.dto.js';
import { UpdateBoatDto } from './dto/update-boat.dto.js';

@Controller('boats')
export class BoatsController {
  constructor(private readonly boats: BoatsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.boats.findAll({ status });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.boats.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateBoatDto) {
    return this.boats.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBoatDto) {
    return this.boats.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.boats.remove(id);
  }
}
