 3rd Party Reservation Integration Plan

## 🎯 Goal

Enable 3rd parties (booking platforms, travel agencies, etc.) to create customers and bookings through the API, while ensuring dive centers can view all customers and bookings regardless of source.

## ✅ Is It Feasible?

**YES, absolutely!** This is a common pattern called **multi-tenant/multi-source data architecture**.

## 📊 Proposed Architecture

### **Unified Tables Approach (Recommended)**

Instead of separate tables, we'll use **a single unified structure** with tracking fields:

- **Same `customers` table** - All customers (direct + 3rd party)
- **Same `bookings` table** - All bookings (direct + 3rd party)
- **Add tracking fields** - Track who created what
- **Add authorization** - Filter data based on user type

### Why This Approach?

✅ **Single Source of Truth** - All data in one place  
✅ **Easy Reporting** - Query all bookings for a location regardless of source  
✅ **No Data Duplication** - Avoids sync issues  
✅ **Better Analytics** - Compare direct vs 3rd party bookings  
✅ **Simpler Queries** - "Show all bookings for tomorrow" works naturally  

---

## 🗄️ Database Schema Changes

### 1. Create `partners` Table (3rd Party Accounts)

```prisma
model partners {
  id                String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name              String      @db.VarChar(100)  // e.g., "Booking.com", "GetYourGuide"
  company_name      String      @db.VarChar(200)
  contact_email     String      @unique @db.VarChar(100)
  contact_phone     String?     @db.VarChar(20)
  api_key           String      @unique @db.VarChar(255)  // For API authentication
  api_secret_hash   String      @db.VarChar(255)  // Hashed secret
  webhook_url       String?     @db.VarChar(255)  // For booking confirmations
  commission_rate   Decimal?    @db.Decimal(5, 2)  // e.g., 15.00 for 15%
  allowed_locations String[]    @db.Uuid  // Which locations they can book for
  is_active         Boolean?    @default(true)
  settings          Json?       @default("{}")  // Partner-specific settings
  created_at        DateTime?   @default(now()) @db.Timestamptz(6)
  updated_at        DateTime?   @default(now()) @updatedAt @db.Timestamptz(6)
  customers         customers[]
  bookings          bookings[]

  @@index([api_key], map: "idx_partners_api_key")
  @@index([is_active], map: "idx_partners_active")
  @@map("partners")
}
```

### 2. Update `customers` Table

```prisma
model customers {
  // ... existing fields ...
  
  // NEW: Track source of customer
  source            booking_source?  @default(direct)  // direct, partner, walk_in
  partner_id        String?          @db.Uuid  // NULL for direct customers
  created_by_partner_id String?      @db.Uuid  // Which partner created this customer
  
  partners          partners?        @relation(fields: [partner_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  partner_creator   partners?        @relation("partner_created_customers", fields: [created_by_partner_id], references: [id], onDelete: SetNull, onUpdate: NoAction)

  // ... existing relations ...
  
  @@index([partner_id], map: "idx_customers_partner")
  @@index([source], map: "idx_customers_source")
  @@index([created_by_partner_id], map: "idx_customers_created_by_partner")
}
```

### 3. Update `bookings` Table

```prisma
model bookings {
  // ... existing fields ...
  
  // NEW: Track source of booking
  source            booking_source?  @default(direct)  // direct, partner, walk_in
  partner_id        String?          @db.Uuid  // Which partner created this booking
  created_by_partner_id String?      @db.Uuid  // Explicit tracking
  
  partners          partners?        @relation(fields: [partner_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  partner_creator   partners?        @relation("partner_created_bookings", fields: [created_by_partner_id], references: [id], onDelete: SetNull, onUpdate: NoAction)

  // ... existing relations ...
  
  @@index([partner_id], map: "idx_bookings_partner")
  @@index([source], map: "idx_bookings_source")
  @@index([created_by_partner_id], map: "idx_bookings_created_by_partner")
}
```

### 4. Add New Enum

```prisma
enum booking_source {
  direct      // Direct booking from customer or dive center
  partner     // From 3rd party partner
  walk_in     // Walk-in customer
  phone       // Phone booking
}
```

### 5. Update `partners` Model Relations

```prisma
model partners {
  // ... existing fields ...
  
  customers_created customers[] @relation("partner_created_customers")
  bookings_created  bookings[]  @relation("partner_created_bookings")
  customers         customers[] @relation  // Current partner assignment
  bookings          bookings[]  @relation  // Current partner assignment

  // ... rest of model ...
}
```

---

## 🔐 Authentication & Authorization

### Partner Authentication Options

**Option A: API Key + Secret (Recommended for 3rd Parties)**
- Partners get an `api_key` and `api_secret`
- Send both in request headers or as Bearer token
- Fast, simple, stateless

**Option B: JWT Tokens**
- Partners authenticate once, get JWT
- More secure, can include expiration
- Better for web applications

**Implementation:**
1. Create `PartnerGuard` - Validates API key/secret
2. Create `PartnerAuthGuard` - Validates JWT for partners
3. Create `DiveCenterGuard` - For dive center staff (separate auth system)
4. Use `@UseGuards()` decorators on controllers

### Authorization Rules

| User Type | Can View | Can Create | Can Edit | Can Delete |
|-----------|----------|------------|----------|------------|
| **Partner** | Own customers/bookings only | Own customers/bookings | Own bookings only | Own bookings only |
| **Dive Center Staff** | All customers/bookings | All customers/bookings | All bookings | All bookings (with restrictions) |
| **Direct Customer** | Own bookings only | Own bookings | Own bookings (limited) | Own bookings (before date) |

---

## 🔌 API Endpoints

### Partner API Endpoints

**Base URL:** `/api/partner` (requires Partner authentication)

```
POST   /api/partner/customers           # Create customer
GET    /api/partner/customers           # List partner's customers
GET    /api/partner/customers/:id       # Get customer (if partner created it)

POST   /api/partner/bookings            # Create booking
GET    /api/partner/bookings            # List partner's bookings
GET    /api/partner/bookings/:id        # Get booking (if partner created it)
PUT    /api/partner/bookings/:id        # Update booking (limited fields)
DELETE /api/partner/bookings/:id        # Cancel booking

GET    /api/partner/availability        # Check availability for date/time
GET    /api/partner/locations           # List available locations
GET    /api/partner/dive-sites          # List dive sites
```

### Dive Center API Endpoints (Enhanced)

**Base URL:** `/api` (requires Dive Center authentication)

```
# These endpoints already exist, but will now return ALL bookings/customers
GET    /api/bookings                    # All bookings (filter by partner_id, source, etc.)
GET    /api/customers                   # All customers (filter by partner_id, source, etc.)

# New filtering capabilities
GET    /api/bookings?source=partner     # Only partner bookings
GET    /api/bookings?partner_id=xxx     # Bookings from specific partner
GET    /api/customers?source=partner    # Only partner customers
```

---

## 📝 Data Flow Examples

### Example 1: Partner Creates Booking

1. **Partner calls API:**
   ```http
   POST /api/partner/bookings
   Authorization: Bearer {partner_api_key}
   
   {
     "customer": {
       "first_name": "John",
       "last_name": "Doe",
       "email": "john@example.com",
       "phone": "+1234567890"
     },
     "location_id": "550e8400-e29b-41d4-a716-446655440001",
     "booking_date": "2025-01-15",
     "activity_type": "diving",
     "number_of_dives": 2
   }
   ```

2. **Backend creates:**
   - Customer record with `partner_id` and `source='partner'`
   - Booking record with `partner_id` and `source='partner'`

3. **Dive Center sees:**
   - Booking appears in `/api/bookings` list
   - Can filter: `GET /api/bookings?partner_id=xxx`
   - Shows partner name in booking details

### Example 2: Dive Center Views All Bookings

1. **Dive Center calls:**
   ```http
   GET /api/bookings?location_id=xxx&booking_date=2025-01-15
   Authorization: Bearer {dive_center_jwt}
   ```

2. **Backend returns:**
   - All bookings for that location/date
   - Includes both direct and partner bookings
   - Each booking shows `source` and `partner.name` (if applicable)

---

## 🔄 Implementation Steps

### Phase 1: Database Schema
1. ✅ Create `partners` table
2. ✅ Add `source` enum
3. ✅ Add `partner_id` and `source` to `customers` table
4. ✅ Add `partner_id` and `source` to `bookings` table
5. ✅ Run migration

### Phase 2: Authentication
1. Create `PartnerAuthModule`
2. Implement API key authentication
3. Create `PartnerGuard` and `PartnerAuthGuard`
4. Create partner management endpoints (admin only)

### Phase 3: Partner API
1. Create `PartnerCustomersModule` and controller
2. Create `PartnerBookingsModule` and controller
3. Implement CRUD with partner scoping
4. Add validation and error handling

### Phase 4: Dive Center Enhancements
1. Update `BookingsService` to filter by partner (optional)
2. Update `CustomersService` to filter by partner (optional)
3. Add partner information to booking/customer DTOs
4. Update frontend to show partner badges

### Phase 5: Testing & Documentation
1. Write integration tests
2. Create API documentation (Swagger)
3. Create partner onboarding guide
4. Test with sample partners

---

## 🎨 Frontend Considerations

### Admin Portal Changes

1. **Booking List:**
   - Add "Source" column (Direct/Partner)
   - Add partner name badge
   - Filter by source/partner

2. **Customer List:**
   - Add "Source" column
   - Filter by source/partner

3. **Partner Management Page:**
   - List all partners
   - Create/edit partners
   - View partner statistics
   - Generate API keys

### Partner Portal (Future)

Separate portal for partners to:
- View their bookings
- Manage their customers
- See commission reports
- Access API documentation

---

## 🔒 Security Considerations

1. **API Rate Limiting** - Prevent abuse
2. **IP Whitelisting** - Optional for partners
3. **Webhook Signing** - For booking confirmations
4. **Audit Logging** - Track all partner actions
5. **Data Validation** - Strict validation for partner input
6. **Commission Tracking** - Track what partners owe

---

## 📊 Reporting & Analytics

With unified tables, reporting becomes easier:

- **Total bookings by source** (direct vs partner)
- **Revenue by partner**
- **Partner performance metrics**
- **Customer overlap** (same customer via different sources)
- **Booking conversion rates by source**

---

## ✅ Benefits Summary

1. ✅ **Single source of truth** - All data in one place
2. ✅ **No data sync issues** - No need to merge separate tables
3. ✅ **Easy filtering** - Query all bookings with simple filters
4. ✅ **Better analytics** - Compare direct vs partner bookings
5. ✅ **Flexible** - Easy to add new sources (walk-in, phone, etc.)
6. ✅ **Scalable** - Works with many partners
7. ✅ **Maintainable** - Simple queries, clear data model

---

## ❓ Questions to Consider

1. **Commission Structure** - How do you pay partners? (Fixed fee, percentage, tiered?)
2. **Cancellation Policy** - Who handles cancellations? Partner or dive center?
3. **Customer Ownership** - Can partners see customer email/phone? (GDPR considerations)
4. **Booking Modifications** - Can partners modify bookings after creation?
5. **Webhooks** - Do you need real-time notifications to partners?
6. **Multi-location** - Can partners book for all locations or just specific ones?

---

## 🚀 Next Steps

1. **Review this plan** - Does it meet your needs?
2. **Clarify requirements** - Answer questions above
3. **Prioritize features** - What's most important first?
4. **Start implementation** - Begin with Phase 1 (database schema)

Would you like me to start implementing this? We can begin with the database schema changes.

