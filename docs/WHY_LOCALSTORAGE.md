# Why Does Customer Portal Use localStorage?

## Current localStorage Usage

The customer portal currently uses localStorage for:

1. **`dcms_user_email`** - Login state persistence
   - Stores the logged-in user's email
   - Used to maintain login state across page refreshes
   - **Necessary?** Yes - without this, user would be logged out on every page refresh

2. **`dcms_customers`** - Customer data cache
   - Stores customer profiles (including the current user's profile)
   - Used for:
     - Login validation (checking if customer exists, verifying password)
     - Profile display in My Account page
     - Booking creation (checking if customer exists, pre-filling forms)
   - **Necessary?** Questionable - could fetch from sync server/backend on demand

3. **`dcms_bookings`** - Booking data cache
   - Stores all bookings (filtered to show user's bookings)
   - Used for displaying bookings in My Account page
   - **Necessary?** Questionable - could fetch from sync server/backend on demand

4. **`dcms_locations`** - Location data
   - Stores location information (Caleta, Las Playitas)
   - Used for booking form dropdown
   - **Necessary?** Could be static/configuration data, doesn't need sync

5. **`dcms_equipment`** - Equipment data
   - Stores equipment inventory
   - Used for equipment management
   - **Necessary?** Probably not needed in customer portal

## Why localStorage is Currently Used

### For PWA (Progressive Web App):
- **Offline Support**: localStorage allows the app to work offline (though currently sync requires server connection)
- **Performance**: Caching data locally reduces server requests
- **Login Persistence**: Maintains login state without requiring backend session management

### Current Architecture:
- Customer portal and admin portal are separate origins (different ports)
- Sync server acts as intermediary (shares data between portals)
- localStorage acts as local cache before/after sync

## Could We Remove localStorage?

### Option 1: Minimal localStorage (Recommended)
Keep only:
- `dcms_user_email` - For login state persistence

Fetch everything else from sync server/backend on page load:
- Customer profile → fetch on login/My Account page load
- Bookings → fetch on My Account page load
- Locations → could be static config (doesn't need sync)

**Pros:**
- Simpler data flow
- Always fresh data
- No stale data issues
- Less storage usage

**Cons:**
- Requires server connection for every operation
- Slower initial page load
- No offline support

### Option 2: Remove All localStorage
- Store nothing locally
- Fetch everything from backend/sync server on demand
- Use session-based authentication (cookies/tokens)

**Pros:**
- Simplest architecture
- Single source of truth (backend)
- No sync issues

**Cons:**
- Requires backend API for everything
- No offline support
- More server load

### Option 3: Keep Current Architecture
- Keep localStorage as cache
- Sync on page load (already implemented)
- Push changes immediately when data is modified

**Pros:**
- Better performance (cached data)
- Can work offline (once data is cached)
- Faster page loads

**Cons:**
- Can have stale data issues
- More complex sync logic
- More storage usage

## Recommendation

For the **current POC/Prototype**, I recommend **Option 1** (Minimal localStorage):

1. **Keep:** `dcms_user_email` (login state)
2. **Remove:** `dcms_customers`, `dcms_bookings`, `dcms_locations`, `dcms_equipment` from localStorage
3. **Fetch on demand:**
   - Customer profile: Fetch on login and My Account page load
   - Bookings: Fetch on My Account page load
   - Locations: Use static configuration (doesn't change often)

This would:
- Eliminate stale data issues
- Simplify sync logic (only push, no cache to maintain)
- Still maintain login state persistence
- Ensure customer always sees latest data (admin updates)

**However**, this would require:
- Refactoring `bookingService` to fetch from sync server instead of localStorage
- Updating login flow to fetch customer data from server
- Updating My Account page to fetch bookings from server
- Removing localStorage read/write operations from booking service

## Current Sync Behavior (After Recent Changes)

- **No periodic sync** - Removed periodic pull/push intervals
- **Pull on page load** - Data fetched when:
  - User logs in (Login.jsx)
  - User opens My Account page (MyAccount.jsx)
  - User clicks "Refresh" button
- **Push immediately** - Data pushed when:
  - Customer creates booking
  - Customer updates profile
  - Customer registers

This reduces stale data issues, but localStorage still acts as a cache that can become outdated between page loads.

