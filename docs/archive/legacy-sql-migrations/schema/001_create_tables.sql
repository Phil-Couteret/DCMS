-- DCMS Database Schema - Complete Table Definitions
-- Created: October 2025
-- Database: PostgreSQL 14+
-- Timezone: Europe/Madrid (Canary Islands)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE location_type AS ENUM ('diving', 'bike_rental', 'future');
CREATE TYPE activity_type AS ENUM ('diving', 'snorkeling', 'try_dive', 'discovery', 'specialty');
CREATE TYPE equipment_type AS ENUM ('diving', 'snorkeling', 'accessory');
CREATE TYPE staff_role AS ENUM ('owner', 'manager', 'instructor', 'divemaster', 'assistant', 'admin', 'boat_captain', 'mechanic', 'intern');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'stripe', 'bank_transfer', 'voucher', 'government_bono', 'deferred');
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'refunded');
CREATE TYPE customer_type AS ENUM ('tourist', 'local', 'recurrent');
CREATE TYPE status AS ENUM ('active', 'inactive', 'pending', 'completed', 'cancelled');
CREATE TYPE incident_type AS ENUM ('equipment_failure', 'medical', 'weather', 'boat_problem', 'lost_equipment', 'customer_complaint', 'other');
CREATE TYPE severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE certification_type AS ENUM ('recreational', 'professional');
CREATE TYPE restriction_level AS ENUM ('none', 'restricted', 'banned');
CREATE TYPE contact_type AS ENUM ('emergency', 'veterinary', 'chamber', 'coast_guard', 'medical', 'police', 'ambulance', 'fire_dept', 'other');
CREATE TYPE data_type AS ENUM ('customer_data', 'booking_data', 'financial_data', 'equipment_data', 'staff_data', 'certification_data', 'medical_data');
CREATE TYPE deletion_trigger AS ENUM ('retention_policy', 'customer_request', 'business_requirement', 'legal_requirement');
CREATE TYPE consent_type AS ENUM ('marketing', 'data_processing', 'photo_video', 'medical_clearance', 'medical_data');
CREATE TYPE consent_method AS ENUM ('online', 'paper', 'verbal', 'implied');
CREATE TYPE withdrawal_method AS ENUM ('online', 'paper', 'email', 'verbal');
CREATE TYPE breach_type AS ENUM ('unauthorized_access', 'data_loss', 'data_disclosure', 'data_modification', 'other');
CREATE TYPE provider_type AS ENUM ('insurance', 'equipment_service', 'training', 'legal', 'medical', 'other');
CREATE TYPE claim_type AS ENUM ('equipment_damage', 'customer_injury', 'equipment_loss', 'liability', 'medical', 'other');
CREATE TYPE clearance_type AS ENUM ('medical_clearance', 'diving_fitness', 'safety_clearance');
CREATE TYPE briefing_type AS ENUM ('safety_briefing', 'dive_briefing', 'equipment_briefing', 'emergency_briefing');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- 1. LOCATIONS
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type location_type NOT NULL,
    address JSONB NOT NULL,
    contact_info JSONB NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. BOATS
CREATE TABLE boats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    equipment_onboard JSONB DEFAULT '[]',
    maintenance_schedule JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. DIVE_SITES
CREATE TABLE dive_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type activity_type NOT NULL,
    depth_range JSONB NOT NULL,
    difficulty_level VARCHAR(50) NOT NULL,
    conditions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. EQUIPMENT
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category equipment_type NOT NULL,
    type equipment_type NOT NULL,
    size VARCHAR(50),
    condition VARCHAR(50),
    serial_number VARCHAR(100),
    is_available BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. STAFF
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role staff_role NOT NULL,
    certifications JSONB DEFAULT '[]',
    emergency_contact JSONB DEFAULT '{}',
    employment_start_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. CUSTOMERS
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    dob DATE,
    nationality VARCHAR(50),
    address JSONB DEFAULT '{}',
    customer_type customer_type,
    preferences JSONB DEFAULT '{}',
    medical_conditions JSONB DEFAULT '[]',
    restrictions JSONB DEFAULT '{}',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. CUSTOMER_STAYS
CREATE TABLE customer_stays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    stay_start_date DATE NOT NULL,
    stay_end_date DATE,
    status status DEFAULT 'active',
    total_dives INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. CERTIFICATION_AGENCIES
CREATE TABLE certification_agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    priority INTEGER NOT NULL,
    is_primary_agency BOOLEAN DEFAULT false,
    api_endpoint VARCHAR(255),
    api_key_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. CUSTOMER_CERTIFICATIONS
CREATE TABLE customer_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    agency_id UUID NOT NULL REFERENCES certification_agencies(id),
    certification_number VARCHAR(100) NOT NULL,
    certification_level VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE,
    instructor_name VARCHAR(100),
    dive_center VARCHAR(100),
    api_validated BOOLEAN DEFAULT false,
    api_data JSONB,
    last_validated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. BOOKINGS
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id),
    boat_id UUID REFERENCES boats(id),
    dive_site_id UUID REFERENCES dive_sites(id),
    staff_primary_id UUID REFERENCES staff(id),
    booking_date DATE NOT NULL,
    activity_type activity_type NOT NULL,
    number_of_dives INTEGER DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL,
    payment_method payment_method,
    payment_status payment_status DEFAULT 'pending',
    status booking_status DEFAULT 'pending',
    special_requirements TEXT,
    equipment_needed JSONB DEFAULT '[]',
    bono_id UUID,
    government_payment DECIMAL(10,2) DEFAULT 0,
    customer_payment DECIMAL(10,2) DEFAULT 0,
    dive_sequence INTEGER DEFAULT 1,
    stay_id UUID REFERENCES customer_stays(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. PRICING_CONFIGS (Unified pricing table - standard prices, promotions, and discounts)
CREATE TABLE pricing_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES locations(id),
    pricing_type VARCHAR(50) NOT NULL DEFAULT 'standard', -- 'standard', 'promotion', 'discount', 'override'
    activity_type activity_type, -- NULL for general promotions that apply across activities
    activity_reference_id UUID, -- References courses.id, equipment.id, etc. if applicable
    name VARCHAR(100) NOT NULL,
    description TEXT,
    pricing_rules JSONB NOT NULL, -- Flexible structure: base_price, discount_percentage, fixed_price, tiers, etc.
    conditions JSONB DEFAULT '{}', -- Conditions for applying: customer_type, date_range, min_quantity, etc.
    priority INTEGER DEFAULT 0, -- Higher priority overrides lower (for promotions over standard prices)
    valid_from DATE NOT NULL,
    valid_until DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. GOVERNMENT_BONOS
CREATE TABLE government_bonos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    discount_percentage DECIMAL(5,2),
    max_amount DECIMAL(10,2),
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    usage_limit INTEGER,
    current_usage INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. BONO_USAGE
CREATE TABLE bono_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bono_id UUID NOT NULL REFERENCES government_bonos(id),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    discount_amount DECIMAL(10,2) NOT NULL,
    usage_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. CUSTOMER_CONSENTS (GDPR Compliance)
CREATE TABLE customer_consents (
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

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_active ON locations(is_active);
CREATE INDEX idx_boats_location ON boats(location_id);
CREATE INDEX idx_boats_active ON boats(is_active);
CREATE INDEX idx_dive_sites_location ON dive_sites(location_id);
CREATE INDEX idx_equipment_location ON equipment(location_id);
CREATE INDEX idx_equipment_category ON equipment(category);
CREATE INDEX idx_staff_location ON staff(location_id);
CREATE INDEX idx_staff_role ON staff(role);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customer_stays_customer ON customer_stays(customer_id);
CREATE INDEX idx_certifications_customer ON customer_certifications(customer_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_pricing_configs_location ON pricing_configs(location_id);
CREATE INDEX idx_pricing_configs_activity_type ON pricing_configs(activity_type);
CREATE INDEX idx_pricing_configs_pricing_type ON pricing_configs(pricing_type);
CREATE INDEX idx_pricing_configs_active ON pricing_configs(is_active);
CREATE INDEX idx_pricing_configs_dates ON pricing_configs(valid_from, valid_until);
CREATE INDEX idx_customer_consents_customer ON customer_consents(customer_id);
CREATE INDEX idx_customer_consents_type ON customer_consents(consent_type);
CREATE INDEX idx_customer_consents_active ON customer_consents(is_active);
CREATE INDEX idx_customer_consents_customer_type_active ON customer_consents(customer_id, consent_type, is_active);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_boats_updated_at BEFORE UPDATE ON boats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dive_sites_updated_at BEFORE UPDATE ON dive_sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_stays_updated_at BEFORE UPDATE ON customer_stays FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_certification_agencies_updated_at BEFORE UPDATE ON certification_agencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_certifications_updated_at BEFORE UPDATE ON customer_certifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_configs_updated_at BEFORE UPDATE ON pricing_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_government_bonos_updated_at BEFORE UPDATE ON government_bonos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_consents_updated_at BEFORE UPDATE ON customer_consents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE locations IS 'Store information about all diving center locations';
COMMENT ON TABLE boats IS 'Track boats and their specifications by location';
COMMENT ON TABLE dive_sites IS 'Catalog all dive sites accessible from each location';
COMMENT ON TABLE equipment IS 'Inventory of all equipment available at each location';
COMMENT ON TABLE staff IS 'Staff members working at each location';
COMMENT ON TABLE customers IS 'Customer information and profiles';
COMMENT ON TABLE customer_stays IS 'Track customer stays for volume discount pricing';
COMMENT ON TABLE certification_agencies IS 'Certification agencies (SSI, PADI, CMAS, VDST)';
COMMENT ON TABLE customer_certifications IS 'Customer certification tracking with agency validation';
COMMENT ON TABLE bookings IS 'All bookings including diving activities';
COMMENT ON TABLE pricing_configs IS 'Unified pricing table: standard prices, promotions, discounts, and overrides. Supports all pricing types including dives, courses, equipment, and addons';
COMMENT ON TABLE government_bonos IS 'Canary Islands resident discount vouchers';
COMMENT ON TABLE customer_consents IS 'GDPR consent management - tracks all customer consents for data processing, marketing, medical data, etc.';

