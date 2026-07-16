# Migration Guide: localStorage to Database

This guide explains how to migrate data from localStorage to PostgreSQL database.

## Prerequisites

1. PostgreSQL database is running and accessible
2. Database schema is created (via Prisma migrations)
3. Backend API is running on port 3003
4. Frontend and public website are updated to use API mode

## Migration Steps

### Step 1: Start the Backend API

```bash
cd backend
npm run start:dev
```

The API should be running on `http://localhost:3003`

### Step 2: Verify Database Connection

Check that the backend can connect to the database:

```bash
curl http://localhost:3003/health
```

### Step 3: Export Data from localStorage

Open your browser's DevTools Console on either:
- Public website: http://localhost:3000
- Admin portal: http://localhost:3001

#### Option A: Using the Migration Script

1. Open browser DevTools Console
2. Copy the contents of `backend/scripts/migrate-localStorage-to-db.js`
3. Paste into console
4. Run: `migrateLocalStorageToDB('http://localhost:3003/api')`

#### Option B: Manual Migration

If you prefer to manually migrate, you can use the API endpoints directly:

```javascript
// Get data from localStorage
const locations = JSON.parse(localStorage.getItem('dcms_locations') || '[]');
const customers = JSON.parse(localStorage.getItem('dcms_customers') || '[]');
const bookings = JSON.parse(localStorage.getItem('dcms_bookings') || '[]');
const equipment = JSON.parse(localStorage.getItem('dcms_equipment') || '[]');

// Migrate each resource via API
// (See migration script for transformation logic)
```

### Step 4: Verify Migration

Check the database to verify data was migrated:

```bash
# Connect to database
psql -U postgres -d dcms

# Check counts
SELECT COUNT(*) FROM locations;
SELECT COUNT(*) FROM customers;
SELECT COUNT(*) FROM bookings;
SELECT COUNT(*) FROM equipment;
```

Or use the API:

```bash
curl http://localhost:3003/api/locations
curl http://localhost:3003/api/customers
curl http://localhost:3003/api/bookings
curl http://localhost:3003/api/equipment
```

### Step 5: Switch to API Mode

The frontend and public website are already configured to use API mode:

- Frontend: `frontend/src/config/apiConfig.js` has `mode: 'api'`
- Public website: Uses `syncService.js` which now points to backend API

### Step 6: Test the Application

1. Start all servers:
   ```bash
   # Backend API
   cd backend && npm run start:dev

   # Frontend (Admin Portal)
   cd frontend && npm start

   # Public Website
   cd public-website && npm start
   ```

2. Verify data appears correctly in both portals
3. Test creating new bookings/customers
4. Verify data persists across browser refreshes

## Troubleshooting

### API Connection Errors

If you see connection errors:
- Verify backend is running: `curl http://localhost:3003/health`
- Check CORS settings in `backend/src/main.ts`
- Verify `DATABASE_URL` in `backend/.env`

### Data Transformation Errors

The migration script transforms localStorage format to database format. Common issues:
- Date format mismatches
- Enum value mismatches (e.g., `customer_type` must match Prisma enum)
- Missing required fields

### Missing Data

If some data didn't migrate:
- Check browser console for error messages
- Review migration script output
- Check database constraints/logs

## Rollback

If you need to rollback to localStorage:

1. Change `frontend/src/config/apiConfig.js` back to `mode: 'mock'`
2. Update `public-website/src/services/syncService.js` to use sync server
3. Data will be read from localStorage again

## Notes

- The migration script preserves existing data (updates if ID exists)
- Duplicate IDs are handled gracefully
- Soft deletes are preserved (deleted_at, is_active fields)
- Related data (certifications, consents) should be migrated separately if needed

