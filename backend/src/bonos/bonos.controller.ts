import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard.js';
import { BonosService } from './bonos.service.js';
import { CreateBonoDto } from './dto/create-bono.dto.js';
import { UpdateBonoDto } from './dto/update-bono.dto.js';

// Government bonos are managed by admins (Settings → Bonos). Staff enter a
// bono's code on a booking; that is checked by the bookings API.
@Controller('bonos')
@UseGuards(AdminAuthGuard)
export class BonosController {
  constructor(private readonly bonos: BonosService) {}

  @Get()
  findAll() {
    return this.bonos.findAll();
  }

  @Post()
  create(@Body() dto: CreateBonoDto) {
    return this.bonos.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBonoDto) {
    return this.bonos.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.bonos.remove(id);
  }
}
