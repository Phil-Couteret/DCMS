import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import {
  ScheduleSlotGuidesService,
  CreateScheduleSlotGuideDto,
  UpdateScheduleSlotGuideDto,
} from './schedule-slot-guides.service';

@ApiTags('schedule-slot-guides')
@Controller('schedule-slot-guides')
export class ScheduleSlotGuidesController {
  constructor(private readonly scheduleSlotGuidesService: ScheduleSlotGuidesService) {}

  @Get()
  @ApiOperation({ summary: 'Get slot-guide coverage records' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location ID' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'List of slot-guide records' })
  async findAll(
    @Query('locationId') locationId?: string,
    @Query('date') date?: string,
  ) {
    if (locationId || date) {
      return this.scheduleSlotGuidesService.findByLocationAndDate(locationId, date);
    }
    return this.scheduleSlotGuidesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a slot-guide record by ID' })
  @ApiParam({ name: 'id', description: 'Schedule slot guide UUID' })
  @ApiResponse({ status: 200, description: 'Record found' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async findOne(@Param('id') id: string) {
    return this.scheduleSlotGuidesService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a slot-guide record' })
  @ApiResponse({ status: 201, description: 'Record created' })
  async create(@Body() dto: CreateScheduleSlotGuideDto) {
    return this.scheduleSlotGuidesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a slot-guide record' })
  @ApiParam({ name: 'id', description: 'Schedule slot guide UUID' })
  @ApiResponse({ status: 200, description: 'Record updated' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateScheduleSlotGuideDto) {
    return this.scheduleSlotGuidesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a slot-guide record' })
  @ApiParam({ name: 'id', description: 'Schedule slot guide UUID' })
  @ApiResponse({ status: 200, description: 'Record deleted' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async remove(@Param('id') id: string) {
    return this.scheduleSlotGuidesService.remove(id);
  }
}
