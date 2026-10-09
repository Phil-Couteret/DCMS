import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { AdminAuthGuard } from '../auth/admin-auth.guard.js';
import { StaffAuthGuard } from '../auth/staff-auth.guard.js';
import type { UploadedFileData } from '../common/csv.js';
import { TenantThrottlerGuard } from '../tenant/tenant-throttler.guard.js';
import { Language } from '../generated/prisma/enums.js';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';

@Controller('customers')
@UseGuards(StaffAuthGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  findAll(
    @Query('country') country?: string,
    @Query('language', new ParseEnumPipe(Language, { optional: true })) language?: Language,
  ) {
    return this.customers.findAll({ country, language });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.findOne(id);
  }

  @Get(':id/dive-history')
  diveHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.diveHistory(id);
  }

  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customers.create(dto);
  }

  // Admins only, as in the original system. multipart/form-data: "file", a
  // CSV with the columns in IMPORT_COLUMNS (at most 2 MB, 2000 rows).
  // Answers { imported, skipped, errors }.
  @Post('import')
  @HttpCode(200)
  @UseGuards(AdminAuthGuard, TenantThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60 * 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2_000_000, files: 1 } }))
  import(@UploadedFile() file: UploadedFileData | undefined) {
    return this.customers.import(file);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.remove(id);
  }
}
