import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UsersService, CreateUserDto, UpdateUserDto, LoginDto, SelectTenantDto } from './users.service';
import { AddTenantMembershipDto } from './dto/add-tenant-membership.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.usersService.login(loginDto);
  }

  @Public()
  @Post('login/select-tenant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login by picking one of the tenants login() offered' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials, or user has no access to that tenant' })
  async selectTenant(@Body() selectTenantDto: SelectTenantDto) {
    return this.usersService.selectTenant(selectTenantDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll() {
    return this.usersService.findAll();
  }

  /** Prevent GET /users/login from matching :id (would pass "login" as UUID and cause 500) */
  @Public()
  @Get('login')
  @HttpCode(HttpStatus.METHOD_NOT_ALLOWED)
  @ApiOperation({ summary: 'Login is POST only' })
  loginGet() {
    return { statusCode: 405, message: 'Method Not Allowed. Use POST /users/login with { username, password }.' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'Username or email already exists' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get(':id/tenant-memberships')
  @ApiOperation({ summary: "List every tenant a user can log into (their primary tenant plus any granted memberships)" })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async listTenantMemberships(@Param('id') id: string) {
    return this.usersService.listTenantMemberships(id);
  }

  @Post(':id/tenant-memberships')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Grant a user access to an additional tenant' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async addTenantMembership(@Param('id') id: string, @Body() dto: AddTenantMembershipDto) {
    return this.usersService.addTenantMembership(id, dto.tenantId, dto.role, dto.permissions, dto.locationAccess);
  }

  @Delete(':id/tenant-memberships/:tenantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revoke a user's access to a (non-primary) tenant" })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  async removeTenantMembership(@Param('id') id: string, @Param('tenantId') tenantId: string) {
    return this.usersService.removeTenantMembership(id, tenantId);
  }
}

