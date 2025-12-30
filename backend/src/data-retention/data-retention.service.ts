import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  // Retention periods in days
  private readonly RETENTION_PERIODS = {
    // Customer personal data: 3-5 years after last activity (we use 5 years)
    customerPersonalData: 5 * 365, // 1825 days
    
    // Financial records: 7 years (tax requirement)
    financialRecords: 7 * 365, // 2555 days
    
    // Booking data: 3-5 years (we use 5 years)
    bookingData: 5 * 365, // 1825 days
    
    // Medical certificates: 3 years after expiry
    medicalCertificates: 3 * 365, // 1095 days
    
    // Communication data: 3 years
    communicationData: 3 * 365, // 1095 days
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Get last activity date for a customer
   * Returns the most recent of: last booking, last profile update, or created date
   */
  async getLastActivityDate(customerId: string): Promise<Date | null> {
    const dates: Date[] = [];

    // Get customer
    const customer = await this.prisma.customers.findUnique({
      where: { id: customerId },
      select: { created_at: true, updated_at: true },
    });

    if (customer?.created_at) {
      dates.push(customer.created_at);
    }
    if (customer?.updated_at) {
      dates.push(customer.updated_at);
    }

    // Get last booking date
    const lastBooking = await this.prisma.bookings.findFirst({
      where: { customer_id: customerId },
      orderBy: { booking_date: 'desc' },
      select: { booking_date: true, created_at: true },
    });

    if (lastBooking?.booking_date) {
      dates.push(new Date(lastBooking.booking_date));
    }
    if (lastBooking?.created_at) {
      dates.push(lastBooking.created_at);
    }

    return dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
  }

  /**
   * Anonymize customer personal data
   * Keeps financial records but removes personal identifiers
   */
  async anonymizeCustomer(customerId: string, reason: string = 'retention_policy'): Promise<void> {
    this.logger.log(`Anonymizing customer ${customerId} - Reason: ${reason}`);

    await this.prisma.customers.update({
      where: { id: customerId },
      data: {
        first_name: 'Anonymized',
        last_name: '[Customer]',
        email: `anonymized.${customerId.substring(0, 8)}@dcms.local`,
        phone: null,
        dob: null,
        nationality: null,
        address: {},
        notes: null,
        medical_conditions: [],
        restrictions: {},
        anonymized: true,
        deletion_reason: reason,
        updated_at: new Date(),
      },
    });

    this.logger.log(`Customer ${customerId} anonymized successfully`);
  }

  /**
   * Check if customer has financial records (invoices/bills) that need to be kept
   */
  async hasFinancialRecords(customerId: string): Promise<boolean> {
    const [billsCount, invoicesCount] = await Promise.all([
      this.prisma.customer_bills.count({
        where: { customer_id: customerId },
      }),
      // Add partner invoices check if needed
      Promise.resolve(0), // Placeholder - implement if partner_invoices table exists
    ]);

    return billsCount > 0 || invoicesCount > 0;
  }

  /**
   * Identify customers that should be anonymized based on retention policy
   */
  async identifyCustomersForAnonymization(): Promise<string[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_PERIODS.customerPersonalData);

    // Get all non-anonymized, non-deleted customers
    const customers = await this.prisma.customers.findMany({
      where: {
        anonymized: false,
        deleted_at: null,
      },
      select: { id: true },
    });

    const customersToAnonymize: string[] = [];

    for (const customer of customers) {
      const lastActivity = await this.getLastActivityDate(customer.id);
      
      if (lastActivity && lastActivity < cutoffDate) {
        customersToAnonymize.push(customer.id);
      }
    }

    return customersToAnonymize;
  }

  /**
   * Process anonymization for customers past retention period
   */
  async processAnonymization(): Promise<{ anonymized: number; errors: number }> {
    this.logger.log('Starting data retention anonymization process');

    const customersToAnonymize = await this.identifyCustomersForAnonymization();
    let anonymized = 0;
    let errors = 0;

    for (const customerId of customersToAnonymize) {
      try {
        // Check if customer has financial records
        const hasFinancialRecords = await this.hasFinancialRecords(customerId);
        
        if (hasFinancialRecords) {
          // Anonymize personal data but keep financial records
          await this.anonymizeCustomer(customerId, 'retention_policy_financial_records_kept');
        } else {
          // No financial records, can anonymize
          await this.anonymizeCustomer(customerId, 'retention_policy');
        }
        
        anonymized++;
      } catch (error) {
        this.logger.error(`Error anonymizing customer ${customerId}:`, error);
        errors++;
      }
    }

    this.logger.log(`Anonymization process completed: ${anonymized} anonymized, ${errors} errors`);
    return { anonymized, errors };
  }

  /**
   * Handle customer deletion request (DSAR - Right to Erasure)
   * Anonymizes personal data, keeps financial records if needed
   */
  async handleDeletionRequest(customerId: string): Promise<void> {
    this.logger.log(`Processing deletion request for customer ${customerId}`);

    const hasFinancialRecords = await this.hasFinancialRecords(customerId);

    if (hasFinancialRecords) {
      // Anonymize instead of delete (keep financial records for tax compliance)
      await this.anonymizeCustomer(customerId, 'customer_request_financial_records_kept');
      this.logger.log(`Customer ${customerId} anonymized (financial records preserved)`);
    } else {
      // No financial records, can fully anonymize
      await this.anonymizeCustomer(customerId, 'customer_request');
      this.logger.log(`Customer ${customerId} anonymized (no financial records)`);
    }
  }
}

