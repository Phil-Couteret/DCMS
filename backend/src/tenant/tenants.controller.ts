import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/superadmin.guard';
import { UseGuards } from '@nestjs/common';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'List tenants (superadmin)' })
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.tenantsService.findAll(includeInactive === 'true');
  }

  @Get('platform/metrics')
  @ApiOperation({ summary: 'Platform metrics: storage, load (superadmin)' })
  async getPlatformMetrics() {
    return this.tenantsService.getPlatformMetrics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID or slug' })
  async findOne(@Param('id') idOrSlug: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    return isUuid
      ? this.tenantsService.findOne(idOrSlug)
      : this.tenantsService.findBySlug(idOrSlug);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create tenant (superadmin)' })
  @ApiResponse({ status: 201, description: 'Tenant created' })
  async create(
    @Body()
    body: {
      name: string;
      slug?: string;
      domain?: string;
      settings?: object;
      numberOfLocations?: number;
      locationType?: string;
    },
  ) {
    return this.tenantsService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update tenant (superadmin)' })
  async update(
    @Param('id') id: string,
    @Body() body: { slug?: string; name?: string; domain?: string; is_active?: boolean; settings?: object },
  ) {
    return this.tenantsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete/deactivate tenant (superadmin)' })
  async delete(@Param('id') id: string, @Query('hard') hard?: string) {
    return this.tenantsService.delete(id, hard === 'true');
  }
}
