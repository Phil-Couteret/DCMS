import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { CreateScheduleSlotGuideDto } from './dto/create-schedule-slot-guide.dto';
import { UpdateScheduleSlotGuideDto } from './dto/update-schedule-slot-guide.dto';

export { CreateScheduleSlotGuideDto, UpdateScheduleSlotGuideDto };

// Phase 6.17 (roadmap): standard CRUD, deliberately no bespoke "upsert on
// create" logic here - the frontend (useScheduleData.js) looks up whether a
// record already exists for a given slot (by the unique
// location_id/date/slot_type/slot_key) and calls update() vs create()
// accordingly, the same "editing ? update : create" pattern already used
// elsewhere in this codebase (e.g. useEquipmentData.js's handleSaveTank).
// Keeps this service consistent with every other resource's plain CRUD
// rather than introducing a special case, and works identically in mock
// mode (whose generic create()/update() have no upsert concept either).
@Injectable()
export class ScheduleSlotGuidesService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
  ) {}

  private tenantFilter() {
    const tenantId = this.tenantContext.getTenantId();
    return tenantId ? { tenant_id: tenantId } : {};
  }

  async findAll() {
    return this.prisma.schedule_slot_guides.findMany({
      where: this.tenantFilter(),
      orderBy: { date: 'desc' },
    });
  }

  async findByLocationAndDate(locationId?: string, date?: string) {
    const where: any = { ...this.tenantFilter() };
    if (locationId) where.location_id = locationId;
    if (date) where.date = new Date(date);
    return this.prisma.schedule_slot_guides.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.schedule_slot_guides.findFirst({
      where: { id, ...this.tenantFilter() },
    });
    if (!record) {
      throw new NotFoundException(`Schedule slot guide record with ID ${id} not found`);
    }
    return record;
  }

  async create(dto: CreateScheduleSlotGuideDto) {
    const location = await this.prisma.locations.findFirst({
      where: { id: dto.locationId, ...this.tenantFilter() },
    });
    if (!location) {
      throw new NotFoundException(`Location with ID ${dto.locationId} not found`);
    }

    return this.prisma.schedule_slot_guides.create({
      data: {
        tenant_id: this.tenantContext.getTenantId() ?? location.tenant_id ?? null,
        location_id: dto.locationId,
        date: new Date(dto.date),
        slot_type: dto.slotType,
        slot_key: dto.slotKey,
        boat_id: dto.boatId || null,
        guide_ids: dto.guideIds || [],
      },
    });
  }

  async update(id: string, dto: UpdateScheduleSlotGuideDto) {
    await this.findOne(id); // Check if exists (and tenant-scoped)

    return this.prisma.schedule_slot_guides.update({
      where: { id },
      data: {
        ...(dto.locationId !== undefined && { location_id: dto.locationId }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.slotType !== undefined && { slot_type: dto.slotType }),
        ...(dto.slotKey !== undefined && { slot_key: dto.slotKey }),
        ...(dto.boatId !== undefined && { boat_id: dto.boatId || null }),
        ...(dto.guideIds !== undefined && { guide_ids: dto.guideIds }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    return this.prisma.schedule_slot_guides.delete({
      where: { id },
    });
  }
}
