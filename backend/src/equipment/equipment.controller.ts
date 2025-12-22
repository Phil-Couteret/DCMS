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
import { EquipmentService, CreateEquipmentDto, UpdateEquipmentDto } from './equipment.service';

@ApiTags('equipment')
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active equipment' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location ID' })
  @ApiQuery({ name: 'available', required: false, description: 'Filter by availability' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiResponse({ status: 200, description: 'List of equipment' })
  async findAll(
    @Query('locationId') locationId?: string,
    @Query('available') available?: string,
    @Query('category') category?: string,
  ) {
    if (locationId) {
      return this.equipmentService.findByLocation(locationId);
    }
    if (available === 'true') {
      return this.equipmentService.findAvailable(category as any);
    }
    return this.equipmentService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get equipment by ID' })
  @ApiParam({ name: 'id', description: 'Equipment UUID' })
  @ApiResponse({ status: 200, description: 'Equipment found' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new equipment' })
  @ApiResponse({ status: 201, description: 'Equipment created' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async create(@Body() createEquipmentDto: CreateEquipmentDto) {
    return this.equipmentService.create(createEquipmentDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update equipment' })
  @ApiParam({ name: 'id', description: 'Equipment UUID' })
  @ApiResponse({ status: 200, description: 'Equipment updated' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async update(@Param('id') id: string, @Body() updateEquipmentDto: UpdateEquipmentDto) {
    return this.equipmentService.update(id, updateEquipmentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete equipment (soft delete)' })
  @ApiParam({ name: 'id', description: 'Equipment UUID' })
  @ApiResponse({ status: 200, description: 'Equipment deleted' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async remove(@Param('id') id: string) {
    return this.equipmentService.remove(id);
  }
}

