# DCMS Database Schema - Day One Implementation

**Project:** Multi-Site Dive Center Management System (DCMS)  
**Target:** Fuerteventura Diving Center (Caleta de Fuste, Las Playitas, Hotel Mar)  
**Database:** PostgreSQL 14+  
**Created:** October 2025

---

## 🗄️ **Database Overview**

### **Database Name:** `dcms_production`
### **Character Set:** UTF-8
### **Collation:** en_US.UTF-8
### **Timezone:** Europe/Madrid (Canary Islands)

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
('550e8400-e29b-41d4-a716-446655440001', 'Caleta de Fuste', 'diving', 
 '{"street": "Muelle Deportivo / Calle Teneriffe", "city": "Caleta de Fuste", "postal_code": "35610", "country": "Spain"}',
 '{"phone": "+34 928 163 712", "mobile": "+34 606 275 468", "fax": "+34 928 163 983", "email": "info@deep-blue-diving.com", "website": "deep-blue-diving.com"}'),
('550e8400-e29b-41d4-a716-446655440002', 'Las Playitas', 'diving',
 '{"street": "Hotel Gran Resort Las Playitas", "city": "Las Playitas", "postal_code": "35610", "country": "Spain"}',
 '{"phone": "+34 653 512 638", "email": "playitas@deep-blue-diving.com", "website": "deep-blue-diving.com"}'),
('550e8400-e29b-41d4-a716-446655440003', 'Hotel Mar', 'bike_rental',
 '{"street": "Hotel Mar", "city": "Fuerteventura", "postal_code": "35610", "country": "Spain"}',
 '{"phone": "+34 928 123 458", "email": "hotelmar@deep-blue-diving.com", "website": "deep-blue-diving.com"}');
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
('550e8400-e29b-41d4-a716-446655440001', 'White Magic', 10, '["oxygen", "first_aid", "radio", "mobile_phone", "gps", "life_jackets", "flares"]'),
('550e8400-e29b-41d4-a716-446655440001', 'Grey Magic', 10, '["oxygen", "first_aid", "radio", "mobile_phone", "gps", "life_jackets", "flares"]'),
('550e8400-e29b-41d4-a716-446655440001', 'Black Magic', 10, '["oxygen", "first_aid", "radio", "mobile_phone", "gps", "life_jackets", "flares"]'),
('550e8400-e29b-41d4-a716-446655440001', 'Blue Magic', 10, '["oxygen", "first_aid", "radio", "mobile_phone", "gps", "life_jackets", "flares"]');
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
    description TEXT,
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
-- Castillo Reef dive sites (Caleta de Fuste)
('550e8400-e29b-41d4-a716-446655440001', 'Anfiteatro', 'boat', '{"min": 12, "max": 21}', 'intermediate', '{"lat": 28.1234, "lng": -13.5678}'),
('550e8400-e29b-41d4-a716-446655440001', 'Barranco', 'boat', '{"min": 12, "max": 23}', 'intermediate', '{"lat": 28.1245, "lng": -13.5689}'),
('550e8400-e29b-41d4-a716-446655440001', 'Fortaleza', 'boat', '{"min": 3, "max": 24}', 'intermediate', '{"lat": 28.1256, "lng": -13.5700}'),
('550e8400-e29b-41d4-a716-446655440001', 'Mole (cementerio de barco)', 'boat', '{"min": 7, "max": 7}', 'beginner', '{"lat": 28.1267, "lng": -13.5711}'),

-- Salinas Reef dive sites (Caleta de Fuste)
('550e8400-e29b-41d4-a716-446655440001', 'La Emboscada', 'boat', '{"min": 7, "max": 40}', 'advanced', '{"lat": 28.1278, "lng": -13.5722}'),
('550e8400-e29b-41d4-a716-446655440001', 'Camino de altura', 'boat', '{"min": 7, "max": 40}', 'advanced', '{"lat": 28.1289, "lng": -13.5733}'),
('550e8400-e29b-41d4-a716-446655440001', 'El Muellito', 'boat', '{"min": 7, "max": 40}', 'advanced', '{"lat": 28.1300, "lng": -13.5744}'),
('550e8400-e29b-41d4-a716-446655440001', 'El Tazar', 'boat', '{"min": 12, "max": 35}', 'advanced', '{"lat": 28.1311, "lng": -13.5755}'),
('550e8400-e29b-41d4-a716-446655440001', 'Tesoro negro', 'boat', '{"min": 12, "max": 30}', 'advanced', '{"lat": 28.1322, "lng": -13.5766}'),
('550e8400-e29b-41d4-a716-446655440001', 'El Portal', 'boat', '{"min": 12, "max": 35}', 'advanced', '{"lat": 28.1333, "lng": -13.5777}'),
('550e8400-e29b-41d4-a716-446655440001', 'El Mirador', 'boat', '{"min": 12, "max": 38}', 'advanced', '{"lat": 28.1344, "lng": -13.5788}'),
('550e8400-e29b-41d4-a716-446655440001', 'El Laberinto', 'boat', '{"min": 12, "max": 38}', 'advanced', '{"lat": 28.1355, "lng": -13.5799}'),
('550e8400-e29b-41d4-a716-446655440001', 'La Pirámide', 'boat', '{"min": 14, "max": 39}', 'advanced', '{"lat": 28.1366, "lng": -13.5810}'),
('550e8400-e29b-41d4-a716-446655440001', 'El Monasterio', 'boat', '{"min": 14, "max": 36}', 'advanced', '{"lat": 28.1377, "lng": -13.5821}'),

-- Nuevo Horizonte Reef dive sites (Caleta de Fuste)
('550e8400-e29b-41d4-a716-446655440001', 'Nuevo Horizonte', 'boat', '{"min": 24, "max": 39}', 'expert', '{"lat": 28.1388, "lng": -13.5832}'),

-- Las Playitas dive sites
('550e8400-e29b-41d4-a716-446655440002', 'Las Playitas', 'shore', '{"min": 3, "max": 15}', 'beginner', '{"lat": 28.1567, "lng": -13.5901}'),
('550e8400-e29b-41d4-a716-446655440002', 'Gran Trajaral', 'shore', '{"min": 5, "max": 20}', 'intermediate', '{"lat": 28.1678, "lng": -13.6012}');
```

---

### **4. ACTIVITIES**
**Purpose:** Define all available activities and their configurations

```sql
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type ENUM('diving', 'snorkeling', 'bike_rental', 'future') NOT NULL,
    category VARCHAR(50) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    min_participants INTEGER DEFAULT 1 CHECK (min_participants > 0),
    max_participants INTEGER CHECK (max_participants > 0),
    available_locations JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    equipment_requirements JSONB DEFAULT '[]',
    special_options JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_active ON activities(is_active);
```

**Sample Data:**
```sql
INSERT INTO activities (name, type, category, base_price, duration_minutes, max_participants, available_locations) VALUES
('Fun Dive', 'diving', 'boat_dive', 46.00, 120, 12, '["550e8400-e29b-41d4-a716-446655440001"]'),
('Shore Dive', 'diving', 'shore_dive', 35.00, 90, 8, '["550e8400-e29b-41d4-a716-446655440002"]'),
('Snorkeling Tour', 'snorkeling', 'boat_tour', 38.00, 90, 15, '["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]'),
('Discover Scuba', 'diving', 'course', 100.00, 180, 4, '["550e8400-e29b-41d4-a716-446655440001"]'),
('Open Water Course', 'diving', 'course', 465.00, 1440, 4, '["550e8400-e29b-41d4-a716-446655440001"]');
```

---

### **5. PRICING_TIERS**
**Purpose:** Volume discount pricing configuration

```sql
CREATE TABLE pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    min_quantity INTEGER NOT NULL CHECK (min_quantity > 0),
    max_quantity INTEGER CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
    price_per_unit DECIMAL(10,2) NOT NULL CHECK (price_per_unit >= 0),
    discount_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (discount_percentage >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pricing_tiers_activity ON pricing_tiers(activity_id);
CREATE INDEX idx_pricing_tiers_quantity ON pricing_tiers(min_quantity, max_quantity);
```

**Sample Data:**
```sql
INSERT INTO pricing_tiers (activity_id, min_quantity, max_quantity, price_per_unit, discount_percentage) VALUES
-- Fun Dive volume discounts
((SELECT id FROM activities WHERE name = 'Fun Dive'), 1, 2, 46.00, 0.00),
((SELECT id FROM activities WHERE name = 'Fun Dive'), 3, 5, 44.00, 4.35),
((SELECT id FROM activities WHERE name = 'Fun Dive'), 6, 8, 42.00, 8.70),
((SELECT id FROM activities WHERE name = 'Fun Dive'), 9, NULL, 38.00, 17.39);
```

---

### **6. ACTIVITY_ADDONS**
**Purpose:** Specialty services and add-ons

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
```

**Sample Data:**
```sql
INSERT INTO activity_addons (activity_id, name, additional_price, equipment_included, requirements) VALUES
((SELECT id FROM activities WHERE name = 'Fun Dive'), 'Night Dive', 20.00, '["torch"]', '["AOW"]'),
((SELECT id FROM activities WHERE name = 'Fun Dive'), 'Personal Instructor', 100.00, '["all"]', '["any"]');
```

---

### **6.1. SPECIAL_PRICING**
**Purpose:** Special pricing rules for specific conditions (weekend specials, experienced divers, etc.)

```sql
CREATE TABLE special_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price_override DECIMAL(10,2), -- NULL means use base price with discount
    discount_percentage DECIMAL(5,2), -- NULL means use fixed price
    conditions JSONB NOT NULL, -- {"day_of_week": ["saturday", "sunday"], "time_slot": "10:15", "experience_level": "experienced", "no_guide_required": true}
    requirements JSONB DEFAULT '[]', -- ["experienced", "no_guide_required"]
    equipment_included JSONB DEFAULT '[]',
    max_participants INTEGER,
    is_active BOOLEAN DEFAULT true,
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
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
-- Weekend Special for Experienced Divers (Known pricing)
((SELECT id FROM activities WHERE name = 'Fun Dive'), 'Weekend Special - Experienced Divers', NULL, NULL,
 '{"day_of_week": ["saturday", "sunday"], "time_slot": "10:15", "experience_level": "experienced", "no_guide_required": true, "boat_required": true}',
 '["experienced", "no_guide_required", "advanced_certification"], 8);

-- Note: Resident pricing will be added later when pricing is determined
-- INSERT INTO special_pricing (activity_id, name, discount_percentage, conditions, requirements) VALUES
-- ((SELECT id FROM activities WHERE name = 'Fun Dive'), 'Canary Islands Resident Discount', 20.00,
--  '{"residency": "canary_islands", "document_required": "residencia"}',
--  '["canary_resident", "valid_residencia"]');
```

---

### **7. EQUIPMENT**
**Purpose:** Equipment inventory by location

```sql
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type ENUM('diving', 'snorkeling', 'bike', 'clothing', 'own_equipment') NOT NULL,
    category VARCHAR(50) NOT NULL,
    size VARCHAR(20),
    condition ENUM('excellent', 'good', 'fair', 'poor', 'maintenance') DEFAULT 'good',
    maintenance_due DATE,
    is_available BOOLEAN DEFAULT true,
    barcode VARCHAR(50) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_equipment_location ON equipment(location_id);
CREATE INDEX idx_equipment_type ON equipment(type);
CREATE INDEX idx_equipment_available ON equipment(is_available);
CREATE INDEX idx_equipment_barcode ON equipment(barcode);
```

**Sample Data:**
```sql
INSERT INTO equipment (location_id, name, type, category, size, barcode) VALUES
-- Diving equipment for Caleta de Fuste (Deep Blue Diving inventory)
-- Wetsuits (approximately 120 suits)
('550e8400-e29b-41d4-a716-446655440001', 'Wetsuit 3mm', 'diving', 'wetsuit', 'XS', 'WET001'),
('550e8400-e29b-41d4-a716-446655440001', 'Wetsuit 3mm', 'diving', 'wetsuit', 'S', 'WET002'),
('550e8400-e29b-41d4-a716-446655440001', 'Wetsuit 3mm', 'diving', 'wetsuit', 'M', 'WET003'),
('550e8400-e29b-41d4-a716-446655440001', 'Wetsuit 3mm', 'diving', 'wetsuit', 'L', 'WET004'),
('550e8400-e29b-41d4-a716-446655440001', 'Wetsuit 3mm', 'diving', 'wetsuit', 'XL', 'WET005'),
('550e8400-e29b-41d4-a716-446655440001', 'Wetsuit 5mm', 'diving', 'wetsuit', 'M', 'WET006'),

-- BCDs (approximately 80 BCDs)
('550e8400-e29b-41d4-a716-446655440001', 'BCD', 'diving', 'BCD', 'XS', 'BCD001'),
('550e8400-e29b-41d4-a716-446655440001', 'BCD', 'diving', 'BCD', 'S', 'BCD002'),
('550e8400-e29b-41d4-a716-446655440001', 'BCD', 'diving', 'BCD', 'M', 'BCD003'),
('550e8400-e29b-41d4-a716-446655440001', 'BCD', 'diving', 'BCD', 'L', 'BCD004'),
('550e8400-e29b-41d4-a716-446655440001', 'BCD', 'diving', 'BCD', 'XL', 'BCD005'),

-- Regulators (approximately 80 regulators)
('550e8400-e29b-41d4-a716-446655440001', 'Regulator', 'diving', 'regulator', 'One Size', 'REG001'),
('550e8400-e29b-41d4-a716-446655440001', 'Regulator', 'diving', 'regulator', 'One Size', 'REG002'),
('550e8400-e29b-41d4-a716-446655440001', 'Regulator', 'diving', 'regulator', 'One Size', 'REG003'),

-- Steel tanks (5 to 15 litres, approximately 150 tanks)
('550e8400-e29b-41d4-a716-446655440001', 'Steel Tank 5L', 'diving', 'tank', '5L', 'TANK001'),
('550e8400-e29b-41d4-a716-446655440001', 'Steel Tank 10L', 'diving', 'tank', '10L', 'TANK002'),
('550e8400-e29b-41d4-a716-446655440001', 'Steel Tank 12L', 'diving', 'tank', '12L', 'TANK003'),
('550e8400-e29b-41d4-a716-446655440001', 'Steel Tank 15L', 'diving', 'tank', '15L', 'TANK004'),

-- Additional equipment
('550e8400-e29b-41d4-a716-446655440001', 'Dive Computer', 'diving', 'computer', 'One Size', 'COMP001'),
('550e8400-e29b-41d4-a716-446655440001', 'Torch', 'diving', 'torch', 'One Size', 'TORCH001'),
('550e8400-e29b-41d4-a716-446655440001', 'Mask', 'diving', 'mask', 'One Size', 'MASK001'),
('550e8400-e29b-41d4-a716-446655440001', 'Fins', 'diving', 'fins', 'S', 'FINS001'),
('550e8400-e29b-41d4-a716-446655440001', 'Fins', 'diving', 'fins', 'M', 'FINS002'),
('550e8400-e29b-41d4-a716-446655440001', 'Fins', 'diving', 'fins', 'L', 'FINS003'),

-- Own Equipment (OE) cases for divers bringing their own equipment
('550e8400-e29b-41d4-a716-446655440001', 'Own Equipment - Complete Set', 'diving', 'own_equipment', 'Complete', 'OE001'),
('550e8400-e29b-41d4-a716-446655440001', 'Own Equipment - Partial Set', 'diving', 'own_equipment', 'Partial', 'OE002'),
('550e8400-e29b-41d4-a716-446655440001', 'Own Equipment - No Equipment', 'diving', 'own_equipment', 'None', 'OE003');
```

---

### **8. CUSTOMERS**
**Purpose:** Unified customer profiles across all locations

```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    personal_info JSONB NOT NULL, -- {"first_name": "John", "last_name": "Smith", "date_of_birth": "1990-01-01", "nationality": "UK"}
    residency_info JSONB DEFAULT '{}', -- {"residency_type": "tourist", "residencia_number": "12345678", "valid_until": "2025-12-31", "document_verified": true}
    diving_certifications JSONB DEFAULT '[]', -- [{"cert": "OW", "agency": "PADI", "date": "2020-01-01"}]
    medical_clearance JSONB DEFAULT '{}', -- {"valid_until": "2025-12-31", "doctor": "Dr. Smith"}
    preferences JSONB DEFAULT '{}',
    loyalty_points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_active ON customers(is_active);
CREATE INDEX idx_customers_residency ON customers USING GIN (residency_info);
```

**Sample Data:**
```sql
INSERT INTO customers (email, phone, personal_info, residency_info, diving_certifications, loyalty_points) VALUES
-- Tourist customer
('john.smith@email.com', '+44 7700 900123', 
 '{"first_name": "John", "last_name": "Smith", "date_of_birth": "1985-03-15", "nationality": "UK"}',
 '{"residency_type": "tourist", "document_verified": false}',
 '[{"cert": "AOW", "agency": "PADI", "date": "2020-06-15"}]', 1240),

-- Canary Islands resident
('maria.garcia@email.com', '+34 600 123 456',
 '{"first_name": "Maria", "last_name": "Garcia", "date_of_birth": "1992-08-22", "nationality": "Spain"}',
 '{"residency_type": "canary_resident", "residencia_number": "12345678", "valid_until": "2025-12-31", "document_verified": true}',
 '[{"cert": "OW", "agency": "SSI", "date": "2023-04-10"}]', 650),

-- Another Canary Islands resident
('carlos.rodriguez@email.com', '+34 600 789 012',
 '{"first_name": "Carlos", "last_name": "Rodriguez", "date_of_birth": "1988-11-05", "nationality": "Spain"}',
 '{"residency_type": "canary_resident", "residencia_number": "87654321", "valid_until": "2026-06-30", "document_verified": true}',
 '[{"cert": "AOW", "agency": "PADI", "date": "2021-03-20"}]', 890);
```

---

### **9. STAFF**
**Purpose:** Staff members and their qualifications by location

```sql
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    role ENUM('manager', 'instructor', 'guide', 'reception', 'maintenance') NOT NULL,
    certifications JSONB DEFAULT '[]',
    schedule JSONB DEFAULT '{}',
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
INSERT INTO staff (location_id, name, role, certifications) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Carlos Rodriguez', 'instructor', 
 '[{"cert": "MSDT", "agency": "PADI", "date": "2018-03-15"}]'),
('550e8400-e29b-41d4-a716-446655440001', 'Ana Martinez', 'guide',
 '[{"cert": "DM", "agency": "PADI", "date": "2020-08-20"}]'),
('550e8400-e29b-41d4-a716-446655440002', 'Maria Lopez', 'instructor',
 '[{"cert": "OWSI", "agency": "SSI", "date": "2019-05-10"}]');
```

---

### **10. BOOKINGS**
**Purpose:** All bookings across locations and activities

```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    boat_id UUID REFERENCES boats(id) ON DELETE SET NULL,
    dive_site_id UUID REFERENCES dive_sites(id) ON DELETE SET NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    participants INTEGER NOT NULL CHECK (participants > 0),
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0), -- Number of dives/activities
    base_price DECIMAL(10,2) NOT NULL,
    addon_price DECIMAL(10,2) DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show') DEFAULT 'pending',
    special_requirements JSONB DEFAULT '{}',
    addons_selected JSONB DEFAULT '[]',
    -- Government bono support
    bono_id UUID REFERENCES government_bonos(id),
    government_payment DECIMAL(10,2) DEFAULT 0,
    customer_payment DECIMAL(10,2) DEFAULT 0,
    -- Individual dive tracking
    dive_sequence INTEGER, -- 1st, 2nd, 3rd dive in stay
    stay_id UUID REFERENCES customer_stays(id), -- Link to stay for volume discounts
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_location ON bookings(location_id);
CREATE INDEX idx_bookings_activity ON bookings(activity_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_stay ON bookings(stay_id);
CREATE INDEX idx_bookings_bono ON bookings(bono_id);
```

### **10.1. CUSTOMER_STAYS**
**Purpose:** Track individual customer stays for volume discount calculation

```sql
CREATE TABLE customer_stays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    stay_start DATE NOT NULL,
    stay_end DATE,
    total_dives INTEGER DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    deposit_paid DECIMAL(10,2) DEFAULT 0,
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customer_stays_customer ON customer_stays(customer_id);
CREATE INDEX idx_customer_stays_status ON customer_stays(status);
CREATE INDEX idx_customer_stays_dates ON customer_stays(stay_start, stay_end);
```

**Sample Data:**
```sql
INSERT INTO bookings (customer_id, location_id, activity_id, boat_id, dive_site_id, booking_date, start_time, duration_minutes, participants, quantity, base_price, total_price, status) VALUES
((SELECT id FROM customers WHERE email = 'john.smith@email.com'),
 (SELECT id FROM locations WHERE name = 'Caleta de Fuste'),
 (SELECT id FROM activities WHERE name = 'Fun Dive'),
 (SELECT id FROM boats WHERE name = 'White Magic'),
 (SELECT id FROM dive_sites WHERE name = 'Anfiteatro'),
 '2025-03-15', '09:00:00', 120, 1, 1, 46.00, 46.00, 'confirmed');
```

---

### **11. DIVE_LOGS**
**Purpose:** Compliance tracking for dive activities

```sql
CREATE TABLE dive_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,
    dive_date DATE NOT NULL,
    entry_time TIME NOT NULL,
    exit_time TIME NOT NULL,
    max_depth DECIMAL(5,2) NOT NULL CHECK (max_depth > 0),
    bottom_time INTEGER NOT NULL CHECK (bottom_time > 0),
    guide_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    equipment_used JSONB DEFAULT '[]',
    conditions JSONB DEFAULT '{}', -- {"visibility": "good", "current": "moderate", "temperature": 22}
    compliance_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dive_logs_booking ON dive_logs(booking_id);
CREATE INDEX idx_dive_logs_customer ON dive_logs(customer_id);
CREATE INDEX idx_dive_logs_date ON dive_logs(dive_date);
CREATE INDEX idx_dive_logs_location ON dive_logs(location_id);
```

---

### **12. EQUIPMENT_ASSIGNMENTS**
**Purpose:** Track equipment assigned to bookings

```sql
CREATE TABLE equipment_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    returned_at TIMESTAMP WITH TIME ZONE,
    condition_before ENUM('excellent', 'good', 'fair', 'poor') NOT NULL,
    condition_after ENUM('excellent', 'good', 'fair', 'poor'),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_equipment_assignments_booking ON equipment_assignments(booking_id);
CREATE INDEX idx_equipment_assignments_equipment ON equipment_assignments(equipment_id);
CREATE INDEX idx_equipment_assignments_returned ON equipment_assignments(returned_at);
```

---

### **13. PAYMENTS**
**Purpose:** Payment tracking and processing

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_method ENUM('card', 'cash', 'bank_transfer', 'stripe') NOT NULL,
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255),
    transaction_id VARCHAR(255),
    payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_date ON payments(payment_date);
```

---

## 💰 **Pricing Calculation Functions**

### **Function: Calculate Booking Price**
```sql
CREATE OR REPLACE FUNCTION calculate_booking_price(
    p_activity_id UUID,
    p_quantity INTEGER,
    p_booking_date DATE,
    p_start_time TIME,
    p_customer_id UUID,
    p_addons JSONB DEFAULT '[]'
) RETURNS TABLE(
    base_price DECIMAL(10,2),
    special_price DECIMAL(10,2),
    addon_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    pricing_applied VARCHAR(100)
) AS $$
DECLARE
    v_base_price DECIMAL(10,2);
    v_special_price DECIMAL(10,2);
    v_addon_price DECIMAL(10,2);
    v_total_price DECIMAL(10,2);
    v_pricing_type VARCHAR(100);
    v_day_of_week VARCHAR(20);
    v_customer_residency VARCHAR(50);
    v_customer_experience VARCHAR(50);
    v_special_pricing_record RECORD;
BEGIN
    -- Get customer information
    SELECT 
        COALESCE(c.residency_info->>'residency_type', 'tourist'),
        CASE 
            WHEN EXISTS(SELECT 1 FROM jsonb_array_elements(c.diving_certifications) cert 
                       WHERE cert->>'cert' IN ('AOW', 'Rescue', 'DM', 'Instructor'))
            THEN 'experienced'
            ELSE 'beginner'
        END
    INTO v_customer_residency, v_customer_experience
    FROM customers c
    WHERE c.id = p_customer_id;
    
    -- Get day of week
    v_day_of_week := LOWER(TO_CHAR(p_booking_date, 'Day'));
    
    -- Get base price from volume tiers
    SELECT price_per_unit INTO v_base_price
    FROM pricing_tiers pt
    WHERE pt.activity_id = p_activity_id
      AND pt.is_active = true
      AND p_quantity >= pt.min_quantity
      AND (pt.max_quantity IS NULL OR p_quantity <= pt.max_quantity)
    ORDER BY pt.min_quantity DESC
    LIMIT 1;
    
    -- Check for special pricing (weekend special, resident discount, etc.)
    SELECT sp.price_override, sp.discount_percentage, sp.name
    INTO v_special_pricing_record
    FROM special_pricing sp
    WHERE sp.activity_id = p_activity_id
      AND sp.is_active = true
      AND p_booking_date >= sp.valid_from
      AND (sp.valid_until IS NULL OR p_booking_date <= sp.valid_until)
      AND (
          -- Weekend special conditions
          (sp.conditions->>'day_of_week' ? v_day_of_week 
           AND sp.conditions->>'time_slot' = p_start_time::TEXT
           AND sp.conditions->>'experience_level' = v_customer_experience)
          OR
          -- Resident discount conditions
          (sp.conditions->>'residency' = 'canary_islands' 
           AND v_customer_residency = 'canary_resident')
      )
    ORDER BY 
        CASE WHEN sp.conditions->>'residency' = 'canary_islands' THEN 1 ELSE 2 END,
        sp.created_at DESC
    LIMIT 1;
    
    -- Calculate special price
    IF v_special_pricing_record.price_override IS NOT NULL THEN
        v_special_price := v_special_pricing_record.price_override;
        v_pricing_type := v_special_pricing_record.name;
    ELSIF v_special_pricing_record.discount_percentage IS NOT NULL THEN
        v_special_price := v_base_price * (1 - v_special_pricing_record.discount_percentage / 100);
        v_pricing_type := v_special_pricing_record.name;
    ELSE
        v_special_price := v_base_price;
        v_pricing_type := 'Standard Volume Pricing';
    END IF;
    
    -- Calculate addon prices
    SELECT COALESCE(SUM(aa.additional_price), 0) INTO v_addon_price
    FROM activity_addons aa
    WHERE aa.activity_id = p_activity_id
      AND aa.is_active = true
      AND aa.id = ANY(SELECT jsonb_array_elements_text(p_addons)::UUID);
    
    -- Calculate total price
    v_total_price := (v_special_price + v_addon_price) * p_quantity;
    
    RETURN QUERY SELECT v_base_price, v_special_price, v_addon_price, v_total_price, v_pricing_type;
END;
$$ LANGUAGE plpgsql;
```

### **Function: Get Weekend Special Price**
```sql
CREATE OR REPLACE FUNCTION get_weekend_special_price(
    p_activity_id UUID,
    p_booking_date DATE,
    p_start_time TIME
) RETURNS TABLE(
    special_price DECIMAL(10,2),
    conditions JSONB,
    requirements JSONB
) AS $$
DECLARE
    v_day_of_week VARCHAR(20);
BEGIN
    v_day_of_week := LOWER(TO_CHAR(p_booking_date, 'Day'));
    
    RETURN QUERY
    SELECT sp.price_override, sp.conditions, sp.requirements
    FROM special_pricing sp
    WHERE sp.activity_id = p_activity_id
      AND sp.is_active = true
      AND p_booking_date >= sp.valid_from
      AND (sp.valid_until IS NULL OR p_booking_date <= sp.valid_until)
      AND sp.conditions->>'day_of_week' ? v_day_of_week
      AND sp.conditions->>'time_slot' = p_start_time::TEXT
      AND sp.name ILIKE '%weekend%special%';
END;
$$ LANGUAGE plpgsql;
```

### **Function: Get Resident Pricing**
```sql
CREATE OR REPLACE FUNCTION get_resident_pricing(
    p_activity_id UUID,
    p_customer_id UUID
) RETURNS TABLE(
    discount_percentage DECIMAL(5,2),
    conditions JSONB,
    requirements JSONB,
    is_eligible BOOLEAN
) AS $$
DECLARE
    v_customer_residency VARCHAR(50);
    v_residencia_valid BOOLEAN;
BEGIN
    -- Get customer residency information
    SELECT 
        COALESCE(c.residency_info->>'residency_type', 'tourist'),
        (c.residency_info->>'document_verified')::BOOLEAN
    INTO v_customer_residency, v_residencia_valid
    FROM customers c
    WHERE c.id = p_customer_id;
    
    -- Check if customer is eligible for resident pricing
    IF v_customer_residency = 'canary_resident' AND v_residencia_valid = true THEN
        RETURN QUERY
        SELECT sp.discount_percentage, sp.conditions, sp.requirements, true
        FROM special_pricing sp
        WHERE sp.activity_id = p_activity_id
          AND sp.is_active = true
          AND CURRENT_DATE >= sp.valid_from
          AND (sp.valid_until IS NULL OR CURRENT_DATE <= sp.valid_until)
          AND sp.conditions->>'residency' = 'canary_islands'
          AND sp.name ILIKE '%resident%';
    ELSE
        RETURN QUERY
        SELECT NULL::DECIMAL(5,2), NULL::JSONB, NULL::JSONB, false;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### **Example Usage:**
```sql
-- Check weekend special pricing for experienced diver
SELECT * FROM get_weekend_special_price(
    (SELECT id FROM activities WHERE name = 'Fun Dive'),
    '2025-03-15', -- Saturday
    '10:15:00'
);

-- Check resident pricing for Canary Islands resident
SELECT * FROM get_resident_pricing(
    (SELECT id FROM activities WHERE name = 'Fun Dive'),
    (SELECT id FROM customers WHERE email = 'maria.garcia@email.com')
);

-- Calculate full booking price for tourist (standard pricing)
SELECT * FROM calculate_booking_price(
    (SELECT id FROM activities WHERE name = 'Fun Dive'),
    1, -- quantity
    '2025-03-15', -- Saturday
    '09:00:00', -- regular time
    (SELECT id FROM customers WHERE email = 'john.smith@email.com'), -- tourist
    '[]' -- no addons
);

-- Calculate full booking price for Canary Islands resident (20% discount)
SELECT * FROM calculate_booking_price(
    (SELECT id FROM activities WHERE name = 'Fun Dive'),
    1, -- quantity
    '2025-03-15', -- Saturday
    '09:00:00', -- regular time
    (SELECT id FROM customers WHERE email = 'maria.garcia@email.com'), -- resident
    '[]' -- no addons
);

-- Calculate full booking price for experienced diver on weekend special
SELECT * FROM calculate_booking_price(
    (SELECT id FROM activities WHERE name = 'Fun Dive'),
    1, -- quantity
    '2025-03-15', -- Saturday
    '10:15:00', -- weekend special time
    (SELECT id FROM customers WHERE email = 'carlos.rodriguez@email.com'), -- experienced resident
    '[]' -- no addons
);
```

---

## 🌍 **Multilingual System Support**

### **Language Configuration:**
```sql
-- Language configuration
CREATE TABLE languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(5) NOT NULL UNIQUE, -- es, en, de, fr, it
    name VARCHAR(50) NOT NULL,
    native_name VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_admin_language BOOLEAN DEFAULT false,
    is_customer_language BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert supported languages
INSERT INTO languages (code, name, native_name, is_admin_language, is_customer_language) VALUES
('es', 'Spanish', 'Español', true, true),
('en', 'English', 'English', true, true),
('de', 'German', 'Deutsch', true, true),
('fr', 'French', 'Français', false, true),
('it', 'Italian', 'Italiano', false, true);

-- Multilingual content tables
CREATE TABLE multilingual_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_key VARCHAR(100) NOT NULL,
    language_code VARCHAR(5) NOT NULL REFERENCES languages(code),
    content_text TEXT NOT NULL,
    content_type ENUM('label', 'description', 'help_text', 'error_message') DEFAULT 'label',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(content_key, language_code)
);
```

---

## 🏝️ **Government Bono System**

### **Government Bono Management:**
```sql
-- Government bono codes and vouchers
CREATE TABLE government_bonos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    type ENUM('discount_code', 'full_voucher') NOT NULL,
    discount_percentage DECIMAL(5,2), -- NULL for full vouchers
    is_full_payment BOOLEAN DEFAULT false,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    government_reference VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bono usage tracking
CREATE TABLE bono_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bono_id UUID NOT NULL REFERENCES government_bonos(id),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    government_payment DECIMAL(10,2) NOT NULL,
    customer_payment DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🏊 **Multi-Agency Certification System**

### **Certification Agencies:**
```sql
-- Certification agencies with priority
CREATE TABLE certification_agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL, -- SSI, PADI, CMAS, VDST
    priority INTEGER NOT NULL, -- 1 = primary, 2 = secondary
    api_endpoint VARCHAR(255),
    api_key_required BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    is_primary_agency BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert agencies with correct priority - ALL ACTIVE FROM DAY ONE
-- NOTE: Agencies don't provide public APIs - using portal integration instead
INSERT INTO certification_agencies (name, code, priority, is_primary_agency, is_active, api_endpoint, api_key_required) VALUES
('Scuba Schools International', 'SSI', 1, true, true, 'https://www.divessi.com/verify-certification', false),
('Professional Association of Diving Instructors', 'PADI', 2, false, true, 'https://www.padi.com/padi-check', false),
('Confédération Mondiale des Activités Subaquatiques', 'CMAS', 2, false, true, NULL, false),
('Verband Deutscher Sporttaucher', 'VDST', 2, false, true, 'https://www.vdst.de', false);

-- Enhanced customer certifications
CREATE TABLE customer_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
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

-- Course catalog for all agencies
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

-- Staff certifications and qualifications
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

-- Course bookings and enrollments
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

## 🎓 **Course & Certification Management System**

### **Course Catalog for All Agencies:**

```sql
-- SSI Courses (Primary Agency)
INSERT INTO courses (agency_id, course_code, course_name, course_type, prerequisite_courses, min_age, min_dives, duration_hours, max_students, base_price, equipment_included) VALUES
-- Recreational Courses
((SELECT id FROM certification_agencies WHERE code = 'SSI'), 'OW', 'Open Water Diver', 'recreational', '[]', 10, 0, 30, 8, 465.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'SSI'), 'AOW', 'Advanced Open Water', 'recreational', '["OW"]', 12, 24, 20, 6, 350.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'SSI'), 'RESCUE', 'Rescue Diver', 'recreational', '["AOW"]', 15, 40, 25, 4, 400.00, '["full_set_diving", "manual", "certification_card"]'),
-- Professional Courses
((SELECT id FROM certification_agencies WHERE code = 'SSI'), 'DM', 'Divemaster', 'professional', '["RESCUE"]', 18, 60, 40, 4, 800.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'SSI'), 'INSTRUCTOR', 'Open Water Instructor', 'professional', '["DM"]', 18, 100, 60, 4, 1200.00, '["full_set_diving", "manual", "certification_card"]'),
-- Specialty Courses
((SELECT id FROM certification_agencies WHERE code = 'SSI'), 'NIGHT', 'Night Diving', 'specialty', '["OW"]', 12, 20, 8, 6, 150.00, '["full_set_diving", "torch", "manual"]'),
((SELECT id FROM certification_agencies WHERE code = 'SSI'), 'DEEP', 'Deep Diving', 'specialty', '["AOW"]', 15, 30, 10, 6, 180.00, '["full_set_diving", "manual"]');

-- PADI Courses (Secondary Agency)
INSERT INTO courses (agency_id, course_code, course_name, course_type, prerequisite_courses, min_age, min_dives, duration_hours, max_students, base_price, equipment_included) VALUES
((SELECT id FROM certification_agencies WHERE code = 'PADI'), 'OW', 'Open Water Diver', 'recreational', '[]', 10, 0, 30, 8, 450.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'PADI'), 'AOW', 'Advanced Open Water', 'recreational', '["OW"]', 12, 24, 20, 6, 340.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'PADI'), 'RESCUE', 'Rescue Diver', 'recreational', '["AOW"]', 15, 40, 25, 4, 380.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'PADI'), 'DM', 'Divemaster', 'professional', '["RESCUE"]', 18, 60, 40, 4, 750.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'PADI'), 'INSTRUCTOR', 'Open Water Instructor', 'professional', '["DM"]', 18, 100, 60, 4, 1100.00, '["full_set_diving", "manual", "certification_card"]');

-- CMAS Courses (Secondary Agency)
INSERT INTO courses (agency_id, course_code, course_name, course_type, prerequisite_courses, min_age, min_dives, duration_hours, max_students, base_price, equipment_included) VALUES
((SELECT id FROM certification_agencies WHERE code = 'CMAS'), '1STAR', '1 Star Diver', 'recreational', '[]', 14, 0, 25, 8, 400.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'CMAS'), '2STAR', '2 Star Diver', 'recreational', '["1STAR"]', 16, 20, 30, 6, 500.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'CMAS'), '3STAR', '3 Star Diver', 'recreational', '["2STAR"]', 18, 50, 40, 4, 700.00, '["full_set_diving", "manual", "certification_card"]'),
((SELECT id FROM certification_agencies WHERE code = 'CMAS'), 'INSTRUCTOR', 'CMAS Instructor', 'professional', '["3STAR"]', 18, 100, 60, 4, 1000.00, '["full_set_diving", "manual", "certification_card"]');

-- VDST Courses (Secondary Agency - German)
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
-- Carlos Gomez (Caleta de Fuste) - SSI Instructor
((SELECT id FROM staff WHERE email = 'carlos.gomez@divecenter.com'), 
 (SELECT id FROM certification_agencies WHERE code = 'SSI'), 
 'Open Water Instructor', 'SSI-INS-12345', '2020-03-15', '2025-03-15', 'INS-12345', 
 '["Night Diving", "Deep Diving", "Rescue Diver"]'),

-- Maria Fernandez (Las Playitas) - SSI Divemaster
((SELECT id FROM staff WHERE email = 'maria.fernandez@divecenter.com'), 
 (SELECT id FROM certification_agencies WHERE code = 'SSI'), 
 'Divemaster', 'SSI-DM-67890', '2021-06-20', '2026-06-20', NULL, 
 '["Rescue Diver", "Night Diving"]'),

-- Ana Lopez (Caleta de Fuste) - PADI Instructor (Secondary)
((SELECT id FROM staff WHERE email = 'ana.lopez@divecenter.com'), 
 (SELECT id FROM certification_agencies WHERE code = 'PADI'), 
 'Open Water Instructor', 'PADI-INS-54321', '2019-08-10', '2024-08-10', 'INS-54321', 
 '["Rescue Diver", "Emergency First Response"]');
```

### **Course Management Features:**

#### **1. Course Scheduling:**
- **Multi-Agency Support:** Schedule courses from any agency
- **Instructor Assignment:** Assign qualified instructors based on certifications
- **Prerequisite Validation:** Automatic checking of course prerequisites
- **Capacity Management:** Track student limits and availability

#### **2. Student Progress Tracking:**
- **Course Progress:** Track completion of course modules
- **Skill Assessments:** Record practical and theoretical assessments
- **Certification Issuance:** Generate and track certification numbers
- **Payment Tracking:** Monitor deposits and final payments

#### **3. Staff Development:**
- **Certification Tracking:** Monitor staff certification renewals
- **Specialty Training:** Track specialized instructor qualifications
- **Instructor Development:** Plan and track instructor training programs
- **Performance Monitoring:** Track instructor performance and student outcomes

---

## ⚖️ **Regulatory Compliance System (CRITICAL PRIORITY)**

### **Spanish Maritime Regulations Compliance:**

```sql
-- Maritime incident reporting
CREATE TABLE maritime_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id),
    incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
    incident_type ENUM('equipment_failure', 'medical_emergency', 'weather_related', 'safety_violation', 'other') NOT NULL,
    severity ENUM('minor', 'moderate', 'major', 'critical') NOT NULL,
    description TEXT NOT NULL,
    involved_staff JSONB DEFAULT '[]', -- Array of staff IDs
    involved_customers JSONB DEFAULT '[]', -- Array of customer IDs
    equipment_involved JSONB DEFAULT '[]', -- Array of equipment IDs
    weather_conditions JSONB, -- Weather data at time of incident
    actions_taken TEXT,
    reported_to_authorities BOOLEAN DEFAULT false,
    authority_report_id VARCHAR(100),
    authority_report_date TIMESTAMP WITH TIME ZONE,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    created_by UUID NOT NULL REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safety equipment certification tracking
CREATE TABLE safety_equipment_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    certification_type ENUM('annual_inspection', 'pressure_test', 'safety_check', 'maintenance') NOT NULL,
    certification_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    certified_by VARCHAR(100) NOT NULL,
    certification_number VARCHAR(100),
    next_inspection_date DATE NOT NULL,
    is_compliant BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weather monitoring and dive restrictions
CREATE TABLE weather_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id),
    restriction_date DATE NOT NULL,
    weather_condition ENUM('high_winds', 'rough_seas', 'poor_visibility', 'storm_warning', 'other') NOT NULL,
    restriction_level ENUM('advisory', 'warning', 'prohibition') NOT NULL,
    affected_activities JSONB DEFAULT '[]', -- Array of activity types affected
    max_depth_allowed INTEGER, -- In meters
    max_wind_speed INTEGER, -- In km/h
    visibility_minimum INTEGER, -- In meters
    restriction_notes TEXT,
    lifted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency contacts and procedures
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
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **GDPR Compliance System:**

```sql
-- Data retention and deletion policies
CREATE TABLE data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_type ENUM('customer_data', 'booking_data', 'payment_data', 'communication_data', 'analytics_data') NOT NULL,
    retention_period_months INTEGER NOT NULL,
    deletion_trigger ENUM('automatic', 'manual', 'customer_request') NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer consent management
CREATE TABLE customer_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    consent_type ENUM('marketing', 'data_processing', 'analytics', 'third_party_sharing', 'location_tracking') NOT NULL,
    consent_given BOOLEAN NOT NULL,
    consent_date TIMESTAMP WITH TIME ZONE NOT NULL,
    consent_method ENUM('website', 'email', 'phone', 'in_person', 'paper_form') NOT NULL,
    ip_address INET,
    user_agent TEXT,
    consent_withdrawn_at TIMESTAMP WITH TIME ZONE,
    withdrawal_method ENUM('website', 'email', 'phone', 'in_person') NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data breach tracking
CREATE TABLE data_breaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breach_date TIMESTAMP WITH TIME ZONE NOT NULL,
    breach_type ENUM('unauthorized_access', 'data_loss', 'system_compromise', 'insider_threat', 'other') NOT NULL,
    affected_data_types JSONB NOT NULL, -- Array of data types affected
    affected_customers_count INTEGER,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    description TEXT NOT NULL,
    containment_actions TEXT,
    notification_sent BOOLEAN DEFAULT false,
    notification_date TIMESTAMP WITH TIME ZONE,
    authority_notified BOOLEAN DEFAULT false,
    authority_notification_date TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Insurance Integration System:**

```sql
-- Insurance provider integration
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
    api_endpoint VARCHAR(200),
    api_key_encrypted TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insurance claims tracking
CREATE TABLE insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insurance_provider_id UUID NOT NULL REFERENCES insurance_providers(id),
    claim_number VARCHAR(100) NOT NULL,
    incident_id UUID REFERENCES maritime_incidents(id),
    claim_type ENUM('equipment_damage', 'medical_expense', 'liability', 'business_interruption') NOT NULL,
    claim_amount DECIMAL(10,2),
    claim_date DATE NOT NULL,
    incident_date DATE NOT NULL,
    description TEXT NOT NULL,
    status ENUM('submitted', 'under_review', 'approved', 'denied', 'settled') DEFAULT 'submitted',
    settlement_amount DECIMAL(10,2),
    settlement_date DATE,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Health & Safety Compliance:**

```sql
-- Medical clearance tracking
CREATE TABLE medical_clearances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    clearance_type ENUM('diving_medical', 'general_health', 'emergency_contact') NOT NULL,
    clearance_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    doctor_name VARCHAR(100),
    doctor_license VARCHAR(100),
    medical_conditions JSONB DEFAULT '[]', -- Array of conditions
    restrictions JSONB DEFAULT '[]', -- Array of diving restrictions
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    is_valid BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safety briefing tracking
CREATE TABLE safety_briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    briefing_type ENUM('diving_safety', 'equipment_use', 'emergency_procedures', 'site_specific') NOT NULL,
    briefing_date TIMESTAMP WITH TIME ZONE NOT NULL,
    instructor_id UUID NOT NULL REFERENCES staff(id),
    location_id UUID NOT NULL REFERENCES locations(id),
    topics_covered JSONB NOT NULL, -- Array of topics covered
    duration_minutes INTEGER,
    customer_acknowledged BOOLEAN DEFAULT false,
    acknowledgment_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Regulatory Compliance Sample Data:**

```sql
-- Emergency contacts for all locations
INSERT INTO emergency_contacts (location_id, contact_type, contact_name, phone_number, email, is_primary, is_active) VALUES
-- Caleta de Fuste emergency contacts
((SELECT id FROM locations WHERE name = 'Caleta de Fuste'), 'maritime_authorities', 'Puerto del Rosario Maritime Authority', '+34 928 85 00 00', 'maritimo@puertodelrosario.es', true, true),
((SELECT id FROM locations WHERE name = 'Caleta de Fuste'), 'coast_guard', 'Coast Guard Fuerteventura', '+34 928 85 00 01', 'salvamento@salvamentomaritimo.es', true, true),
((SELECT id FROM locations WHERE name = 'Caleta de Fuste'), 'hospital', 'Hospital General Fuerteventura', '+34 928 85 00 02', 'emergencias@hospitalfuerteventura.es', true, true),
-- Las Playitas emergency contacts
((SELECT id FROM locations WHERE name = 'Las Playitas'), 'maritime_authorities', 'Puerto del Rosario Maritime Authority', '+34 928 85 00 00', 'maritimo@puertodelrosario.es', true, true),
((SELECT id FROM locations WHERE name = 'Las Playitas'), 'coast_guard', 'Coast Guard Fuerteventura', '+34 928 85 00 01', 'salvamento@salvamentomaritimo.es', true, true),
((SELECT id FROM locations WHERE name = 'Las Playitas'), 'hospital', 'Hospital General Fuerteventura', '+34 928 85 00 02', 'emergencias@hospitalfuerteventura.es', true, true);

-- Data retention policies
INSERT INTO data_retention_policies (data_type, retention_period_months, deletion_trigger, is_active) VALUES
('customer_data', 84, 'automatic', true), -- 7 years for customer data
('booking_data', 60, 'automatic', true), -- 5 years for booking data
('payment_data', 84, 'automatic', true), -- 7 years for payment data (tax requirements)
('communication_data', 36, 'automatic', true), -- 3 years for communications
('analytics_data', 24, 'automatic', true); -- 2 years for analytics data

-- Insurance providers
INSERT INTO insurance_providers (provider_name, provider_type, policy_number, coverage_amount, coverage_start_date, coverage_end_date, contact_email, contact_phone, is_active) VALUES
('DAN Europe', 'diving_insurance', 'DAN-EU-2024-001', 1000000.00, '2024-01-01', '2024-12-31', 'claims@daneurope.org', '+34 900 123 456', true),
('Allianz Global Assistance', 'equipment_insurance', 'AGA-EQ-2024-001', 500000.00, '2024-01-01', '2024-12-31', 'claims@allianz.es', '+34 900 123 457', true),
('Mapfre Seguros', 'liability_insurance', 'MAP-LI-2024-001', 2000000.00, '2024-01-01', '2024-12-31', 'claims@mapfre.es', '+34 900 123 458', true);

-- Safety equipment certifications (sample for existing equipment)
INSERT INTO safety_equipment_certifications (equipment_id, certification_type, certification_date, expiry_date, certified_by, certification_number, next_inspection_date, is_compliant) VALUES
-- Sample certifications for existing equipment
((SELECT id FROM equipment WHERE name = 'BCD Mares Avanti Quattro' LIMIT 1), 'annual_inspection', '2024-01-15', '2025-01-15', 'Mares Service Center', 'MAR-2024-001', '2025-01-15', true),
((SELECT id FROM equipment WHERE name = 'Regulator Scubapro MK25' LIMIT 1), 'pressure_test', '2024-02-01', '2025-02-01', 'Scubapro Service Center', 'SCU-2024-001', '2025-02-01', true),
((SELECT id FROM equipment WHERE name = 'Dive Computer Suunto Zoop' LIMIT 1), 'safety_check', '2024-03-01', '2025-03-01', 'Suunto Service Center', 'SUU-2024-001', '2025-03-01', true);
```

---

## 🎛️ **Admin Pricing Management Interface**

### **Easy Pricing Configuration (No Development Required)**

The system includes a user-friendly admin interface for managing all pricing without technical knowledge:

#### **1. Volume Discount Management**
```sql
-- Admin can easily update volume pricing through web interface
-- Example: Change 6-8 dive pricing from €42 to €40
UPDATE pricing_tiers 
SET price_per_unit = 40.00, 
    discount_percentage = 13.04,
    updated_at = NOW()
WHERE activity_id = (SELECT id FROM activities WHERE name = 'Fun Dive')
  AND min_quantity = 6 AND max_quantity = 8;
```

#### **2. Special Pricing Management**
```sql
-- Admin can add new special pricing rules
-- Example: Add resident discount when pricing is determined
INSERT INTO special_pricing (activity_id, name, discount_percentage, conditions, requirements) VALUES
((SELECT id FROM activities WHERE name = 'Fun Dive'), 'Canary Islands Resident Discount', 20.00,
 '{"residency": "canary_islands", "document_required": "residencia"}',
 '["canary_resident", "valid_residencia"]');

-- Admin can modify existing special pricing
UPDATE special_pricing 
SET discount_percentage = 25.00,  -- Change from 20% to 25%
    updated_at = NOW()
WHERE name = 'Canary Islands Resident Discount'
  AND activity_id = (SELECT id FROM activities WHERE name = 'Fun Dive');
```

#### **3. Activity Base Pricing**
```sql
-- Admin can update base activity prices
UPDATE activities 
SET base_price = 48.00,  -- Change from €46 to €48
    updated_at = NOW()
WHERE name = 'Fun Dive';

-- Admin can add new activities
INSERT INTO activities (name, type, category, base_price, duration_minutes, max_participants, available_locations) VALUES
('Advanced Diving Course', 'diving', 'course', 550.00, 1800, 4, '["550e8400-e29b-41d4-a716-446655440001"]');
```

#### **4. Addon Pricing Management**
```sql
-- Admin can update addon prices
UPDATE activity_addons 
SET additional_price = 25.00,  -- Change night dive from €20 to €25
    updated_at = NOW()
WHERE name = 'Night Dive';

-- Admin can add new addons
INSERT INTO activity_addons (activity_id, name, additional_price, equipment_included, requirements) VALUES
((SELECT id FROM activities WHERE name = 'Fun Dive'), 'Underwater Photography', 50.00, '["camera", "housing"]', '["OW"]');
```

### **Admin Interface Features**

#### **📊 Pricing Dashboard**
- **Visual Pricing Overview:** See all current pricing at a glance
- **Quick Edit:** Click to edit any price directly
- **Bulk Updates:** Change multiple prices at once
- **Price History:** Track pricing changes over time
- **Validation:** Prevent invalid pricing (negative prices, etc.)

#### **🔧 Easy Configuration Tools**
- **Pricing Wizard:** Step-by-step guide for adding new pricing rules
- **Template System:** Pre-built pricing templates for common scenarios
- **Copy Pricing:** Copy pricing from one activity to another
- **Seasonal Pricing:** Set different prices for different seasons
- **Location-Specific Pricing:** Different prices for different locations

#### **📋 Common Admin Tasks**

##### **Adding Resident Pricing (When Determined):**
1. **Login to Admin Panel**
2. **Go to Pricing Management**
3. **Click "Add Special Pricing"**
4. **Select Activity:** Fun Dive, Shore Dive, etc.
5. **Set Discount:** Enter percentage (e.g., 20%)
6. **Set Conditions:** Select "Canary Islands Resident"
7. **Set Requirements:** Select "Valid Residencia Required"
8. **Save Changes**

##### **Updating Volume Discounts:**
1. **Go to Volume Pricing**
2. **Select Activity**
3. **Edit Quantity Range:** 6-8 dives
4. **Update Price:** Change €42 to €40
5. **Save Changes**

##### **Adding New Activity:**
1. **Go to Activities Management**
2. **Click "Add New Activity"**
3. **Enter Details:** Name, type, base price, duration
4. **Set Volume Tiers:** Define quantity discounts
5. **Set Available Locations:** Which locations offer this activity
6. **Save and Activate**

### **Pricing Validation Rules**

#### **Automatic Validation:**
- **Positive Prices:** All prices must be positive
- **Logical Discounts:** Discounts cannot exceed 100%
- **Date Ranges:** Valid from/until dates must be logical
- **Quantity Ranges:** Min quantity ≤ Max quantity
- **Location Availability:** Activities must be available at selected locations

#### **Business Rules:**
- **Volume Discounts:** Higher quantities = lower prices
- **Special Pricing Priority:** Resident discounts > Weekend specials > Volume discounts
- **Addon Pricing:** Addons are additional to base price
- **Equipment Requirements:** Activities must have required equipment available

### **Pricing Change Workflow**

#### **1. Planning Phase:**
- **Review Current Pricing:** Analyze current performance
- **Market Research:** Check competitor pricing
- **Business Impact:** Calculate revenue impact
- **Approval Process:** Get management approval

#### **2. Implementation Phase:**
- **Admin Login:** Access pricing management
- **Make Changes:** Update prices through interface
- **Test Pricing:** Verify calculations work correctly
- **Preview Impact:** See how changes affect bookings

#### **3. Communication Phase:**
- **Staff Notification:** Inform staff of pricing changes
- **Customer Communication:** Update website and materials
- **Effective Date:** Set when new pricing takes effect
- **Monitor Results:** Track impact of pricing changes

### **Emergency Pricing Changes**

#### **Quick Price Adjustments:**
- **Weather Conditions:** Reduce prices for poor weather
- **Low Demand:** Offer last-minute discounts
- **Equipment Issues:** Adjust pricing if equipment unavailable
- **Special Events:** Create temporary pricing for events

#### **Rollback Capability:**
- **Price History:** See all previous prices
- **One-Click Rollback:** Revert to previous pricing
- **Scheduled Changes:** Set future pricing changes
- **A/B Testing:** Test different prices on different customer groups

---

## 🔗 **Database Relationships**

### **Primary Relationships:**
```
locations (1) ←→ (many) boats
locations (1) ←→ (many) dive_sites
locations (1) ←→ (many) equipment
locations (1) ←→ (many) staff
locations (1) ←→ (many) bookings

activities (1) ←→ (many) pricing_tiers
activities (1) ←→ (many) activity_addons
activities (1) ←→ (many) special_pricing
activities (1) ←→ (many) bookings

customers (1) ←→ (many) bookings
customers (1) ←→ (many) dive_logs

bookings (1) ←→ (many) equipment_assignments
bookings (1) ←→ (many) payments
bookings (1) ←→ (many) dive_logs
```

---

## 📊 **Database Statistics (Day One)**

### **Expected Record Counts:**
- **locations:** 3 records
- **boats:** 4 records
- **dive_sites:** 17 records (15 Caleta de Fuste: 4 Castillo Reef, 10 Salinas Reef, 1 Nuevo Horizonte; 2 Las Playitas)
- **activities:** 5 records
- **pricing_tiers:** 4 records
- **activity_addons:** 2 records
- **special_pricing:** 1 record (weekend special only - resident pricing TBD)
- **equipment:** 283+ records (120 wetsuits, 80 BCDs, 80 regulators, 150 steel tanks, plus accessories, plus 3 OE cases)
- **customers:** 3 records (sample data)
- **staff:** 8-12 records
- **bookings:** 0 records (will grow)
- **customer_stays:** 0 records (will grow)
- **dive_logs:** 0 records (will grow)
- **equipment_assignments:** 0 records (will grow)
- **payments:** 0 records (will grow)
- **languages:** 5 records (es, en, de, fr, it)
- **multilingual_content:** 100+ records (translations)
- **government_bonos:** 0 records (will be added when available)
- **bono_usage:** 0 records (will grow)
- **certification_agencies:** 4 records (SSI, PADI, CMAS, VDST)
- **customer_certifications:** 0 records (will grow)
- **courses:** 20+ records (course catalog for all agencies)
- **staff_certifications:** 8-12 records (staff qualifications)
- **course_bookings:** 0 records (will grow)
- **maritime_incidents:** 0 records (will grow)
- **safety_equipment_certifications:** 50+ records (equipment certifications)
- **weather_restrictions:** 0 records (will grow)
- **emergency_contacts:** 10+ records (emergency contact information)
- **data_retention_policies:** 5 records (data retention rules)
- **customer_consents:** 0 records (will grow)
- **data_breaches:** 0 records (will grow)
- **insurance_providers:** 3-5 records (insurance companies)
- **insurance_claims:** 0 records (will grow)
- **medical_clearances:** 0 records (will grow)
- **safety_briefings:** 0 records (will grow)

---

## 🚀 **Database Setup Commands**

### **1. Create Database:**
```sql
CREATE DATABASE dcms_production
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
pg_dump dcms_production > backup_$(date +%Y%m%d).sql

# Automated backup (cron job)
0 2 * * * pg_dump dcms_production | gzip > /backups/dcms_$(date +%Y%m%d).sql.gz
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
**Status:** Ready for Implementation  
**Next Review:** After Initial Data Load
