# DCMS API Endpoints Audit

## Summary
This document lists all API endpoints that the frontend calls and their status in the backend.

## ✅ Backend Endpoints (Fully Implemented)

### 1. `/api/bookings`
- **Status**: ✅ Implemented
- **Methods**: GET, POST, PUT, DELETE
- **Controller**: `BookingsController`
- **Used by**: Bookings page, BookingForm, BoatPrep, StayService, BillGenerator

### 2. `/api/customers`
- **Status**: ✅ Implemented
- **Methods**: GET, POST, PUT, DELETE
- **Special endpoints**: 
  - `GET /api/customers/email/:email` - Find by email
- **Controller**: `CustomersController`
- **Used by**: Customers page, CustomerForm, BookingForm, BoatPrep, StayService

### 3. `/api/locations`
- **Status**: ✅ Implemented
- **Methods**: GET, POST, PUT, DELETE
- **Controller**: `LocationsController`
- **Used by**: Navigation, Customers, Settings, Equipment, Dashboard, BillGenerator, BoatPrep

### 4. `/api/equipment`
- **Status**: ✅ Implemented
- **Methods**: GET, POST, PUT, DELETE
- **Query params**: `locationId`, `available`, `category`
- **Controller**: `EquipmentController`
- **Used by**: Equipment page, BookingForm, BoatPrep

### 5. `/api/boats`
- **Status**: ✅ Implemented
- **Methods**: GET, POST, PUT, DELETE
- **Query params**: `locationId`
- **Controller**: `BoatsController`
- **Used by**: BookingForm, BoatPrep, Settings, Navigation

## ⚠️ Missing Endpoints (Handled via localStorage Fallback)

### 6. `/api/settings`
- **Status**: ❌ Not implemented
- **Current workaround**: Falls back to `localStorage.getItem('dcms_settings')`
- **Used by**: Settings page, BookingForm, BillGenerator, StayService, Prices component
- **Impact**: Settings are stored locally, not synced across devices
- **Priority**: HIGH - Settings are critical for pricing and configuration

### 7. `/api/diveSites` or `/api/dive-sites`
- **Status**: ❌ Not implemented
- **Current workaround**: Falls back to `localStorage.getItem('dcms_diveSites')`
- **Used by**: BookingForm, BoatPrep, Settings, BillGenerator
- **Impact**: Dive sites are stored locally, not synced
- **Priority**: HIGH - Dive sites are essential for bookings

### 8. `/api/users` or `/api/staff`
- **Status**: ❌ Not implemented
- **Current workaround**: Falls back to `localStorage.getItem('dcms_users')`
- **Used by**: BoatPrep, Settings, UserSelector, ChangePasswordDialog
- **Impact**: User accounts are stored locally, not synced
- **Priority**: MEDIUM - User management is important but less critical than bookings

### 9. `/api/governmentBonos`
- **Status**: ❌ Not implemented
- **Current workaround**: Falls back to `localStorage.getItem('dcms_governmentBonos')`
- **Used by**: BookingForm (with error handling)
- **Impact**: Government bonos are stored locally
- **Priority**: LOW - Used for discounts, not critical

## ❌ Missing Endpoints (Causing Errors)

### 10. `/api/boatPreps`
- **Status**: ❌ Not implemented
- **Current behavior**: Returns 404 error
- **Used by**: BoatPrep page, BillGenerator
- **Impact**: **CAUSING ERRORS** - Boat preparation data cannot be saved/loaded
- **Priority**: **CRITICAL** - This is causing runtime errors
- **Note**: Boat preparations are created in BoatPrep page but cannot be persisted

## Other Backend Modules (Not Used by Frontend)

These modules exist in the backend but are not currently used by the frontend:
- `/api/consents` - GDPR consent management
- `/api/audit` - Audit logging
- `/api/dsar` - Data Subject Access Requests
- `/api/breaches` - Data breach management
- `/api/statistics` - Statistics endpoints

## Recommendations

### Immediate Actions (Critical)
1. **Create `/api/boatPreps` endpoint** - This is causing errors
   - Create `BoatPrepsController` and `BoatPrepsService`
   - Add to `AppModule`
   - Create Prisma model if needed

### High Priority
2. **Create `/api/settings` endpoint** - Settings are critical
3. **Create `/api/diveSites` endpoint** - Essential for bookings

### Medium Priority
4. **Create `/api/users` or `/api/staff` endpoint** - For user management

### Low Priority
5. **Create `/api/governmentBonos` endpoint** - Nice to have

## Current Workarounds

The `realApiAdapter.js` file handles missing endpoints by:
- Checking for specific resource names
- Falling back to localStorage for: `users`, `diveSites`, `settings`, `governmentBonos`
- Returning 404 errors for: `boatPreps` (not handled, causing errors)

## Files to Update

When creating new endpoints:
1. Create controller in `backend/src/{resource}/{resource}.controller.ts`
2. Create service in `backend/src/{resource}/{resource}.service.ts`
3. Create module in `backend/src/{resource}/{resource}.module.ts`
4. Add module to `backend/src/app.module.ts`
5. Update Prisma schema if needed
6. Remove localStorage fallback from `frontend/src/services/api/realApiAdapter.js`

