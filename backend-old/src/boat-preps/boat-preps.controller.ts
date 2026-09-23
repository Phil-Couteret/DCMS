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
import { BoatPrepsService, CreateBoatPrepDto, UpdateBoatPrepDto } from './boat-preps.service';

@ApiTags('boat-preps')
@Controller('boat-preps')
export class BoatPrepsController {
  constructor(private readonly boatPrepsService: BoatPrepsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all boat preparations' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location ID' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'List of boat preparations' })
  async findAll(
    @Query('locationId') locationId?: string,
    @Query('date') date?: string,
  ) {
    if (date) {
      return this.boatPrepsService.findByDate(date, locationId);
    }
    if (locationId) {
      return this.boatPrepsService.findByLocation(locationId);
    }
    return this.boatPrepsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a boat preparation by ID' })
  @ApiParam({ name: 'id', description: 'Boat prep UUID' })
  @ApiResponse({ status: 200, description: 'Boat prep found' })
  @ApiResponse({ status: 404, description: 'Boat prep not found' })
  async findOne(@Param('id') id: string) {
    return this.boatPrepsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new boat preparation' })
  @ApiResponse({ status: 201, description: 'Boat prep created' })
  async create(@Body() createBoatPrepDto: CreateBoatPrepDto) {
    return this.boatPrepsService.create(createBoatPrepDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a boat preparation' })
  @ApiParam({ name: 'id', description: 'Boat prep UUID' })
  @ApiResponse({ status: 200, description: 'Boat prep updated' })
  @ApiResponse({ status: 404, description: 'Boat prep not found' })
  async update(@Param('id') id: string, @Body() updateBoatPrepDto: UpdateBoatPrepDto) {
    return this.boatPrepsService.update(id, updateBoatPrepDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a boat preparation' })
  @ApiParam({ name: 'id', description: 'Boat prep UUID' })
  @ApiResponse({ status: 200, description: 'Boat prep deleted' })
  @ApiResponse({ status: 404, description: 'Boat prep not found' })
  async remove(@Param('id') id: string) {
    return this.boatPrepsService.remove(id);
  }
}

