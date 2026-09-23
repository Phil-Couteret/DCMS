import { Controller, Post, Get, Param } from '@nestjs/common';
import { DataRetentionService } from './data-retention.service';
// TODO: Add authentication guard for admin-only access

@Controller('data-retention')
export class DataRetentionController {
  constructor(private readonly dataRetentionService: DataRetentionService) {}

  /**
   * Process anonymization for customers past retention period
   * Admin only endpoint
   */
  @Post('process')
  async processAnonymization() {
    return this.dataRetentionService.processAnonymization();
  }

  /**
   * Get list of customers that should be anonymized
   */
  @Get('customers-for-anonymization')
  async getCustomersForAnonymization() {
    return this.dataRetentionService.identifyCustomersForAnonymization();
  }

  /**
   * Handle customer deletion request (DSAR)
   */
  @Post('deletion-request/:customerId')
  async handleDeletionRequest(@Param('customerId') customerId: string) {
    await this.dataRetentionService.handleDeletionRequest(customerId);
    return { message: 'Deletion request processed successfully' };
  }

  /**
   * Check if customer has financial records
   */
  @Get('check-financial-records/:customerId')
  async checkFinancialRecords(@Param('customerId') customerId: string) {
    const hasRecords = await this.dataRetentionService.hasFinancialRecords(customerId);
    return { customerId, hasFinancialRecords: hasRecords };
  }
}

