-- Migration: Enhanced Account Deletion (Soft Delete + Legal Retention)
-- Date: December 2025
-- Adds soft delete functionality and anonymization support

-- Add deleted_at timestamp to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS anonymized BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Add index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_customers_anonymized ON customers(anonymized);

-- Add comment
COMMENT ON COLUMN customers.deleted_at IS 'Timestamp when account was deleted (soft delete)';
COMMENT ON COLUMN customers.anonymized IS 'Whether personal data has been anonymized';
COMMENT ON COLUMN customers.deletion_reason IS 'Reason for account deletion';

