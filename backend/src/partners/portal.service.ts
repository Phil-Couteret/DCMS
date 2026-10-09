import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { firstBoatWithRoom } from '../bookings/bookings.service.js';
import { ACTIVITY_NAMES } from '../config/catalogue.js';
import { PricingService } from '../settings/pricing.service.js';
import { centerToday, dateOnly } from '../financial/center-day.js';
import { Prisma } from '../generated/prisma/client.js';
import { BookingSource, BookingStatus, PartnerInvoiceStatus } from '../generated/prisma/enums.js';
import { requireTenantId } from '../tenant/tenant-context.js';
import { accountForCustomer } from '../users/accounts.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantConfig } from '../tenant/tenant-config.service.js';
import { PartnerBookingDto, PartnerCustomerDto } from './dto/portal.dto.js';
import { PARTNER_SELECT, PartnersService, valueBooking } from './partners.service.js';

const D = Prisma.Decimal;
type Tx = Prisma.TransactionClient;

const money = (v: Prisma.Decimal | number) => new D(v).toFixed(2);

// Only what a partner needs to see about its clients.
const CUSTOMER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  country: true,
  partnerId: true,
  user: { select: { email: true } },
} satisfies Prisma.CustomerSelect;

// Customers the partner registered or has booked for.
const visibleTo = (partnerId: string): Prisma.CustomerWhereInput => ({
  OR: [{ partnerId }, { bookings: { some: { partnerId } } }],
});

// A customer the center already had keeps their phone private: the partner
// sees what it entered itself, plus the name and email it booked them with.
function presentCustomer(partnerId: string, { user, partnerId: owner, ...c }: Prisma.CustomerGetPayload<{ select: typeof CUSTOMER_SELECT }>) {
  return { ...c, phone: owner === partnerId ? c.phone : null, email: user.email };
}

// The partner portal: a partner sees and creates only its own customers and
// bookings, and reads only its own invoices.
@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly partners: PartnersService,
    private readonly pricing: PricingService,
    private readonly config: TenantConfig,
  ) {}

  async me(partnerId: string) {
    const [partner, customers, bookings, invoices] = await Promise.all([
      this.prisma.partner.findUniqueOrThrow({ where: { id: partnerId }, select: PARTNER_SELECT }),
      this.prisma.customer.count({ where: visibleTo(partnerId) }),
      this.prisma.booking.count({ where: { partnerId } }),
      this.prisma.partnerInvoice.aggregate({
        where: { partnerId, status: { not: PartnerInvoiceStatus.CANCELLED } },
        _count: true,
        _sum: { total: true, paidAmount: true, commission: true },
      }),
    ]);
    const total = new D(invoices._sum.total ?? 0);
    return {
      partner,
      center: await this.partners.center(),
      stats: {
        customers,
        bookings,
        invoices: invoices._count,
        invoiced: money(total),
        commissionEarned: money(invoices._sum.commission ?? 0),
        outstanding: money(total.minus(invoices._sum.paidAmount ?? 0)),
      },
    };
  }

  async customers(partnerId: string) {
    const rows = await this.prisma.customer.findMany({
      where: visibleTo(partnerId),
      select: CUSTOMER_SELECT,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return rows.map((c) => presentCustomer(partnerId, c));
  }

  // Registers a new client. An email the center already knows is refused:
  // the partner books for that person with a new booking instead, which
  // leaves their details as the center has them.
  async createCustomer(partnerId: string, dto: PartnerCustomerDto) {
    const email = dto.email.toLowerCase();
    return this.prisma.$transaction(async (tx) => {
      if (await customerByEmail(tx, email)) {
        throw new ConflictException(
          'The center already has a customer with this email. Create a booking with their details to book for them.',
        );
      }
      return presentCustomer(partnerId, await this.newCustomer(tx, partnerId, dto));
    });
  }

  async bookings(partnerId: string) {
    const prices = await this.pricing.current();
    const rows = await this.prisma.booking.findMany({
      where: { partnerId },
      select: {
        id: true,
        date: true,
        timeSlot: true,
        activityType: true,
        participantCount: true,
        numberOfDives: true,
        status: true,
        notes: true,
        createdAt: true,
        customer: { select: { id: true, firstName: true, lastName: true } },
        partnerInvoice: { select: { id: true, invoiceNumber: true } },
      },
      orderBy: [{ date: 'desc' }, { timeSlot: 'asc' }],
    });
    return rows.map((b) => {
      const { total } = valueBooking(b, prices);
      return {
        ...b,
        date: b.date.toISOString().slice(0, 10),
        activityName: ACTIVITY_NAMES[b.activityType],
        value: total === null ? null : money(total),
      };
    });
  }

  // A pending booking on the first boat with room; the center confirms it.
  async createBooking(partnerId: string, dto: PartnerBookingDto) {
    if (!dto.customerId === !dto.customer) throw new BadRequestException('Give either customerId or customer');
    if (dto.date < centerToday(await this.config.timeZone())) throw new BadRequestException('The date has passed');
    const date = dateOnly(dto.date);
    return this.prisma.$transaction(async (tx) => {
      const customerId = dto.customerId
        ? await this.ownCustomer(tx, partnerId, dto.customerId)
        : await this.findOrCreateCustomer(tx, partnerId, dto.customer!);
      const boatId = await firstBoatWithRoom(tx, {
        date,
        timeSlot: dto.timeSlot,
        participantCount: dto.participantCount,
      });
      return tx.booking.create({
        data: {
          customerId,
          boatId,
          partnerId,
          activityType: dto.activityType,
          date,
          timeSlot: dto.timeSlot,
          participantCount: dto.participantCount,
          status: BookingStatus.PENDING,
          bookingSource: BookingSource.PARTNER,
          notes: dto.notes?.trim() || null,
        },
        select: { id: true, date: true, timeSlot: true, activityType: true, participantCount: true, numberOfDives: true, status: true },
      });
    });
  }

  invoices(partnerId: string) {
    return this.prisma.partnerInvoice.findMany({
      where: { partnerId, status: { not: PartnerInvoiceStatus.CANCELLED } },
      orderBy: { invoiceNumber: 'desc' },
    });
  }

  invoice(partnerId: string, id: string) {
    return this.partners.findInvoice(id, partnerId);
  }

  private async ownCustomer(tx: Tx, partnerId: string, customerId: string) {
    const customer = await tx.customer.findFirst({ where: { id: customerId, ...visibleTo(partnerId) }, select: { id: true } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer.id;
  }

  // As public guest bookings do: an existing customer is used as the center
  // has them, never updated from here.
  private async findOrCreateCustomer(tx: Tx, partnerId: string, dto: PartnerCustomerDto) {
    const email = dto.email.toLowerCase();
    const existing = await customerByEmail(tx, email);
    if (existing) return existing.id;
    return (await this.newCustomer(tx, partnerId, dto)).id;
  }

  private async newCustomer(tx: Tx, partnerId: string, dto: PartnerCustomerDto) {
    const email = dto.email.toLowerCase();
    return tx.customer.create({
      data: {
        userId: await accountForCustomer(tx, requireTenantId(), email),
        partnerId,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone?.trim() || null,
        country: dto.country,
        language: dto.language ?? (await this.config.get()).defaultLanguage,
        ...(dto.birthdate && { birthdate: dateOnly(dto.birthdate) }),
      },
      select: CUSTOMER_SELECT,
    });
  }
}

// This tenant's customer whose account has this email, if any (the lookup is
// filtered by the current tenant; another company's customer is separate).
function customerByEmail(tx: Tx, email: string) {
  return tx.customer.findFirst({ where: { user: { email } }, select: { id: true } });
}
