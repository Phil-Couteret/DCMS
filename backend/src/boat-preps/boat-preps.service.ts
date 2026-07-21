import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { CreateBoatPrepDto } from './dto/create-boat-prep.dto';
import { UpdateBoatPrepDto } from './dto/update-boat-prep.dto';

export { CreateBoatPrepDto, UpdateBoatPrepDto };

@Injectable()
export class BoatPrepsService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
  ) {}

  private tenantFilter() {
    const tenantId = this.tenantContext.getTenantId();
    return tenantId ? { tenant_id: tenantId } : {};
  }

  async findAll() {
    return this.prisma.boat_preps.findMany({
      where: this.tenantFilter(),
      include: {
        locations: true,
        boats: true,
        dive_sites_boat_preps_dive_site_idTodive_sites: true,
        dive_sites_boat_preps_actual_dive_site_idTodive_sites: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findByLocation(locationId: string) {
    return this.prisma.boat_preps.findMany({
      where: { location_id: locationId, ...this.tenantFilter() },
      include: {
        locations: true,
        boats: true,
        dive_sites_boat_preps_dive_site_idTodive_sites: true,
        dive_sites_boat_preps_actual_dive_site_idTodive_sites: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findByDate(date: string, locationId?: string) {
    const where: any = {
      date: new Date(date),
      ...this.tenantFilter(),
    };
    if (locationId) {
      where.location_id = locationId;
    }
    return this.prisma.boat_preps.findMany({
      where,
      include: {
        locations: true,
        boats: true,
        dive_sites_boat_preps_dive_site_idTodive_sites: true,
        dive_sites_boat_preps_actual_dive_site_idTodive_sites: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const boatPrep = await this.prisma.boat_preps.findFirst({
      where: { id, ...this.tenantFilter() },
      include: {
        locations: true,
        boats: true,
        dive_sites_boat_preps_dive_site_idTodive_sites: true,
        dive_sites_boat_preps_actual_dive_site_idTodive_sites: true,
      },
    });

    if (!boatPrep) {
      throw new NotFoundException(`Boat prep with ID ${id} not found`);
    }

    return boatPrep;
  }

  async create(createBoatPrepDto: CreateBoatPrepDto) {
    const location = await this.prisma.locations.findFirst({
      where: { id: createBoatPrepDto.locationId, ...this.tenantFilter() },
    });
    if (!location) {
      throw new NotFoundException(`Location with ID ${createBoatPrepDto.locationId} not found`);
    }

    return this.prisma.boat_preps.create({
      data: {
        tenant_id: this.tenantContext.getTenantId() ?? location.tenant_id ?? null,
        location_id: createBoatPrepDto.locationId,
        date: new Date(createBoatPrepDto.date),
        session: createBoatPrepDto.session,
        boat_id: createBoatPrepDto.boatId || null,
        diver_ids: createBoatPrepDto.diverIds || [],
        dive_site_id: createBoatPrepDto.diveSiteId || null,
        actual_dive_site_id: createBoatPrepDto.actualDiveSiteId || null,
        dive_site_status: createBoatPrepDto.diveSiteStatus || {},
        post_dive_report: createBoatPrepDto.postDiveReport || {},
        staff: createBoatPrepDto.staff || {},
      },
      include: {
        locations: true,
        boats: true,
        dive_sites_boat_preps_dive_site_idTodive_sites: true,
        dive_sites_boat_preps_actual_dive_site_idTodive_sites: true,
      },
    });
  }

  async update(id: string, updateBoatPrepDto: UpdateBoatPrepDto) {
    await this.findOne(id); // Check if exists

    const updateData: any = {};
    if (updateBoatPrepDto.locationId !== undefined) updateData.location_id = updateBoatPrepDto.locationId;
    if (updateBoatPrepDto.date !== undefined) updateData.date = new Date(updateBoatPrepDto.date);
    if (updateBoatPrepDto.session !== undefined) updateData.session = updateBoatPrepDto.session;
    if (updateBoatPrepDto.boatId !== undefined) updateData.boat_id = updateBoatPrepDto.boatId || null;
    if (updateBoatPrepDto.diverIds !== undefined) updateData.diver_ids = updateBoatPrepDto.diverIds;
    if (updateBoatPrepDto.diveSiteId !== undefined) updateData.dive_site_id = updateBoatPrepDto.diveSiteId || null;
    if (updateBoatPrepDto.actualDiveSiteId !== undefined) updateData.actual_dive_site_id = updateBoatPrepDto.actualDiveSiteId || null;
    if (updateBoatPrepDto.diveSiteStatus !== undefined) updateData.dive_site_status = updateBoatPrepDto.diveSiteStatus;
    if (updateBoatPrepDto.postDiveReport !== undefined) updateData.post_dive_report = updateBoatPrepDto.postDiveReport;
    if (updateBoatPrepDto.staff !== undefined) updateData.staff = updateBoatPrepDto.staff;

    return this.prisma.boat_preps.update({
      where: { id },
      data: updateData,
      include: {
        locations: true,
        boats: true,
        dive_sites_boat_preps_dive_site_idTodive_sites: true,
        dive_sites_boat_preps_actual_dive_site_idTodive_sites: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    return this.prisma.boat_preps.delete({
      where: { id },
    });
  }
}

