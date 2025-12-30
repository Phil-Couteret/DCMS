# Data Retention Service

This service manages GDPR-compliant data retention and anonymization.

## Retention Periods

- **Customer Personal Data**: 5 years after last activity
- **Financial Records (Invoices/Bills)**: 7 years (personal data anonymized after 5 years, financial data kept)
- **Booking Data**: 5 years
- **Medical Certificates**: 3 years after expiry
- **Communication Data**: 3 years

## Implementation

### Service Methods

- `identifyCustomersForAnonymization()` - Find customers past retention period
- `anonymizeCustomer(customerId)` - Anonymize personal data
- `hasFinancialRecords(customerId)` - Check if customer has invoices/bills
- `handleDeletionRequest(customerId)` - Process DSAR deletion requests
- `processAnonymization()` - Process all customers past retention period

### API Endpoints

- `POST /api/data-retention/process` - Manually trigger anonymization
- `GET /api/data-retention/customers-for-anonymization` - Get list of customers to anonymize
- `POST /api/data-retention/deletion-request/:customerId` - Handle customer deletion request
- `GET /api/data-retention/check-financial-records/:customerId` - Check if customer has financial records

### Scheduled Jobs

To enable automatic scheduled cleanup:

1. Install @nestjs/schedule:
   ```bash
   npm install @nestjs/schedule
   ```

2. Import ScheduleModule in AppModule:
   ```typescript
   import { ScheduleModule } from '@nestjs/schedule';
   
   @Module({
     imports: [
       ScheduleModule.forRoot(),
       // ... other modules
     ],
   })
   ```

3. Add @Cron decorator to `DataRetentionScheduler.runScheduledCleanup()`:
   ```typescript
   @Cron('0 2 * * *') // Daily at 2 AM
   async runScheduledCleanup() {
     // ...
   }
   ```

### Manual Execution

The cleanup can also be triggered manually via:
- API endpoint: `POST /api/data-retention/process`
- External cron job calling the API endpoint
- Admin dashboard (to be implemented)

