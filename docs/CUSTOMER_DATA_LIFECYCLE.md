# Customer Data Lifecycle

This document explains how customer data flows through the DCMS system, from registration to price calculation.

## Overview

The DCMS system consists of:
- **Public Website** (Customer Portal) - Port 3000
- **Admin Portal** - Port 3001
- **Sync Server** - Port 3002 (acts as intermediary/source of truth)

## Data Flow

### 1. Customer Registration (Public Website)

**Location:** `public-website/src/pages/Login.jsx`

**Process:**
1. Customer fills registration form (firstName, lastName, email, password, phone)
2. Validates required GDPR consents (dataProcessing, medicalData)
3. Hashes password using `passwordHash.storeHashedPassword()`
4. Creates customer record via `bookingService.findOrCreateCustomer()`:
   - **Defaults:** `customerType: 'tourist'`, `centerSkillLevel: 'beginner'`
   - Stores in localStorage: `dcms_customers`
   - Dispatches events: `dcms_customer_created`, `dcms_customer_updated`

**Storage:**
- **Local:** `localStorage.getItem('dcms_customers')` (Public Website)
- **Sync:** `syncService.pushAllData()` → Sync Server (`http://localhost:3002/api/sync/customers`)

**Code References:**
- `public-website/src/pages/Login.jsx` (lines 185-250)
- `public-website/src/services/bookingService.js` (lines 124-185)

---

### 2. Data Sync to Backend/Sync Server

**Location:** `public-website/src/services/syncService.js`

**Process:**
1. Sync Service runs automatically (periodic sync every 10 seconds)
2. `pushAllData()` sends all customer data to sync server
3. Sync server stores in memory: `sharedStorage.dcms_customers`

**Sync Server:**
- Receives POST requests: `/api/sync/customers`
- Stores data in-memory (acts as shared storage between portals)
- Tracks `lastUpdate` timestamp for each resource

**Code References:**
- `public-website/src/services/syncService.js` (lines 141-177)
- `sync-server/sync-server.js` (lines 50-61)

---

### 3. Admin Portal Accesses Customer Data

**Location:** `frontend/src/pages/Customers.jsx`

**Process:**
1. Admin portal's sync service pulls customer data from sync server
2. Admin views customer list or individual customer details
3. Customer data displayed in `CustomerForm.jsx`

**Storage:**
- **Local:** `localStorage.getItem('dcms_customers')` (Admin Portal)
- **Source:** Pulled from Sync Server via `syncService.pullChanges()`

**Code References:**
- `frontend/src/services/syncService.js` (lines 183-255)
- `frontend/src/pages/Customers.jsx`
- `frontend/src/components/Customer/CustomerForm.jsx`

---

### 4. Admin Updates Customer Data (customerType, centerSkillLevel)

**Location:** `frontend/src/components/Customer/CustomerForm.jsx`

**Process:**
1. Admin edits customer profile (e.g., changes `customerType` from 'tourist' to 'recurrent')
2. Admin can also update `centerSkillLevel` (beginner/intermediate/advanced)
3. On save, `dataService.update('customers', customerId, updatedData)` is called
4. Updates localStorage: `dcms_customers`
5. Dispatches event: `dcms_customer_updated`

**Critical Fields:**
- `customerType`: 'tourist' | 'local' | 'recurrent' (affects pricing)
- `centerSkillLevel`: 'beginner' | 'intermediate' | 'advanced' (operational assessment)

**Sync to Server:**
- Admin portal's `syncService` should automatically push updated data to sync server
- Runs periodically (every 30 seconds) or can be triggered manually via `syncService.syncNow()`

**Code References:**
- `frontend/src/components/Customer/CustomerForm.jsx` (lines 408-429)
- `frontend/src/services/dataService.js` (lines 42-48)
- `frontend/src/services/syncService.js` (lines 150-179)

---

### 5. CustomerType Used for Price Calculation

**Location:** `frontend/src/services/stayService.js` & `frontend/src/services/pricingService.js`

**Process:**
1. When calculating prices, system reads customer's `customerType`
2. **Recurrent customers:** Fixed price per dive (e.g., €32.00)
3. **Local customers:** Fixed price per dive (e.g., €35.00)
4. **Tourist customers:** Tiered pricing based on total number of dives in stay
   - 1-2 dives: €46.00 per dive
   - 3-5 dives: €44.00 per dive
   - 6-8 dives: €42.00 per dive
   - 9-12 dives: €40.00 per dive
   - 13+ dives: €38.00 per dive

**Usage:**
- **Customer Stays:** `stayService.getCumulativeStayPricing()` uses `customerType` to determine pricing
- **Booking Prices:** When admin clicks "Reprice Bookings", `bookingRepricingService.recalculateAllBookingPrices()` recalculates all bookings based on current `customerType`
- **Bill Generation:** `BillGenerator.jsx` uses customer's `customerType` for accurate pricing

**Code References:**
- `frontend/src/services/stayService.js` (lines 47-176)
- `frontend/src/services/pricingService.js`
- `frontend/src/services/bookingRepricingService.js` (lines 6-54)
- `frontend/src/components/Bill/BillGenerator.jsx`

---

### 6. Data Should Flow Back to Customer Portal

**Location:** `public-website/src/pages/MyAccount.jsx`

**Expected Process:**
1. Customer portal's sync service should pull updated customer data from sync server
2. When customer opens "My Account" page, `syncNow()` is called to get latest data
3. Customer sees updated information (including correct pricing based on their `customerType`)

**Current Issue:**
- **Problem:** Customer portal sometimes has stale data (e.g., `customerType: 'tourist'` when it should be `'recurrent'`)
- **Cause:** Sync may not happen immediately, or sync server may not have latest data from admin portal
- **Solution:** Added "Refresh" button in customer portal to manually trigger sync

**Code References:**
- `public-website/src/pages/MyAccount.jsx` (lines 500-513, 1135-1155)
- `public-website/src/services/syncService.js` (lines 257-262)

---

## Current Sync Mechanism

### Admin Portal Sync
- **Push:** Periodically pushes all customer data to sync server (every 30 seconds)
- **Pull:** Periodically pulls customer data from sync server (checks `lastUpdate` timestamp)
- **Manual:** Can trigger `syncService.syncNow()` for immediate sync

### Public Website Sync
- **Push:** Immediately pushes customer creation/updates to sync server
- **Pull:** Periodically pulls customer data (every 10 seconds), or when opening My Account page
- **Manual:** "Refresh" button triggers `syncService.syncNow()`

### Sync Server
- Stores data in-memory (lost on restart)
- Acts as intermediary between admin portal and public website
- Tracks `lastUpdate` timestamp for each resource to optimize sync

---

## Data Consistency Issues

### Known Issues:
1. **Stale Customer Data:** Customer portal may not immediately reflect admin portal updates
2. **Sync Timing:** Sync happens periodically, not in real-time
3. **Sync Server Restart:** In-memory storage means data is lost on server restart

### Solutions:
1. **Manual Refresh:** Use "Refresh" button in customer portal's My Account page
2. **Login Sync:** Customer portal pulls latest data on login (line 127 in Login.jsx)
3. **My Account Sync:** Customer portal syncs when opening My Account page (line 502 in MyAccount.jsx)

---

## Key Data Fields

### Customer Object Structure:
```javascript
{
  id: "uuid",
  firstName: "string",
  lastName: "string",
  email: "string",
  phone: "string",
  customerType: "tourist" | "local" | "recurrent",  // ⚠️ CRITICAL for pricing
  centerSkillLevel: "beginner" | "intermediate" | "advanced",  // Operational assessment
  preferences: { ... },
  certifications: [ ... ],
  medicalCertificate: { ... },
  divingInsurance: { ... },
  createdAt: "ISO timestamp",
  updatedAt: "ISO timestamp"
}
```

### Pricing Impact:
- `customerType` determines pricing model (fixed vs. tiered)
- When admin changes `customerType`, bookings should be repriced using "Reprice Bookings" button
- Customer portal should sync updated `customerType` to show correct prices

---

## Recommendations

1. **Improve Sync Reliability:**
   - Consider adding real-time sync (WebSockets) for critical data like `customerType`
   - Add sync status indicator in UI
   - Add retry mechanism for failed syncs

2. **Data Validation:**
   - Ensure `customerType` is always set (never null/undefined)
   - Validate `customerType` values before saving

3. **User Experience:**
   - Show sync status in customer portal
   - Automatically refresh data when customer opens My Account page (already implemented)
   - Display last sync timestamp

4. **Testing:**
   - Test sync between admin portal and customer portal
   - Verify pricing updates correctly after `customerType` change
   - Test "Reprice Bookings" functionality

