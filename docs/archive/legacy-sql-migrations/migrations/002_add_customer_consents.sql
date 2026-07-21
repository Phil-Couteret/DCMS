-- Migration: Add customer_consents table for GDPR compliance
-- Date: December 2025

-- Add 'medical_data' to consent_type enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'medical_data' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'consent_type')
    ) THEN
        ALTER TYPE consent_type ADD VALUE 'medical_data';
    END IF;
END $$;

-- Create customer_consents table if it doesn't exist
CREATE TABLE IF NOT EXISTS customer_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    consent_type consent_type NOT NULL,
    consent_given BOOLEAN NOT NULL,
    consent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    consent_method consent_method NOT NULL DEFAULT 'online',
    ip_address INET,
    user_agent TEXT,
    withdrawal_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_customer_consents_customer ON customer_consents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_consents_type ON customer_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_customer_consents_active ON customer_consents(is_active);
CREATE INDEX IF NOT EXISTS idx_customer_consents_customer_type_active ON customer_consents(customer_id, consent_type, is_active);

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_customer_consents_updated_at ON customer_consents;
CREATE TRIGGER update_customer_consents_updated_at 
    BEFORE UPDATE ON customer_consents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE customer_consents IS 'GDPR consent management - tracks all customer consents for data processing, marketing, medical data, etc.';

