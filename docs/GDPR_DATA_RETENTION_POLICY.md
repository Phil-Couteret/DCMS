# GDPR Data Retention Policy

## Overview

This document outlines the GDPR-compliant data retention policy for the DCMS system. **Personal data should NOT be retained for 7 years** - this period is only for tax/accounting records, not personal information.

## Key GDPR Principle

**Storage Limitation (Article 5(1)(e))**: Personal data must be kept only for as long as necessary for the purposes for which it was collected.

## Recommended Retention Periods

### 1. Financial/Tax Records (7 years - Legal Requirement)
**Purpose**: Tax compliance and accounting records

- **Invoice records** (`customer_bills`, `partner_invoices`): **7 years**
- **Payment transactions**: **7 years**
- **Financial summaries** (amounts, dates, totals): **7 years**

**Action**: Keep financial data but **anonymize or remove personal identifiers** after the customer data retention period.

### 2. Customer Personal Data (3-5 years after last activity - GDPR Compliant)
**Purpose**: Business relationship management

- **Customer personal information** (name, email, phone, DOB, address): **3-5 years after last booking/activity**
- **Medical information**: **3 years after last activity** (sensitive data - shorter retention)
- **Certification records**: **3-5 years after last activity**

**Action**: 
- After retention period: **Anonymize or delete** personal data
- Keep anonymized transaction history for statistics (no personal identifiers)

### 3. Booking Data (3-5 years after booking date)
**Purpose**: Business operations and customer service

- **Booking details** (dates, activities, equipment): **3-5 years**
- **Booking notes/comments**: **3 years**

**Action**: After retention period, anonymize personal references but keep aggregate statistics.

### 4. Communication Data (3 years)
**Purpose**: Customer service records

- **Email communications**: **3 years**
- **Customer service notes**: **3 years**

**Action**: Delete after retention period.

### 5. Analytics Data (2 years)
**Purpose**: Business analytics

- **Aggregated statistics**: **2 years**
- **Behavioral data**: **2 years**

**Action**: Delete or fully anonymize after retention period.

## Implementation Strategy

### Phase 1: Data Anonymization (Recommended Approach)

Instead of deleting customer data immediately, **anonymize** it:

1. **Anonymize personal identifiers**:
   - Replace names with "Customer [ID]"
   - Replace emails with "[anonymized]@example.com"
   - Remove phone numbers
   - Remove addresses
   - Remove DOB

2. **Keep anonymized transaction data**:
   - Transaction amounts and dates
   - Booking types and activities
   - Equipment used
   - Payment methods (no card details)

3. **Benefits**:
   - Maintains business statistics
   - Preserves data integrity for financial records
   - Complies with GDPR
   - Allows 7-year retention of financial records for tax purposes

### Phase 2: Automatic Data Retention Management

Create a scheduled job that:

1. **Identifies data to anonymize**:
   - Customers with no activity for 3-5 years
   - Check `last_booking_date` or `updated_at` timestamp

2. **Anonymizes personal data**:
   - Update customer records with anonymized data
   - Set `anonymized = true` flag
   - Set `anonymized_at` timestamp
   - Store original data hash for verification (optional)

3. **Keeps financial records intact**:
   - Invoices/bills remain with anonymized customer references
   - Financial totals remain accurate

4. **Logs all anonymization actions**:
   - Track what was anonymized and when
   - Required for GDPR compliance documentation

### Phase 3: Customer Deletion Requests (DSAR Right to Erasure)

When a customer requests deletion:

1. **Check for legal requirements**:
   - Any pending legal disputes?
   - Any outstanding invoices (can keep for 7 years but anonymize)?

2. **Anonymize or delete**:
   - If no legal requirement: Delete all personal data
   - If invoices exist: Anonymize personal data but keep invoices

3. **Update related records**:
   - Anonymize customer references in bookings
   - Anonymize customer references in bills/invoices (if kept for tax)

## Current Implementation Status

✅ **Implemented**:
- Soft delete (`deleted_at` field)
- Anonymization flag (`anonymized` field)
- DSAR module (data subject access requests)
- Consent management module
- Breach tracking module

❌ **Not Yet Implemented**:
- Automatic anonymization based on retention periods
- Data retention policy enforcement
- Scheduled cleanup jobs

## Recommended Next Steps

1. **Update retention policy documentation** to separate:
   - Personal data: 3-5 years after last activity
   - Financial records: 7 years (anonymized after personal data period)

2. **Implement anonymization service**:
   - Create `DataRetentionService` 
   - Scheduled job to identify and anonymize old data
   - Manual anonymization endpoint for DSAR requests

3. **Update customer deletion**:
   - Check for financial records before full deletion
   - Anonymize instead of delete when invoices exist
   - Keep anonymized invoices for tax compliance

4. **Add data retention settings**:
   - Configurable retention periods per data type
   - Admin interface to review and manage retention

## Example Anonymization Process

```
Customer: John Smith (john@example.com)
Last Activity: 2019-01-15
Current Date: 2024-01-15
Retention Period: 5 years
Status: Should be anonymized

Before:
- first_name: "John"
- last_name: "Smith"
- email: "john@example.com"
- phone: "+34 123 456 789"
- dob: "1985-05-10"

After:
- first_name: "Anonymized"
- last_name: "[Customer]"
- email: "anonymized.customer@dcms.local"
- phone: null
- dob: null
- anonymized: true
- anonymized_at: "2024-01-15"
- deletion_reason: "retention_policy"

Invoices/Bills:
- customer_name: "Anonymized Customer"
- customer_id: [unchanged for referential integrity]
- All financial data: [unchanged]
```

## Compliance Notes

- **Document retention periods**: Maintain clear documentation of why each retention period was chosen
- **Review regularly**: Review and update retention policies annually
- **Customer transparency**: Inform customers of retention periods in privacy policy
- **Right to erasure**: Honor deletion requests promptly (within 30 days per GDPR)
- **Legal basis**: Document legal basis for data processing and retention

