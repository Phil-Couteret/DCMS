import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateCustomerBillDto {
  customerId: string;
  locationId: string;
  billNumber: string;
  stayStartDate: string;
  billDate: string;
  bookingIds?: string[];
  billItems?: any[];
  subtotal: number;
  tax: number;
  total: number;
  partnerPaidTotal?: number;
  customerPaidTotal?: number;
  partnerTax?: number;
  customerTax?: number;
  breakdown?: any;
  notes?: string;
}

export interface UpdateCustomerBillDto {
  notes?: string;
}

@Injectable()
export class CustomerBillsService {
  constructor(private prisma: PrismaService) {}

  async findAll(customerId?: string, startDate?: string, endDate?: string) {
    const where: any = {};
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
    const bill = await this.prisma.customer_bills.findUnique({
      where: { id },
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
    return this.prisma.customer_bills.findUnique({
      where: { bill_number: billNumber },
      include: {
        customers: true,
        locations: true,
      },
    });
  }

  async findByCustomer(customerId: string) {
    return this.prisma.customer_bills.findMany({
      where: { customer_id: customerId },
      include: {
        customers: true,
        locations: true,
      },
      orderBy: { bill_date: 'desc' },
    });
  }

  async create(createCustomerBillDto: CreateCustomerBillDto) {
    // Verify customer exists
    const customer = await this.prisma.customers.findUnique({
      where: { id: createCustomerBillDto.customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${createCustomerBillDto.customerId} not found`);
    }

    // Verify location exists
    const location = await this.prisma.locations.findUnique({
      where: { id: createCustomerBillDto.locationId },
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

