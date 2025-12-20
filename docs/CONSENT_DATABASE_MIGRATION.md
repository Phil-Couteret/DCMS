# Consent Database Migration - Implementation Guide

**Date:** December 2025  
**Status:** ✅ Database schema and backend API ready | Frontend migration pending

---

## ✅ What Was Implemented

### 1. Database Schema

**File:** `database/schema/001_create_tables.sql`

- ✅ Added `customer_consents` table to PostgreSQL schema
- ✅ Added indexes for performance (customer_id, consent_type, is_active)
- ✅ Added composite index for common queries
- ✅ Added `updated_at` trigger for automatic timestamp updates
- ✅ Added `medical_data` to consent_type enum (in addition to `medical_clearance`)

**Table Structure:**
```sql
CREATE TABLE customer_consents (
    id UUID PRIMARY KEY,
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
```

### 2. Prisma Schema

**File:** `backend/prisma/schema.prisma`

- ✅ Added `customer_consents` model
- ✅ Added `medical_data` to consent_type enum
- ✅ Added relation to `customers` model
- ✅ Configured proper indexes

### 3. Backend API

**Files Created:**
- `backend/src/consents/consents.module.ts` - NestJS module
- `backend/src/consents/consents.controller.ts` - REST API endpoints
- `backend/src/consents/consents.service.ts` - Business logic
- `backend/src/consents/dto/create-consent.dto.ts` - DTO for validation
- `backend/src/prisma/prisma.service.ts` - Prisma client service

**API Endpoints:**
- `GET /api/customers/:customerId/consents` - Get all consents
- `GET /api/customers/:customerId/consents/active` - Get active consents
- `GET /api/customers/:customerId/consents/check?type=:type` - Check if consent exists
- `POST /api/customers/:customerId/consents` - Record consent
- `DELETE /api/customers/:customerId/consents/:type` - Withdraw consent
- `DELETE /api/customers/:customerId/consents` - Delete all consents

**Features:**
- Full CRUD operations
- Automatic withdrawal handling (marks previous consents as withdrawn)
- Validation and error handling
- Swagger documentation
- GDPR-compliant (tracks IP, user agent, timestamps)

### 4. Migration Script

**File:** `scripts/migrate-consents-to-db.js`

- ✅ Script to migrate consent data from localStorage to database
- ✅ Handles customer ID mapping (email to UUID)
- ✅ Error handling and reporting
- ✅ Interactive prompts for user input

### 5. API Client Service (Optional)

**File:** `public-website/src/services/consentServiceAPI.js`

- ✅ API client with localStorage fallback
- ✅ Automatically detects if API is available
- ✅ Falls back to localStorage if API unavailable (for POC mode)

---

## 🔄 Migration Steps

### Step 1: Update Database Schema

```bash
# Run the schema update
cd database
psql -d dcms -f schema/001_create_tables.sql

# Or apply via Prisma (if using migrations)
cd backend
npx prisma migrate dev --name add_customer_consents
npx prisma generate
```

### Step 2: Start Backend API

```bash
cd backend
npm install  # Install dependencies if needed
npm run start:dev
```

The API will be available at `http://localhost:3003/api`

### Step 3: Migrate Existing Consent Data

**Option A: Using Migration Script**

1. Export localStorage consent data:
   ```javascript
   // In browser console
   JSON.stringify(JSON.parse(localStorage.getItem('dcms_consents') || '{}'))
   ```
2. Save output to a JSON file (e.g., `consents-backup.json`)
3. Run migration script:
   ```bash
   node scripts/migrate-consents-to-db.js
   # Enter path to consents-backup.json when prompted
   ```

**Option B: Manual Migration**

If you prefer to migrate manually or handle edge cases:
1. Export localStorage data
2. Map customer emails to database UUIDs
3. Insert records using SQL or Prisma Studio

### Step 4: Update Frontend (When Ready)

**Current State:** Frontend still uses localStorage (`consentService.js`)

**To Switch to API:**

1. **Option 1:** Replace imports to use `consentServiceAPI.js`:
   ```javascript
   // Change from:
   import consentService from './services/consentService';
   
   // To:
   import consentService from './services/consentServiceAPI';
   ```

2. **Option 2:** Update existing `consentService.js` to use API with localStorage fallback (hybrid approach)

**Files that use consentService:**
- `public-website/src/pages/Login.jsx` - Registration consent recording
- `public-website/src/pages/MyAccount.jsx` - Consent management UI

---

## 📋 Testing Checklist

### Backend API Testing

- [ ] Start backend server
- [ ] Test GET `/api/customers/:id/consents` (returns empty array for new customer)
- [ ] Test POST `/api/customers/:id/consents` (record consent)
- [ ] Test GET `/api/customers/:id/consents/active` (returns active consents)
- [ ] Test GET `/api/customers/:id/consents/check?type=marketing` (check consent)
- [ ] Test DELETE `/api/customers/:id/consents/marketing` (withdraw consent)
- [ ] Test DELETE `/api/customers/:id/consents` (delete all consents)
- [ ] Verify Swagger docs at `/api` show consent endpoints

### Database Testing

- [ ] Verify `customer_consents` table exists
- [ ] Verify indexes are created
- [ ] Test cascade delete (delete customer, verify consents are deleted)
- [ ] Verify consent records are created with proper timestamps

### Migration Testing

- [ ] Export localStorage consent data
- [ ] Run migration script
- [ ] Verify consents are migrated correctly
- [ ] Verify no data loss
- [ ] Test API endpoints with migrated data

---

## 🔍 Verification Queries

### Check Consent Records
```sql
SELECT 
  c.email,
  cc.consent_type,
  cc.consent_given,
  cc.consent_date,
  cc.is_active,
  cc.withdrawal_date
FROM customer_consents cc
JOIN customers c ON c.id = cc.customer_id
ORDER BY cc.consent_date DESC;
```

### Count Consents by Type
```sql
SELECT 
  consent_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active AND consent_given) as active
FROM customer_consents
GROUP BY consent_type;
```

### Find Customers Without Required Consents
```sql
SELECT DISTINCT c.id, c.email
FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM customer_consents cc
  WHERE cc.customer_id = c.id
  AND cc.consent_type = 'data_processing'
  AND cc.is_active = true
  AND cc.consent_given = true
);
```

---

## 📝 Notes

### Consent Type Mapping

The database enum includes both `medical_clearance` and `medical_data`. The frontend currently uses `medical_data`, but the database primarily uses `medical_clearance`. The migration script handles this mapping.

**Recommendation:** Standardize on `medical_clearance` in the database and update frontend to use this value, or update the database to accept both as aliases.

### Current Implementation

- **Backend:** ✅ Fully implemented and ready
- **Database Schema:** ✅ Created and ready
- **Frontend:** ⚠️ Still using localStorage (API client available but not integrated)

### When to Migrate Frontend

The frontend can continue using localStorage until:
1. Backend API is fully tested and stable
2. All customers are migrated to database
3. Ready for production deployment

The hybrid approach (API with localStorage fallback) allows gradual migration.

---

## 🚀 Next Steps

1. **Run Database Migration:**
   ```bash
   psql -d dcms -f database/schema/001_create_tables.sql
   ```

2. **Generate Prisma Client:**
   ```bash
   cd backend
   npx prisma generate
   ```

3. **Start Backend and Test:**
   ```bash
   cd backend
   npm run start:dev
   # Test endpoints at http://localhost:3003/api
   ```

4. **Migrate Existing Data:**
   ```bash
   node scripts/migrate-consents-to-db.js
   ```

5. **Update Frontend (When Ready):**
   - Switch to `consentServiceAPI.js` or update `consentService.js` to use API

---

**Last Updated:** December 2025

