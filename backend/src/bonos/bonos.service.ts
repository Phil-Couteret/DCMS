import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { BonoType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBonoDto } from './dto/create-bono.dto.js';
import { UpdateBonoDto } from './dto/update-bono.dto.js';

@Injectable()
export class BonosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.governmentBono.findMany({
      orderBy: [{ isActive: 'desc' }, { validFrom: 'desc' }, { code: 'asc' }],
      include: { _count: { select: { bookings: true } } },
    });
  }

  async findOne(id: string) {
    const bono = await this.prisma.governmentBono.findUnique({ where: { id } });
    if (!bono) throw new NotFoundException(`Bono ${id} not found`);
    return bono;
  }

  async create(dto: CreateBonoDto) {
    try {
      return await this.prisma.governmentBono.create({ data: checked(dto) as Prisma.GovernmentBonoCreateInput });
    } catch (e) {
      throw mapError(e);
    }
  }

  async update(id: string, dto: UpdateBonoDto) {
    const current = await this.findOne(id);
    const data = checked({ ...current, ...dto }, dto);
    if (dto.usageLimit != null && dto.usageLimit < current.usageCount) {
      throw new BadRequestException(`usageLimit cannot be below the ${current.usageCount} uses already counted`);
    }
    try {
      return await this.prisma.governmentBono.update({ where: { id }, data });
    } catch (e) {
      throw mapError(e);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      return await this.prisma.governmentBono.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException('This bono is on bookings and cannot be deleted; deactivate it instead');
      }
      throw e;
    }
  }
}

type Terms = {
  type: BonoType;
  discountValue: number | Prisma.Decimal;
  validFrom: string | Date;
  validTo?: string | Date | null;
};

// Checks the bono as it will be (current values with the changes), and
// returns the changes as data: dates as dates.
function checked(whole: Terms, changes: UpdateBonoDto = whole as UpdateBonoDto) {
  if (whole.type === BonoType.PERCENTAGE && Number(whole.discountValue) > 100) {
    throw new BadRequestException('A percentage discount cannot be over 100');
  }
  const from = new Date(whole.validFrom);
  if (whole.validTo && new Date(whole.validTo) < from) {
    throw new BadRequestException('validTo cannot be before validFrom');
  }
  const { validFrom, validTo, ...rest } = changes;
  return {
    ...rest,
    ...(validFrom !== undefined && { validFrom: new Date(validFrom) }),
    ...(validTo !== undefined && { validTo: validTo === null ? null : new Date(validTo) }),
  };
}

function mapError(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return new ConflictException('A bono with this code already exists');
  }
  return e;
}
