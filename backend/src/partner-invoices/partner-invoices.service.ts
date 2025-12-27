import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePartnerInvoiceDto {
  partnerId: string;
  customerId?: string;
  billId?: string;
  locationId: string;
  invoiceDate?: string;
  dueDate?: string;
  paymentTermsDays?: number;
  subtotal: number;
  tax?: number;
  total: number;
  bookingIds?: string[];
  notes?: string;
}

export interface UpdatePartnerInvoiceDto {
  paidAmount?: number;
  status?: string;
  notes?: string;
}

@Injectable()
export class PartnerInvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(partnerId?: string, status?: string) {
    const where: any = {};
    if (partnerId) {
      where.partner_id = partnerId;
    }
    if (status) {
      where.status = status;
    }

    return this.prisma.partner_invoices.findMany({
      where,
      include: {
        partners: true,
      },
      orderBy: { invoice_date: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.partner_invoices.findUnique({
      where: { id },
      include: {
        partners: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Partner invoice with ID ${id} not found`);
    }

    return invoice;
  }

  async findByPartner(partnerId: string) {
    return this.prisma.partner_invoices.findMany({
      where: { partner_id: partnerId },
      include: {
        partners: true,
      },
      orderBy: { invoice_date: 'desc' },
    });
  }

  async create(createPartnerInvoiceDto: CreatePartnerInvoiceDto) {
    // Verify partner exists
    const partner = await this.prisma.partners.findUnique({
      where: { id: createPartnerInvoiceDto.partnerId },
    });

    if (!partner) {
      throw new NotFoundException(`Partner with ID ${createPartnerInvoiceDto.partnerId} not found`);
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(createPartnerInvoiceDto.partnerId);

    // Calculate due date if not provided
    const invoiceDate = createPartnerInvoiceDto.invoiceDate 
      ? new Date(createPartnerInvoiceDto.invoiceDate)
      : new Date();
    
    const paymentTermsDays = createPartnerInvoiceDto.paymentTermsDays || 30;
    const dueDate = createPartnerInvoiceDto.dueDate
      ? new Date(createPartnerInvoiceDto.dueDate)
      : new Date(invoiceDate.getTime() + paymentTermsDays * 24 * 60 * 60 * 1000);

    // Calculate tax if not provided (default 0)
    const tax = createPartnerInvoiceDto.tax !== undefined ? createPartnerInvoiceDto.tax : 0;

    const invoice = await this.prisma.partner_invoices.create({
      data: {
        partner_id: createPartnerInvoiceDto.partnerId,
        customer_id: createPartnerInvoiceDto.customerId || null,
        bill_id: createPartnerInvoiceDto.billId || null,
        location_id: createPartnerInvoiceDto.locationId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate,
        payment_terms_days: paymentTermsDays,
        subtotal: createPartnerInvoiceDto.subtotal,
        tax: tax,
        total: createPartnerInvoiceDto.total,
        booking_ids: createPartnerInvoiceDto.bookingIds || [],
        notes: createPartnerInvoiceDto.notes || null,
        status: 'pending',
        paid_amount: 0,
      },
      include: {
        partners: true,
      },
    });

    return invoice;
  }

  async update(id: string, updatePartnerInvoiceDto: UpdatePartnerInvoiceDto) {
    const invoice = await this.findOne(id);

    const updateData: any = {};
    
    if (updatePartnerInvoiceDto.paidAmount !== undefined) {
      updateData.paid_amount = updatePartnerInvoiceDto.paidAmount;
      
      // Update status based on paid amount
      const invoiceTotal = parseFloat(invoice.total.toString());
      if (updatePartnerInvoiceDto.paidAmount === 0) {
        updateData.status = 'pending';
        updateData.paid_at = null;
      } else if (updatePartnerInvoiceDto.paidAmount >= invoiceTotal) {
        updateData.status = 'paid';
        updateData.paid_at = new Date();
      } else if (updatePartnerInvoiceDto.paidAmount > 0) {
        updateData.status = 'partial';
        updateData.paid_at = new Date();
      }
    }

    if (updatePartnerInvoiceDto.status !== undefined) {
      updateData.status = updatePartnerInvoiceDto.status;
      if (updatePartnerInvoiceDto.status === 'paid' && !updateData.paid_at) {
        updateData.paid_at = new Date();
      }
    }

    if (updatePartnerInvoiceDto.notes !== undefined) {
      updateData.notes = updatePartnerInvoiceDto.notes;
    }

    // Check if invoice is overdue
    if (invoice.status !== 'paid' && new Date() > invoice.due_date) {
      if (updateData.status !== 'paid') {
        updateData.status = 'overdue';
      }
    }

    return this.prisma.partner_invoices.update({
      where: { id },
      data: updateData,
      include: {
        partners: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.partner_invoices.delete({
      where: { id },
    });
  }

  private async generateInvoiceNumber(partnerId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    // Find the last invoice for this year
    const lastInvoice = await this.prisma.partner_invoices.findFirst({
      where: {
        partner_id: partnerId,
        invoice_number: {
          startsWith: prefix,
        },
      },
      orderBy: { invoice_number: 'desc' },
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoice_number.replace(prefix, ''));
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }

  async calculateCommission(partnerId: string, bookingIds: string[]): Promise<{
    subtotal: number;
    commissionAmount: number;
    total: number;
  }> {
    // Get partner commission rate
    const partner = await this.prisma.partners.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new NotFoundException(`Partner with ID ${partnerId} not found`);
    }

    const commissionRate = partner.commission_rate ? parseFloat(partner.commission_rate.toString()) : 0;

    // Get bookings and calculate total
    const bookings = await this.prisma.bookings.findMany({
      where: {
        id: { in: bookingIds },
        partner_id: partnerId,
      },
    });

    const subtotal = bookings.reduce((sum, booking) => {
      return sum + parseFloat(booking.total_price.toString());
    }, 0);

    const commissionAmount = subtotal * commissionRate;
    const total = commissionAmount; // Total invoice amount is the commission

    return {
      subtotal,
      commissionAmount,
      total,
    };
  }
}
