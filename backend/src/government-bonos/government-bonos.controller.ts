import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { GovernmentBonosService, CreateGovernmentBonoDto, UpdateGovernmentBonoDto } from './government-bonos.service';

@ApiTags('government-bonos')
@Controller('government-bonos')
export class GovernmentBonosController {
  constructor(private readonly governmentBonosService: GovernmentBonosService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active government bonos' })
  @ApiResponse({ status: 200, description: 'List of government bonos' })
  async findAll() {
    return this.governmentBonosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a government bono by ID' })
  @ApiParam({ name: 'id', description: 'Government bono UUID' })
  @ApiResponse({ status: 200, description: 'Government bono found' })
  @ApiResponse({ status: 404, description: 'Government bono not found' })
  async findOne(@Param('id') id: string) {
    return this.governmentBonosService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new government bono' })
  @ApiResponse({ status: 201, description: 'Government bono created' })
  async create(@Body() createBonoDto: CreateGovernmentBonoDto) {
    return this.governmentBonosService.create(createBonoDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a government bono' })
  @ApiParam({ name: 'id', description: 'Government bono UUID' })
  @ApiResponse({ status: 200, description: 'Government bono updated' })
  @ApiResponse({ status: 404, description: 'Government bono not found' })
  async update(@Param('id') id: string, @Body() updateBonoDto: UpdateGovernmentBonoDto) {
    return this.governmentBonosService.update(id, updateBonoDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a government bono (soft delete)' })
  @ApiParam({ name: 'id', description: 'Government bono UUID' })
  @ApiResponse({ status: 200, description: 'Government bono deleted' })
  @ApiResponse({ status: 404, description: 'Government bono not found' })
  async remove(@Param('id') id: string) {
    return this.governmentBonosService.remove(id);
  }
}

