-- DCMS Sample Data
-- This file contains sample data for testing and development
-- Created: October 2025

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Locations
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

-- Boats (Deep Blue Diving - 4 Bombard Explorer boats, capacity 10 each)
INSERT INTO boats (location_id, name, capacity, equipment_onboard) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'White Magic', 10, '["oxygen", "first_aid", "radio", "mobile_phone", "gps", "life_jackets", "flares"]'),
('550e8400-e29b-41d4-a716-446655440001', 'Grey Magic', 10, '["oxygen", "first_aid", "radio", "mobile_phone", "gps", "life_jackets", "flares"]'),
('550e8400-e29b-41d4-a716-446655440001', 'Black Magic', 10, '["oxygen", "first_aid", "radio", "mobile_phone", "gps", "life_jackets", "flares"]'),
('550e8400-e29b-41d4-a716-446655440001', 'Blue Magic', 10, '["oxygen", "first_aid", "radio", "mobile_phone", "gps", "life_jackets", "flares"]');

-- Dive Sites (Caleta de Fuste and Las Playitas)
INSERT INTO dive_sites (location_id, name, type, depth_range, difficulty_level, conditions) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Castillo Reef', 'diving', '{"min": 5, "max": 18}', 'intermediate', '{"current": "moderate", "visibility": "good"}'),
('550e8400-e29b-41d4-a716-446655440001', 'Salinas Reef', 'diving', '{"min": 8, "max": 25}', 'intermediate', '{"current": "moderate", "visibility": "excellent"}'),
('550e8400-e29b-41d4-a716-446655440001', 'Nuevo Horizonte Reef', 'diving', '{"min": 10, "max": 30}', 'advanced', '{"current": "strong", "visibility": "good"}'),
('550e8400-e29b-41d4-a716-446655440001', 'Las Playitas', 'diving', '{"min": 5, "max": 20}', 'beginner', '{"current": "weak", "visibility": "excellent"}'),
('550e8400-e29b-41d4-a716-446655440001', 'Gran Trajaral', 'diving', '{"min": 12, "max": 35}', 'advanced', '{"current": "strong", "visibility": "good"}');

-- Staff
INSERT INTO staff (location_id, first_name, last_name, email, phone, role, certifications) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Deep', 'Blue', 'instructor@deep-blue-diving.com', '+34 606 275 468', 'instructor', '["SSI", "PADI"]'),
('550e8400-e29b-41d4-a716-446655440001', 'Instructor', 'Staff', 'instructor2@deep-blue-diving.com', '+34 653 512 638', 'instructor', '["SSI"]'),
('550e8400-e29b-41d4-a716-446655440001', 'Divemaster', 'Helper', 'divemaster@deep-blue-diving.com', '+34 678 901 234', 'divemaster', '["SSI"]');

-- Equipment (Sample)
INSERT INTO equipment (location_id, name, category, type, size, condition, is_available) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Wetsuit Shorty 3mm', 'diving', 'diving', 'S', 'excellent', true),
('550e8400-e29b-41d4-a716-446655440001', 'Wetsuit Shorty 3mm', 'diving', 'diving', 'M', 'excellent', true),
('550e8400-e29b-41d4-a716-446655440001', 'BCD', 'diving', 'diving', 'M', 'good', true),
('550e8400-e29b-41d4-a716-446655440001', 'Regulator', 'diving', 'diving', NULL, 'excellent', true),
('550e8400-e29b-41d4-a716-446655440001', 'Mask', 'diving', 'diving', NULL, 'good', true),
('550e8400-e29b-41d4-a716-446655440001', 'Fins', 'diving', 'diving', '42', 'excellent', true),
('550e8400-e29b-41d4-a716-446655440001', 'Own Equipment - Complete Set', 'diving', 'diving', 'Complete', 'OE001', true),
('550e8400-e29b-41d4-a716-446655440001', 'Own Equipment - Partial Set', 'diving', 'diving', 'Partial', 'OE002', true),
('550e8400-e29b-41d4-a716-446655440001', 'Own Equipment - No Equipment', 'diving', 'diving', 'None', 'OE003', true);

-- Certification Agencies (SSI, PADI, CMAS, VDST)
INSERT INTO certification_agencies (id, name, code, priority, is_primary_agency, is_active, api_endpoint, api_key_required) VALUES
('550e8400-e29b-41d4-a716-446655440010', 'Scuba Schools International', 'SSI', 1, true, true, 'https://www.divessi.com/verify-certification', false),
('550e8400-e29b-41d4-a716-446655440011', 'Professional Association of Diving Instructors', 'PADI', 2, false, true, 'https://www.padi.com/padi-check', false),
('550e8400-e29b-41d4-a716-446655440012', 'Confédération Mondiale des Activités Subaquatiques', 'CMAS', 2, false, true, NULL, false),
('550e8400-e29b-41d4-a716-446655440013', 'Verband Deutscher Sporttaucher', 'VDST', 2, false, true, 'https://www.vdst.de', false);

-- Customers (Sample)
INSERT INTO customers (id, first_name, last_name, email, phone, dob, nationality, customer_type) VALUES
('550e8400-e29b-41d4-a716-446655440020', 'John', 'Smith', 'john.smith@example.com', '+44 7700 900123', '1985-05-15', 'British', 'tourist'),
('550e8400-e29b-41d4-a716-446655440021', 'Maria', 'Garcia', 'maria.garcia@example.com', '+34 612 345 678', '1990-08-20', 'Spanish', 'local'),
('550e8400-e29b-41d4-a716-446655440022', 'Hans', 'Mueller', 'hans.mueller@example.com', '+49 151 234 5678', '1988-03-10', 'German', 'recurrent');

-- Pricing Configuration
INSERT INTO pricing_configs (location_id, activity_type, name, valid_from, valid_until, pricing_rules, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'diving', 'Standard Diving Pricing', '2025-01-01', NULL,
 '{
   "tiers": [
     {"dives": 1, "price": 46},
     {"dives": 2, "price": 44},
     {"dives": 3, "price": 44},
     {"dives": 4, "price": 42},
     {"dives": 5, "price": 42},
     {"dives": 6, "price": 42},
     {"dives": 7, "price": 40},
     {"dives": 8, "price": 40},
     {"dives": 9, "price": 38}
   ],
   "addons": {
     "night_dive": 20,
     "personal_instructor": 100
   }
 }', true);

-- Special Pricing (now part of unified pricing_configs)
INSERT INTO pricing_configs (location_id, pricing_type, activity_type, name, description, pricing_rules, conditions, priority, valid_from, valid_until, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'promotion', 'diving', 'Weekend Special', '10% discount on weekends', 
 '{"discount_percentage": 10}', 
 '{"day": "weekend"}', 
 100, -- Higher priority than standard pricing
 '2025-01-01', '2025-12-31', true);

-- Government Bonos (Canary Islands)
INSERT INTO government_bonos (code, type, discount_percentage, max_amount, valid_from, valid_until, usage_limit, is_active) VALUES
('BONO-2025-001', 'discount_code', 20, 200, '2025-01-01', '2025-12-31', 100, true);

-- Sample Bookings
INSERT INTO bookings (customer_id, location_id, boat_id, dive_site_id, booking_date, activity_type, number_of_dives, price, total_price, status, payment_method, payment_status) VALUES
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440001', 
 '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', 
 '2025-10-15', 'diving', 1, 46.00, 46.00, 'confirmed', 'card', 'paid'),
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440001',
 '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440006',
 '2025-10-16', 'diving', 2, 88.00, 88.00, 'confirmed', 'card', 'paid');

-- Customer Certifications
INSERT INTO customer_certifications (customer_id, agency_id, certification_number, certification_level, issue_date) VALUES
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440010', 'SSI-12345', 'Open Water Diver', '2022-06-10'),
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440010', 'SSI-67890', 'Advanced Diver', '2021-08-15');

