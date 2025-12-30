import { Injectable, Logger } from '@nestjs/common';
import { DataRetentionService } from './data-retention.service';

/**
 * Data Retention Scheduler
 * 
 * Runs data retention cleanup periodically.
 * Note: For production, install @nestjs/schedule and use @Cron decorator.
 * For now, this can be called manually or via a cron job external to the application.
 */
@Injectable()
export class DataRetentionScheduler {
  private readonly logger = new Logger(DataRetentionScheduler.name);

  constructor(private readonly dataRetentionService: DataRetentionService) {}

  /**
   * Run data retention cleanup
   * This should be called by a scheduled job (e.g., daily at 2 AM)
   * 
   * To set up with @nestjs/schedule:
   * 1. Install: npm install @nestjs/schedule
   * 2. Import ScheduleModule in AppModule
   * 3. Add @Cron('0 2 * * *') decorator to this method (runs daily at 2 AM)
   */
  async runScheduledCleanup() {
    this.logger.log('Starting scheduled data retention cleanup...');
    
    try {
      const result = await this.dataRetentionService.processAnonymization();
      this.logger.log(`Scheduled cleanup completed: ${result.anonymized} anonymized, ${result.errors} errors`);
      return result;
    } catch (error) {
      this.logger.error('Error during scheduled data retention cleanup:', error);
      throw error;
    }
  }
}

