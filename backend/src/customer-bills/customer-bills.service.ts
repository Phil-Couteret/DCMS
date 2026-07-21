import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { CreateCustomerBillDto } from './dto/create-customer-bill.dto';
import { UpdateCustomerBillDto } from './dto/update-customer-bill.dto';

export { CreateCustomerBillDto, UpdateCustomerBillDto };

@Injectable()
export class CustomerBillsService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
  ) {}

  private tenantFilter() {
    const tenantId = this.tenantContext.getTenantId();
    return tenantId ? { tenant_id: tenantId } : {};
  }

  async findAll(customerId?: string, startDate?: string, endDate?: string) {
    const where: any = { ...this.tenantFilter() };
    if (customerId) {
      where.customer_id = customerId;
    }
    if (startDate || endDate) {
      where.bill_date = {};
      if (startDate) {
        where.bill_date.gte = new Date(startDate);
      }
      if (endDate) {
        where.bill_date.lte = new Date(endDate);
      }
    }

    return this.prisma.customer_bills.findMany({
      where,
      include: {
        customers: true,
        locations: true,
      },
      orderBy: { bill_date: 'desc' },
    });
  }

  async findOne(id: string) {
    const bill = await this.prisma.customer_bills.findFirst({
      where: { id, ...this.tenantFilter() },
      include: {
        customers: true,
        locations: true,
      },
    });

    if (!bill) {
      throw new NotFoundException(`Customer bill with ID ${id} not found`);
    }

    return bill;
  }

  async findByBillNumber(billNumber: string) {
    return this.prisma.customer_bills.findFirst({
      where: { bill_number: billNumber, ...this.tenantFilter() },
      include: {
        customers: true,
        locations: true,
      },
    });
  }

  async findByCustomer(customerId: string) {
    return this.prisma.customer_bills.findMany({
      where: { customer_id: customerId, ...this.tenantFilter() },
      include: {
        customers: true,
        locations: true,
      },
      orderBy: { bill_date: 'desc' },
    });
  }

  async create(createCustomerBillDto: CreateCustomerBillDto) {
    // Verify customer exists (and belongs to this tenant, when scoped)
    const customer = await this.prisma.customers.findFirst({
      where: { id: createCustomerBillDto.customerId, ...this.tenantFilter() },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${createCustomerBillDto.customerId} not found`);
    }

    // Verify location exists (and belongs to this tenant, when scoped)
    const location = await this.prisma.locations.findFirst({
      where: { id: createCustomerBillDto.locationId, ...this.tenantFilter() },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${createCustomerBillDto.locationId} not found`);
    }

    // Check if bill number already exists
    const existingBill = await this.prisma.customer_bills.findUnique({
      where: { bill_number: createCustomerBillDto.billNumber },
    });

    if (existingBill) {
      throw new BadRequestException(`Bill with number ${createCustomerBillDto.billNumber} already exists`);
    }

    return this.prisma.customer_bills.create({
      data: {
        tenant_id: this.tenantContext.getTenantId() ?? location.tenant_id ?? null,
        customer_id: createCustomerBillDto.customerId,
        location_id: createCustomerBillDto.locationId,
        bill_number: createCustomerBillDto.billNumber,
        stay_start_date: new Date(createCustomerBillDto.stayStartDate),
        bill_date: new Date(createCustomerBillDto.billDate),
        booking_ids: createCustomerBillDto.bookingIds || [],
        bill_items: createCustomerBillDto.billItems || [],
        subtotal: createCustomerBillDto.subtotal,
        tax: createCustomerBillDto.tax,
        total: createCustomerBillDto.total,
        partner_paid_total: createCustomerBillDto.partnerPaidTotal || 0,
        customer_paid_total: createCustomerBillDto.customerPaidTotal || 0,
        partner_tax: createCustomerBillDto.partnerTax || 0,
        customer_tax: createCustomerBillDto.customerTax || 0,
        breakdown: createCustomerBillDto.breakdown || {},
        notes: createCustomerBillDto.notes,
      },
      include: {
        customers: true,
        locations: true,
      },
    });
  }

  async update(id: string, updateCustomerBillDto: UpdateCustomerBillDto) {
    const bill = await this.findOne(id);

    return this.prisma.customer_bills.update({
      where: { id },
      data: {
        notes: updateCustomerBillDto.notes,
        updated_at: new Date(),
      },
      include: {
        customers: true,
        locations: true,
      },
    });
  }

  async remove(id: string) {
    const bill = await this.findOne(id);
    return this.prisma.customer_bills.delete({
      where: { id },
    });
  }
}

