-- Migration: Add Data Subject Access Requests (DSAR) table
-- Date: December 2025
-- For GDPR Article 15 - Right to Access

-- Create data_subject_access_requests table
CREATE TABLE IF NOT EXISTS data_subject_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL DEFAULT 'access', -- 'access', 'portability', 'deletion'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'rejected'
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL, -- 30 days from request
    requested_by VARCHAR(100), -- Email or identifier of requester
    request_details JSONB DEFAULT '{}', -- Additional request information
    response_data JSONB, -- Response data (if applicable)
    response_format VARCHAR(20), -- 'json', 'csv', 'pdf'
    response_delivery_method VARCHAR(50), -- 'download', 'email', 'portal'
    response_delivered_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dsar_customer ON data_subject_access_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_dsar_status ON data_subject_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_dsar_deadline ON data_subject_access_requests(deadline);
CREATE INDEX IF NOT EXISTS idx_dsar_requested_at ON data_subject_access_requests(requested_at);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_data_subject_access_requests_updated_at ON data_subject_access_requests;
CREATE TRIGGER update_data_subject_access_requests_updated_at 
    BEFORE UPDATE ON data_subject_access_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE data_subject_access_requests IS 'GDPR Article 15 - Data Subject Access Requests (DSAR) tracking. 30-day response deadline.';

