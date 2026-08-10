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
import { DiveSitesService, CreateDiveSiteDto, UpdateDiveSiteDto } from './dive-sites.service';
import { parsePaginationQuery } from '../common/utils/pagination';

@ApiTags('dive-sites')
@Controller('dive-sites')
export class DiveSitesController {
  constructor(private readonly diveSitesService: DiveSitesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active dive sites' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location ID' })
  @ApiQuery({ name: 'skip', required: false, description: 'Pagination: number of records to skip (opt-in, unbounded when omitted)' })
  @ApiQuery({ name: 'take', required: false, description: 'Pagination: max records to return, capped at 500 (opt-in, unbounded when omitted)' })
  @ApiResponse({ status: 200, description: 'List of dive sites' })
  async findAll(
    @Query('locationId') locationId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const pagination = parsePaginationQuery(skip, take);
    if (locationId) {
      return this.diveSitesService.findByLocation(locationId, pagination);
    }
    return this.diveSitesService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a dive site by ID' })
  @ApiParam({ name: 'id', description: 'Dive site UUID' })
  @ApiResponse({ status: 200, description: 'Dive site found' })
  @ApiResponse({ status: 404, description: 'Dive site not found' })
  async findOne(@Param('id') id: string) {
    return this.diveSitesService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new dive site' })
  @ApiResponse({ status: 201, description: 'Dive site created' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async create(@Body() createDiveSiteDto: CreateDiveSiteDto) {
    return this.diveSitesService.create(createDiveSiteDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a dive site' })
  @ApiParam({ name: 'id', description: 'Dive site UUID' })
  @ApiResponse({ status: 200, description: 'Dive site updated' })
  @ApiResponse({ status: 404, description: 'Dive site not found' })
  async update(@Param('id') id: string, @Body() updateDiveSiteDto: UpdateDiveSiteDto) {
    return this.diveSitesService.update(id, updateDiveSiteDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a dive site (soft delete)' })
  @ApiParam({ name: 'id', description: 'Dive site UUID' })
  @ApiResponse({ status: 200, description: 'Dive site deleted' })
  @ApiResponse({ status: 404, description: 'Dive site not found' })
  async remove(@Param('id') id: string) {
    return this.diveSitesService.remove(id);
  }
}

