# Database Access Guide

This guide explains how to view and modify tables in the DCMS PostgreSQL database.

## 📊 Current Server Status

- **Public Website**: http://localhost:3000
- **Admin Portal**: http://localhost:3001
- **Sync Server**: http://localhost:3002
- **Backend API**: http://localhost:3003 (may take a moment to compile)

## 🗄️ Database Connection

- **Host**: localhost
- **Port**: 5432
- **Database**: dcms
- **User**: phil (or your system username)

## 🔧 Method 1: Prisma Studio (Recommended - GUI)

Prisma Studio provides a visual interface to browse and edit your database tables.

### Start Prisma Studio

```bash
cd backend
npm run prisma:studio
```

This will:
- Start Prisma Studio on **http://localhost:5555**
- Open automatically in your browser
- Show all tables in a user-friendly interface

### Using Prisma Studio

1. **View Tables**: Click on any table name in the left sidebar
2. **View Records**: See all records in a table with pagination
3. **Add Records**: Click the "+ Add record" button
4. **Edit Records**: Click on any field to edit inline
5. **Delete Records**: Click the trash icon next to a record
6. **Filter/Search**: Use the search bar to filter records

### Stop Prisma Studio

Press `Ctrl+C` in the terminal where Prisma Studio is running.

---

## 💻 Method 2: psql (Command Line)

`psql` is the PostgreSQL command-line client for direct database access.

### Connect to Database

```bash
psql -d dcms
```

Or with explicit connection:
```bash
psql -h localhost -p 5432 -U phil -d dcms
```

### Common Commands

#### List All Tables
```sql
\dt
```

#### View Table Structure
```sql
\d table_name
```

For example:
```sql
\d customers
\d bookings
\d pricing_configs
```

#### View All Records in a Table
```sql
SELECT * FROM table_name;
```

For example:
```sql
SELECT * FROM customers;
SELECT * FROM bookings;
SELECT * FROM pricing_configs;
```

#### View Specific Columns
```sql
SELECT id, name, email FROM customers;
```

#### Count Records
```sql
SELECT COUNT(*) FROM customers;
```

#### Filter Records
```sql
SELECT * FROM bookings WHERE status = 'confirmed';
SELECT * FROM customers WHERE email LIKE '%@example.com';
```

#### Insert a New Record
```sql
INSERT INTO customers (id, name, email, phone, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'John Doe',
  'john@example.com',
  '+1234567890',
  NOW(),
  NOW()
);
```

#### Update a Record
```sql
UPDATE customers
SET email = 'newemail@example.com', updated_at = NOW()
WHERE id = 'customer-uuid-here';
```

#### Delete a Record
```sql
DELETE FROM customers WHERE id = 'customer-uuid-here';
```

#### Join Tables
```sql
SELECT 
  b.id,
  b.date,
  c.name AS customer_name,
  c.email
FROM bookings b
JOIN customers c ON b.customer_id = c.id
WHERE b.status = 'confirmed';
```

### Exit psql

```sql
\q
```

---

## 📋 Available Tables

Based on the database schema, you have the following tables:

1. **customers** - Customer profiles
2. **bookings** - Dive bookings
3. **locations** - Dive sites/locations
4. **equipment** - Equipment inventory
5. **pricing_configs** - Pricing configurations
6. **users** - System users (admins)
7. **dive_sessions** - Dive session records
8. **post_dive_reports** - Post-dive reports

---

## 🔍 Quick Database Queries

### View All Customers
```sql
SELECT id, name, email, phone, gender, created_at FROM customers ORDER BY created_at DESC;
```

### View All Bookings
```sql
SELECT 
  b.id,
  b.date,
  b.status,
  c.name AS customer_name,
  l.name AS location_name
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
LEFT JOIN locations l ON b.location_id = l.id
ORDER BY b.date DESC;
```

### View Pricing Configurations
```sql
SELECT 
  id,
  location_id,
  pricing_type,
  activity_reference_id,
  price,
  description
FROM pricing_configs
ORDER BY location_id, pricing_type;
```

### Count Bookings by Status
```sql
SELECT status, COUNT(*) as count
FROM bookings
GROUP BY status;
```

---

## 🛠️ Troubleshooting

### Cannot Connect to Database

1. **Check PostgreSQL is running**:
   ```bash
   brew services list | grep postgresql
   ```

2. **Start PostgreSQL if not running**:
   ```bash
   brew services start postgresql@14
   ```

### Permission Denied

If you get permission errors, you may need to create the database user:
```bash
createuser -s phil
```

### Database Doesn't Exist

If the database doesn't exist, run the setup script:
```bash
./setup-local-db.sh
```

---

## 📝 Notes

- **Always backup** before making bulk changes
- **Use transactions** for complex operations:
  ```sql
  BEGIN;
  -- your changes here
  COMMIT;  -- or ROLLBACK; to undo
  ```
- **UUIDs**: Most IDs are UUIDs. Use `gen_random_uuid()` to generate new ones
- **Timestamps**: Use `NOW()` for `created_at` and `updated_at` fields

---

## 🔗 Related Documentation

- Database Schema: `database/schema/001_create_tables.sql`
- Sample Data: `database/seeds/002_sample_data.sql`
- Database README: `database/README.md`
- Local Setup Guide: `LOCAL_DATABASE_SETUP.md`

