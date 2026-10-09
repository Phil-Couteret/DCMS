import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { BreachStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { canMove, isOverdue, reportingDeadline, STATUS_ORDER } from './breach-rules.js';
import { ChangeStatusDto } from './dto/change-status.dto.js';
import { CreateBreachDto } from './dto/create-breach.dto.js';
import { NotifyCustomersDto } from './dto/notify-customers.dto.js';
import { UpdateBreachDto } from './dto/update-breach.dto.js';

const SELECT = {
  id: true,
  title: true,
  detectedAt: true,
  severity: true,
  status: true,
  description: true,
  affectedDataTypes: true,
  estimatedAffected: true,
  reportedToAuthority: true,
  reportedAt: true,
  authorityReference: true,
  resolutionDetails: true,
  resolutionDate: true,
  breachType: true,
  occurredAt: true,
  rootCause: true,
  containmentMeasures: true,
  mitigationMeasures: true,
  customersNotified: true,
  customersNotifiedAt: true,
  customersNotifiedMethod: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.DataBreachSelect;

type BreachRow = Prisma.DataBreachGetPayload<{ select: typeof SELECT }>;

// Clock skew between the browser and the server.
const FUTURE_SLACK_MS = 5 * 60_000;

function present(b: BreachRow, now: Date) {
  return { ...b, reportingDeadline: reportingDeadline(b.detectedAt), overdue: isOverdue(b, now) };
}

// An instant that is neither in the future nor before the breach was detected.
function instant(value: string, label: string, detectedAt: Date | null, now: Date) {
  const at = new Date(value);
  if (at.getTime() > now.getTime() + FUTURE_SLACK_MS) throw new BadRequestException(`${label} cannot be in the future`);
  if (detectedAt && at < detectedAt) throw new BadRequestException(`${label} cannot be before the breach was detected`);
  return at;
}

const label = (status: BreachStatus) => status.charAt(0) + status.slice(1).toLowerCase();

const trimmed = (v: string | null | undefined) => v?.trim() || null;

// When the incident happened: not in the future, not after it was detected.
function occurred(value: string, detectedAt: Date, now: Date) {
  const at = instant(value, 'When it happened', null, now);
  if (at > detectedAt) throw new BadRequestException('A breach cannot have happened after it was detected');
  return at;
}

// The optional details, as given (null clears one).
function details(dto: CreateBreachDto | UpdateBreachDto) {
  return {
    ...(dto.breachType !== undefined && { breachType: dto.breachType }),
    ...(dto.rootCause !== undefined && { rootCause: trimmed(dto.rootCause) }),
    ...(dto.containmentMeasures !== undefined && { containmentMeasures: trimmed(dto.containmentMeasures) }),
    ...(dto.mitigationMeasures !== undefined && { mitigationMeasures: trimmed(dto.mitigationMeasures) }),
  };
}

@Injectable()
export class BreachesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: { status?: string }) {
    if (filters.status && !STATUS_ORDER.includes(filters.status as BreachStatus)) {
      throw new BadRequestException('Unknown status');
    }
    const rows = await this.prisma.dataBreach.findMany({
      where: filters.status ? { status: filters.status as BreachStatus } : {},
      select: SELECT,
      orderBy: { detectedAt: 'desc' },
    });
    const now = new Date();
    return rows.map((b) => present(b, now));
  }

  async findOne(id: string) {
    return present(await this.row(id), new Date());
  }

  async create(dto: CreateBreachDto, createdById: string) {
    const now = new Date();
    const detectedAt = instant(dto.detectedAt, 'The detection time', null, now);
    const row = await this.prisma.dataBreach.create({
      data: {
        title: dto.title.trim(),
        detectedAt,
        ...details(dto),
        occurredAt: dto.occurredAt ? occurred(dto.occurredAt, detectedAt, now) : null,
        severity: dto.severity,
        description: dto.description.trim(),
        affectedDataTypes: dto.affectedDataTypes,
        estimatedAffected: dto.estimatedAffected ?? null,
        createdById,
      },
      select: SELECT,
    });
    return present(row, now);
  }

  async update(id: string, dto: UpdateBreachDto) {
    const now = new Date();
    const current = await this.row(id);
    const data: Prisma.DataBreachUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.severity !== undefined) data.severity = dto.severity;
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.affectedDataTypes !== undefined) data.affectedDataTypes = dto.affectedDataTypes;
    if (dto.estimatedAffected !== undefined) data.estimatedAffected = dto.estimatedAffected;
    const detectedAt = dto.detectedAt ? instant(dto.detectedAt, 'The detection time', null, now) : current.detectedAt;
    if (dto.detectedAt) data.detectedAt = detectedAt;
    Object.assign(data, details(dto));
    if (dto.occurredAt !== undefined) data.occurredAt = dto.occurredAt ? occurred(dto.occurredAt, detectedAt, now) : null;
    else if (dto.detectedAt && current.occurredAt && current.occurredAt > detectedAt) {
      throw new BadRequestException('A breach cannot have happened after it was detected');
    }

    const notifying = dto.customersNotifiedAt !== undefined || dto.customersNotifiedMethod !== undefined;
    if (notifying && !current.customersNotified) {
      throw new BadRequestException('Record the customer notification with Notify customers');
    }
    if (dto.customersNotifiedAt !== undefined) {
      data.customersNotifiedAt = instant(dto.customersNotifiedAt, 'The notification date', detectedAt, now);
    }
    if (dto.customersNotifiedMethod !== undefined) data.customersNotifiedMethod = dto.customersNotifiedMethod;

    const reporting = dto.reportedAt !== undefined || dto.authorityReference !== undefined;
    if (reporting && !current.reportedToAuthority) {
      throw new BadRequestException('Record the report by moving the breach to Reported');
    }
    if (dto.reportedAt === null) throw new BadRequestException('A reported breach needs the date it was reported');
    if (dto.reportedAt !== undefined) data.reportedAt = instant(dto.reportedAt, 'The report date', detectedAt, now);
    if (dto.authorityReference !== undefined) data.authorityReference = trimmed(dto.authorityReference);

    const resolution = dto.resolutionDetails !== undefined || dto.resolutionDate !== undefined;
    if (resolution && current.status !== BreachStatus.RESOLVED) {
      throw new BadRequestException('Record the resolution by moving the breach to Resolved');
    }
    if (dto.resolutionDetails !== undefined) {
      if (!trimmed(dto.resolutionDetails)) throw new BadRequestException('A resolved breach needs resolution details');
      data.resolutionDetails = dto.resolutionDetails.trim();
    }
    if (dto.resolutionDate === null) throw new BadRequestException('A resolved breach needs its resolution date');
    if (dto.resolutionDate !== undefined) {
      data.resolutionDate = instant(dto.resolutionDate, 'The resolution date', detectedAt, now);
    }

    // A new detection time must still come before the dates already recorded.
    if (dto.detectedAt) {
      const reportedAt = (data.reportedAt as Date | undefined) ?? current.reportedAt;
      const resolvedAt = (data.resolutionDate as Date | undefined) ?? current.resolutionDate;
      const notifiedAt = (data.customersNotifiedAt as Date | undefined) ?? current.customersNotifiedAt;
      if ((reportedAt && reportedAt < detectedAt) || (resolvedAt && resolvedAt < detectedAt) || (notifiedAt && notifiedAt < detectedAt)) {
        throw new BadRequestException('The detection time must come before the report and resolution dates');
      }
    }

    const row = await this.prisma.dataBreach.update({ where: { id }, data, select: SELECT });
    return present(row, now);
  }

  async changeStatus(id: string, dto: ChangeStatusDto) {
    const now = new Date();
    const current = await this.row(id);
    if (!canMove(current.status, dto.status)) {
      throw new ConflictException(`A breach cannot move from ${label(current.status)} to ${label(dto.status)}: statuses only move forward`);
    }
    const data: Prisma.DataBreachUpdateManyMutationInput = { status: dto.status };

    if (dto.status === BreachStatus.REPORTED) {
      data.reportedToAuthority = true;
      data.reportedAt = dto.reportedAt ? instant(dto.reportedAt, 'The report date', current.detectedAt, now) : now;
      data.authorityReference = trimmed(dto.authorityReference) ?? current.authorityReference;
    } else if (dto.reportedAt !== undefined || dto.authorityReference !== undefined) {
      throw new BadRequestException('Report details go with the move to Reported');
    }

    if (dto.status === BreachStatus.RESOLVED) {
      const details = trimmed(dto.resolutionDetails);
      if (!details) {
        throw new BadRequestException(
          current.reportedToAuthority
            ? 'Describe how the breach was resolved'
            : 'Describe how the breach was resolved, and why it was not reported to the authority',
        );
      }
      data.resolutionDetails = details;
      data.resolutionDate = dto.resolutionDate
        ? instant(dto.resolutionDate, 'The resolution date', current.detectedAt, now)
        : now;
    } else if (dto.resolutionDetails !== undefined || dto.resolutionDate !== undefined) {
      throw new BadRequestException('Resolution details go with the move to Resolved');
    }

    // Guarded by the current status, so two moves at once cannot both apply.
    const { count } = await this.prisma.dataBreach.updateMany({ where: { id, status: current.status }, data });
    if (count === 0) throw new ConflictException('The breach changed meanwhile; reload and try again');
    return this.findOne(id);
  }

  // The people affected have been told (GDPR Art. 34): records when and how.
  // Recorded once; corrections go through an edit.
  async notifyCustomers(id: string, dto: NotifyCustomersDto) {
    const now = new Date();
    const current = await this.row(id);
    if (current.customersNotified) throw new ConflictException('The customers have already been notified; edit the breach to correct it');
    const notifiedAt = dto.notifiedAt ? instant(dto.notifiedAt, 'The notification date', current.detectedAt, now) : now;
    const { count } = await this.prisma.dataBreach.updateMany({
      where: { id, customersNotified: false },
      data: { customersNotified: true, customersNotifiedAt: notifiedAt, customersNotifiedMethod: dto.method },
    });
    if (count === 0) throw new ConflictException('The breach changed meanwhile; reload and try again');
    return this.findOne(id);
  }

  // Only a breach still DETECTED, i.e. one logged by mistake. Once assessed it
  // is part of the record GDPR requires the center to keep.
  async remove(id: string) {
    const current = await this.row(id);
    const { count } = await this.prisma.dataBreach.deleteMany({ where: { id, status: BreachStatus.DETECTED } });
    if (count === 0) {
      throw new ConflictException('Only a breach still Detected can be deleted; later ones stay in the register');
    }
    return present(current, new Date());
  }

  private async row(id: string) {
    const row = await this.prisma.dataBreach.findUnique({ where: { id }, select: SELECT });
    if (!row) throw new NotFoundException('Breach not found');
    return row;
  }
}
