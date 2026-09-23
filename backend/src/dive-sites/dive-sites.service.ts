import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDiveSiteDto } from './dto/create-dive-site.dto.js';
import { UpdateDiveSiteDto } from './dto/update-dive-site.dto.js';

@Injectable()
export class DiveSitesService {
  constructor(private readonly prisma: PrismaService) {}

  // Both filters are ceilings: a diver certified at level 2 sees every site
  // requiring level 2 or less, and difficulty 3 returns sites rated 1 to 3.
  findAll(filters: { requiredCertLevel?: number; difficultyLevel?: number } = {}) {
    return this.prisma.diveSite.findMany({
      where: {
        ...(filters.requiredCertLevel !== undefined && {
          requiredCertLevel: { lte: filters.requiredCertLevel },
        }),
        ...(filters.difficultyLevel !== undefined && {
          difficultyLevel: { lte: filters.difficultyLevel },
        }),
      },
      orderBy: { nameEn: 'asc' },
    });
  }

  async findOne(id: string) {
    const site = await this.prisma.diveSite.findUnique({ where: { id } });
    if (!site) throw new NotFoundException(`Dive site ${id} not found`);
    return site;
  }

  create(dto: CreateDiveSiteDto) {
    assertDepthRange(dto.depthMin, dto.depthMax);
    return this.prisma.diveSite.create({
      data: dto as Prisma.DiveSiteCreateInput,
    });
  }

  async update(id: string, dto: UpdateDiveSiteDto) {
    const current = await this.findOne(id);
    assertDepthRange(dto.depthMin ?? current.depthMin, dto.depthMax ?? current.depthMax);
    return this.prisma.diveSite.update({
      where: { id },
      data: dto as Prisma.DiveSiteUpdateInput,
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
