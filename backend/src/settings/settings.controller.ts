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
import { SettingsService, CreateSettingDto, UpdateSettingDto } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  @ApiResponse({ status: 200, description: 'List of settings' })
  async findAll() {
    // Return default settings (first settings record or all if none exist)
    return this.settingsService.getDefaultSettings();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a setting by ID' })
  @ApiParam({ name: 'id', description: 'Setting UUID' })
  @ApiResponse({ status: 200, description: 'Setting found' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async findOne(@Param('id') id: string) {
    return this.settingsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new setting' })
  @ApiResponse({ status: 201, description: 'Setting created' })
  async create(@Body() createSettingDto: CreateSettingDto) {
    return this.settingsService.create(createSettingDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a setting' })
  @ApiParam({ name: 'id', description: 'Setting UUID' })
  @ApiResponse({ status: 200, description: 'Setting updated' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async update(@Param('id') id: string, @Body() updateSettingDto: UpdateSettingDto) {
    return this.settingsService.update(id, updateSettingDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a setting' })
  @ApiParam({ name: 'id', description: 'Setting UUID' })
  @ApiResponse({ status: 200, description: 'Setting deleted' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async remove(@Param('id') id: string) {
    return this.settingsService.remove(id);
  }
}

