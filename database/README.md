# DCMS Database Schema

This directory contains all database-related files for the DCMS project.

## 📁 Structure

```
database/
├── schema/              # Table definitions
│   └── 001_create_tables.sql
├── seeds/               # Sample data
│   └── 002_sample_data.sql
└── migrations/          # Migration files (future)
```

---

## 🚀 Quick Start

### **1. Create Database**

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE dcms_production;

# Set timezone
ALTER DATABASE dcms_production SET timezone = 'Europe/Madrid';

# Exit
\q
```

### **2. Run Schema**

```bash
# Run table creation
psql -U postgres -d dcms_production -f schema/001_create_tables.sql

# Run sample data
psql -U postgres -d dcms_production -f seeds/002_sample_data.sql
```

### **3. Verify**

```bash
# Connect to database
psql -U postgres -d dcms_production

# List tables
\dt

# Check table structure
\d locations
\d bookings
\d customers

# View sample data
SELECT * FROM locations;
SELECT * FROM boats;
SELECT * FROM staff;

# Exit
\q
```

---

## 📊 Database Schema Overview

### **Core Tables**
- `locations` - Dive center locations
- `boats` - Boats and their specifications
- `dive_sites` - Catalog of dive sites
- `equipment` - Equipment inventory
- `staff` - Staff members
- `customers` - Customer information
- `bookings` - Diving bookings

### **Advanced Tables**
- `customer_stays` - Customer stays for volume discounts
- `certification_agencies` - SSI, PADI, CMAS, VDST
- `customer_certifications` - Customer certifications
- `pricing_configs` - Volume discount pricing
- `special_pricing` - Special pricing rules
- `government_bonos` - Canary Islands resident discounts

---

## 🔧 Database Features

### **ENUM Types Created**
- `location_type` - diving, bike_rental, future
- `activity_type` - diving, snorkeling, try_dive
- `equipment_type` - diving, snorkeling, accessory
- `staff_role` - owner, manager, instructor, divemaster
- `booking_status` - pending, confirmed, completed
- `payment_method` - cash, card, stripe, etc.
- `payment_status` - pending, partial, paid
- `customer_type` - tourist, local, recurrent
- And more...

### **UUID Primary Keys**
All tables use UUID as primary keys for better distribution and uniqueness.

### **JSONB Fields**
Flexible data storage for:
- Addresses and contact info
- Preferences and settings
- Equipment onboard
- Pricing configurations

### **Indexes**
Optimized indexes on frequently queried fields:
- `locations(type, is_active)`
- `boats(location_id, is_active)`
- `customers(email)`
- `bookings(customer_id, booking_date, status)`

### **Triggers**
Automatic `updated_at` timestamp update on all tables.

---

## 📈 Sample Data Included

The `seeds/002_sample_data.sql` file includes:
- 3 locations (Caleta de Fuste, Las Playitas, Hotel Mar)
- 4 boats (White Magic, Grey Magic, Black Magic, Blue Magic)
- 5 dive sites
- 3 staff members
- 9 equipment items (including Own Equipment markers)
- 4 certification agencies (SSI, PADI, CMAS, VDST)
- 3 sample customers
- 2 sample bookings
- Pricing configuration

---

## 🔄 Migration Strategy

Future migration files will be stored in `database/migrations/`:
- Timestamped migration files
- Schema versioning
- Rollback support

---

## 📝 Documentation

Full schema documentation is available in:
- `/docs/planning/dcms-database-schema.md`

---

## 🛠️ Maintenance

### **Backup**
```bash
pg_dump -U postgres dcms_production > backup.sql
```

### **Restore**
```bash
psql -U postgres dcms_production < backup.sql
```

### **Reset Database**
```bash
# Drop and recreate
psql -U postgres -c "DROP DATABASE dcms_production;"
psql -U postgres -c "CREATE DATABASE dcms_production;"

# Re-run schema
psql -U postgres -d dcms_production -f schema/001_create_tables.sql
psql -U postgres -d dcms_production -f seeds/002_sample_data.sql
```

---

**Status:** Ready for backend development  
**Last Updated:** October 2025

