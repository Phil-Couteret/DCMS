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
import { CreateUserDto } from './dto/create-user.dto.js';
import { SetPasswordDto } from './dto/set-password.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

// Login accounts. Admins only.
@Controller('users')
@UseGuards(AdminAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll(@Query('role') role?: string) {
    return this.users.list({ role });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.createAccount(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: { id: string },
  ) {
    return this.users.update(id, dto, actor.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: { id: string }) {
    return this.users.remove(id, actor.id);
  }

  // Sets any user's password without the old one.
  @Post(':id/change-password')
  @HttpCode(200)
  setPassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetPasswordDto) {
    return this.users.setPassword(id, dto.password);
  }
}
