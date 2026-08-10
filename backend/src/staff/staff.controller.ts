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
import { StaffService, CreateStaffDto, UpdateStaffDto } from './staff.service';
import { parsePaginationQuery } from '../common/utils/pagination';

@ApiTags('staff')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active staff' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location ID' })
  @ApiQuery({ name: 'skip', required: false, description: 'Pagination: number of records to skip (opt-in, unbounded when omitted)' })
  @ApiQuery({ name: 'take', required: false, description: 'Pagination: max records to return, capped at 500 (opt-in, unbounded when omitted)' })
  @ApiResponse({ status: 200, description: 'List of staff' })
  async findAll(
    @Query('locationId') locationId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const pagination = parsePaginationQuery(skip, take);
    if (locationId) {
      return this.staffService.findByLocation(locationId, pagination);
    }
    return this.staffService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a staff member by ID' })
  @ApiParam({ name: 'id', description: 'Staff UUID' })
  @ApiResponse({ status: 200, description: 'Staff found' })
  @ApiResponse({ status: 404, description: 'Staff not found' })
  async findOne(@Param('id') id: string) {
    return this.staffService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new staff member' })
  @ApiResponse({ status: 201, description: 'Staff created' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async create(@Body() createStaffDto: CreateStaffDto) {
    return this.staffService.create(createStaffDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a staff member' })
  @ApiParam({ name: 'id', description: 'Staff UUID' })
  @ApiResponse({ status: 200, description: 'Staff updated' })
  @ApiResponse({ status: 404, description: 'Staff not found' })
  async update(@Param('id') id: string, @Body() updateStaffDto: UpdateStaffDto) {
    return this.staffService.update(id, updateStaffDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a staff member (soft delete)' })
  @ApiParam({ name: 'id', description: 'Staff UUID' })
  @ApiResponse({ status: 200, description: 'Staff deleted' })
  @ApiResponse({ status: 404, description: 'Staff not found' })
  async remove(@Param('id') id: string) {
    return this.staffService.remove(id);
  }
}

