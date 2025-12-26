import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { user_role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface CreateUserDto {
  username: string;
  name: string;
  email?: string;
  password: string;
  role?: user_role;
  permissions?: string[];
  locationAccess?: string[];
  isActive?: boolean;
}

export interface UpdateUserDto {
  username?: string;
  name?: string;
  email?: string;
  password?: string;
  role?: user_role;
  permissions?: string[];
  locationAccess?: string[];
  isActive?: boolean;
}

export interface LoginDto {
  username: string;
  password: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.users.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.users.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Don't return password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findByUsername(username: string) {
    return this.prisma.users.findUnique({
      where: { username },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
    });
  }

  async login(loginDto: LoginDto) {
    const user = await this.findByUsername(loginDto.username);
    
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('User account is inactive');
    }

    const isValidPassword = await bcrypt.compare(loginDto.password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // Don't return password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async create(dto: CreateUserDto) {
    // Check if username already exists
    const existingUsername = await this.findByUsername(dto.username);
    if (existingUsername) {
      throw new ConflictException(`User with username ${dto.username} already exists`);
    }

    // Check if email already exists (if provided)
    if (dto.email) {
      const existingEmail = await this.findByEmail(dto.email);
      if (existingEmail) {
        throw new ConflictException(`User with email ${dto.email} already exists`);
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.users.create({
      data: {
        username: dto.username,
        name: dto.name,
        email: dto.email || null,
        password_hash: passwordHash,
        role: dto.role || 'admin',
        permissions: dto.permissions || [],
        location_access: dto.locationAccess || [],
        is_active: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    // Don't return password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id); // Check if exists

    // Check if username is being changed and already exists
    if (dto.username) {
      const existingUsername = await this.findByUsername(dto.username);
      if (existingUsername && existingUsername.id !== id) {
        throw new ConflictException(`User with username ${dto.username} already exists`);
      }
    }

    // Check if email is being changed and already exists
    if (dto.email) {
      const existingEmail = await this.findByEmail(dto.email);
      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException(`User with email ${dto.email} already exists`);
      }
    }

    const updateData: any = {};
    if (dto.username !== undefined) updateData.username = dto.username;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email || null;
    if (dto.password !== undefined) {
      updateData.password_hash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.permissions !== undefined) updateData.permissions = dto.permissions;
    if (dto.locationAccess !== undefined) updateData.location_access = dto.locationAccess;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

    const user = await this.prisma.users.update({
      where: { id },
      data: updateData,
    });

    // Don't return password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.users.delete({
      where: { id },
    });
  }
}

