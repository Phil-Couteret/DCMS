import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ParseDatePipe } from '../bookings/parse-date.pipe.js';
import { DiveLogsService } from './dive-logs.service.js';
import { AddParticipantDto } from './dto/add-participant.dto.js';
import { AddSignatureDto } from './dto/add-signature.dto.js';
import { CreateDiveLogDto } from './dto/create-dive-log.dto.js';
import { ReportIncidentDto } from './dto/report-incident.dto.js';
import { UpdateDiveLogDto } from './dto/update-dive-log.dto.js';

@Controller('dive-logs')
@UseGuards(JwtAuthGuard)
export class DiveLogsController {
  constructor(private readonly diveLogs: DiveLogsService) {}

  @Get()
  findAll(
    @Query('date', ParseDatePipe) date?: string,
    @Query('siteId', new ParseUUIDPipe({ optional: true })) siteId?: string,
    @Query('guideId', new ParseUUIDPipe({ optional: true })) guideId?: string,
  ) {
    return this.diveLogs.findAll({ date, siteId, guideId });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.diveLogs.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDiveLogDto) {
    return this.diveLogs.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDiveLogDto) {
    return this.diveLogs.update(id, dto);
  }

  @Post(':id/participants')
  addParticipant(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddParticipantDto) {
    return this.diveLogs.addParticipant(id, dto);
  }

  @Post(':id/signatures')
  addSignature(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddSignatureDto) {
    return this.diveLogs.addSignature(id, dto);
  }

  @Post(':id/incident')
  reportIncident(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReportIncidentDto) {
    return this.diveLogs.reportIncident(id, dto);
  }
}
