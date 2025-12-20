# Pricing FAQ: Unified Pricing Table and Booking Prices

## Current State vs Future Database

### Current PWA (localStorage)
- **Pricing stored in**: `location.pricing` object in localStorage (`dcms_locations`)
- **Structure**: Nested JSON structure (customerTypes, equipment, addons, etc.)
- **Status**: ✅ **Currently in use**

### Future Database Implementation
- **Pricing stored in**: `pricing_configs` table (unified table)
- **Structure**: Single table with `pricing_type`, `pricing_rules` JSONB, `conditions` JSONB
- **Status**: 🔄 **Schema ready, not yet connected to PWA**

---

## Will the PWA Use the Unified Pricing Table?

**Yes, eventually!** When the PWA connects to the database backend, it will use the unified `pricing_configs` table instead of localStorage.

**Migration Path:**
1. ✅ Database schema created (unified `pricing_configs` table)
2. 🔄 Backend API to read/write `pricing_configs`
3. 🔄 PWA frontend updated to use API instead of localStorage
4. 🔄 Data migration from localStorage `location.pricing` to `pricing_configs` table

---

## Booking Prices: Display Without Recalculation

### ✅ **Yes, booking prices display correctly without recalculation!**

**How it works:**

1. **Prices are stored at booking creation time:**
   ```javascript
   const booking = {
     id: '...',
     price: 46.00,           // Base price calculated at booking time
     discount: 0,
     totalPrice: 46.00,      // Final price including all addons
     // ... other fields
   };
   ```

2. **Booking records include:**
   - `price` - Base price (dive price, course price, etc.)
   - `discount` - Any discounts applied
   - `totalPrice` - Final total (including equipment, insurance, etc.)

3. **Display in UI:**
   - Bookings list shows `booking.totalPrice` directly
   - No recalculation needed - prices are **stored values**
   - Historical bookings retain their original prices

### Why Recalculation Exists

There's a **"Recalculate Prices"** button in the Bookings page, but it's **optional**:

- **Purpose**: Update historical bookings when pricing rules change
- **When to use**: 
  - After changing pricing in Settings → Prices
  - When you want historical bookings to reflect new prices
  - For bulk updates
- **When NOT needed**:
  - ✅ Displaying bookings (uses stored `totalPrice`)
  - ✅ Viewing booking history
  - ✅ Generating bills/reports (uses stored prices)

### Example Scenario

1. **Day 1**: Customer books 2 dives at €46/dive = €92 (stored in booking)
2. **Day 2**: Admin changes price to €44/dive in Settings
3. **Display**: Old booking still shows €92 (correct - it's what was charged)
4. **Recalculation** (optional): If you run recalculation, the old booking would update to €88 (new price)
5. **New bookings**: Use €44/dive (from current pricing)

---

## Database Schema: Bookings Table

```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY,
    customer_id UUID,
    location_id UUID,
    price DECIMAL(10,2) NOT NULL,        -- Base price (stored at booking time)
    discount DECIMAL(10,2) DEFAULT 0,    -- Discount applied
    total_price DECIMAL(10,2) NOT NULL,  -- Final total (stored at booking time)
    -- ... other fields
);
```

**Key points:**
- `price` and `total_price` are **stored values** (snapshot at booking time)
- No foreign key to `pricing_configs` (bookings don't reference current prices)
- Historical accuracy: Shows what was actually charged

---

## Unified Pricing Table Structure

When the PWA uses the database, it will:

1. **Read prices from `pricing_configs`** when creating new bookings
2. **Calculate price** using current pricing rules
3. **Store calculated price** in the booking record
4. **Display stored price** from booking (no recalculation needed)

### Example Pricing Config Record

```sql
INSERT INTO pricing_configs (
    location_id,
    pricing_type,        -- 'standard', 'promotion', 'discount'
    activity_type,       -- 'diving', 'course', 'equipment'
    name,
    pricing_rules,       -- JSONB: {"base_price": 46.00, "tiers": [...]}
    conditions,          -- JSONB: {"customer_type": "tourist"}
    priority,
    valid_from,
    valid_until
) VALUES (
    'location-uuid',
    'standard',
    'diving',
    'Tourist Dive Pricing',
    '{"customer_types": {"tourist": {"tiers": [{"dives": 1, "price": 46}, {"dives": 3, "price": 44}]}}}',
    '{"customer_type": "tourist"}',
    0,
    '2025-01-01',
    NULL
);
```

---

## Summary

### ✅ What Works Now
- ✅ Booking prices display correctly (uses stored `totalPrice`)
- ✅ No recalculation needed for display
- ✅ Historical bookings show original prices

### 🔄 Future (Database)
- 🔄 PWA will use unified `pricing_configs` table
- 🔄 Prices calculated from `pricing_configs` at booking creation
- 🔄 Stored in booking record (still no recalculation needed for display)

### ⚠️ Optional Feature
- ⚠️ "Recalculate Prices" button exists but is optional
- ⚠️ Only use if you want historical bookings updated with new prices
- ⚠️ Not required for normal operation

