# DCMS Page Structure Reorganization Proposal

## Current Structure Analysis

### Current Roles:
- **ADMIN**: Full access (dashboard, bookings, customers, equipment, settings, reports)
- **BOAT_PILOT**: Dashboard, bookings, customers, equipment
- **GUIDE**: Dashboard, bookings, customers, equipment
- **TRAINER**: Dashboard, bookings, customers, equipment
- **INTERN**: Dashboard, bookings, customers (read-only)

### Current Pages:
1. Dashboard
2. Bookings
3. Customer Stays
4. Customers
5. Equipment
6. Boat/Dive Preparation
7. Settings

---

## Proposed Structure Based on Actual Workflow

### 1. **ADMIN TEAM** (2 persons - Customer Service)
**Responsibilities**: Customer service, bookings management, customer information

**Access:**
- ✅ **Customer Service Hub** (new focused dashboard)
  - Today's bookings overview
  - Pending bookings
  - Customer inquiries
  - Quick customer lookup
- ✅ **Bookings** (full access)
  - Create/edit/cancel bookings
  - View all bookings
  - Payment tracking
- ✅ **Customer Stays** (full access)
  - Manage customer stays
  - Track multi-day bookings
- ✅ **Customers** (full access)
  - View/edit customer profiles
  - Certification management
  - Equipment preferences
- ✅ **Dashboard** (customer service metrics)
  - Booking statistics
  - Revenue overview
  - Customer activity
- ❌ Equipment (no access - not their responsibility)
- ❌ Boat/Dive Preparation (no access - handled by guides/owners)
- ✅ Settings (limited - customer service settings only)

---

### 2. **OWNERS** (Boat Captains + Equipment Managers)
**Responsibilities**: Equipment maintenance, boat operations, specialized training

**Access:**
- ✅ **Equipment Management** (full CRUD)
  - Add/edit/delete equipment
  - Maintenance tracking
  - Revision schedules
  - Equipment allocation to locations
- ✅ **Boat/Dive Preparation** (full access)
  - Assign captains
  - Assign guides
  - Assign divers to boats
  - Dive site selection
- ✅ **Dashboard** (operational overview)
  - Equipment status
  - Boat utilization
  - Upcoming dives
- ✅ **Bookings** (view only - to see what's coming)
  - See upcoming dives
  - Check diver requirements
- ✅ **Customers** (view only - to see who's diving)
  - View customer profiles
  - Check certifications
  - Equipment sizes
- ❌ Customer Stays (no access - admin responsibility)
- ✅ Settings (equipment-related settings)

---

### 3. **GUIDES** (Some are also Boat Captains - 4 persons)
**Responsibilities**: Providing equipment to divers, dive preparation

**Access:**
- ✅ **Boat/Dive Preparation** (full access)
  - Assign divers to boats
  - Assign equipment
  - View dive schedule
- ✅ **Equipment** (view + allocate)
  - View available equipment
  - Allocate equipment to divers
  - Mark equipment as in use/available
  - Cannot add/edit/delete equipment
- ✅ **Customers** (view + edit equipment sizes)
  - View customer profiles
  - Edit equipment preferences/sizes
  - View certifications
- ✅ **Bookings** (view only)
  - See today's schedule
  - View booking details
- ✅ **Dashboard** (daily operations)
  - Today's dives
  - Equipment status
- ❌ Customer Stays (no access)
- ❌ Settings (no access)

---

### 4. **TRAINEES/INTERNS**
**Responsibilities**: Helping guides with equipment

**Access:**
- ✅ **Equipment** (view + allocate)
  - View available equipment
  - Allocate equipment to divers
  - Mark equipment as in use/available
  - Cannot add/edit/delete equipment
- ✅ **Customers** (view + edit equipment sizes)
  - View customer profiles
  - Edit equipment preferences/sizes
  - View certifications
- ✅ **Boat/Dive Preparation** (assist mode - view + limited actions)
  - View dive schedule
  - Help assign equipment
  - Cannot assign staff or make major changes
- ✅ **Bookings** (view only)
  - See today's schedule
  - View booking details
- ✅ **Dashboard** (limited - today's operations)
  - Today's dives
  - Equipment status
- ❌ Customer Stays (no access)
- ❌ Settings (no access)

---

## Proposed Navigation Structure

### For ADMIN TEAM:
```
📊 Customer Service Hub (Dashboard)
📅 Bookings
👥 Customers
🏨 Customer Stays
⚙️ Settings (limited)
```

### For OWNERS:
```
📊 Dashboard (Operational)
🛠️ Equipment Management
🚤 Boat/Dive Preparation
📅 Bookings (view only)
👥 Customers (view only)
⚙️ Settings (equipment)
```

### For GUIDES:
```
📊 Dashboard (Daily Operations)
🚤 Boat/Dive Preparation
🛠️ Equipment (allocate)
👥 Customers (view/edit sizes)
📅 Bookings (view only)
```

### For TRAINEES/INTERNS:
```
📊 Dashboard (Today's Operations)
🚤 Boat/Dive Preparation (assist)
🛠️ Equipment (allocate)
👥 Customers (view/edit sizes)
📅 Bookings (view only)
```

---

## Implementation Plan

1. **Update Role Permissions** in `authContext.js`
2. **Reorganize Navigation** in `Navigation.jsx` (role-based menu)
3. **Create Customer Service Hub** (optional - enhanced dashboard for admins)
4. **Update Equipment Page** permissions (view-only for guides/trainees)
5. **Update Boat/Dive Preparation** permissions (assist mode for trainees)
6. **Update Settings** permissions (role-based sections)

---

## Role Name Clarifications

Current roles might need renaming or clarification:
- **ADMIN** → Keep as is (customer service team)
- **BOAT_PILOT** → Could be merged with OWNER role, or kept separate if needed
- **GUIDE** → Keep as is
- **TRAINER** → This seems to be for specialized training (owners do this)
- **INTERN** → Keep as is (trainees)

**Question**: Should we add an "OWNER" role, or use BOAT_PILOT + ADMIN combination for owners?

