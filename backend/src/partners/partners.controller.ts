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
import { PartnersService, CreatePartnerDto, UpdatePartnerDto } from './partners.service';

@ApiTags('partners')
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all partners' })
  @ApiResponse({ status: 200, description: 'List of partners' })
  async findAll() {
    return this.partnersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a partner by ID' })
  @ApiParam({ name: 'id', description: 'Partner UUID' })
  @ApiResponse({ status: 200, description: 'Partner found' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async findOne(@Param('id') id: string) {
    return this.partnersService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new partner' })
  @ApiResponse({ status: 201, description: 'Partner created (includes API key and secret)' })
  @ApiResponse({ status: 409, description: 'Partner with email already exists' })
  async create(@Body() createPartnerDto: CreatePartnerDto) {
    return this.partnersService.create(createPartnerDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a partner' })
  @ApiParam({ name: 'id', description: 'Partner UUID' })
  @ApiResponse({ status: 200, description: 'Partner updated' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async update(@Param('id') id: string, @Body() updatePartnerDto: UpdatePartnerDto) {
    return this.partnersService.update(id, updatePartnerDto);
  }

  @Post(':id/regenerate-api-key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate API key and secret for a partner' })
  @ApiParam({ name: 'id', description: 'Partner UUID' })
  @ApiResponse({ status: 200, description: 'API key regenerated (includes new API key and secret)' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async regenerateApiKey(@Param('id') id: string) {
    return this.partnersService.regenerateApiKey(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a partner' })
  @ApiParam({ name: 'id', description: 'Partner UUID' })
  @ApiResponse({ status: 200, description: 'Partner deleted' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async remove(@Param('id') id: string) {
    return this.partnersService.remove(id);
  }
}

