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
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { DiveSitesService } from './dive-sites.service.js';
import { CreateDiveSiteDto } from './dto/create-dive-site.dto.js';
import { UpdateDiveSiteDto } from './dto/update-dive-site.dto.js';

@Controller('dive-sites')
export class DiveSitesController {
  constructor(private readonly diveSites: DiveSitesService) {}

  @Get()
  findAll(
    @Query('requiredCertLevel', new ParseIntPipe({ optional: true }))
    requiredCertLevel?: number,
    @Query('difficultyLevel', new ParseIntPipe({ optional: true }))
    difficultyLevel?: number,
  ) {
    return this.diveSites.findAll({ requiredCertLevel, difficultyLevel });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.diveSites.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateDiveSiteDto) {
    return this.diveSites.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDiveSiteDto) {
    return this.diveSites.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.diveSites.remove(id);
  }
}
