# Pricing Structure in DCMS

## Current Implementation (PWA/localStorage)

### Storage Location
Prices are stored in `location.pricing` object, nested within each location record in localStorage (`dcms_locations`).

### Structure Overview

```
location.pricing = {
  customerTypes: {
    tourist: {
      orientationDive: 32.00,      // Special price for orientation dive
      diveTiers: [                 // Volume-based pricing
        { dives: 1, price: 46.00, description: "1-2 dives" },
        { dives: 3, price: 44.00, description: "3-5 dives" },
        ...
      ]
    },
    local: {
      pricePerDive: 35.00          // Fixed price per dive
    },
    recurrent: {
      pricePerDive: 32.00          // Fixed price per dive
    }
  },
  equipment: {
    completeEquipment: 13.00,
    Suit: 5.00,
    BCD: 5.00,
    ...
  },
  addons: {
    night_dive: 20.00,
    personal_instructor: 100.00,
    ...
  },
  diveInsurance: {
    one_day: 7.00,
    one_week: 18.00,
    one_month: 25.00,
    one_year: 45.00
  },
  beverages: {
    water: 1.80,
    soft_drinks: 1.80,
    ...
  },
  tax: {
    igic_rate: 0.07,
    igic_label: "IGIC (7%)"
  },
  // MISSING: certifications
}
```

### Activity Types with Prices

1. **Dives** - Associated with customer type (tourist/local/recurrent)
   - Regular dives: Tiered (tourist) or fixed (local/recurrent)
   - Orientation dive: Special price for tourists (`orientationDive`)

2. **Discovery Dive** - Currently hardcoded in `pricingService.js` (100€)
   - ❌ **NOT in location.pricing** - needs to be added

3. **Certifications** - ❌ **NOT currently in location.pricing**
   - Should be added as `certifications` object with agency and course code

### Where Prices are Used

- **Frontend (Admin Portal)**: `frontend/src/components/Settings/Prices.jsx`
- **Frontend (Public Website)**: `public-website/src/services/pricingService.js`
- **Pricing Calculation**: `frontend/src/services/pricingService.js`

---

## Future Database Implementation

### Database Tables

1. **`pricing_configs`** - Unified pricing table (standard prices, promotions, discounts, overrides)
   ```sql
   CREATE TABLE pricing_configs (
       id UUID PRIMARY KEY,
       location_id UUID REFERENCES locations(id),
       pricing_type VARCHAR(50) NOT NULL DEFAULT 'standard',  -- 'standard', 'promotion', 'discount', 'override'
       activity_type activity_type,                            -- NULL for general promotions
       activity_reference_id UUID,                             -- References courses.id, equipment.id, etc.
       name VARCHAR(100) NOT NULL,
       description TEXT,
       pricing_rules JSONB NOT NULL,                           -- Flexible: base_price, discount_percentage, fixed_price, tiers, etc.
       conditions JSONB DEFAULT '{}',                          -- Conditions: customer_type, date_range, min_quantity, etc.
       priority INTEGER DEFAULT 0,                             -- Higher priority overrides lower
       valid_from DATE NOT NULL,
       valid_until DATE,
       is_active BOOLEAN DEFAULT true
   );
   ```

2. **`courses`** - Course catalog with base prices
   ```sql
   CREATE TABLE courses (
       id UUID PRIMARY KEY,
       agency_id UUID REFERENCES certification_agencies(id),
       course_code VARCHAR(50) NOT NULL,      -- 'OW', 'AOW', 'RESCUE', etc.
       course_name VARCHAR(100) NOT NULL,
       course_type ENUM('recreational', 'professional', 'specialty'),
       base_price DECIMAL(10,2) NOT NULL,     -- Base price per course
       ...
   );
   ```

### ✅ **Implementation: Single Unified Table**

The database schema has been updated to use a single unified `pricing_configs` table. All pricing (standard, promotions, discounts) is now stored in one table.

#### Option 1: Single Unified Pricing Table ✅ **Recommended for simplification**
You could merge `pricing_configs` and `special_pricing` into one table:

```sql
CREATE TABLE pricing_configs (
    id UUID PRIMARY KEY,
    location_id UUID REFERENCES locations(id),
    pricing_type VARCHAR(50) NOT NULL,  -- 'standard', 'promotion', 'discount', 'override'
    activity_type activity_type,        -- NULL for general promotions
    activity_reference_id UUID,         -- References courses.id, equipment.id, etc. if applicable
    name VARCHAR(100) NOT NULL,
    pricing_rules JSONB NOT NULL,       -- Flexible: base_price, discount_percentage, fixed_price, etc.
    conditions JSONB DEFAULT '{}',      -- Conditions for applying (date range, customer type, etc.)
    valid_from DATE NOT NULL,
    valid_until DATE,
    priority INTEGER DEFAULT 0,         -- Higher priority overrides lower (for promotions)
    is_active BOOLEAN DEFAULT true
);
```

**Pros:**
- ✅ Single source of truth for all pricing
- ✅ Simpler queries (one table instead of two)
- ✅ Easier to manage
- ✅ Flexible JSONB structure handles all pricing scenarios

**Cons:**
- ❌ Slightly more complex queries (need to filter by pricing_type)
- ❌ Less explicit separation between standard and promotional pricing

#### ✅ **Implementation: Single Unified Table**

The database schema has been updated to use a single unified `pricing_configs` table:

```sql
CREATE TABLE pricing_configs (
    id UUID PRIMARY KEY,
    location_id UUID REFERENCES locations(id),
    pricing_type VARCHAR(50) NOT NULL DEFAULT 'standard',  -- 'standard', 'promotion', 'discount', 'override'
    activity_type activity_type,                            -- NULL for general promotions
    activity_reference_id UUID,                             -- References courses.id, equipment.id, etc.
    name VARCHAR(100) NOT NULL,
    description TEXT,
    pricing_rules JSONB NOT NULL,                           -- Flexible pricing structure
    conditions JSONB DEFAULT '{}',                          -- Conditions for applying
    priority INTEGER DEFAULT 0,                             -- Override priority
    valid_from DATE NOT NULL,
    valid_until DATE,
    is_active BOOLEAN DEFAULT true
);
```

**Benefits:**
- ✅ Single source of truth for all pricing
- ✅ Simple queries (no joins needed)
- ✅ Flexible JSONB structure handles all scenarios
- ✅ Priority field enables promotion overrides

#### About the `courses` Table
The `courses` table should remain separate because:
- It's a **catalog** table, not just a pricing table
- Contains metadata: prerequisites, duration, max students, equipment included, etc.
- The `base_price` field is a **default/reference price**, but actual pricing can vary by location (stored in `pricing_configs`)
- You might reference a course from `pricing_configs` via `activity_reference_id`

**Implementation Status:** ✅ **COMPLETED**
- ✅ Merged `special_pricing` into unified `pricing_configs` table
- ✅ `courses` table remains separate (it's a catalog, not just pricing)
- ✅ `activity_reference_id` field available to link to courses when needed
- ✅ Added indexes for optimal query performance

### Activity Type Enum (from schema)
- `dive` - Regular diving activities
- `course` - Certification courses
- `equipment` - Equipment rental
- `discover` - Discovery dive
- `orientation` - Orientation dive
- `snorkeling` - Snorkeling activities

---

## Adding Certification Prices

### Option 1: Add to location.pricing (Current PWA)
```javascript
location.pricing.certifications = {
  // SSI Courses
  SSI: {
    OW: { price: 465.00, name: "Open Water Diver" },
    AOW: { price: 350.00, name: "Advanced Open Water" },
    RESCUE: { price: 400.00, name: "Rescue Diver" },
    DM: { price: 800.00, name: "Divemaster" },
    INSTRUCTOR: { price: 1200.00, name: "Open Water Instructor" },
    NIGHT: { price: 150.00, name: "Night Diving" },
    DEEP: { price: 180.00, name: "Deep Diving" }
  },
  // PADI Courses
  PADI: {
    OW: { price: 450.00, name: "Open Water Diver" },
    AOW: { price: 340.00, name: "Advanced Open Water" },
    RESCUE: { price: 380.00, name: "Rescue Diver" },
    DM: { price: 750.00, name: "Divemaster" },
    INSTRUCTOR: { price: 1100.00, name: "Open Water Instructor" }
  },
  // CMAS Courses
  CMAS: {
    '1STAR': { price: 400.00, name: "1 Star Diver" },
    '2STAR': { price: 500.00, name: "2 Star Diver" },
    '3STAR': { price: 700.00, name: "3 Star Diver" },
    INSTRUCTOR: { price: 1000.00, name: "CMAS Instructor" }
  },
  // VDST Courses
  VDST: {
    BRONZE: { price: 380.00, name: "Bronze Diver" },
    SILVER: { price: 480.00, name: "Silver Diver" },
    GOLD: { price: 680.00, name: "Gold Diver" },
    INSTRUCTOR: { price: 950.00, name: "VDST Instructor" }
  }
}
```

### Option 2: Database (Future)
Use the `courses` table with `base_price` field. Prices can be location-specific via `pricing_configs` table linking `course_id` + `location_id`.

---

## Summary

### ✅ Currently Stored
- ✅ Dive prices (tourist/local/recurrent)
- ✅ Orientation dive price
- ✅ Equipment rental prices
- ✅ Addon services prices
- ✅ Dive insurance prices
- ✅ Beverage prices
- ✅ Tax configuration

### ✅ Recently Added
- ✅ Discovery dive price (moved from hardcoded 100€ to `location.pricing.customerTypes.tourist.discoverDive`)

### ❌ Missing
- ❌ Certification course prices (per agency + course code)

### 📋 Next Steps
1. Add certification pricing to `location.pricing.certifications`
2. Update Prices.jsx UI to manage certification prices
3. Update pricingService.js to calculate certification prices
4. Future: Migrate to database using unified `pricing_configs` table (see "Can We Use a Single Table?" section above)

