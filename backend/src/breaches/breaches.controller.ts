import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { BreachesService } from './breaches.service.js';
import { ChangeStatusDto } from './dto/change-status.dto.js';
import { CreateBreachDto } from './dto/create-breach.dto.js';
import { NotifyCustomersDto } from './dto/notify-customers.dto.js';
import { UpdateBreachDto } from './dto/update-breach.dto.js';

// The GDPR data breach register. Admins only.
@Controller('breaches')
@UseGuards(AdminAuthGuard)
export class BreachesController {
  constructor(private readonly breaches: BreachesService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.breaches.findAll({ status });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.breaches.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBreachDto, @CurrentUser() user: { id: string }) {
    return this.breaches.create(dto, user.id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBreachDto) {
    return this.breaches.update(id, dto);
  }

  @Post(':id/status')
  @HttpCode(200)
  changeStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeStatusDto) {
    return this.breaches.changeStatus(id, dto);
  }

  @Post(':id/notify-customers')
  @HttpCode(200)
  notifyCustomers(@Param('id', ParseUUIDPipe) id: string, @Body() dto: NotifyCustomersDto) {
    return this.breaches.notifyCustomers(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.breaches.remove(id);
  }
}
