# Database Migration Instructions

## New API Endpoints Created

The following API endpoints have been created and need database migrations:

1. **boat-preps** - NEW model added to Prisma schema
2. **settings** - NEW model added to Prisma schema
3. **dive-sites** - Model already existed, now has API endpoint
4. **government-bonos** - Model already existed, now has API endpoint
5. **staff** - Model already existed, now has API endpoint (frontend calls it "users")

## Migration Steps

1. **Generate Prisma client:**
   ```bash
   cd backend
   npm run prisma:generate
   ```

2. **Create and run migration:**
   ```bash
   cd backend
   npm run prisma:migrate
   ```
   
   When prompted, name the migration: `add_boat_preps_and_settings`

3. **Verify migration:**
   ```bash
   cd backend
   npm run prisma:studio
   ```
   
   Check that the following tables exist:
   - `boat_preps`
   - `settings`

## New Backend Modules Added

All new modules have been added to `backend/src/app.module.ts`:
- `DiveSitesModule`
- `GovernmentBonosModule`
- `StaffModule`
- `BoatPrepsModule`
- `SettingsModule`

## Frontend Updates

- Updated `frontend/src/services/api/realApiAdapter.js` to:
  - Map resource names (users → staff, diveSites → dive-sites, etc.)
  - Remove localStorage fallbacks
  - Use API endpoints for all resources

## Testing

After migration, test the following endpoints:
- `GET /api/boat-preps` - Should return empty array or existing data
- `GET /api/dive-sites` - Should return dive sites
- `GET /api/staff` - Should return staff members
- `GET /api/government-bonos` - Should return bonos
- `GET /api/settings` - Should return settings

## Notes

- The `settings` table uses a `key` field for unique identification
- The frontend expects settings as an array, but the API returns all settings
- Boat preparations link to locations, boats, and dive sites
- Staff endpoint is mapped from "users" in frontend to "staff" in backend

