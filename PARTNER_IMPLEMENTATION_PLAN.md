# Partner Cost Following & Portal Implementation Plan

## Overview
Implement complete partner management system with cost tracking, invoicing, and dedicated partner portal.

---

## Phase 1: Database Schema & Backend Infrastructure

### 1.1 Partner Invoices Table
**Location:** `backend/prisma/schema.prisma`

Add `partner_invoices` model:
```prisma
model partner_invoices {
  id                String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  partner_id        String      @db.Uuid
  invoice_number    String      @unique @db.VarChar(50)
  invoice_date      DateTime    @default(now()) @db.Timestamptz(6)
  due_date          DateTime    @db.Timestamptz(6)
  period_start      DateTime    @db.Timestamptz(6)
  period_end        DateTime    @db.Timestamptz(6)
  
  // Financial data
  total_amount      Decimal     @db.Decimal(10, 2)
  commission_amount Decimal     @db.Decimal(10, 2)
  paid_amount       Decimal?    @default("0") @db.Decimal(10, 2)
  status            String      @default("pending") @db.VarChar(20) // pending, partial, paid, overdue
  
  // Invoice details (JSON)
  bookings          Json?       // Array of booking IDs and amounts
  commission_rate   Decimal?    @db.Decimal(5, 2) // Snapshot of rate at invoice time
  
  // Metadata
  notes             String?     @db.Text
  created_at        DateTime?   @default(now()) @db.Timestamptz(6)
  updated_at        DateTime?   @default(now()) @updatedAt @db.Timestamptz(6)
  
  partner           partners    @relation(fields: [partner_id], references: [id], onDelete: Cascade)
  
  @@index([partner_id])
  @@index([status])
  @@index([invoice_date])
  @@map("partner_invoices")
}
```

Add relation to `partners` model:
```prisma
model partners {
  // ... existing fields
  invoices         partner_invoices[]
}
```

### 1.2 Backend Service & Controller
**Files to create:**
- `backend/src/partner-invoices/partner-invoices.service.ts`
- `backend/src/partner-invoices/partner-invoices.controller.ts`
- `backend/src/partner-invoices/partner-invoices.module.ts`

**Key features:**
- CRUD operations for partner invoices
- Generate invoice from partner bookings
- Calculate commission automatically
- Mark invoices as paid/partial
- Generate invoice number (e.g., "INV-2025-001")
- Calculate due date based on partner settings

### 1.3 Update Bill Generation
**File:** `frontend/src/pages/Bill.jsx` or `frontend/src/components/Bill/BillGenerator.jsx`

When generating a bill for a customer with partner:
- Detect partner relationship from booking
- Calculate partner commission
- Create/update partner invoice automatically
- Show partner amount separately in bill

---

## Phase 2: Admin UI - Partner Management

### 2.1 Partners Page (Admin)
**File:** `frontend/src/pages/Partners.jsx` (create new)

**Features:**
- List all partners (table view)
- Create new partner (form with API key generation)
- Edit partner details
- View partner statistics:
  - Total bookings
  - Total customers
  - Total commission earned
  - Pending invoices
- Toggle active/inactive status
- View/regenerate API keys

**UI Components:**
- DataGrid or Table with sorting/filtering
- Partner form dialog (create/edit)
- Summary cards (total partners, active, total commission)
- Actions: Create, Edit, View Details, Deactivate

### 2.2 Partner Invoices Page (Admin)
**File:** `frontend/src/pages/PartnerInvoices.jsx` (create new)

**Features:**
- List all partner invoices
- Filter by partner, status, date range
- View invoice details:
  - Invoice number
  - Partner name
  - Period (start/end dates)
  - Total amount, commission amount
  - Paid amount, remaining balance
  - Status (pending, partial, paid, overdue)
  - List of bookings included
- Mark invoice as paid/partial
- Export invoice as PDF
- Generate invoice manually
- View payment history

**UI Components:**
- Filterable table
- Invoice detail dialog/modal
- Payment form (record partial/full payment)
- Export buttons (PDF, CSV)
- Status chips/indicators

---

## Phase 3: Partner Portal (Separate Frontend)

### 3.1 Partner Authentication
**Files to create:**
- `frontend/src/pages/partner/PartnerLogin.jsx`
- `frontend/src/contexts/PartnerAuthContext.jsx`

**Features:**
- Partner login using API key/secret or email/password
- JWT token-based authentication
- Protected routes for partner portal
- Auto-logout on token expiry

### 3.2 Partner Portal Routes
**File:** `frontend/src/App.jsx` (add partner routes)

```jsx
// Partner Portal Routes (separate from admin)
<Route path="/partner/login" element={<PartnerLogin />} />
<Route path="/partner" element={<PartnerLayout />}>
  <Route path="dashboard" element={<PartnerDashboard />} />
  <Route path="bookings" element={<PartnerBookings />} />
  <Route path="customers" element={<PartnerCustomers />} />
  <Route path="invoices" element={<PartnerInvoices />} />
  <Route path="profile" element={<PartnerProfile />} />
</Route>
```

### 3.3 Partner Dashboard
**File:** `frontend/src/pages/partner/PartnerDashboard.jsx`

**Features:**
- Summary cards:
  - Total bookings (this month, all time)
  - Total customers
  - Total commission earned
  - Pending invoices count
  - Outstanding balance
- Recent bookings table
- Recent invoices table
- Commission chart (monthly trend)
- Quick actions:
  - View bookings
  - View invoices
  - View customers

### 3.4 Partner Bookings Page
**File:** `frontend/src/pages/partner/PartnerBookings.jsx`

**Features:**
- List all bookings created by this partner
- Filter by date, status, customer
- View booking details:
  - Customer name/email
  - Activity type, number of dives
  - Booking date, total price
  - Commission earned
- Export bookings (CSV, PDF)

### 3.5 Partner Customers Page
**File:** `frontend/src/pages/partner/PartnerCustomers.jsx`

**Features:**
- List all customers associated with partner
- Search/filter customers
- View customer details:
  - Basic info
  - Booking history
  - Total bookings value
- Export customer list

### 3.6 Partner Invoices Page
**File:** `frontend/src/pages/partner/PartnerInvoices.jsx`

**Features:**
- List all invoices for this partner
- Filter by status, date range
- View invoice details:
  - Invoice number, dates
  - Breakdown of bookings
  - Commission calculation
  - Payment status
- Download invoice PDF
- View payment history
- Export invoice list

### 3.7 Partner Profile/Settings
**File:** `frontend/src/pages/partner/PartnerProfile.jsx`

**Features:**
- View partner information
- Update contact details
- View API keys (masked)
- Update webhook URL
- View allowed locations
- Commission rate display

---

## Phase 4: API Adapter & Data Service

### 4.1 Update Real API Adapter
**File:** `frontend/src/services/api/realApiAdapter.js`

Add transformations for:
- `partners` resource
- `partnerInvoices` resource

### 4.2 Update Data Service
**File:** `frontend/src/services/dataService.js`

Ensure CRUD operations work for:
- `partners`
- `partnerInvoices`

---

## Phase 5: Integration Points

### 5.1 Bill Generation Integration
When generating a bill:
1. Check if customer has partner relationship
2. Calculate partner commission (from partner's commission_rate)
3. Create/update partner invoice
4. Display partner information in bill
5. Show separate amounts (customer pays, partner receives)

### 5.2 Booking Creation Integration
When booking is created by partner (via API):
- Automatically link booking to partner
- Track for invoice generation

---

## Phase 6: Styling & UX

### 6.1 Partner Portal Theme
- Different color scheme from admin portal
- Partner branding support
- Responsive design
- Mobile-friendly

### 6.2 Navigation
- Partner portal sidebar navigation
- Breadcrumbs
- Logout button

---

## Implementation Order

### Priority 1 (Core Functionality):
1. ✅ Partner invoices schema
2. ✅ Partner invoices backend service
3. ✅ Partner invoices backend controller
4. ✅ Admin Partners page (basic CRUD)
5. ✅ Admin Partner Invoices page (list, view, mark paid)

### Priority 2 (Integration):
6. ✅ Bill generation integration (create partner invoice)
7. ✅ Partner invoice calculation logic

### Priority 3 (Partner Portal):
8. ✅ Partner authentication
9. ✅ Partner portal routes
10. ✅ Partner dashboard
11. ✅ Partner invoices view
12. ✅ Partner bookings view
13. ✅ Partner customers view

### Priority 4 (Polish):
14. ✅ Export functionality (PDF, CSV)
15. ✅ Charts and statistics
16. ✅ Email notifications
17. ✅ Payment reminders

---

## Files to Create

### Backend:
- `backend/src/partner-invoices/partner-invoices.service.ts`
- `backend/src/partner-invoices/partner-invoices.controller.ts`
- `backend/src/partner-invoices/partner-invoices.module.ts`

### Frontend (Admin):
- `frontend/src/pages/Partners.jsx`
- `frontend/src/pages/PartnerInvoices.jsx`

### Frontend (Partner Portal):
- `frontend/src/pages/partner/PartnerLogin.jsx`
- `frontend/src/pages/partner/PartnerDashboard.jsx`
- `frontend/src/pages/partner/PartnerBookings.jsx`
- `frontend/src/pages/partner/PartnerCustomers.jsx`
- `frontend/src/pages/partner/PartnerInvoices.jsx`
- `frontend/src/pages/partner/PartnerProfile.jsx`
- `frontend/src/components/partner/PartnerLayout.jsx`
- `frontend/src/contexts/PartnerAuthContext.jsx`
- `frontend/src/services/partnerApiService.js`

---

## Database Migration

After updating schema:
```bash
cd backend
npx prisma migrate dev --name add_partner_invoices
npx prisma generate
```

---

## Testing Checklist

- [ ] Create partner via admin UI
- [ ] Generate invoice for partner
- [ ] Mark invoice as paid
- [ ] Partner login via portal
- [ ] Partner views their invoices
- [ ] Partner views their bookings
- [ ] Commission calculation is correct
- [ ] Bill generation creates partner invoice
- [ ] Export invoice as PDF
- [ ] Filter and search works
- [ ] API key authentication works
