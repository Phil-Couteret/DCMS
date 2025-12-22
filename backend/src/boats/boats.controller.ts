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
import { BoatsService, CreateBoatDto, UpdateBoatDto } from './boats.service';

@ApiTags('boats')
@Controller('boats')
export class BoatsController {
  constructor(private readonly boatsService: BoatsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active boats' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location ID' })
  @ApiResponse({ status: 200, description: 'List of boats' })
  async findAll(@Query('locationId') locationId?: string) {
    if (locationId) {
      return this.boatsService.findByLocation(locationId);
    }
    return this.boatsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a boat by ID' })
  @ApiParam({ name: 'id', description: 'Boat UUID' })
  @ApiResponse({ status: 200, description: 'Boat found' })
  @ApiResponse({ status: 404, description: 'Boat not found' })
  async findOne(@Param('id') id: string) {
    return this.boatsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new boat' })
  @ApiResponse({ status: 201, description: 'Boat created' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async create(@Body() createBoatDto: CreateBoatDto) {
    return this.boatsService.create(createBoatDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a boat' })
  @ApiParam({ name: 'id', description: 'Boat UUID' })
  @ApiResponse({ status: 200, description: 'Boat updated' })
  @ApiResponse({ status: 404, description: 'Boat not found' })
  async update(@Param('id') id: string, @Body() updateBoatDto: UpdateBoatDto) {
    return this.boatsService.update(id, updateBoatDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a boat (soft delete)' })
  @ApiParam({ name: 'id', description: 'Boat UUID' })
  @ApiResponse({ status: 200, description: 'Boat deleted' })
  @ApiResponse({ status: 404, description: 'Boat not found' })
  async remove(@Param('id') id: string) {
    return this.boatsService.remove(id);
  }
}

