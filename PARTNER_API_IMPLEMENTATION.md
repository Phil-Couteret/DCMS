# Partner API Implementation Summary

## ✅ Implementation Complete

All authentication and API endpoints for 3rd party partners have been successfully implemented.

---

## 📦 What Was Created

### 1. Authentication System

**File: `backend/src/common/guards/partner-auth.guard.ts`**
- Validates API key from request headers (`x-api-key` or `api-key`)
- Optionally validates API secret for enhanced security
- Ensures partner account is active
- Attaches partner object to request for use in controllers

**File: `backend/src/common/decorators/partner.decorator.ts`**
- Decorator to extract authenticated partner from request
- Used in controllers: `@Partner() partner`

### 2. Partners Management Module

**Files:**
- `backend/src/partners/partners.service.ts`
- `backend/src/partners/partners.controller.ts`
- `backend/src/partners/partners.module.ts`

**Endpoints (Admin/Dive Center only):**
- `GET /api/partners` - List all partners
- `GET /api/partners/:id` - Get partner by ID
- `POST /api/partners` - Create new partner (generates API key/secret)
- `PUT /api/partners/:id` - Update partner
- `POST /api/partners/:id/regenerate-api-key` - Regenerate API credentials
- `DELETE /api/partners/:id` - Delete partner

**Features:**
- Auto-generates API keys (`dcms_partner_...`)
- Auto-generates API secrets (hashed with bcrypt)
- Returns API key and secret on creation/regeneration (only time shown)
- Tracks commission rates, allowed locations, webhook URLs

### 3. Partner Customers Module

**Files:**
- `backend/src/partner/partner-customers.service.ts`
- `backend/src/partner/partner-customers.controller.ts`

**Endpoints (Protected by PartnerAuthGuard):**
- `GET /api/partner/customers` - List all customers created by partner
- `GET /api/partner/customers/:id` - Get customer (only if created by partner)
- `POST /api/partner/customers` - Create new customer
- `PUT /api/partner/customers/:id` - Update customer (only if created by partner)

**Features:**
- All customers are tagged with `source='partner'` and `created_by_partner_id`
- Partners can only see/edit customers they created
- Email deduplication (returns existing customer if email matches)

### 4. Partner Bookings Module

**Files:**
- `backend/src/partner/partner-bookings.service.ts`
- `backend/src/partner/partner-bookings.controller.ts`

**Endpoints (Protected by PartnerAuthGuard):**
- `GET /api/partner/bookings` - List all bookings created by partner
- `GET /api/partner/bookings?date=YYYY-MM-DD` - Filter by date
- `GET /api/partner/bookings/:id` - Get booking (only if created by partner)
- `POST /api/partner/bookings` - Create new booking
- `PUT /api/partner/bookings/:id` - Update booking (only if created by partner)
- `POST /api/partner/bookings/:id/cancel` - Cancel booking
- `DELETE /api/partner/bookings/:id` - Delete booking

**Features:**
- All bookings are tagged with `source='partner'` and `created_by_partner_id`
- Partners can only see/edit bookings they created
- Can create customer inline when creating booking
- Validates location is allowed for partner
- Auto-sets booking status and payment status defaults

### 5. Partner Availability Module

**Files:**
- `backend/src/partner/partner-availability.controller.ts`

**Endpoints (Protected by PartnerAuthGuard):**
- `GET /api/partner/locations` - Get available locations (filtered by partner restrictions)
- `GET /api/partner/dive-sites` - Get dive sites (filtered by partner locations)
- `GET /api/partner/availability?date=YYYY-MM-DD` - Check boat availability for date

**Features:**
- Respects partner's `allowed_locations` restrictions
- Returns boat capacity and availability information
- Useful for partners to check availability before creating bookings

---

## 🔐 Authentication Flow

### For Partners

1. **Get API Credentials**
   - Admin creates partner via `POST /api/partners`
   - Response includes `apiKey` and `apiSecret` (shown only once!)
   - Store these securely

2. **Make Authenticated Requests**
   ```http
   GET /api/partner/customers
   X-API-Key: dcms_partner_xxxxxxxxxxxxxxxxxxxxx
   X-API-Secret: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (optional, but recommended)
   ```

3. **API Key Only (Simpler)**
   ```http
   GET /api/partner/customers
   X-API-Key: dcms_partner_xxxxxxxxxxxxxxxxxxxxx
   ```
   - Works with API key only
   - API secret provides additional security layer

---

## 📝 Example Usage

### 1. Create a Partner (Admin)

```http
POST /api/partners
Content-Type: application/json

{
  "name": "Booking.com",
  "companyName": "Booking.com BV",
  "contactEmail": "api@booking.com",
  "contactPhone": "+1234567890",
  "webhookUrl": "https://api.booking.com/webhooks/dcms",
  "commissionRate": 15.00,
  "allowedLocations": ["550e8400-e29b-41d4-a716-446655440001"]
}
```

**Response:**
```json
{
  "id": "xxx",
  "name": "Booking.com",
  "apiKey": "dcms_partner_abc123...",
  "apiSecret": "def456...",
  ...
}
```
⚠️ **Save the API key and secret immediately - secret is never shown again!**

### 2. Create Customer (Partner)

```http
POST /api/partner/customers
X-API-Key: dcms_partner_abc123...
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "nationality": "US"
}
```

### 3. Create Booking (Partner)

```http
POST /api/partner/bookings
X-API-Key: dcms_partner_abc123...
Content-Type: application/json

{
  "customerId": "customer-uuid",
  "locationId": "550e8400-e29b-41d4-a716-446655440001",
  "bookingDate": "2025-01-15",
  "activityType": "diving",
  "numberOfDives": 2,
  "price": 80.00,
  "totalPrice": 80.00,
  "status": "confirmed",
  "paymentStatus": "pending"
}
```

### 4. Create Booking with Inline Customer

```http
POST /api/partner/bookings
X-API-Key: dcms_partner_abc123...
Content-Type: application/json

{
  "customer": {
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "phone": "+9876543210"
  },
  "locationId": "550e8400-e29b-41d4-a716-446655440001",
  "bookingDate": "2025-01-15",
  "activityType": "diving",
  "numberOfDives": 1,
  "price": 40.00,
  "totalPrice": 40.00
}
```

### 5. Check Availability

```http
GET /api/partner/availability?date=2025-01-15&locationId=550e8400-e29b-41d4-a716-446655440001
X-API-Key: dcms_partner_abc123...
```

**Response:**
```json
{
  "date": "2025-01-15",
  "locationId": "550e8400-e29b-41d4-a716-446655440001",
  "boatAvailability": [
    {
      "boatId": "xxx",
      "boatName": "Alpha",
      "capacity": 12,
      "booked": 8,
      "available": 4
    }
  ],
  "totalBookings": 8
}
```

---

## 🔒 Security Features

1. **API Key Authentication** - Required for all partner endpoints
2. **API Secret (Optional)** - Additional security layer
3. **Partner Scoping** - Partners can only access their own data
4. **Location Restrictions** - Partners can be restricted to specific locations
5. **Active Status Check** - Inactive partners are blocked
6. **Data Isolation** - Partner data is tagged and filtered automatically

---

## 📊 Data Flow

### When Partner Creates Booking:

1. Partner calls `POST /api/partner/bookings` with API key
2. `PartnerAuthGuard` validates API key and attaches partner to request
3. Service checks:
   - Location exists and is allowed for partner
   - Customer exists and was created by same partner (or creates new one)
4. Booking created with:
   - `source = 'partner'`
   - `partner_id = partner.id`
   - `created_by_partner_id = partner.id`
5. Customer (if created) also tagged with partner info

### When Dive Center Views Bookings:

- Dive center calls `GET /api/bookings` (no partner restrictions)
- All bookings returned (direct + partner)
- Can filter by `source` or `partner_id` if needed
- Full visibility into all booking sources

---

## ✅ What's Working

- ✅ Partner authentication (API key + optional secret)
- ✅ Partner management (CRUD operations)
- ✅ Partner-scoped customer management
- ✅ Partner-scoped booking management
- ✅ Inline customer creation during booking
- ✅ Location and availability endpoints
- ✅ Data isolation and security
- ✅ Swagger API documentation
- ✅ Error handling and validation

---

## 🔜 Next Steps (Optional Enhancements)

1. **Webhook Notifications**
   - Send booking confirmations to partner's `webhook_url`
   - Implement webhook signing for security

2. **Rate Limiting**
   - Add rate limiting per partner
   - Prevent API abuse

3. **Commission Tracking**
   - Calculate and track commission amounts
   - Generate commission reports

4. **Audit Logging**
   - Log all partner API calls
   - Track booking modifications

5. **Partner Portal UI**
   - Web interface for partners
   - View bookings, customers, statistics

---

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:3003/api`
- Look for `partner` and `partners` tags

---

## 🧪 Testing

To test the implementation:

1. **Create a partner:**
   ```bash
   curl -X POST http://localhost:3003/api/partners \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Partner",
       "companyName": "Test Company",
       "contactEmail": "test@example.com",
       "commissionRate": 10.00
     }'
   ```

2. **Use the returned API key to create a customer:**
   ```bash
   curl -X POST http://localhost:3003/api/partner/customers \
     -H "Content-Type: application/json" \
     -H "X-API-Key: YOUR_API_KEY_HERE" \
     -d '{
       "firstName": "John",
       "lastName": "Doe",
       "email": "john@example.com"
     }'
   ```

3. **Create a booking:**
   ```bash
   curl -X POST http://localhost:3003/api/partner/bookings \
     -H "Content-Type: application/json" \
     -H "X-API-Key: YOUR_API_KEY_HERE" \
     -d '{
       "customerId": "CUSTOMER_ID_HERE",
       "locationId": "LOCATION_ID_HERE",
       "bookingDate": "2025-01-15",
       "activityType": "diving",
       "price": 50.00,
       "totalPrice": 50.00
     }'
   ```

---

## 🎉 Summary

The partner API is fully functional and ready to use! Partners can now:
- Create and manage their customers
- Create and manage their bookings
- Check availability
- All data is properly scoped and secured
- Dive centers can see all bookings regardless of source

All implementation is complete and tested. The build succeeds and all modules are properly integrated.

