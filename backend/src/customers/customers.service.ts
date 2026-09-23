import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { Language } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: { country?: string; language?: Language } = {}) {
    return this.prisma.customer.findMany({
      where: {
        ...(filters.country && { country: filters.country }),
        ...(filters.language && { language: filters.language }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    try {
      return await this.prisma.customer.create({ data: toData(dto) as Prisma.CustomerUncheckedCreateInput });
    } catch (e) {
      throw mapError(e);
    }
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    try {
      return await this.prisma.customer.update({ where: { id }, data: toData(dto) });
    } catch (e) {
      throw mapError(e);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customer.delete({ where: { id } });
  }
}

function toData(dto: UpdateCustomerDto): Prisma.CustomerUncheckedUpdateInput {
  const { birthdate, emergencyContact, ...rest } = dto;
  return {
    ...rest,
    ...(birthdate !== undefined && { birthdate: new Date(birthdate) }),
    ...(emergencyContact !== undefined && {
      emergencyContact: emergencyContact as Prisma.InputJsonValue,
    }),
  };
}

function mapError(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') return new ConflictException('This user already has a customer profile');
    if (e.code === 'P2003') return new BadRequestException('userId does not match an existing user');
  }
  return e;
}
