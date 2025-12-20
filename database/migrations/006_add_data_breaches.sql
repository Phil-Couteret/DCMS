-- Migration: Add data_breaches table for GDPR Article 33-34 compliance
-- Date: December 2025
-- Tracks security breaches and notification deadlines (72-hour requirement)

-- Create data_breaches table
CREATE TABLE IF NOT EXISTS data_breaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breach_type breach_type NOT NULL,
    severity severity NOT NULL DEFAULT 'medium',
    description TEXT NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    occurred_at TIMESTAMP WITH TIME ZONE, -- When the breach actually occurred (if known)
    affected_data_types data_type[] DEFAULT '{}', -- Array of affected data types
    affected_customers_count INTEGER DEFAULT 0,
    affected_customer_ids UUID[], -- Array of affected customer IDs
    root_cause TEXT,
    containment_measures TEXT,
    mitigation_actions TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'detected', -- 'detected', 'assessed', 'reported', 'resolved'
    reported_to_authority BOOLEAN DEFAULT false,
    authority_notification_date TIMESTAMP WITH TIME ZONE,
    authority_name VARCHAR(255), -- e.g., "Spanish DPA (AEPD)"
    customer_notification_required BOOLEAN DEFAULT false,
    customer_notification_date TIMESTAMP WITH TIME ZONE,
    customers_notified_count INTEGER DEFAULT 0,
    notification_deadline TIMESTAMP WITH TIME ZONE NOT NULL, -- 72 hours from detection
    resolved_at TIMESTAMP WITH TIME ZONE,
    reported_by UUID, -- Staff member ID who reported it
    assigned_to UUID, -- Staff member ID responsible for handling
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_data_breaches_status ON data_breaches(status);
CREATE INDEX IF NOT EXISTS idx_data_breaches_severity ON data_breaches(severity);
CREATE INDEX IF NOT EXISTS idx_data_breaches_detected_at ON data_breaches(detected_at);
CREATE INDEX IF NOT EXISTS idx_data_breaches_notification_deadline ON data_breaches(notification_deadline);
CREATE INDEX IF NOT EXISTS idx_data_breaches_reported_to_authority ON data_breaches(reported_to_authority);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_data_breaches_updated_at ON data_breaches;
CREATE TRIGGER update_data_breaches_updated_at 
    BEFORE UPDATE ON data_breaches 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE data_breaches IS 'GDPR Article 33-34 - Data breach tracking. 72-hour notification deadline to authorities.';

