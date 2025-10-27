# Open Source Dive Center Management System - Database Schema

**Project:** OpenDCMS - Universal Dive Center Management Platform  
**License:** MIT Open Source  
**Database:** PostgreSQL 14+  
**Created:** October 2025

---

## 🗄️ **Database Overview**

### **Database Name:** `opendcms_production`
### **Character Set:** UTF-8
### **Collation:** en_US.UTF-8
### **Timezone:** UTC (configurable per location)

---

## 📋 **Core Tables (Day One)**

### **1. LOCATIONS**
**Purpose:** Store information about all diving center locations

```sql
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type ENUM('diving', 'bike_rental', 'future') NOT NULL,
    address JSONB NOT NULL,
    contact_info JSONB NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_active ON locations(is_active);
```

**Sample Data:**
```sql
INSERT INTO locations (id, name, type, address, contact_info) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Main Dive Center', 'diving', 
 '{"street": "123 Ocean Drive", "city": "Coastal City", "postal_code": "12345", "country": "Country"}',
 '{"phone": "+1 555 123 456", "email": "main@divecenter.com", "website": "main.divecenter.com"}'),
('550e8400-e29b-41d4-a716-446655440002', 'Secondary Location', 'diving',
 '{"street": "456 Beach Road", "city": "Coastal City", "postal_code": "12345", "country": "Country"}',
 '{"phone": "+1 555 123 457", "email": "secondary@divecenter.com", "website": "secondary.divecenter.com"}'),
('550e8400-e29b-41d4-a716-446655440003', 'Future Location', 'bike_rental',
 '{"street": "789 Harbor Street", "city": "Coastal City", "postal_code": "12345", "country": "Country"}',
 '{"phone": "+1 555 123 458", "email": "future@divecenter.com", "website": "future.divecenter.com"}');
```

---

### **2. BOATS**
**Purpose:** Track boats and their specifications by location

```sql
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

-- Indexes
CREATE INDEX idx_boats_location ON boats(location_id);
CREATE INDEX idx_boats_active ON boats(is_active);
```

**Sample Data:**
```sql
INSERT INTO boats (location_id, name, capacity, equipment_onboard) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Boat Alpha', 12, '["oxygen", "first_aid", "radio"]'),
('550e8400-e29b-41d4-a716-446655440001', 'Boat Beta', 10, '["oxygen", "first_aid", "radio"]'),
('550e8400-e29b-41d4-a716-446655440001', 'Boat Gamma', 8, '["oxygen", "first_aid", "radio"]'),
('550e8400-e29b-41d4-a716-446655440001', 'Boat Delta', 6, '["oxygen", "first_aid", "radio"]');
```

---

### **3. DIVE_SITES**
**Purpose:** Catalog all dive sites accessible from each location

```sql
CREATE TABLE dive_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type ENUM('boat', 'shore') NOT NULL,
    depth_range JSONB NOT NULL, -- {"min": 5, "max": 30}
    difficulty_level ENUM('beginner', 'intermediate', 'advanced', 'expert') NOT NULL,
    coordinates JSONB, -- {"lat": 28.1234, "lng": -13.5678}
    marine_life JSONB DEFAULT '[]',
    access_method ENUM('boat', 'shore', 'both') NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dive_sites_location ON dive_sites(location_id);
CREATE INDEX idx_dive_sites_type ON dive_sites(type);
CREATE INDEX idx_dive_sites_difficulty ON dive_sites(difficulty_level);
```

**Sample Data:**
```sql
INSERT INTO dive_sites (location_id, name, type, depth_range, difficulty_level, coordinates) VALUES
-- Main location dive sites
('550e8400-e29b-41d4-a716-446655440001', 'Reef Point', 'boat', '{"min": 8, "max": 25}', 'intermediate', '{"lat": 28.1234, "lng": -13.5678}'),
('550e8400-e29b-41d4-a716-446655440001', 'Deep Wall', 'boat', '{"min": 12, "max": 30}', 'advanced', '{"lat": 28.1345, "lng": -13.5789}'),
('550e8400-e29b-41d4-a716-446655440001', 'Cathedral Rock', 'boat', '{"min": 15, "max": 35}', 'expert', '{"lat": 28.1456, "lng": -13.5890}'),
-- Secondary location dive sites
('550e8400-e29b-41d4-a716-446655440002', 'Shore Dive 1', 'shore', '{"min": 3, "max": 15}', 'beginner', '{"lat": 28.1567, "lng": -13.5901}'),
('550e8400-e29b-41d4-a716-446655440002', 'Shore Dive 2', 'shore', '{"min": 5, "max": 20}', 'intermediate', '{"lat": 28.1678, "lng": -13.6012}');
```

---

### **4. ACTIVITIES**
**Purpose:** Define all available activities and their configurations

```sql
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type ENUM('diving', 'snorkeling', 'bike_rental', 'future') NOT NULL,
    category ENUM('fun_dive', 'course', 'specialty', 'rental') NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    max_participants INTEGER,
    requirements JSONB DEFAULT '{}',
    equipment_included JSONB DEFAULT '[]',
    special_options JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_category ON activities(category);
CREATE INDEX idx_activities_active ON activities(is_active);
```

**Sample Data:**
```sql
INSERT INTO activities (name, type, category, base_price, duration_minutes, max_participants, requirements, equipment_included) VALUES
('Fun Dive', 'diving', 'fun_dive', 46.00, 120, 12, '{"certification": "OW", "min_age": 10}', '["full_set_diving"]'),
('Snorkeling Tour', 'snorkeling', 'fun_dive', 25.00, 90, 20, '{"min_age": 8}', '["snorkel", "mask", "fins"]'),
('Discover Scuba', 'diving', 'course', 80.00, 180, 4, '{"min_age": 10}', '["full_set_diving", "instructor"]'),
('Open Water Course', 'diving', 'course', 450.00, 1800, 8, '{"min_age": 10}', '["full_set_diving", "manual", "certification"]');
```

---

### **5. EQUIPMENT**
**Purpose:** Track all equipment inventory by location

```sql
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type ENUM('diving', 'snorkeling', 'bike', 'clothing') NOT NULL,
    category VARCHAR(50) NOT NULL,
    size VARCHAR(20),
    brand VARCHAR(50),
    model VARCHAR(50),
    serial_number VARCHAR(100),
    barcode VARCHAR(50) UNIQUE,
    purchase_date DATE,
    condition ENUM('excellent', 'good', 'fair', 'poor', 'maintenance') DEFAULT 'good',
    rental_price DECIMAL(10,2) DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_equipment_location ON equipment(location_id);
CREATE INDEX idx_equipment_type ON equipment(type);
CREATE INDEX idx_equipment_category ON equipment(category);
CREATE INDEX idx_equipment_available ON equipment(is_available);
CREATE INDEX idx_equipment_barcode ON equipment(barcode);
```

**Sample Data:**
```sql
INSERT INTO equipment (location_id, name, type, category, size, barcode) VALUES
-- Diving equipment for main location
('550e8400-e29b-41d4-a716-446655440001', 'BCD Mares', 'diving', 'BCD', 'M', 'BCD001'),
('550e8400-e29b-41d4-a716-446655440001', 'BCD Mares', 'diving', 'BCD', 'L', 'BCD002'),
('550e8400-e29b-41d4-a716-446655440001', 'Regulator Aqualung', 'diving', 'regulator', 'One Size', 'REG001'),
('550e8400-e29b-41d4-a716-446655440001', 'Wetsuit 3mm', 'diving', 'wetsuit', 'M', 'WET001'),
('550e8400-e29b-41d4-a716-446655440001', 'Dive Computer', 'diving', 'computer', 'One Size', 'COMP001'),
('550e8400-e29b-41d4-a716-446655440001', 'Torch', 'diving', 'torch', 'One Size', 'TORCH001');
```

---

### **6. STAFF**
**Purpose:** Manage staff members across all locations

```sql
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role ENUM('manager', 'instructor', 'guide', 'reception', 'maintenance') NOT NULL,
    hire_date DATE NOT NULL,
    salary DECIMAL(10,2),
    languages JSONB DEFAULT '[]',
    certifications JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_staff_location ON staff(location_id);
CREATE INDEX idx_staff_role ON staff(role);
CREATE INDEX idx_staff_active ON staff(is_active);
```

**Sample Data:**
```sql
INSERT INTO staff (location_id, first_name, last_name, email, phone, role, hire_date, languages) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'John', 'Instructor', 'instructor1@divecenter.com', '+1 555 200 001', 'instructor', '2020-01-15', '["English", "Spanish"]'),
('550e8400-e29b-41d4-a716-446655440001', 'Jane', 'Manager', 'manager@divecenter.com', '+1 555 200 002', 'manager', '2019-06-01', '["English", "Spanish", "French"]'),
('550e8400-e29b-41d4-a716-446655440002', 'Mike', 'Divemaster', 'divemaster1@divecenter.com', '+1 555 200 003', 'guide', '2021-03-10', '["English", "German"]');
```

---

### **7. CUSTOMERS**
**Purpose:** Store customer information and preferences

```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    nationality VARCHAR(50),
    emergency_contact JSONB DEFAULT '{}',
    medical_conditions JSONB DEFAULT '[]',
    certifications JSONB DEFAULT '[]',
    preferences JSONB DEFAULT '{}',
    residency_info JSONB DEFAULT '{}', -- For resident pricing
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_active ON customers(is_active);
```

**Sample Data:**
```sql
INSERT INTO customers (first_name, last_name, email, phone, date_of_birth, nationality, emergency_contact, certifications) VALUES
('John', 'Smith', 'john.smith@email.com', '+1 555 300 001', '1985-06-15', 'American', '{"name": "Jane Smith", "phone": "+1 555 300 002"}', '["OW", "AOW"]'),
('Maria', 'Garcia', 'maria.garcia@email.com', '+1 555 300 003', '1990-03-22', 'Spanish', '{"name": "Carlos Garcia", "phone": "+1 555 300 004"}', '["OW"]'),
('Hans', 'Mueller', 'hans.mueller@email.com', '+1 555 300 005', '1988-11-08', 'German', '{"name": "Anna Mueller", "phone": "+1 555 300 006"}', '["OW", "AOW", "Rescue"]');
```

---

## 🎯 **Advanced Features Tables**

### **8. PRICING_TIERS**
**Purpose:** Volume discount pricing configuration

```sql
CREATE TABLE pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    min_quantity INTEGER,
    max_quantity INTEGER,
    price_per_unit DECIMAL(10,2),
    discount_percentage DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pricing_tiers_activity ON pricing_tiers(activity_id);
CREATE INDEX idx_pricing_tiers_active ON pricing_tiers(is_active);
```

**Sample Data:**
```sql
INSERT INTO pricing_tiers (activity_id, min_quantity, max_quantity, price_per_unit, discount_percentage) VALUES
-- Volume discounts for diving
((SELECT id FROM activities WHERE name = 'Fun Dive'), 1, 2, 46.00, NULL),
((SELECT id FROM activities WHERE name = 'Fun Dive'), 3, 5, 44.00, NULL),
((SELECT id FROM activities WHERE name = 'Fun Dive'), 6, 8, 42.00, NULL),
((SELECT id FROM activities WHERE name = 'Fun Dive'), 9, NULL, 38.00, NULL);
```

---

### **9. ACTIVITY_ADDONS**
**Purpose:** Specialty services with additional costs

```sql
CREATE TABLE activity_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    additional_price DECIMAL(10,2) NOT NULL,
    equipment_included JSONB DEFAULT '[]',
    requirements JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activity_addons_activity ON activity_addons(activity_id);
CREATE INDEX idx_activity_addons_active ON activity_addons(is_active);
```

**Sample Data:**
```sql
INSERT INTO activity_addons (activity_id, name, additional_price, equipment_included, requirements) VALUES
-- Night dive addon
((SELECT id FROM activities WHERE name = 'Fun Dive'), 'Night Dive', 20.00, '["torch"]', '{"certification": "AOW"}'),
-- Personal instructor addon
((SELECT id FROM activities WHERE name = 'Fun Dive'), 'Personal Instructor', 100.00, '[]', '{}');
```

---

### **10. SPECIAL_PRICING**
**Purpose:** Special pricing rules (weekend specials, resident discounts)

```sql
CREATE TABLE special_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price_override DECIMAL(10,2),
    discount_percentage DECIMAL(5,2),
    conditions JSONB DEFAULT '{}',
    requirements JSONB DEFAULT '{}',
    valid_from DATE,
    valid_until DATE,
    max_participants INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_special_pricing_activity ON special_pricing(activity_id);
CREATE INDEX idx_special_pricing_active ON special_pricing(is_active);
CREATE INDEX idx_special_pricing_dates ON special_pricing(valid_from, valid_until);
```

**Sample Data:**
```sql
INSERT INTO special_pricing (activity_id, name, price_override, discount_percentage, conditions, requirements, max_participants) VALUES
-- Weekend Special for Experienced Divers
((SELECT id FROM activities WHERE name = 'Fun Dive'), 'Weekend Special - Experienced Divers', NULL, NULL,
 '{"day_of_week": ["saturday", "sunday"], "time": "10:15", "experience_level": "experienced"}',
 '{"certification": "AOW", "min_dives": 50}', 12);
```

---

### **11. BOOKINGS**
**Purpose:** Main booking system with advanced features

```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    location_id UUID NOT NULL REFERENCES locations(id),
    activity_id UUID NOT NULL REFERENCES activities(id),
    boat_id UUID REFERENCES boats(id),
    dive_site_id UUID REFERENCES dive_sites(id),
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    participants INTEGER NOT NULL DEFAULT 1,
    quantity INTEGER NOT NULL DEFAULT 1,
    base_price DECIMAL(10,2) NOT NULL,
    addon_price DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL,
    addons_selected JSONB DEFAULT '[]',
    -- Government bono support
    bono_id UUID REFERENCES government_bonos(id),
    government_payment DECIMAL(10,2) DEFAULT 0,
    customer_payment DECIMAL(10,2) DEFAULT 0,
    -- Stay tracking for volume discounts
    stay_id UUID REFERENCES customer_stays(id),
    dive_sequence INTEGER, -- For volume discount calculation
    status ENUM('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_location ON bookings(location_id);
CREATE INDEX idx_bookings_activity ON bookings(activity_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
```

**Sample Data:**
```sql
INSERT INTO bookings (customer_id, location_id, activity_id, boat_id, dive_site_id, booking_date, start_time, duration_minutes, participants, quantity, base_price, total_price, status) VALUES
((SELECT id FROM customers WHERE email = 'john.smith@email.com'),
 (SELECT id FROM locations WHERE name = 'Main Dive Center'),
 (SELECT id FROM activities WHERE name = 'Fun Dive'),
 (SELECT id FROM boats WHERE name = 'Boat Alpha'),
 (SELECT id FROM dive_sites WHERE name = 'Reef Point'),
 '2025-03-15', '09:00:00', 120, 1, 1, 46.00, 46.00, 'confirmed');
```

---

### **12. CUSTOMER_STAYS**
**Purpose:** Track individual customer stays for volume discount calculation

```sql
CREATE TABLE customer_stays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    stay_start DATE NOT NULL,
    stay_end DATE NOT NULL,
    location_id UUID NOT NULL REFERENCES locations(id),
    total_dives INTEGER DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customer_stays_customer ON customer_stays(customer_id);
CREATE INDEX idx_customer_stays_dates ON customer_stays(stay_start, stay_end);
```

---

### **13. DIVE_BOOKINGS**
**Purpose:** Track individual dives within a stay for cross-period pricing

```sql
CREATE TABLE dive_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stay_id UUID NOT NULL REFERENCES customer_stays(id),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    dive_sequence INTEGER NOT NULL, -- 1, 2, 3, etc. within the stay
    dive_date DATE NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    final_price DECIMAL(10,2) NOT NULL,
    pricing_config_snapshot JSONB NOT NULL, -- Snapshot of pricing at time of dive
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dive_bookings_stay ON dive_bookings(stay_id);
CREATE INDEX idx_dive_bookings_sequence ON dive_bookings(dive_sequence);
```

---

## 🌍 **Multilingual System Tables**

### **14. LANGUAGES**
**Purpose:** Language configuration for the system

```sql
CREATE TABLE languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(5) NOT NULL UNIQUE, -- es, en, de, fr, it
    name VARCHAR(50) NOT NULL,
    native_name VARCHAR(50) NOT NULL,
    is_admin_language BOOLEAN DEFAULT false,
    is_customer_language BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert supported languages
INSERT INTO languages (code, name, native_name, is_admin_language, is_customer_language) VALUES
('es', 'Spanish', 'Español', true, true),
('en', 'English', 'English', true, true),
('de', 'German', 'Deutsch', true, true),
('fr', 'French', 'Français', false, true),
('it', 'Italian', 'Italiano', false, true);
```

---

### **15. MULTILINGUAL_CONTENT**
**Purpose:** Store translated content

```sql
CREATE TABLE multilingual_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_key VARCHAR(100) NOT NULL,
    language_code VARCHAR(5) NOT NULL REFERENCES languages(code),
    content_text TEXT NOT NULL,
    content_type ENUM('label', 'description', 'help_text', 'error_message') DEFAULT 'label',
    context VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_multilingual_content_key ON multilingual_content(content_key);
CREATE INDEX idx_multilingual_content_language ON multilingual_content(language_code);
```

---

## 🏛️ **Government Integration Tables**

### **16. GOVERNMENT_BONOS**
**Purpose:** Government discount codes and vouchers

```sql
CREATE TABLE government_bonos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    type ENUM('discount_code', 'full_voucher') NOT NULL,
    discount_percentage DECIMAL(5,2), -- For discount codes
    max_amount DECIMAL(10,2), -- Maximum discount amount
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    usage_limit INTEGER, -- Maximum number of uses
    current_usage INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### **17. BONO_USAGE**
**Purpose:** Track usage of government bonos

```sql
CREATE TABLE bono_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bono_id UUID NOT NULL REFERENCES government_bonos(id),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    discount_amount DECIMAL(10,2) NOT NULL,
    usage_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🎓 **Multi-Agency Certification System**

### **18. CERTIFICATION_AGENCIES**
**Purpose:** Certification agencies (SSI, PADI, CMAS, VDST)

```sql
CREATE TABLE certification_agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    priority INTEGER NOT NULL, -- 1 = primary, 2+ = secondary
    is_primary_agency BOOLEAN DEFAULT false,
    api_endpoint VARCHAR(200),
    api_key_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert agencies with correct priority - ALL ACTIVE FROM DAY ONE
INSERT INTO certification_agencies (name, code, priority, is_primary_agency, is_active, api_endpoint, api_key_required) VALUES
('Scuba Schools International', 'SSI', 1, true, true, 'https://api.ssi.com/v1', true),
('Professional Association of Diving Instructors', 'PADI', 2, false, true, 'https://api.padi.com/v1', true),
('Confédération Mondiale des Activités Subaquatiques', 'CMAS', 3, false, true, 'https://api.cmas.org/v1', true),
('Verband Deutscher Sporttaucher', 'VDST', 4, false, true, 'https://api.vdst.de/v1', true);
```

---

### **19. CUSTOMER_CERTIFICATIONS**
**Purpose:** Customer certification tracking

```sql
CREATE TABLE customer_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    agency_id UUID NOT NULL REFERENCES certification_agencies(id),
    certification_number VARCHAR(100) NOT NULL,
    certification_level VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE,
    api_validated BOOLEAN DEFAULT false,
    api_data JSONB DEFAULT '{}',
    last_validated TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### **20. COURSES**
**Purpose:** Course catalog for all agencies

```sql
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES certification_agencies(id),
    course_code VARCHAR(50) NOT NULL, -- e.g., 'OW', 'AOW', 'RESCUE', 'DM', 'INSTRUCTOR'
    course_name VARCHAR(100) NOT NULL,
    course_type ENUM('recreational', 'professional', 'specialty') NOT NULL,
    prerequisite_courses JSONB DEFAULT '[]', -- Array of required course codes
    min_age INTEGER,
    min_dives INTEGER,
    duration_hours INTEGER NOT NULL,
    max_students INTEGER DEFAULT 8,
    base_price DECIMAL(10,2) NOT NULL,
    equipment_included JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agency_id, course_code)
);
```

---

### **21. STAFF_CERTIFICATIONS**
**Purpose:** Staff certifications and qualifications

```sql
CREATE TABLE staff_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id),
    agency_id UUID NOT NULL REFERENCES certification_agencies(id),
    certification_level VARCHAR(100) NOT NULL,
    certification_number VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE,
    instructor_number VARCHAR(100), -- For instructors
    specialties JSONB DEFAULT '[]', -- Specialized certifications
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### **22. COURSE_BOOKINGS**
**Purpose:** Course bookings and enrollments

```sql
CREATE TABLE course_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    instructor_id UUID REFERENCES staff(id),
    location_id UUID NOT NULL REFERENCES locations(id),
    start_date DATE NOT NULL,
    end_date DATE,
    status ENUM('enrolled', 'in_progress', 'completed', 'failed', 'cancelled') DEFAULT 'enrolled',
    total_price DECIMAL(10,2) NOT NULL,
    deposit_paid DECIMAL(10,2) DEFAULT 0,
    final_payment DECIMAL(10,2) DEFAULT 0,
    certification_issued BOOLEAN DEFAULT false,
    certification_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## ⚖️ **Regulatory Compliance System (MANDATORY)**

### **23. MARITIME_INCIDENTS**
**Purpose:** Track maritime incidents and safety violations

```sql
CREATE TABLE maritime_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id),
    incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
    incident_type ENUM('equipment_failure', 'medical_emergency', 'weather_related', 'safety_violation', 'other') NOT NULL,
    severity ENUM('minor', 'moderate', 'major', 'critical') NOT NULL,
    description TEXT NOT NULL,
    involved_staff JSONB DEFAULT '[]', -- Array of staff IDs
    involved_customers JSONB DEFAULT '[]', -- Array of customer IDs
    actions_taken TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### **24. SAFETY_EQUIPMENT_CERTIFICATIONS**
**Purpose:** Track safety equipment certifications and inspections

```sql
CREATE TABLE safety_equipment_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    certification_type ENUM('annual_inspection', 'pressure_test', 'safety_check', 'maintenance') NOT NULL,
    certification_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    certified_by VARCHAR(100) NOT NULL,
    certification_number VARCHAR(100),
    next_inspection_date DATE,
    is_compliant BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### **25. WEATHER_RESTRICTIONS**
**Purpose:** Track weather-based operation restrictions

```sql
CREATE TABLE weather_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id),
    restriction_date DATE NOT NULL,
    restriction_type ENUM('wind', 'waves', 'visibility', 'storm', 'other') NOT NULL,
    severity ENUM('advisory', 'warning', 'prohibition') NOT NULL,
    description TEXT NOT NULL,
    affected_activities JSONB DEFAULT '[]',
    start_time TIME,
    end_time TIME,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### **26. EMERGENCY_CONTACTS**
**Purpose:** Emergency contact information for all locations

```sql
CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id),
    contact_type ENUM('maritime_authorities', 'medical_emergency', 'coast_guard', 'police', 'hospital', 'equipment_supplier') NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### **27. DATA_RETENTION_POLICIES**
**Purpose:** GDPR compliance data retention policies

```sql
CREATE TABLE data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_type VARCHAR(50) NOT NULL,
    retention_period_months INTEGER NOT NULL,
    deletion_trigger ENUM('automatic', 'manual', 'request') NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### **28. CUSTOMER_CONSENTS**
**Purpose:** GDPR consent management

```sql
CREATE TABLE customer_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    consent_type ENUM('data_processing', 'marketing', 'analytics', 'third_party') NOT NULL,
    consent_given BOOLEAN NOT NULL,
    consent_date TIMESTAMP WITH TIME ZONE NOT NULL,
    consent_method ENUM('website', 'email', 'phone', 'in_person') NOT NULL,
    ip_address INET,
    user_agent TEXT,
    withdrawal_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### **29. DATA_BREACHES**
**Purpose:** Track data breaches for GDPR compliance

```sql
CREATE TABLE data_breaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breach_date TIMESTAMP WITH TIME ZONE NOT NULL,
    discovery_date TIMESTAMP WITH TIME ZONE NOT NULL,
    breach_type ENUM('unauthorized_access', 'data_loss', 'system_compromise', 'other') NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    description TEXT NOT NULL,
    affected_customers INTEGER,
    data_types_affected JSONB DEFAULT '[]',
    containment_actions TEXT,
    notification_sent BOOLEAN DEFAULT false,
    notification_date TIMESTAMP WITH TIME ZONE,
    authorities_notified BOOLEAN DEFAULT false,
    authorities_notification_date TIMESTAMP WITH TIME ZONE,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### **30. INSURANCE_PROVIDERS**
**Purpose:** Insurance provider management

```sql
CREATE TABLE insurance_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(100) NOT NULL,
    provider_type ENUM('diving_insurance', 'equipment_insurance', 'liability_insurance', 'staff_insurance') NOT NULL,
    policy_number VARCHAR(100),
    coverage_amount DECIMAL(12,2),
    coverage_start_date DATE,
    coverage_end_date DATE,
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### **31. INSURANCE_CLAIMS**
**Purpose:** Insurance claim tracking

```sql
CREATE TABLE insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insurance_provider_id UUID NOT NULL REFERENCES insurance_providers(id),
    claim_number VARCHAR(100) NOT NULL,
    incident_id UUID REFERENCES maritime_incidents(id),
    claim_type ENUM('equipment_damage', 'medical_expense', 'liability', 'business_interruption') NOT NULL,
    claim_amount DECIMAL(10,2),
    claim_date DATE NOT NULL,
    status ENUM('submitted', 'under_review', 'approved', 'denied', 'paid') DEFAULT 'submitted',
    description TEXT,
    supporting_documents JSONB DEFAULT '[]',
    settlement_amount DECIMAL(10,2),
    settlement_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### **32. MEDICAL_CLEARANCES**
**Purpose:** Medical clearance tracking

```sql
CREATE TABLE medical_clearances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    clearance_date DATE NOT NULL,
    valid_until DATE NOT NULL,
    medical_condition VARCHAR(100),
    restrictions JSONB DEFAULT '[]',
    doctor_name VARCHAR(100),
    doctor_contact VARCHAR(100),
    clearance_document VARCHAR(200), -- File path or reference
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### **33. SAFETY_BRIEFINGS**
**Purpose:** Safety briefing tracking

```sql
CREATE TABLE safety_briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    briefing_type ENUM('diving_safety', 'equipment_use', 'emergency_procedures', 'site_specific') NOT NULL,
    briefing_date TIMESTAMP WITH TIME ZONE NOT NULL,
    instructor_id UUID NOT NULL REFERENCES staff(id),
    location_id UUID NOT NULL REFERENCES locations(id),
    topics_covered JSONB DEFAULT '[]',
    customer_acknowledgment BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### **34. PRICING_CHANGE_HISTORY**
**Purpose:** Track pricing changes for cross-period stay pricing

```sql
CREATE TABLE pricing_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id),
    change_date DATE NOT NULL,
    old_pricing_config JSONB NOT NULL,
    new_pricing_config JSONB NOT NULL,
    change_reason VARCHAR(200),
    changed_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔧 **Advanced Pricing Functions**

### **Pricing Calculation Function:**
```sql
CREATE OR REPLACE FUNCTION calculate_booking_price(
    p_activity_id UUID,
    p_quantity INTEGER,
    p_customer_id UUID,
    p_booking_date DATE
) RETURNS TABLE(
    base_price DECIMAL(10,2),
    final_price DECIMAL(10,2),
    pricing_type VARCHAR(100),
    volume_tier VARCHAR(50)
) AS $$
DECLARE
    v_base_price DECIMAL(10,2);
    v_final_price DECIMAL(10,2);
    v_pricing_type VARCHAR(100) := 'Standard';
    v_volume_tier VARCHAR(50);
    v_customer_residency VARCHAR(50);
    v_customer_experience VARCHAR(50);
    v_special_pricing_record RECORD;
BEGIN
    -- Get base price from activity
    SELECT base_price INTO v_base_price
    FROM activities
    WHERE id = p_activity_id AND is_active = true;
    
    -- Get customer information
    SELECT 
        COALESCE(residency_info->>'type', 'tourist') as residency,
        COALESCE(certifications->>0, 'beginner') as experience
    INTO v_customer_residency, v_customer_experience
    FROM customers
    WHERE id = p_customer_id;
    
    -- Check for special pricing (weekend special, resident discount, etc.)
    SELECT sp.price_override, sp.discount_percentage, sp.name
    INTO v_special_pricing_record
    FROM special_pricing sp
    WHERE sp.activity_id = p_activity_id
      AND sp.is_active = true
      AND (sp.valid_from IS NULL OR sp.valid_from <= p_booking_date)
      AND (sp.valid_until IS NULL OR sp.valid_until >= p_booking_date);
    
    -- Calculate volume discount tier
    SELECT 
        CASE 
            WHEN p_quantity BETWEEN 1 AND 2 THEN '1-2 dives'
            WHEN p_quantity BETWEEN 3 AND 5 THEN '3-5 dives'
            WHEN p_quantity BETWEEN 6 AND 8 THEN '6-8 dives'
            WHEN p_quantity >= 9 THEN '9+ dives'
        END
    INTO v_volume_tier;
    
    -- Calculate special price
    IF v_special_pricing_record.price_override IS NOT NULL THEN
        v_final_price := v_special_pricing_record.price_override;
        v_pricing_type := v_special_pricing_record.name;
    ELSIF v_special_pricing_record.discount_percentage IS NOT NULL THEN
        v_final_price := v_base_price * (1 - v_special_pricing_record.discount_percentage / 100);
        v_pricing_type := v_special_pricing_record.name;
    ELSE
        v_final_price := v_base_price;
    END IF;
    
    RETURN QUERY SELECT v_base_price, v_final_price, v_pricing_type, v_volume_tier;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 **Sample Data for All Tables**

### **Course Catalog Sample Data:**
```sql
-- SSI Courses
INSERT INTO courses (agency_id, course_code, course_name, course_type, prerequisite_courses, min_age, min_dives, duration_hours, max_students, base_price, equipment_included) VALUES
((SELECT id FROM certification_agencies WHERE code = 'SSI'), 'OW', 'Open Water Diver', 'recreational', '[]', 10, 0, 30, 8, 465.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'SSI'), 'AOW', 'Advanced Open Water', 'recreational', '["OW"]', 12, 24, 20, 6, 350.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'SSI'), 'RESCUE', 'Rescue Diver', 'recreational', '["AOW"]', 15, 40, 25, 4, 400.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'SSI'), 'DM', 'Divemaster', 'professional', '["RESCUE"]', 18, 60, 40, 4, 800.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'SSI'), 'INSTRUCTOR', 'Open Water Instructor', 'professional', '["DM"]', 18, 100, 60, 4, 1200.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'SSI'), 'NIGHT', 'Night Diving', 'specialty', '["OW"]', 12, 20, 8, 6, 150.00, '["full_set_diving", "torch", "manual"]'),
((SELECT id FROM certification_agencies WHERE code = 'SSI'), 'DEEP', 'Deep Diving', 'specialty', '["AOW"]', 15, 30, 10, 6, 180.00, '["full_set_diving", "manual"]');

-- PADI Courses
INSERT INTO courses (agency_id, course_code, course_name, course_type, prerequisite_courses, min_age, min_dives, duration_hours, max_students, base_price, equipment_included) VALUES
((SELECT id FROM certification_agencies WHERE code = 'PADI'), 'OW', 'Open Water Diver', 'recreational', '[]', 10, 0, 30, 8, 450.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'PADI'), 'AOW', 'Advanced Open Water', 'recreational', '["OW"]', 12, 24, 20, 6, 340.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'PADI'), 'RESCUE', 'Rescue Diver', 'recreational', '["AOW"]', 15, 40, 25, 4, 380.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'PADI'), 'DM', 'Divemaster', 'professional', '["RESCUE"]', 18, 60, 40, 4, 750.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'PADI'), 'INSTRUCTOR', 'Open Water Instructor', 'professional', '["DM"]', 18, 100, 60, 4, 1100.00, '["full_set_diving", "manual", "certification_card"]');

-- CMAS Courses
INSERT INTO courses (agency_id, course_code, course_name, course_type, prerequisite_courses, min_age, min_dives, duration_hours, max_students, base_price, equipment_included) VALUES
((SELECT id FROM certification_agencies WHERE code = 'CMAS'), '1STAR', '1 Star Diver', 'recreational', '[]', 14, 0, 25, 8, 400.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'CMAS'), '2STAR', '2 Star Diver', 'recreational', '["1STAR"]', 16, 20, 30, 6, 500.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'CMAS'), '3STAR', '3 Star Diver', 'recreational', '["2STAR"]', 18, 50, 40, 4, 700.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'CMAS'), 'INSTRUCTOR', 'CMAS Instructor', 'professional', '["3STAR"]', 18, 100, 60, 4, 1000.00, '["full_set_diving", "manual", "certification_card"]');

-- VDST Courses
INSERT INTO courses (agency_id, course_code, course_name, course_type, prerequisite_courses, min_age, min_dives, duration_hours, max_students, base_price, equipment_included) VALUES
((SELECT id FROM certification_agencies WHERE code = 'VDST'), 'BRONZE', 'Bronze Diver', 'recreational', '[]', 14, 0, 25, 8, 380.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'VDST'), 'SILVER', 'Silver Diver', 'recreational', '["BRONZE"]', 16, 20, 30, 6, 480.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'VDST'), 'GOLD', 'Gold Diver', 'recreational', '["SILVER"]', 18, 50, 40, 4, 680.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'VDST'), 'INSTRUCTOR', 'VDST Instructor', 'professional', '["GOLD"]', 18, 100, 60, 4, 950.00, '["full_set_diving", "manual", "certification_card"]');
```

### **Staff Certifications Sample Data:**
```sql
-- Staff certifications for existing staff
INSERT INTO staff_certifications (staff_id, agency_id, certification_level, certification_number, issue_date, expiry_date, instructor_number, specialties) VALUES
-- Main Location Instructor - SSI Instructor
((SELECT id FROM staff WHERE email = 'instructor1@divecenter.com'), 
 (SELECT id FROM certification_agencies WHERE code = 'SSI'), 
 'Open Water Instructor', 'SSI-INS-12345', '2020-03-15', '2025-03-15', 'INS-12345', 
 '["Night Diving", "Deep Diving", "Rescue Diver"]'),

-- Secondary Location Divemaster - SSI Divemaster
((SELECT id FROM staff WHERE email = 'divemaster1@divecenter.com'), 
 (SELECT id FROM certification_agencies WHERE code = 'SSI'), 
 'Divemaster', 'SSI-DM-67890', '2021-06-20', '2026-06-20', NULL, 
 '["Rescue Diver", "Night Diving"]'),

-- Main Location Instructor - PADI Instructor (Secondary)
((SELECT id FROM staff WHERE email = 'instructor2@divecenter.com'), 
 (SELECT id FROM certification_agencies WHERE code = 'PADI'), 
 'Open Water Instructor', 'PADI-INS-54321', '2019-08-10', '2024-08-10', 'INS-54321', 
 '["Rescue Diver", "Emergency First Response"]');
```

### **Regulatory Compliance Sample Data:**
```sql
-- Emergency contacts for all locations
INSERT INTO emergency_contacts (location_id, contact_type, contact_name, phone_number, email, is_primary, is_active) VALUES
-- Main location emergency contacts
((SELECT id FROM locations WHERE name = 'Main Dive Center'), 'maritime_authorities', 'Local Maritime Authority', '+1 555 100 000', 'maritime@authority.gov', true, true),
((SELECT id FROM locations WHERE name = 'Main Dive Center'), 'coast_guard', 'Local Coast Guard', '+1 555 100 001', 'coastguard@authority.gov', true, true),
((SELECT id FROM locations WHERE name = 'Main Dive Center'), 'hospital', 'Local General Hospital', '+1 555 100 002', 'emergency@hospital.gov', true, true),
-- Secondary location emergency contacts
((SELECT id FROM locations WHERE name = 'Secondary Location'), 'maritime_authorities', 'Local Maritime Authority', '+1 555 100 000', 'maritime@authority.gov', true, true),
((SELECT id FROM locations WHERE name = 'Secondary Location'), 'coast_guard', 'Local Coast Guard', '+1 555 100 001', 'coastguard@authority.gov', true, true),
((SELECT id FROM locations WHERE name = 'Secondary Location'), 'hospital', 'Local General Hospital', '+1 555 100 002', 'emergency@hospital.gov', true, true);

-- Data retention policies
INSERT INTO data_retention_policies (data_type, retention_period_months, deletion_trigger, is_active) VALUES
('customer_data', 84, 'automatic', true), -- 7 years for customer data
('booking_data', 60, 'automatic', true), -- 5 years for booking data
('payment_data', 84, 'automatic', true), -- 7 years for payment data (tax requirements)
('communication_data', 36, 'automatic', true), -- 3 years for communications
('analytics_data', 24, 'automatic', true); -- 2 years for analytics data

-- Insurance providers
INSERT INTO insurance_providers (provider_name, provider_type, policy_number, coverage_amount, coverage_start_date, coverage_end_date, contact_email, contact_phone, is_active) VALUES
('DAN Insurance', 'diving_insurance', 'DAN-2024-001', 1000000.00, '2024-01-01', '2024-12-31', 'claims@dan.org', '+1 555 200 456', true),
('Equipment Insurance Co', 'equipment_insurance', 'EIC-EQ-2024-001', 500000.00, '2024-01-01', '2024-12-31', 'claims@equipmentinsurance.com', '+1 555 200 457', true),
('Liability Insurance Co', 'liability_insurance', 'LIC-LI-2024-001', 2000000.00, '2024-01-01', '2024-12-31', 'claims@liabilityinsurance.com', '+1 555 200 458', true);

-- Safety equipment certifications (sample for existing equipment)
INSERT INTO safety_equipment_certifications (equipment_id, certification_type, certification_date, expiry_date, certified_by, certification_number, next_inspection_date, is_compliant) VALUES
-- Sample certifications for existing equipment
((SELECT id FROM equipment WHERE name = 'BCD Mares' LIMIT 1), 'annual_inspection', '2024-01-15', '2025-01-15', 'Equipment Service Center', 'EQUIP-2024-001', '2025-01-15', true),
((SELECT id FROM equipment WHERE name = 'Regulator Aqualung' LIMIT 1), 'pressure_test', '2024-02-01', '2025-02-01', 'Equipment Service Center', 'EQUIP-2024-002', '2025-02-01', true),
((SELECT id FROM equipment WHERE name = 'Dive Computer' LIMIT 1), 'safety_check', '2024-03-01', '2025-03-01', 'Equipment Service Center', 'EQUIP-2024-003', '2025-03-01', true);
```

---

## 🔗 **Database Relationships**

### **Core Relationships:**
```
locations (1) ←→ (many) boats
locations (1) ←→ (many) dive_sites
locations (1) ←→ (many) equipment
locations (1) ←→ (many) staff
locations (1) ←→ (many) bookings
locations (1) ←→ (many) emergency_contacts

activities (1) ←→ (many) pricing_tiers
activities (1) ←→ (many) activity_addons
activities (1) ←→ (many) special_pricing
activities (1) ←→ (many) bookings

customers (1) ←→ (many) bookings
customers (1) ←→ (many) customer_stays
customers (1) ←→ (many) customer_certifications
customers (1) ←→ (many) customer_consents
customers (1) ←→ (many) medical_clearances
customers (1) ←→ (many) safety_briefings

boats (1) ←→ (many) bookings
dive_sites (1) ←→ (many) bookings
staff (1) ←→ (many) bookings
staff (1) ←→ (many) staff_certifications
staff (1) ←→ (many) course_bookings
```

### **Advanced Feature Relationships:**
```
certification_agencies (1) ←→ (many) courses
certification_agencies (1) ←→ (many) customer_certifications
certification_agencies (1) ←→ (many) staff_certifications

courses (1) ←→ (many) course_bookings
customer_stays (1) ←→ (many) dive_bookings
customer_stays (1) ←→ (many) bookings

government_bonos (1) ←→ (many) bono_usage
insurance_providers (1) ←→ (many) insurance_claims
equipment (1) ←→ (many) safety_equipment_certifications
```

---

## 📊 **Expected Record Counts (Day One)**

### **Core Tables:**
- **locations:** 3 records (Main, Secondary, Future)
- **boats:** 4 records (Alpha, Beta, Gamma, Delta)
- **dive_sites:** 5 records (3 main location, 2 secondary)
- **activities:** 4 records (Fun Dive, Snorkeling, Discover Scuba, OW Course)
- **equipment:** 6 records (sample diving equipment)
- **staff:** 3 records (instructor, manager, divemaster)
- **customers:** 3 records (sample customers)

### **Advanced Features:**
- **pricing_tiers:** 4 records
- **activity_addons:** 2 records
- **special_pricing:** 1 record (weekend special only - resident pricing TBD)
- **bookings:** 1 record (sample booking)
- **customer_stays:** 0 records (will grow)
- **dive_bookings:** 0 records (will grow)
- **equipment_assignments:** 0 records (will grow)
- **payments:** 0 records (will grow)
- **languages:** 5 records (es, en, de, fr, it)
- **multilingual_content:** 100+ records (translations)
- **government_bonos:** 0 records (will be added when available)
- **bono_usage:** 0 records (will grow)
- **certification_agencies:** 4 records (SSI, PADI, CMAS, VDST)
- **customer_certifications:** 0 records (will grow)
- **courses:** 20+ records (course catalog for all agencies)
- **staff_certifications:** 3 records (staff qualifications)
- **course_bookings:** 0 records (will grow)
- **maritime_incidents:** 0 records (will grow)
- **safety_equipment_certifications:** 3 records (equipment certifications)
- **weather_restrictions:** 0 records (will grow)
- **emergency_contacts:** 6 records (emergency contact information)
- **data_retention_policies:** 5 records (data retention rules)
- **customer_consents:** 0 records (will grow)
- **data_breaches:** 0 records (will grow)
- **insurance_providers:** 3 records (insurance companies)
- **insurance_claims:** 0 records (will grow)
- **medical_clearances:** 0 records (will grow)
- **safety_briefings:** 0 records (will grow)

---

## 🚀 **Database Setup Commands**

### **1. Create Database:**
```sql
CREATE DATABASE opendcms_production
    WITH 
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;
```

### **2. Create Extensions:**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### **3. Create Enums:**
```sql
-- Location types
CREATE TYPE location_type AS ENUM ('diving', 'bike_rental', 'future');

-- Activity types
CREATE TYPE activity_type AS ENUM ('diving', 'snorkeling', 'bike_rental', 'future');

-- Equipment types
CREATE TYPE equipment_type AS ENUM ('diving', 'snorkeling', 'bike', 'clothing');

-- Staff roles
CREATE TYPE staff_role AS ENUM ('manager', 'instructor', 'guide', 'reception', 'maintenance');

-- Booking status
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show');

-- Payment methods
CREATE TYPE payment_method AS ENUM ('card', 'cash', 'bank_transfer', 'stripe');

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
```

### **4. Create Tables:**
Execute all CREATE TABLE statements in order (locations first, then dependent tables).

### **5. Insert Sample Data:**
Execute all INSERT statements to populate the database with initial data.

---

## 🔧 **Database Maintenance**

### **Backup Strategy:**
```bash
# Daily backup
pg_dump opendcms_production > backup_$(date +%Y%m%d).sql

# Automated backup (cron job)
0 2 * * * pg_dump opendcms_production | gzip > /backups/opendcms_$(date +%Y%m%d).sql.gz
```

### **Performance Monitoring:**
```sql
-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;
```

---

## 📋 **Database Validation Checklist**

### **Day One Setup:**
- [ ] Database created with correct encoding
- [ ] All extensions installed
- [ ] All enums created
- [ ] All tables created successfully
- [ ] All indexes created
- [ ] Sample data inserted
- [ ] Foreign key constraints working
- [ ] Backup strategy implemented
- [ ] Performance monitoring setup
- [ ] Database user permissions configured

---

**Last Updated:** October 2025  
**Status:** Ready for Open Source Implementation  
**Next Review:** After Initial Data Load
