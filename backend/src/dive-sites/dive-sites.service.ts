import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { assertLocation } from '../locations/assert-location.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDiveSiteDto } from './dto/create-dive-site.dto.js';
import { UpdateDiveSiteDto } from './dto/update-dive-site.dto.js';

// Each site comes with its location's name.
const LOCATION = { location: { select: { id: true, name: true } } } as const;

@Injectable()
export class DiveSitesService {
  constructor(private readonly prisma: PrismaService) {}

  // Both filters are ceilings: a diver certified at level 2 sees every site
  // requiring level 2 or less, and difficulty 3 returns sites rated 1 to 3.
  // locationId "none": sites not assigned to a location.
  findAll(filters: { requiredCertLevel?: number; difficultyLevel?: number; locationId?: string } = {}) {
    return this.prisma.diveSite.findMany({
      where: {
        ...(filters.locationId && { locationId: filters.locationId === 'none' ? null : filters.locationId }),
        ...(filters.requiredCertLevel !== undefined && {
          requiredCertLevel: { lte: filters.requiredCertLevel },
        }),
        ...(filters.difficultyLevel !== undefined && {
          difficultyLevel: { lte: filters.difficultyLevel },
        }),
      },
      include: LOCATION,
      orderBy: { nameEn: 'asc' },
    });
  }

  async findOne(id: string) {
    const site = await this.prisma.diveSite.findUnique({ where: { id }, include: LOCATION });
    if (!site) throw new NotFoundException(`Dive site ${id} not found`);
    return site;
  }

  async create(dto: CreateDiveSiteDto) {
    assertDepthRange(dto.depthMin, dto.depthMax);
    await assertLocation(this.prisma, dto.locationId);
    return this.prisma.diveSite.create({
      data: dto as Prisma.DiveSiteCreateInput,
      include: LOCATION,
    });
  }

  async update(id: string, dto: UpdateDiveSiteDto) {
    const current = await this.findOne(id);
    assertDepthRange(dto.depthMin ?? current.depthMin, dto.depthMax ?? current.depthMax);
    await assertLocation(this.prisma, dto.locationId);
    return this.prisma.diveSite.update({
      where: { id },
      data: dto as Prisma.DiveSiteUpdateInput,
      include: LOCATION,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      return await this.prisma.diveSite.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException('This dive site has dive logs and cannot be deleted');
      }
      throw e;
    }
  }
}

function assertDepthRange(depthMin: number, depthMax: number) {
  if (depthMin > depthMax) {
    throw new BadRequestException('depthMin must not be greater than depthMax');
  }
}
