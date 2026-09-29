import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCertificationDto } from './dto/create-certification.dto.js';
import { UpdateCertificationDto } from './dto/update-certification.dto.js';

// The card details a verification covers.
const CARD_FIELDS = ['agency', 'level', 'cardNumber', 'issueDate', 'expiryDate'] as const;

@Injectable()
export class CustomerCertificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(customerId: string) {
    await this.assertCustomer(customerId);
    return this.prisma.customerCertification.findMany({
      where: { customerId },
      orderBy: [{ issueDate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    });
  }

  async create(customerId: string, dto: CreateCertificationDto) {
    await this.assertCustomer(customerId);
    const data = toData(dto);
    assertDates(data.issueDate ?? null, data.expiryDate ?? null);
    return this.prisma.customerCertification.create({
      data: { ...data, agency: dto.agency.trim(), level: dto.level.trim(), customerId },
    });
  }

  async update(customerId: string, certId: string, dto: UpdateCertificationDto, staffEmail: string) {
    const current = await this.findOne(customerId, certId);
    const { verified, ...fields } = dto;
    const data: Prisma.CustomerCertificationUpdateInput = toData(fields);
    assertDates(
      data.issueDate !== undefined ? (data.issueDate as Date | null) : current.issueDate,
      data.expiryDate !== undefined ? (data.expiryDate as Date | null) : current.expiryDate,
    );
    if (verified === true) {
      data.verifiedAt = new Date();
      data.verifiedBy = staffEmail;
    } else if (verified === false || cardChanged(data, current)) {
      data.verifiedAt = null;
      data.verifiedBy = null;
    }
    return this.prisma.customerCertification.update({ where: { id: certId }, data });
  }

  async remove(customerId: string, certId: string) {
    await this.findOne(customerId, certId);
    return this.prisma.customerCertification.delete({ where: { id: certId } });
  }

  private async findOne(customerId: string, certId: string) {
    const cert = await this.prisma.customerCertification.findFirst({ where: { id: certId, customerId } });
    if (!cert) throw new NotFoundException(`Certification ${certId} not found for customer ${customerId}`);
    return cert;
  }

  private async assertCustomer(id: string) {
    const found = await this.prisma.customer.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException(`Customer ${id} not found`);
  }
}

function toData(dto: Omit<UpdateCertificationDto, 'verified'>) {
  const { issueDate, expiryDate, agency, level, cardNumber } = dto;
  const date = (v: string | null | undefined) => (v === undefined ? undefined : v === null ? null : new Date(v));
  return {
    ...(agency !== undefined && { agency: agency.trim() }),
    ...(level !== undefined && { level: level.trim() }),
    ...(cardNumber !== undefined && { cardNumber: cardNumber?.trim() || null }),
    ...(issueDate !== undefined && { issueDate: date(issueDate) }),
    ...(expiryDate !== undefined && { expiryDate: date(expiryDate) }),
  };
}

function assertDates(issueDate: Date | null, expiryDate: Date | null) {
  if (issueDate && expiryDate && expiryDate < issueDate) {
    throw new BadRequestException('expiryDate must not be before issueDate');
  }
}

function cardChanged(data: Record<string, unknown>, current: Record<(typeof CARD_FIELDS)[number], unknown>) {
  return CARD_FIELDS.some((f) => {
    if (data[f] === undefined) return false;
    const a = data[f];
    const b = current[f];
    return a instanceof Date && b instanceof Date ? a.getTime() !== b.getTime() : a !== b;
  });
}
