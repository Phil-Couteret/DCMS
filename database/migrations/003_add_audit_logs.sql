-- Migration: Add audit_logs table for GDPR accountability (Article 5(2))
-- Date: December 2025

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Staff member ID or customer ID (nullable for system actions)
    user_type VARCHAR(20) NOT NULL, -- 'admin', 'customer', 'system'
    action VARCHAR(50) NOT NULL, -- 'view', 'create', 'update', 'delete', 'export', 'login', 'logout'
    resource_type VARCHAR(50) NOT NULL, -- 'customer', 'booking', 'consent', 'account'
    resource_id UUID, -- ID of the resource being acted upon
    details JSONB DEFAULT '{}', -- Additional details about the action
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_type ON audit_logs(user_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Composite index for common queries (who did what and when)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action_date ON audit_logs(user_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_action_date ON audit_logs(resource_type, resource_id, action, created_at DESC);

-- Add comment
COMMENT ON TABLE audit_logs IS 'Audit trail for GDPR accountability - logs all data access, modifications, and user actions';

