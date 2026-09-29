# Original features reference (frontend-old)

A complete description of the old admin frontend in `frontend-old/src`: every page, component, field, action, business rule and data model. It exists so the rebuild (NestJS `backend/` + Next.js `backoffice/`) never needs to go back to the old source.

- **Covers:** `frontend-old/src/pages/`, `components/`, `hooks/`, `services/`, `data/`, plus the app shell (`App.jsx`, `config/`, `utils/`).
- **Source state:** as of commit `3a68bc0` (2026-09-29). `frontend-old` is not maintained; if it ever changes, this document does not.
- **Describes what the code does, not what it should do.** Bugs, dead code and inconsistencies are recorded under each area's *Quirks* heading so they are not copied into the rebuild by accident.
- **Credentials:** default and seed passwords that exist in the old code are written as `<redacted>`.

## Reading notes

- **Three pricing implementations.** Prices are computed by `services/pricingService.js` (the live path used by the booking form and stays), by the mock-mode `calculatePrice` in the data layer, and by `components/Booking/VolumeDiscountCalculator.jsx`. Tourist dive tiers are stored as *lower bounds* (`{ dives: 1, price: 46 }` means "1-2 dives"). `pricingService` reads them that way and is the correct rule: 1-2 dives 46 €, 3-5 44 €, 6-8 42 €, 9-12 40 €, 13+ 38 € per dive. The other two use `tiers.find(t => t.dives >= n)`, which is off by one (2 dives priced at 44 €). The pricing and data-layer sections each describe their own code path.
- **Storage.** The data mode is hard-coded to the real API, but several features still keep their data only in the browser's localStorage (expenses, closed days, stay costs, the "billed" flag, tank details). Each section says which fields live where.
- **Location types.** Most screens behave differently for diving and rental (bike, surf, kite…) locations; see [Multi-tenant and multi-location model](#multi-tenant-and-multi-location-model).

## Contents

- [Application overview](#application-overview)
- [Customers and bookings](#customers-and-bookings)
- [Billing and financial](#billing-and-financial)
- [Operations: schedule, trips, boat preparation, breaches](#operations-schedule-trips-boat-preparation-breaches)
- [Dashboard, equipment, stays and pricing](#dashboard-equipment-stays-and-pricing)
- [Settings, users, partners and navigation](#settings-users-partners-and-navigation)
- [Data layer and data models](#data-layer-and-data-models)

---

## Application overview

### Stack and entry point

- React SPA built with Vite, MUI (`@mui/material`, `@mui/icons-material`), React Router. PWA via `vite-plugin-pwa` (`registerType: 'autoUpdate'`).
- `index.jsx` renders `<App />` in `React.StrictMode` and exposes `syncService` as `window.syncService` (initialised on import, see [Data layer](#data-layer-and-data-models)).
- `App.jsx` provider nesting (outer → inner): `AuthProvider` → `LanguageProvider` → `PartnerAuthProvider` → MUI `ThemeProvider` (primary `#1976d2`, secondary `#dc004e`) + `CssBaseline` → `BrowserRouter` → `Suspense`.
- Every page is lazy-loaded (`React.lazy`, one chunk per route) with a centred `CircularProgress` fallback (min height 60vh).
- Admin layout: `Navigation` (top bar + drawer) beside a `<main>` with background `#f5f5f5`, padding 3, top margin 8 for the app bar.

### Routes

Two route trees. Partner routes are outside the admin layout; everything else is wrapped in `ProtectedRoute` (login required) and then a per-route `ProtectedRoute requiredPermission=…`.

| Path | Page component | Required permission | Notes |
|---|---|---|---|
| `/partner/login` | `pages/partner/PartnerLogin` | none (public) | Partner portal login |
| `/partner/dashboard` | `pages/partner/PartnerDashboard` | partner session (`ProtectedPartnerRoute`) | Partner portal |
| `/` | `pages/Dashboard` | `dashboard` | |
| `/bookings` | `pages/Bookings` | `bookings` | list |
| `/bookings/new` | `pages/Bookings` | `bookings` | renders the booking form |
| `/bookings/:id` | `pages/Bookings` | `bookings` | edit a booking |
| `/stays` | `pages/Stays` | `stays` | "Current Customers" |
| `/customers` | `pages/Customers` | `customers` | `?mode=new` and `?id=` open `CustomerForm` |
| `/equipment` | `pages/Equipment` | `equipment` | |
| `/boat-prep` | `pages/BoatPrep` | `boatPrep` | |
| `/schedule` | `pages/Schedule` | `boatPrep` | |
| `/schedule/trip/:date/:type/:boatId?/:session?` | `pages/TripDetails` | `boatPrep` | |
| `/settings` | `pages/Settings` | `settings` | |
| `/breaches` | `pages/Breaches` | `settings` | GDPR data breaches |
| `/bill` | `pages/Bill` | `stays` | bill generator/viewer |
| `/bills` | `pages/Bills` | `stays` | |
| `/partners` | `pages/Partners` | `settings` | |
| `/partner-invoices` | `pages/PartnerInvoices` | `settings` | |
| `/financial` | `pages/Financial` | `settings` | |

### Roles and permissions (`utils/authContext.jsx`)

- `USER_ROLES`: `superadmin`, `admin`, `boat_pilot`, `guide`, `trainer`, `intern`. Roles are kept "for backward compatibility"; **permissions are primary**.
- `AVAILABLE_PERMISSIONS` (key → label): `dashboard` → Dashboard, `bookings` → Bookings, `customers` → Customers, `stays` → Current Customers, `equipment` → Equipment, `boatPrep` → Boat Preparation, `settings` → Settings.
- `hasPermission(user, route)`: superadmin → always true; otherwise `user.permissions` (array) must include the key; no array → false.
- `canAccess(route)` (from `useAuth()`): superadmin → true. For `settings`, the user needs the `settings` permission **and** must be a *global* user (`locationAccess` missing or empty array). Otherwise `hasPermission`.
- `isAdmin()` is true for `admin` and `superadmin`; `isSuperAdmin()`, `isGuide()` check the role. Many screens gate admin-only actions on `isAdmin()` rather than on permissions.
- Session: `login(user)` stores the user object in localStorage `dcms_current_user` (and `dcms_tenant_slug` when `user.tenantSlug` is set). `logout()` removes `dcms_current_user`, `dcms_tenant_slug`, `auth_token`. There is no token expiry handling in the context.
- Location access helpers: `hasLocationAccess(user, locationId)` (global when `locationAccess` missing/empty), `getAccessibleLocations(user)` (returns `['all']` for global users), `isMultiLocationUser(user)` (global or more than one location).
- `utils/createSuperadmin.js`: console utility that clones the first `admin` user into a `superadmin` (username `superadmin_<username>`, name `Super <name>`, email `superadmin.<email>`), unless a superadmin already exists. It copies the admin's password or falls back to a hard-coded default.

### Partner session (`utils/partnerAuthContext.jsx`)

- `login(identifier, apiSecret, method = 'apiKey')` posts to `/partner-auth/login` with `{ apiKey, apiSecret }` or, for `method === 'email'`, `{ email, apiSecret }`.
- Response `{ access_token, partner }`. Both are stored in localStorage (`partner_token`, `partner_data`), and the token is set on `httpClient` with scope `'partner'`.
- Errors: the message after the first `:` of the thrown error is shown, default `Login failed`.
- `logout()` clears both keys and the httpClient token. `isAuthenticated()` needs both a partner and a token.

### Multi-tenant and multi-location model

- **Tenant** (`utils/tenantContext.js`, `getTenantSlug()`), resolved in this order:
  1. Hostname: `admin.*` / `api.*` → no tenant (platform/superadmin). `{slug}.(dcms|admin|api).…` → `slug`.
  2. The logged-in user's `tenantSlug`. If the user has only a `tenant_id`, it returns `null` and lets the backend use a header.
  3. localStorage `dcms_tenant_slug` (the superadmin switcher). `setTenantSlug(slug)` writes or clears it.
  - Production domains referenced: `admin.couteret.fr`, `api.couteret.fr`.
- **Location**: a tenant has several locations. The current one is in localStorage `dcms_current_location`, and changing it dispatches the window event `dcms_location_changed`, which pages listen to in order to reload.
- **Location types** (`utils/locationTypes.js`): stored in `settings.locationTypes` (empty by default), each `{ id, name, displayName, icon, color, order, isActive, features }`. `locations.type` is a free slug (VARCHAR(50)).
  - Type ids must match `/^[a-z][a-z0-9_]*$/`.
  - Feature flags: `requiresBoats`, `requiresDiveSites`, `requiresCertifications`, `requiresMedicalClearance`.
  - Defaults when a type isn't configured: `diving` → all four true. `bike_rental`, `surf`, `kite_surf`, `wing_foil`, `windsurf`, `stand_up_paddle`, `future` → all false.
  - `RENTAL_TYPE_IDS` = the six rental types (`future` excluded).
  - `hasFeature(location, key, settings)` checks the configured features, then the defaults, else false.
  - `hasDivingFeatures(location, settings)` = `hasFeature(…, 'requiresDiveSites')`. Screens use it to switch between "diving" and "bike rental" behaviour (e.g. `CustomerForm` hides all diving fields and auto-approves customers for rental locations).
  - `isRentalLocation(location)` means the type is in `RENTAL_TYPE_IDS`.
  - `getDisplayName(settings, typeId)` returns the config's displayName, then its name, else the humanised slug. `getTypeColor(settings, typeId)` returns the config colour or `'default'`.

### Internationalisation (`utils/languageContext.jsx`, `utils/translations.js`)

- Languages: `es`, `en`, `de`, `ca`, `fr`. `LanguageSwitcher` shows them in the order Español, Català, English, Français, Deutsch.
- Current language is in localStorage `dcms_language`, default `en`.
- `t('a.b.c')` walks `translations[lang]` and falls back to **the key itself** (not to English) when missing. Several components pass `t(...) || 'English text'`, which never triggers because a missing key returns the key string.
- Top-level namespaces: `settings`, `stays`, `nav`, `dashboard`, `bookings`, `customers`, `equipment`, `common`, `financial`, `schedule`, `boatPrep`, `bills`, `partners`, `breaches`, `partner`, `partnerInvoices`.
- Many strings in components are hard-coded English and not translated.
- Notable translated domain vocabulary:
  - Financial expense categories: gasoline, tankNet, glue, equipment ("New Equipment"), maintenance, other.
  - Quarterly tax title template: `Quarterly {tax} Declaration`.
  - Partner invoice statuses: pending, partial, paid, overdue.
  - Breach statuses: detected, assessed, reported, resolved, overdue.

### Schedule constants (`utils/scheduleConstants.js`)

- Mole (shore "discovery") slots: start `09:30`, each lasts 60 min, a new slot every 30 min.
- Boat sessions: Morning `09:00` for 240 min, Afternoon `12:00` for 240 min, Night `18:00` for 120 min.

### localStorage keys (app shell)

| Key | Holds |
|---|---|
| `dcms_current_user` | Logged-in staff user object (including permissions, locationAccess, tenantSlug) |
| `dcms_tenant_slug` | Selected tenant slug |
| `auth_token` | Staff API token (removed on logout) |
| `dcms_current_location` | Current location id |
| `dcms_language` | UI language |
| `partner_token`, `partner_data` | Partner portal session |

Entity storage keys (`dcms_customers`, etc.) are listed in the data layer section.

---

## Customers and bookings

Covers `pages/Customers.jsx`, `pages/Customers.smoke.test.jsx`, `pages/Bookings.jsx`, `components/Customer/CustomerForm.jsx`, `components/Booking/BookingForm.jsx`, `components/Booking/VolumeDiscountCalculator.jsx`.

External dependencies used by these files:

| Dependency | Used for |
|---|---|
| `services/dataService.js` → `getAll(entity)`, `getById(entity,id)`, `create(entity,data)`, `update(entity,id,data)`, `searchCustomers(query)`, `getCustomerBookings(customerId)` | All data access. In API mode `getCustomerBookings`/`searchCustomers` are **async** (return Promises); in mock mode they are sync. |
| `services/pricingService.js` → `calculateDivePrice`, `calculateActivityPrice`, `getCustomerType` | Dive / activity base prices. Reads location pricing from **localStorage `dcms_locations`**, not from the API-loaded list. |
| `services/stayService.js` → `getCumulativeStayPricing(customerId, stayStartDate)` | Tourist volume-discount price per dive over a 30-day stay window. |
| `services/bookingRepricingService.js` → `recalculateAllBookingPrices()` (async) | "Reprice Bookings" button. |
| `utils/locationTypes.js` → `hasDivingFeatures(location, settings)` | Customers screens: "bike rental" = location whose type does **not** have `requiresDiveSites` (with `settings=null`, falls back to `DEFAULT_FEATURES[type]`: only `diving` → true; `bike_rental`, `surf`, `kite_surf`, `wing_foil`, `windsurf`, `stand_up_paddle`, `future`, unknown types → false). |
| `utils/authContext` → `useAuth()` (`isAdmin()`, `currentUser.locationAccess`) | Role gating / default location. |
| `utils/languageContext` → `useTranslation().t` | i18n keys (listed where used). |

Shared browser state:

| Key / event | Type | Read/written by |
|---|---|---|
| `dcms_current_location` | localStorage (location id) | Read by all; **written** by BookingForm (on mount if user has `locationAccess`, and on Location select change). |
| `dcms_customers`, `dcms_bookings` | localStorage keys watched via `storage` event | Customers / Bookings list reload. |
| `dcms_pricingConfig` | localStorage JSON array | VolumeDiscountCalculator tiers. |
| `dcms_location_changed` | window event | Customers, CustomerForm, Bookings reload. |
| `dcms_customer_created`, `dcms_customer_updated`, `dcms_customers_synced` | window events | Customers list reload. |
| `dcms_booking_created`, `dcms_bookings_synced` | window events | Bookings list reload. |

---

### Customers page

- **File**: `pages/Customers.jsx`
- **Route**: `/customers` (App.jsx, `ProtectedRoute requiredPermission="customers"`). Query params switch mode: `?mode=new` → renders `<CustomerForm/>` (create); `?id=<customerId>` → renders `<CustomerForm/>` (edit/view). Otherwise renders the list.
- **Purpose**: List customers relevant to the current location type (diving vs rental), search them, toggle approval, bulk-import from CSV, navigate to create/edit.

#### Data loaded

- Only when neither `mode` nor `id` param is set:
  - `dataService.getAll('customers')`
  - `dataService.getAll('locations')` (to resolve current location from `localStorage.dcms_current_location`)
  - `dataService.getAll('partners')` (for partner names)
- **Location-type filter** (`loadCustomers`):
  - `isBikeRental = currentLocation ? !hasDivingFeatures(currentLocation, null) : false` (no location selected ⇒ treated as diving).
  - `hasCustomerType = customer.customerType && customer.customerType.trim() !== ''`
  - `isPartnerCustomer = !!(customer.partnerId || customer.partner_id || customer.source === 'partner' || customer.created_by_partner_id)`
  - Rental ("bike rental") location: keep `!hasCustomerType && !isPartnerCustomer`.
  - Diving location (or none): keep `hasCustomerType || isPartnerCustomer`.
  - Not filtered by location id — only by customer "kind". No sorting (API order).
- **Search**: typing calls `handleSearch(query)` on every keystroke: non-blank → `dataService.searchCustomers(query)` and the result replaces the list **unfiltered by location type**; blank → `loadCustomers()`.
- **Refresh triggers**: window events `dcms_customer_created`, `dcms_customer_updated`, `dcms_customers_synced`, `dcms_location_changed`; `storage` event with key `dcms_customers` or null key; **polling every 2 s**: `getAll('customers')` and reload if total count ≠ displayed count.
- On error: list set to `[]` (console only).

#### UI layout

1. Header row: `<h4>` `t('customers.title')`; buttons right-aligned (see Actions).
2. Full-width search TextField, placeholder `t('customers.search')`, search icon adornment.
3. Empty state (list empty): People icon; heading `t('customers.noResults') || 'No results found'` when a search query is present, else `t('customers.noCustomers')`. When no search query: body `t('customers.createFirst')` + contained button labelled `t('customers.createFirst')` → `/customers?mode=new` (**no admin check**).
4. List: Paper containing one **Accordion per customer**.
   - **Summary row (left)**: Business icon (secondary colour) if partner customer; name = `[firstName, lastName].filter(Boolean).join(' ') || email || 'Unknown Customer'`; italic caption `(Partner Customer)` if partner.
     Partner test in the list UI = `customer.partnerId || customer.partner_id || customer.source === 'partner'` (does **not** include `created_by_partner_id`).
   - **Summary row (right)**, in order:
     | Element | Shown when | Content |
     |---|---|---|
     | Chip (outlined) | diving location | `customer.customerType || 'tourist'` |
     | Chip (outlined, info) | diving location | `Skill: ${centerSkillLevel || 'beginner'}` |
     | Chip (filled, secondary, Business icon) | partner customer | partner name via `getPartnerName` or `'Partner'` |
     | Approval chip | diving location | `isApproved` ? `Approved` (success, filled, CheckCircle icon) : `Pending` (warning, outlined, Pending icon) |
     | Approve/Revoke button | diving location **and** `isAdmin()` | `Approve` (contained, success) when not approved; `Revoke` (outlined, error) when approved; minWidth 100px |
     | Email text | always | `customer.email` |
     | Edit icon button | always | → `/customers?id=<id>` |
   - **Details (AccordionDetails)**, left column:
     - email, phone (plain lines, always).
     - `t('customers.nationality')`: nationality — if set.
     - `t('customers.type')`: `customerType || 'tourist'` — diving only.
     - Chip `Partner: <name || 'Unknown Partner'>` (outlined, secondary) — partner customers.
     - **Medical Certificate** block — diving only and `medicalCertificate.hasCertificate`: title `t('customers.medicalCertificate') || 'Medical Certificate'`; box green (`#4caf50` border / `#e8f5e9` bg) if `verified`, else red (`#f44336` / `#ffebee`); text `#<certificateNumber>` + ` (Expires: <expiryDate>)` if expiry; status `Verified` (check icon) or `Not Verified` (error icon).
     - **Diving Insurance** block — diving only and `divingInsurance.hasInsurance`: same styling; text `<insuranceProvider> - #<policyNumber>` + ` (Expires: <expiryDate>)`.
     - **Certifications** — diving only and non-empty: for each cert a box with chip `<agency> <level>`, caption `#<certificationNumber>`, status with tooltip:
       | `cert.verified` | Icon / colour / border / bg | Text | Tooltip |
       |---|---|---|---|
       | truthy | Verified / success / `#4caf50` / `#e8f5e9` | `Verified` | `Verified on <verifiedDate || 'N/A'>` |
       | `=== false` | Pending / warning / `#ff9800` / `#fff3e0` | `Pending Verification` | `Needs verification` |
       | anything else (undefined/null) | Error / error / `#f44336` / `#ffebee` | `Not Verified` | `Verification required` |
       (all texts via `t('customers.*') ||` fallback shown).
     - Full-width row: outlined `t('common.edit')` button → `/customers?id=<id>`.
5. **Bulk Import dialog** (maxWidth md). Title `Bulk Import Customers`. Info alert "Instructions:" bullets: `Download the CSV template to ensure correct format`, `Fill in customer data following the template`, `Required fields: firstName, lastName, email`, `Date format: YYYY-MM-DD (e.g., 1990-01-15)`, `Upload your CSV file to import customers`. Buttons `Download CSV Template` and `Select CSV File` (hidden `<input type=file accept=".csv">`, disabled while importing). While importing: `Processing X of Y customers...`, determinate LinearProgress (`processed/total*100`), `Successfully imported: N`, `Errors: N` if any. After import (`!importing && processed > 0`): alert (warning if errors else success) `Import completed: N successful, M errors`, then an "Errors:" list of `Row <row>: <error>`. Footer button: `Close` if processed > 0 else `Cancel` (disabled while importing; resets progress). Dialog cannot be closed by backdrop while importing.

#### Actions

| Action | Visible to | Behaviour |
|---|---|---|
| `Sync from Public Site` (outlined, Sync icon) | all | Just calls `loadCustomers()` (comment: API already returns public-site customers). |
| `Refresh` (outlined) | all | `loadCustomers()`. |
| `Bulk Import` (contained, upload icon) | `isAdmin()` | Opens bulk import dialog. |
| `t('customers.new')` (contained, Add icon) | `isAdmin()` | Navigate `/customers?mode=new`. |
| Approve / Revoke | admin, diving location | `stopPropagation`; `getById('customers', id)`; `update('customers', id, {...fresh, isApproved: !fresh.isApproved, updatedAt: now ISO})` (whole record re-sent); reload. Error alert: `Error updating customer approval. Please try again.` No confirmation. |
| Edit icon / Edit button | all | Navigate `/customers?id=<id>` (CustomerForm decides read-only for non-admins). |
| Download CSV Template | admin (inside dialog) | Downloads `customer_import_template.csv` (see below). |
| Select CSV File | admin | If `file.type !== 'text/csv'` and name not ending `.csv` → alert `Please select a CSV file`. Else `handleBulkImport(file)`. |

**CSV template content** (exact): header `firstName,lastName,email,phone,dob,nationality,gender,customerType,centerSkillLevel`; example row `John,Doe,john.doe@example.com,+34 123 456 789,1990-01-15,Spanish,male,tourist,beginner`; blank line; then lines `Notes:`, `- Required fields: firstName, lastName, email`, `- Date format: YYYY-MM-DD (e.g., 1990-01-15)`, `- customerType: tourist, local, or recurrent`, `- centerSkillLevel: beginner, intermediate, advanced, or expert`, `- gender: male, female, or other`, `- All other fields are optional`.

**CSV parsing** (`parseCSV`):
- Split on `\n`; drop blank lines and lines starting with `Notes:`; data lines starting with `-` skipped.
- Fewer than 2 lines → error `CSV file must have at least a header row and one data row`.
- Quote-aware splitter: `"` toggles quoting, `""` inside quotes = literal quote, `,` separates outside quotes; values trimmed and surrounding quotes stripped. Multi-line quoted values not supported.
- Column-count mismatch on any row throws `Row <i+1> has X columns but header has Y columns` → the whole import aborts with a single error `{row: 0, error: message}`.
- Zero data rows → `No data rows found in CSV file`.

**Import per row** (sequential, one `dataService.create('customers', …)` per row):
- Missing `firstName`, `lastName` or `email` → error `Missing required fields: firstName, lastName, or email` (row number = index + 2).
- Payload: `firstName`/`lastName` trimmed; `email` trimmed + lowercased; `phone` (trim or `''`); `dob` (trim or `null`); `nationality` (or `''`); `gender` (or `''`); `customerType` (or `'tourist'`); `centerSkillLevel` (or `'beginner'`); `preferences: {}`; `certifications: []`; `medicalCertificate: {hasCertificate:false}`; `divingInsurance: {hasInsurance:false}`; `isActive: true`. No `isApproved` sent. No duplicate check, no value validation of enums/dates.
- Create failure → `{row, error: error.message || 'Unknown error'}`. After all rows: `loadCustomers()`.

#### Business rules

- Customer "kind" is inferred: **diving customer** = has non-empty `customerType` or is a partner customer; **rental customer** = neither. Imported CSV customers always get `customerType` (default `tourist`) ⇒ always diving customers.
- Approval UI (chip + toggle) exists only in diving locations; rental customers are auto-approved at creation (see CustomerForm).
- Partner name resolution: `partner.name || partner.companyName || partner.company_name || 'Partner'`; id from `customer.partnerId || customer.partner_id`.

#### Quirks / bugs

- Poll compares **unfiltered** total count to **filtered** displayed count ⇒ whenever any customer is filtered out, `loadCustomers()` runs every 2 s, and it also overwrites active search results within 2 s.
- Search results bypass the location-type filter.
- "Rental" detection uses `hasDivingFeatures` (all non-diving types count as "bike rental"), whereas Bookings uses exact type strings.
- Empty-state "create first" button has no admin check (header "New" button does).
- `locations` state and `setLocations` unused. "Sync from Public Site" = Refresh.
- Template notes advertise `centerSkillLevel` `expert`, but CustomerForm only offers beginner/intermediate/advanced.

---

### Customers smoke test

- **File**: `pages/Customers.smoke.test.jsx` (Vitest + Testing Library, mocks `dataService` and `useAuth` → `isAdmin: () => true`).
- Test 1: list renders customer "Dana Diver" (customerType `tourist`, no location → diving filter passes).
- Test 2: typing "Dana" in the search box (placeholder /search/ or first textbox) calls `dataService.searchCustomers`.
- Test 3: with `/customers?mode=new` the list row "Dana Diver" is not rendered (CustomerForm shown instead).

---

### CustomerForm

- **File**: `components/Customer/CustomerForm.jsx`
- **Where used**: rendered by `pages/Customers.jsx` when `?mode=new` or `?id=<id>`. Reads `id` itself from `useSearchParams`.
- **Purpose**: Create/edit a customer: identity, customer type & skill level, approval, equipment/suit preferences, certifications, medical certificate, diving insurance, document uploads. Non-admins get a read-only view where only equipment sizes (and skill level) can be saved.

#### Modes

| Mode | Condition | Title | Submit label |
|---|---|---|---|
| Create | no `id` | `New Customer` | `Create Customer` |
| Edit | `id` and `isAdmin()` | `Edit Customer` | `Update Customer` |
| Read-only | `id` and not admin (`isReadOnly = !isAdmin() && customerId`) | `View Customer` | `Save Equipment Sizes` |

Read-only shows info alert: `You are viewing this customer in read-only mode. You can only modify equipment sizes for preparation purposes.`

#### Data loaded

- `dataService.getAll('locations')` on mount and on `dcms_location_changed`; current location = `localStorage.dcms_current_location`. `isBikeRental = currentLocation ? !hasDivingFeatures(currentLocation, null) : false`.
- Edit/view: `dataService.getById('customers', id)` → `normalizeCustomerData` (below).
- Certification verification: `dataService.getAll('settings')` on click.

#### Normalisation on load (`normalizeCustomerData`)

- `customerType` → keep if not undefined/null/''; else `'tourist'`. `centerSkillLevel` → else `'beginner'`. `gender ?? ''`.
- `preferences` → `normalizePreferences`: defaults merged (see Fields), `equipmentOwnership` merged over all-false, `tank` forced `false`, `suitPreferences` merged over defaults, `ownEquipment` recomputed = every non-tank item owned.
- `certifications[]` → `{agency||'', level||'', certificationNumber||'', issueDate, expiryDate (YYYY-MM-DD), verified||false, verifiedDate||null, ...cert}` (original spread last).
- `medicalCertificate` / `divingInsurance` → defaults merged, issue/expiry dates formatted `YYYY-MM-DD` (ISO datetime split at `T`; Date → ISO date).
- `dob` formatted; `uploadedDocuments || []`; `medicalConditions || []`; `isApproved` default `false`.

#### Initial state (create)

`firstName:'', lastName:'', email:'', phone:'', dob:'', nationality:'', gender:''`, plus (diving) `customerType:'tourist', centerSkillLevel:'beginner', certifications:[], medicalCertificate: default, divingInsurance: default`, `isApproved: isBikeRental`, `preferences: isBikeRental ? {} : defaultPreferences`, `medicalConditions: []`. (In practice `isBikeRental` is always `false` at first render because locations aren't loaded yet — so diving defaults are always present.)

#### Fields

Section order: identity grid → type/skill → approval switch → "Equipment & Suit Preferences" → "Diving Certifications" → "Medical Certificate" → "Diving Insurance" → buttons.

| Field (label) | Data key | Control | Options / default | Validation | Conditions |
|---|---|---|---|---|---|
| First Name | `firstName` | text | '' | HTML required; submit alert `First name and last name are required.` | disabled read-only |
| Last Name | `lastName` | text | '' | required (same) | disabled read-only |
| Email | `email` | text type=email | '' | browser email format only; not required | disabled read-only |
| Phone | `phone` | text | '' | – | disabled read-only |
| Date of Birth | `dob` | date | '' | – | disabled read-only |
| Nationality | `nationality` | text (free) | '' | – | disabled read-only |
| Gender | `gender` | select | `''` "Not specified", `male` "Male", `female` "Female", `other` "Other" | – | disabled read-only |
| Customer Type | `customerType` | select | `tourist` "Tourist" (default), `local` "Local", `recurrent` "Recurrent" | – | diving only; disabled read-only |
| Center Skill Level | `centerSkillLevel` | select, helper `Operational assessment by staff` | `beginner` "Beginner" (default), `intermediate` "Intermediate", `advanced` "Advanced" | – | diving only; **editable in read-only** (and saved) |
| Customer Approved for Booking | `isApproved` | switch; caption `Approved customers can book dives in the customer portal. Unapproved customers must wait for assessment.` | false | – | `isAdmin()` **and** editing existing **and** diving |
| Customer brings complete equipment setup | `preferences.ownEquipment` | switch | false | – | diving; disabled read-only. Toggling sets all 12 non-tank items to the value (tank stays false). |
| Gear customer brings (subtitle) | `preferences.equipmentOwnership.<key>` | 13 checkboxes | keys/labels: `mask` Mask, `snorkel` Snorkel, `fins` Fins, `boots` Boots, `wetsuit` Wetsuit, `hood` Hood, `bcd` BCD, `regulator` Regulator, `computer` Dive Computer, `torch` Torch, `camera` Camera, `weights` Weights, `tank` "Tank (provided by center)"; all false | – | diving; disabled read-only; `tank` always disabled/false. Any change recomputes `ownEquipment` = all 12 non-tank checked. |
| Tank Size | `preferences.tankSize` | select | `10L` "10 L", `12L` "12 L" (default), `15L` "15 L", `Nitrox 12L` "Nitrox 12 L", `Nitrox 15L` "Nitrox 15 L" | – | diving; disabled read-only |
| BCD Size | `preferences.bcdSize` | select | `XS`,`S`,`M`(default),`L`,`XL`,`XXL` | – | diving and `!equipmentOwnership.bcd`; disabled read-only |
| Wetsuit Size | `preferences.wetsuitSize` | select | same sizes, default `M` | – | diving and `!equipmentOwnership.wetsuit` |
| Fins Size | `preferences.finsSize` | select | same, default `M` | – | diving and `!equipmentOwnership.fins` |
| Boots Size | `preferences.bootsSize` | select | same, default `M` | – | diving and `!equipmentOwnership.boots` |
| Preferred Suit Style (under "Suit Preferences") | `preferences.suitPreferences.style` | radio row | `full` "Full" (default), `shorty` "Shorty" | – | diving and wetsuit not owned; disabled read-only |
| Thickness | `preferences.suitPreferences.thickness` | select | `3mm` "3 mm", `5mm` "5 mm" (default), `7mm` "7 mm" | – | same |
| Include hood | `preferences.suitPreferences.hood` | switch | false | – | same |
| (alert) | – | – | `Customer brings their own suit, so suit preferences are hidden.` (success) | – | diving and wetsuit owned |
| Certification Agency (new cert) | `newCertification.agency` | select | `SSI`, `PADI`, `CMAS`, `VDST` | needed for Add | diving **and admin** |
| Certification Level | `newCertification.level` | free text, placeholder `e.g., OW, AOW, RESCUE` | '' | needed for Add | diving and admin |
| Certification Number | `newCertification.certificationNumber` | text, placeholder `e.g., PADI-OW-123456` | '' | needed for Add | diving and admin |
| Customer has medical certificate | `medicalCertificate.hasCertificate` | switch | false | – | diving and admin |
| Certificate Number | `medicalCertificate.certificateNumber` | text, placeholder `e.g., MED-2024-001` | '' | – | diving, admin, hasCertificate |
| Issue Date / Expiry Date | `medicalCertificate.issueDate` / `.expiryDate` | date | '' | – | same |
| Customer has diving insurance | `divingInsurance.hasInsurance` | switch | false | – | diving (all roles); disabled read-only |
| Insurance Provider | `divingInsurance.insuranceProvider` | text, placeholder `e.g., DAN Europe, PADI Insurance` | '' | – | diving, hasInsurance (**not** disabled in read-only) |
| Policy Number | `divingInsurance.policyNumber` | text, placeholder `e.g., DAN-2024-789` | '' | – | same |
| Issue Date / Expiry Date | `divingInsurance.issueDate` / `.expiryDate` | date | '' | – | same |

Section headings/texts: "Equipment & Suit Preferences"; "Diving Certifications" + `Add customer's diving certifications. Click verify buttons to check with certification agencies.`; "Medical Certificate" + `Required for diving activities. Include certificate details and verification status.`; "Diving Insurance" + `Required for diving activities. Include insurance provider and policy details.`

#### Actions

| Action | Visible to | Behaviour |
|---|---|---|
| Existing certification row | admin, diving | Chip `<agency||'N/A'> <level>`, caption `#<number||'N/A'>`; if `verified` → chip `Verified`; else button `Verify` (disabled if no agency/number); red Cancel icon "Remove certification" removes from array (no confirm). |
| `Verify` (certification) | admin | If agency/number missing → alert `Certification information is incomplete. Please ensure the certification has an agency and certification number.` Loads settings (array → first item, or object); looks up `certificationUrls` in `settings.certificationUrls`, `settings.certification_urls`, `settings.value.certificationUrls`, `settings.value.certification_urls`. If none/empty → alert `Certification verification URLs not configured. Please check Settings page and save the certification URLs.` If `certificationUrls[agency]` exists → `window.open(url, 'certification-verification', 'width=800,height=600,…')`; if blocked → alert `Please allow popups for certification verification or check your popup blocker settings`; else **immediately marks cert `verified: true, verifiedDate: YYYY-MM-DD` in form state** and alerts `Verification portal opened for <agency>. After verifying the certification, it will be marked as verified.` If no URL for agency → `No verification URL configured for <agency>. Please configure it in Settings.` Persisted only on Save. |
| `Add Certification` | admin | Enabled when agency, level, number set. Appends `{agency, level, certificationNumber, issueDate: null, expiryDate: null, verified: false}`; resets inputs. |
| `Verify Medical Certificate` | admin, hasCertificate, not verified | Sets `medicalCertificate.verified=true, verifiedDate=YYYY-MM-DD` (no external check). When verified: chip `Verified` + caption `Verified on: <date>`. |
| `Verify Insurance` | diving, hasInsurance, not verified (not disabled in read-only) | Same for `divingInsurance`. |
| `Upload Document` (medical) / (insurance) | medical: admin; insurance: all, disabled read-only | File input accept `.pdf,.jpg,.jpeg,.png,.doc,.docx`; >10 MB → alert `File size must be less than 10MB`. Reads as base64 and appends to `uploadedDocuments` `{id: Date.now() string, type: 'medical_certificate'|'diving_insurance', fileName, fileSize, mimeType, fileData (base64 w/o prefix), uploadedAt ISO, uploadedBy: 'admin'}`. Stored inside the customer record on save. |
| Document chip | same sections | Label = fileName; click → download; delete (x) removes (not in read-only). |
| `Cancel` | all | Navigate `/customers`. |
| Submit | all | See below. On success: alert-box `Customer saved successfully!`, navigate `/customers` after 1500 ms. On error: alert `Error saving customer: <error.response.data.message || error.message || …>`. |

**Submit logic**:
1. Require `firstName` and `lastName`.
2. `prepareCustomerData` (only when `isBikeRental`): remove `customerType, centerSkillLevel, certifications, medicalCertificate, divingInsurance, medicalConditions`; `preferences = {gender, ...preferences}` minus `equipmentOwnership`, `suitPreferences`, `ownEquipment`. Diving: data sent as-is.
3. Read-only: `getById` then `update('customers', id, {...existing, preferences: form.preferences, updatedAt: now})` + `centerSkillLevel` if diving. All other edits discarded.
4. Admin edit: `getById`; `update(id, prepare({...existing, ...formData, id: existing.id, createdAt: existing.createdAt, updatedAt: now}))`. If not found → `create` instead.
5. Create: `create('customers', prepare({...formData, isApproved: isBikeRental ? true : (formData.isApproved || false), createdAt, updatedAt}))`.

#### Business rules

- **Auto-approval**: customers created while the current location is non-diving get `isApproved: true`; diving customers are created unapproved (the approval switch is only shown on edit).
- Approval meaning (UI copy): approved customers can book dives in the customer portal.
- Tank is always provided by the centre (never owned).
- "Owns complete equipment" ⇔ owns all 12 non-tank items; owning an item hides its size selector; owning wetsuit hides suit preferences.
- Certifications/medical certificate management is admin-only; non-admins can see/edit insurance fields visually but the read-only save does not persist them.

#### Quirks / bugs

- `handleFileDownload(document)` shadows the global `document`, so `document.createElement` throws — **downloading an uploaded document is broken**.
- Center Skill Level is not disabled in read-only (intentional per save logic, but inconsistent with alert text).
- Insurance text/date fields and "Verify Insurance" are not disabled in read-only; changes silently dropped.
- `formatCertDates` spreads `...cert` last, overriding the formatted dates.
- `newCertification.issueDate/expiryDate` exist in state but no inputs → always `null`.
- Initial `isBikeRental` evaluated before locations load ⇒ always diving defaults in initial state.
- `locations` state unused apart from setting it.

---

### Bookings page

- **File**: `pages/Bookings.jsx`
- **Routes**: `/bookings` (list), `/bookings/new` (renders `<BookingForm/>`), `/bookings/:id` (renders `<BookingForm bookingId={id}/>`). All `ProtectedRoute requiredPermission="bookings"`. No further role checks inside.
- **Purpose**: List bookings for the current location (filtered by activity family), show details, reprice, cancel bike rentals, and open create/edit form.

#### Data loaded

- List mode only: `getAll('bookings')`, `getAll('customers')`, `getAll('locations')`, `getAll('partners')`.
- **Filter** by current location (`localStorage.dcms_current_location`) and `booking.equipmentNeeded.activityType`:
  | Current location `type` | Keep bookings where |
  |---|---|
  | `bike_rental` | `(locationId||location_id) === loc.id` and `equipmentNeeded.activityType === 'bike_rental'` |
  | `surf` | same location and `activityType === 'surf'` |
  | `kite_surf` | same location and `activityType === 'kite_surf'` |
  | anything else | same location and `equipmentNeeded.activityType` not in (`bike_rental`,`surf`,`kite_surf`) |
  | no current location | all bookings (global view) |
- No sorting (API order).
- Refresh triggers: `dcms_location_changed`, `dcms_booking_created`, `dcms_bookings_synced`, `storage` event with key `dcms_bookings`/null; poll every 2 s comparing total bookings count with displayed (filtered) count.

#### UI layout

1. Header: `t('bookings.title')`; buttons `Refresh` (outlined), `Reprice Bookings` / `Repricing…` (outlined, PriceChange icon, disabled while running), `t('bookings.new')` (contained) → `/bookings/new`.
2. Empty state: Event icon, `t('bookings.noBookings')`, `t('bookings.createFirst')` text + button → `/bookings/new`.
3. Accordion per booking.
   - **Summary left**: customer name (`firstName lastName` or `t('customers.unknown') || 'Unknown Customer'`); status Chip (label = raw status; colours: `pending` warning, `confirmed` info, `completed` success, `cancelled` error, `no_show` default); partner chip (filled secondary, name or `'Partner'`) if `partnerId || partner_id || source === 'partner'`; booking date `dd/mm/yyyy` (`en-GB`), `N/A` if missing.
   - **Summary right**: activity display name; route chip if `routeType` (`playitas_local` → "Playitas Local", `caleta_from_playitas` → "Caleta from Playitas", `dive_trip` → "Dive Trip", else raw); price `€<totalPrice.toFixed(2)>` (bold primary).
   - **Details left**: `Booking ID`: first 8 chars + `...`; `Date`; `Activity`; then
     - Rental (bike/surf/kite): `Rental Duration:` `equipmentNeeded.rentalDays || numberOfDives || 1` day(s); bike: `Bike Type:` (`street_bike` Street Bike, `gravel_bike` Gravel Bike, `mountain_bike` Mountain Bike, else raw); surf: `Board:` surfType with `_`→space; kite: `Equipment:` kiteType with `_`→space; `Start Date:` / `End Date:` from `equipmentNeeded` if present.
     - Otherwise `Dive Sessions:` — if `booking.diveSessions` exists: "Morning (9AM)" and/or "Afternoon (12PM)" joined by ", " (night not shown); else `<numberOfDives||1> dives`.
     - `Status:` `t('bookings.status.<status>') || status`; `Payment Method:` `paymentMethod || 'N/A'`; `Payment Status:` `paymentStatus || 'pending'`; partner chip `Partner: <name || 'Unknown Partner'>`.
   - **Details right**: `€<totalPrice>` (h6); then
     - Bike: `Equipment:` chips for true keys of `equipmentNeeded.bikeEquipment` (`click_pedals` Click Pedals, `helmet` Helmet, `gps_computer` GPS Computer); `Insurance:` (`one_day` One Day, `one_week` One Week, `one_month` One Month).
     - Surf: `Accessories:` chips (`wetsuit` Wetsuit, `shoes` Shoes, `surf_leash` Leash, `auto_rack` Auto Rack).
     - Kite: `Accessories:` chips (`harness` Harness, `kite_leash` Kite Leash, `helmet` Helmet, `impact_vest` Impact Vest, `wetsuit` Wetsuit).
     - Diving/other: `Own Equipment: Yes` if `booking.ownEquipment`; `Rented Equipment:` chips of raw keys where `booking.rentedEquipment[key]` true.
     - `Special Requirements:` and `Notes:` if present.
   - **Buttons**: `Cancel` (outlined error) only for **bike rental** bookings not already `cancelled`; `t('common.edit')` → `/bookings/<id>`.
4. Snackbar bottom-right, 5 s auto-hide.

Activity display name: bike/surf/kite rental (via `equipmentNeeded.activityType`) → "Bike Rental" / "Surf Rental" / "Kite Surf Rental"; else map `diving` Diving, `snorkeling` Snorkeling, `discover` Discovery Dive, `specialty` Specialty; else raw `activityType`.

#### Actions

| Action | Behaviour |
|---|---|
| Refresh | `loadBookings()`. |
| Reprice Bookings | `window.confirm('Recalculate all booking prices using the latest customer types and price table?')`; calls `recalculateAllBookingPrices()`; reloads; snackbar `Recalculated N booking(s)` or `No bookings required price updates`; error snackbar `Failed to recalculate prices. Please try again.` Service (external): for each customer, `getCustomerStaySummary` breakdown; if `|newTotal − old| ≥ 0.01` sets `price = totalPrice = newTotal`; then PATCHes `{price, totalPrice}` for **all** bookings when ≥1 changed. |
| Cancel (bike only) | `window.confirm('Are you sure you want to cancel this booking?')` → `update('bookings', id, {status: 'cancelled'})` → reload. Error alert `Error cancelling booking. Please try again.` |
| Edit | Navigate `/bookings/<id>`. |
| New | Navigate `/bookings/new`. |

#### Quirks / bugs

- `recalculateAllBookingPrices` is async but called without `await`: the snackbar always shows `No bookings required price updates` (`result.updated` undefined on a Promise), the reload happens before repricing finishes, and failures are not caught.
- Poll compares total vs filtered counts ⇒ continuous 2 s reloads whenever a location filter excludes bookings.
- Dive sessions detail reads `booking.diveSessions` (top-level) but BookingForm saves sessions inside `equipmentNeeded`; same for `ownEquipment`/`rentedEquipment` ⇒ these detail lines generally fall back / don't show for API data (unclear whether the API transform re-exposes them).
- Only bike rentals get a Cancel button; other cancellations go through the edit form's status.
- Bike type label map includes `mountain_bike`, which the form cannot produce.

---

### BookingForm

- **File**: `components/Booking/BookingForm.jsx`
- **Where used**: `pages/Bookings.jsx` for `/bookings/new` (no `bookingId`) and `/bookings/:id` (`bookingId`).
- **Purpose**: Create/edit a booking with live price calculation. The form changes completely by location type: **bike rental**, **surf rental**, **kite surf rental**, or **diving** (with activity types diving/snorkeling/discover).

#### Data loaded

- On mount (`Promise.all`): `getAll('customers')`, `getAll('boats')`, `getAll('diveSites')`, `getAll('governmentBonos')` (errors → `[]`), `getAll('locations')`; `getAll('settings')` → `settings = settingsData[0]`.
- Locations reordered: user's `currentUser.locationAccess` first, then the rest.
- Default `locationId`: initial hard-coded `'550e8400-e29b-41d4-a716-446655440001'` (comment "Caleta de Fuste"); overridden on mount by `currentUser.locationAccess[0]` (also written to `localStorage.dcms_current_location`) else by `localStorage.dcms_current_location`.
- Edit: `getById('bookings', bookingId)` → normalisation (below).
- New booking + customer selected: `getById('customers', id)` → sets `ownEquipment = customer.preferences.ownEquipment || false`.
- Customers dropdown lists **all** customers (no location/type filter, no search). Boats and dive sites are loaded but have no UI (comment: "Boat and Dive Site will be selected after the dive for Spanish regulation compliance").
- `loading` shows `Loading booking form...` until `loadData` finishes.

#### Default form state (new booking)

`customerId:''`, `routeType:''`, `boatId:''`, `diveSiteId:''`, `bookingDate: today (YYYY-MM-DD)`, `activityType:'diving'`, `numberOfDives:1`, `diveSessions:{morning:false, afternoon:false, night:false}`, `bikeType:''`, `rentalDays:2`, `startDate: today`, `endDate:''`, `bikeEquipment:{click_pedals, helmet, gps_computer: false}`, `bikeInsurance:''`, `surfType:''`, `surfEquipment:{wetsuit, shoes, surf_leash, auto_rack: false}`, `kiteType:''`, `kiteEquipment:{harness, kite_leash, helmet, impact_vest, wetsuit: false}`, `price:46.00`, `discount:0`, `totalPrice:46.00`, **`status:'confirmed'`** (admin-created bookings auto-confirmed), **`paymentMethod:'account'`**, **`paymentStatus:'paid'`**, `bonoId:''`, `governmentPayment:0`, `customerPayment:0`, `equipmentNeeded:[]`, `specialRequirements:''`, `ownEquipment:false`, `rentedEquipment:{completeEquipment, Suit, BCD, Regulator, Torch, Computer, UWCamera, Mask, Fins, Boots: false}`, `addons:{personalInstructor:false}`.

#### Load normalisation (edit)

- `activityType`: `try_dive` / `discovery` → `discover`.
- Diving with object `equipmentNeeded`: sessions from `equipmentNeeded.morning/afternoon/night/tenFifteen` (or `'10:15'`), accepting `true`, `1`, `'true'`; `ownEquipment`, `rentedEquipment`, `addons` also read from `equipmentNeeded`.
- Rentals: `bikeType` from `equipmentNeeded.bikeType` (when `activityType==='bike_rental'`); `surfType`/`surfEquipment`; `kiteType`/`kiteEquipment`.
- `bookingDate` split at `T`; `numberOfDives` = `Number(...)||1` for non-diving, `undefined` for diving; `boatId`/`diveSiteId` → `''` if missing; numeric coercion of `price, discount, totalPrice, equipmentRental, bikeInsuranceCost`; `rentalDays = Number(booking.rentalDays) || 2`.

#### UI layout

Title `New Booking` / `Edit Booking`; success alert `Booking saved successfully!`. Grid, in order:

1. **Location** select (all locations, label = `loc.name`), required. Change → sets `locationId`, clears `routeType`, writes `localStorage.dcms_current_location` (no event dispatched).
2. **Customer** select: `""` "Select Customer" + each `firstName lastName`. Required.
3. Location-type specific block (below).
4. **Pricing info panel** — diving-family locations with a customer selected (see Business rules).
5. **Activity Type** select — diving-family only: `diving` "Diving", `snorkeling` "Snorkeling", `discover` "Discovery / Try Dive".
6. Divider, **Addons**: switch `Personal Instructor (+€100)` → `addons.personalInstructor` — diving-family only.
7. **Government Bono (Canary Islands)** select — diving-family only: `""` "None" + each bono `"<code> - <discountPercentage>% discount"` (all bonos, any type).
8. **Booking Status** select (all location types): `pending` Pending, `confirmed` Confirmed (default), `completed` Completed, `cancelled` Cancelled, `no_show` No Show.
9. **Own equipment / equipment rental** — diving-family and `activityType === 'diving'` only (below).
10. Divider; **VolumeDiscountCalculator** — diving-family, `activityType==='diving'`, customer selected and customer type `tourist`; props: `numberOfDives` = selected sessions count, `addons = formData.addons`, `bono` = selected bono object.
11. Buttons: `Cancel` → `/bookings`; submit `Create Booking` / `Update Booking`.

##### Bike rental block (`location.type === 'bike_rental'`)

| Field (label) | Data key | Control | Options / default | Validation | Notes |
|---|---|---|---|---|---|
| Start Date | `startDate` (also copies to `bookingDate`) | date | today | required; submit alert `Please select a start date.` | |
| Rental Duration (Days) | `rentalDays` | number, min 2, helper `Minimum rental period is 2 days` | 2 | clamped `max(2, parseInt||2)`; submit alert `Please enter a valid rental duration (minimum 2 days).` | |
| Bike Type | `bikeType` | select (required) | `street_bike` "Street Bike", `gravel_bike` "Gravel Bike" | submit alert `Please select a bike type.` | |
| Equipment (charged once per rental) | `bikeEquipment.click_pedals/helmet/gps_computer` | 3 switches, label `<Name> (€<price>)` | Click Pedals €10, Helmet €10, GPS Computer €15 defaults (location `pricing.equipment[key]` overrides) | – | |
| Insurance (Optional) | `bikeInsurance` | select | `""` "No Insurance", `one_day` "1 Day (€5)", `one_week` "1 Week (€15)", `one_month` "1 Month (€25)" (amounts from `pricing.insurance` or these defaults) | – | |

Card "Rental Price Breakdown": `Base Price (N days): €x`, `Equipment: €x` (if >0), `Insurance: €x` (if selected), divider, `Total: €x`.

##### Surf rental block (`type === 'surf'`)

| Field | Data key | Control | Options / default | Validation |
|---|---|---|---|---|
| Start Date | `startDate` (+`bookingDate`) | date | today | required |
| Rental Duration (Days) | `rentalDays` | number min 1 | 2 (initial state) | clamp `max(1, …)`; alert `Please enter a valid rental duration (at least 1 day).` |
| Surfboard Type | `surfType` | select | keys of `location.pricing.surfTypes`; label `surfTypes[key].name` or key with `_`→space (code comment lists `softboard`, `performance_softboard`, `shortboard`, `midlength`, `longboard`) | alert `Please select a surfboard type.` |
| Accessories | `surfEquipment.wetsuit/shoes/surf_leash/auto_rack` | switches, label `<Name> (€<price>/day)` | Wetsuit, Shoes, Surf Leash, Auto Rack; price `pricing.surfEquipment[key] || 0` | – |

Card "Rental Price": `Base`, `Accessories` (if >0), `Total`.

##### Kite surf rental block (`type === 'kite_surf'`)

Same as surf with: **Equipment Type** select → `kiteType` from `pricing.kiteTypes` keys (comment: `complete_equipment`, `kite_bar_leash`, `kiteboard`), alert `Please select a kite surf equipment type.`; Accessories `kiteEquipment.harness` Harness, `kite_leash` Kite Leash, `helmet` Helmet, `impact_vest` Impact Vest, `wetsuit` Wetsuit, priced `pricing.kiteEquipment[key] || 0` per day.

##### Diving-family block (any other location type)

| Field | Data key | Control | Options / default | Validation / conditions |
|---|---|---|---|---|
| Booking Date | `bookingDate` | date | today | required |
| Dive Sessions | `diveSessions.morning` / `.afternoon` / `.night` | 3 switches: `Morning Dive (9:00 AM) - 1 dive`, `Afternoon Dive (12:00 PM) - 1 dive`, `Night Dive (+€20) - 1 dive` | all false | only when `activityType==='diving'`; info alert `Maximum 3 dives per day: Morning (9:00 AM), Afternoon (12:00 PM), and Night dive. Volume discounts apply to cumulative dives across multiple days of the customer's stay.`; caption `N dive(s) selected for today` or `Please select at least one dive session` (+ red duplicate); submit alert `Please select at least one dive session for diving activities.` |
| Number of Sessions | `numberOfDives` | number min 1, helper `Enter the number of sessions for this activity` | 1 | when `activityType !== 'diving'`; `parseInt || 1`; alert `Please enter a valid number of sessions (at least 1).` |
| Route | `routeType` | select | `""` "Select route", `playitas_local` "Playitas Local Dive (€35)", `caleta_from_playitas` "Caleta Dive from Playitas (tiers + €15 transfer per day)", `dive_trip` "Dive Trip (Gran Tarajal / La Lajita) (€45)" | only diving and location name contains `playitas` (case-insensitive) |
| Customer brings own equipment (no equipment rental fee) | `ownEquipment` | switch | from customer `preferences.ownEquipment` on new | diving only; turning on clears all `rentedEquipment` and recalculates |
| Complete Equipment - €13 per dive (first 8 dives only, then free) | `rentedEquipment.completeEquipment` | switch; caption `Includes: Suit, BCD, Regulator, Torch, Computer, Mask, Fins, Boots` | false | shown when `!ownEquipment`; heading "Equipment Rental Selection" + `Complete equipment: €13 per dive for first 8 dives only, then free. Or select individual equipment.` |
| Individual ("Or select individual equipment:") | `rentedEquipment.BCD` "BCD (€5)", `Regulator` "Regulator (€5)", `Mask` "Mask (Free)", `Fins` "Fins (Free)", `Boots` "Boots (Free)", `Suit` "Suit (€5)", `Computer` "Computer (€3)", `Torch` "Torch (€5)", `UWCamera` "UW Camera (€20)" | switches | false | all except UW Camera disabled when completeEquipment on (they keep their values) |

Activity type change: resets `diveSessions` to all false; `numberOfDives` → `undefined` for diving, else `prev.numberOfDives || 1`.

#### Business rules — price calculation (`calculatePrice`)

Recomputed by effect whenever location, customer, settings, locations, rental fields, sessions, addons, bono, ownEquipment, rentedEquipment, numberOfDives, activityType or routeType change (also called directly from rental inputs). Does nothing until `settings` and `locations` are loaded. Location = `data.locationId || localStorage.dcms_current_location || locations[0].id`; `locPricing = location.pricing || {}`.

**1. Bike rental** (`type==='bike_rental'`):
- `rentalDays = max(2, rentalDays||2)`. No `bikeType` → all prices 0.
- Base price, using `locPricing.bikeTypes[bikeType].rentalTiers` (`{days, price}`) when configured, else defaults:
  | Days | Rule | Tier looked up | Default |
  |---|---|---|---|
  | 2 | fixed total | `days===2` | €80 |
  | 3 | fixed total | `days===3` | €114 |
  | 4–6 | per day × days | `days===4` | €36/day |
  | 7–10 | per day × days | `days===7` | €34/day |
  | 11–13 | per day × days | `days===11` | €30/day |
  | ≥14 | per day × days | `days===14` | €25/day |
  (If tiers exist but the specific tier is missing, that row's default is used.)
- Equipment once per rental: `click_pedals` `pricing.equipment.click_pedals || 10`, `helmet || 10`, `gps_computer || 15`.
- Insurance: `pricing.insurance[key] || {one_day:5, one_week:15, one_month:25}[key]`.
- `price = base`, `totalPrice = base + equipment + insurance`, `discount = 0`, `governmentPayment = 0`, `customerPayment = totalPrice`, `equipmentRental`, `bikeInsuranceCost`.

**2. Surf** (`type==='surf'`) and **3. Kite surf** (`type==='kite_surf'`) — identical algorithm:
- `rentalDays = max(1, rentalDays||1)`; no type → price/total/equipment 0.
- Tiers `pricing.surfTypes[type].rentalTiers` / `pricing.kiteTypes[type].rentalTiers`, sorted by days. Exact `days` match → that price. Else highest tier with `days ≤ rentalDays` (or first tier if none) + `extraDayPrice × (rentalDays − tier.days)` (extra days floored at 0). No tiers → base 0.
- Accessories **per day**: `Σ pricing.surfEquipment[k] × rentalDays` (kite: `pricing.kiteEquipment`). Missing price = 0.
- `price = base`, `totalPrice = base + accessories`. (discount/governmentPayment not touched.)

**4. Non-diving activities** in diving-family locations (`activityType !== 'diving'`):
- `base = calculateActivityPrice(activityType, numberOfDives||1, locationId)`: `snorkeling` €38 × n (hard-coded); `discover` `pricing.customerTypes.tourist.discoverDive || 100` × n; `orientation` `…orientationDive || 32` × n (not selectable in UI); else 0.
- Bono: if selected bono has `type === 'discount_code'`: `discount = min(base × discountPercentage/100, maxAmount || Infinity)`; `governmentPayment = discount`.
- `totalPrice = customerPayment = base − discount`; `equipmentRental = 0`, `diveInsurance = 0`, `transferFee = 0`, `cumulativePricing = null`.

**5. Diving** (`activityType === 'diving'`):
- `numberOfDives = morning + afternoon + night` (each 1).
- `customerType = customer.customerType || 'tourist'` (tourist when no customer).
- Price per dive:
  - customer selected and `recurrent`/`local` → `calculateDivePrice(loc, type, 1)` = `pricing.customerTypes.<type>.pricePerDive` or fallback **recurrent €32**, **local €35**.
  - customer selected and `tourist` → `stayService.getCumulativeStayPricing(customerId, bookingDate)` → `pricePerDive || 46` (error → 46, `cumulativePricing = null`). Stay = that customer's bookings from `bookingDate` to +30 days, counting only `diving` bookings' sessions; tier from location `customerTypes.tourist` (`pricing:'tiered'`, `diveTiers`) or fallback by total stay dives: <3 €46, 3–5 €44, 6–8 €42, 9–12 €40, ≥13 €38.
  - else 46.
- Base price:
  - **Location name contains "playitas"**:
    - recurrent/local → `n × pricePerDive`.
    - `playitas_local` → €35/dive.
    - `dive_trip` → €45/dive.
    - `caleta_from_playitas` → tourist tiers `pricing.customerTypes.tourist.diveTiers`; `totalCaletaDives` = previous `caleta_from_playitas` dives of this customer (via sync `getCustomerBookings`) + n; tier = first i with `total ≥ tiers[i].dives` and (no next or `total < tiers[i+1].dives`); default €45; `base = n × tierPrice`.
    - no route → `n × pricePerDive` (cumulative).
  - **Other locations** → `calculateDivePrice(loc, customerType, n)` (uses **only this booking's n**, not the stay total): recurrent `pricePerDive`/32, local `pricePerDive`/35, tourist `diveTiers` (highest tier with `dives ≤ n`, else first) × n, fallback 1–2 €46, 3–5 €44, 6–8 €42, 9–12 €40, 13+ €38.
- Night surcharge (if night selected): `pricing.addons.night_dive ?? settings.prices.addons.night_dive ?? 20` (once per booking).
- Personal instructor: `pricing.addons.personal_instructor ?? 100` (once per booking).
- Transfer fee: `routeType === 'caleta_from_playitas'` and n > 0 → €15 (per booking).
- `price = base + night + instructor + transfer`.
- Equipment rental (0 if `ownEquipment` or nothing rented):
  - Complete equipment: `min(n, max(0, 8 − previousCompleteEquipmentDives)) × 13` — previous = Σ over customer's bookings with `rentedEquipment.completeEquipment` of `numberOfDives || (morning+afternoon)`.
  - Individual (per dive): prices from **global** `settings.prices.equipment` with defaults `Suit 5, BCD 5, Regulator 5, Torch 5, Computer 3, UWCamera 20`; Mask/Fins/Boots free; when complete equipment is on, only UWCamera is charged additionally.
- Dive insurance: always 0 on bookings (comment: handled at checkout/stay level).
- `totalPrice = price + equipmentRental`. Bono (`type==='discount_code'`): `discount = min(total × pct/100, bono.maxAmount)`; `governmentPayment = discount`; `totalPrice = customerPayment = total − discount`.
- Stores display-only fields `nightDiveSurcharge`, `cumulativePricing`, `pricePerDive`, `transferFee`, `diveInsurance`.

**Pricing info panel** (diving-family, customer selected):
- Title: recurrent/local → `"<Type> Customer Pricing"`; tourist → `Cumulative Stay Pricing (Volume Discount Applied)`.
- Text: `<Type> customers have fixed pricing per dive.` or `Volume discounts are calculated based on total dives across all days of the customer's stay. Maximum 3 dives per day (Morning, Afternoon, Night).`
- Tourist with cumulative: `Total dives in stay: N dives (across multiple days)`, `Total stay price: €x` (`cumulativePricing.totalPrice || totalPrice`).
- Recurrent/local: `Dives in this booking: N dive(s)`.
- `Price per dive: €x` — recurrent/local `pricePerDive || 32/35`; tourist `cumulativePricing.pricePerDive || pricePerDive || 46`; suffix `(discounted from €46.00)` when tourist and stay `totalDives > 3`; `(<type> customer rate)` for recurrent/local.
- Caption: `All dives are priced at the <type> customer rate (€x per dive)` or `All dives in this stay are priced at the same rate based on total volume across all booking days`.

#### Submit (`handleSubmit`)

1. Rental validations (type, duration, start date) — messages above.
2. Diving-family:
   - `diving`: ≥1 session required.
   - **First-dive insurance check**: `await getCustomerBookings(customerId)`; if no other `diving` booking (excluding this one): `getById('customers')`; valid if `divingInsurance.hasInsurance` and `expiryDate ≥ today`. If invalid → `window.confirm` "⚠️ Insurance Validation Required … This is the customer's first diving booking. Insurance is mandatory for all divers. Customer does not have valid insurance on file. Please ensure insurance is purchased and added to the stay costs before completing the booking. Do you want to proceed anyway?" — cancel aborts. On lookup error → confirm "⚠️ Could not validate insurance. … Do you want to continue?".
   - Non-diving: `numberOfDives ≥ 1`.
3. Calls `calculatePrice()` then after **100 ms** builds payload from `formData`:
   - Rentals: `activityType = 'specialty'` (real type in `equipmentNeeded.activityType`).
   - Bike: `equipmentNeeded = {activityType:'bike_rental', bikeType, rentalDays||2, bikeEquipment, bikeInsurance? (if non-empty), startDate (or bookingDate), endDate? }`; `numberOfDives = rentalDays`; price 0 → alert `Error: Booking price is invalid. Please check the pricing calculation.`; totalPrice falls back to price; clears dive/bono/equipment fields.
   - Surf: `equipmentNeeded = {activityType:'surf', surfType, rentalDays||1, surfEquipment, startDate||bookingDate}`; `numberOfDives = rentalDays`; price 0 → `Error: Surf rental price is invalid.`
   - Kite: `equipmentNeeded = {activityType:'kite_surf', kiteType, rentalDays||1, kiteEquipment, startDate||bookingDate}`; price 0 → `Error: Kite surf rental price is invalid.`
   - Diving-family: `equipmentNeeded = {...diveSessions (morning, afternoon, night[, tenFifteen]), ownEquipment, rentedEquipment, addons}`; non-diving activities: sessions forced false, `numberOfDives ||= 1`.
   - If `ownEquipment` (non-bike/kite): `totalPrice = customerPayment = price + diveInsurance − discount`.
   - Required checks: `Please select a customer.`, `Please select a location.`, `Please select a booking date.`, `Activity type is required.`, `Invalid booking price. Please check the pricing calculation.` (price must be number > 0), `Invalid total price. Please check the pricing calculation.`
   - **Payload sent** (CreateBookingDto whitelist): `customerId, locationId, bookingDate, activityType, numberOfDives (integer, default 1), price, discount, totalPrice, paymentStatus ('pending' fallback), status ('confirmed' fallback), equipmentNeeded` + optional non-empty `boatId, diveSiteId, staffPrimaryId, paymentMethod, specialRequirements, bonoId, stayId`. (`governmentPayment`, `customerPayment`, `routeType`, `addons` etc. are **not** sent.)
   - `update('bookings', id, payload)` or `create('bookings', payload)` → success alert, navigate `/bookings` after 1500 ms; error alert `Error saving booking: <message>. Please check the console for details.`

#### Location-type differences (summary)

| Aspect | Bike rental | Surf / Kite | Diving-family |
|---|---|---|---|
| Date field | Start Date | Start Date | Booking Date |
| Min duration | 2 days | 1 day | n/a (sessions) |
| Pricing | fixed 2/3-day, then per-day bands | tiers + extraDayPrice | customer type / stay volume / route |
| Extras | once per rental | per day | per dive (equipment), per booking (addons) |
| Activity type saved | `specialty` | `specialty` | `diving` / `snorkeling` / `discover` |
| Bono, addons, status | status only | status only | all |

#### Quirks / bugs

- Payload is built from a stale `formData` closure; the pre-submit `calculatePrice()` result is not included.
- Diving bookings are always saved with `numberOfDives: 1` (diving's `numberOfDives` is `undefined`/initial 1; sessions are only in `equipmentNeeded`).
- Non-diving branch of `calculatePrice` uses `formData` instead of `data`.
- `dataService.getCustomerBookings` is used synchronously in `calculatePrice` (Caleta tier history, 8-dive complete-equipment cap); in API mode it returns a Promise ⇒ history is always 0. Also it looks for `booking.rentedEquipment` / `booking.diveSessions` at top level while the form stores them in `equipmentNeeded`.
- Non-Playitas tourist pricing ignores the cumulative stay price (uses per-booking tiers) though the panel displays the cumulative price.
- `pricingService` reads location pricing from `localStorage.dcms_locations`, not the API-loaded locations.
- Diving bono: `Math.min(x, bono.maxAmount)` yields `NaN` when `maxAmount` is undefined (non-diving uses `|| Infinity`). Bono list is not filtered to `type === 'discount_code'`.
- Labels hard-code prices (Night +€20, Personal Instructor +€100, equipment €5/€3/€20, complete €13) while actual values can come from settings/location pricing; €13 complete-equipment and €38 snorkeling are hard-coded in logic.
- Editing a rental booking: `rentalDays` restored from `booking.rentalDays` (not `equipmentNeeded.rentalDays`) → defaults to 2; `bikeEquipment`, `bikeInsurance`, `startDate` are not restored from `equipmentNeeded`.
- `endDate` has no input.
- Customer/Activity/Status/Bono selects lack a `label` prop (MUI outline notch overlaps).
- Changing Location in the form mutates the global current location in localStorage without firing `dcms_location_changed`.
- Hard-coded default location UUID `550e8400-e29b-41d4-a716-446655440001`.
- `paymentMethod: 'account'` / `paymentStatus: 'paid'` defaults with no UI to change them.
- Bike equipment/insurance price labels use `||` (a configured 0 falls back to default).

---

### VolumeDiscountCalculator

- **File**: `components/Booking/VolumeDiscountCalculator.jsx`
- **Where used**: BookingForm (diving, tourist customer). Props: `numberOfDives` (number), `addons` (object, default `{}`), `bono` (bono object or undefined).
- **Purpose**: Informational table of tourist volume-discount tiers with the current tier highlighted. Does **not** affect saved prices.

#### Data

- Tiers from `localStorage.dcms_pricingConfig` → `config[0].tiers`; default: `1→€46, 2→€44, 3→€44, 4→€42, 5→€42, 6→€42, 7→€40, 8→€40, 9→€38` (default also lists addons `nightDive: 20`, `personalInstructor: 100`, unused).
- Recomputed when `numberOfDives` or `addons` change.

#### UI

- Header (TrendingDown icon) `Volume Discount Pricing System`; text `Volume discounts apply to cumulative dives across multiple days of the customer's stay. The more total dives booked during their stay, the lower the price per dive.`; info alert `Note: Maximum 3 dives per day (Morning, Afternoon, Night). Discounts are calculated based on the total number of dives across all booking days.`
- Table columns: **Number of Dives** (`N dive(s)`), **Price per Dive** (`€x.xx`), **Total Price** (`tier.price × numberOfDives`, `✓` on current), **Discount** (chip `-P%`, success colour on current).
- Current row (bold, highlighted): first tier with `tier.dives ≥ numberOfDives` (ceiling match; if none, last tier for the summary).
- Discount % = `round((46 − price) / 46 × 100)` (base 46 hard-coded).
- "Current Calculation:" box: `N dives × €price = €total`; `+ Addons: €x` where addons = `nightDive ? 20 : 0` + `personalInstructor ? 100 : 0` (hard-coded); `+ Bono discount: -P%` if `bono`.

#### Quirks

- Tier matching (ceiling, per booking) differs from `pricingService` (floor) and `stayService` (stay total); uses its own localStorage config, not location pricing.
- BookingForm passes `formData.addons` which never has `nightDive` (night is a dive session), so the night addon never appears.
- With 0 sessions the first tier is highlighted and totals are €0.

---

### Data shapes used in this area

#### Customer (as read/written by Customers / CustomerForm)

| Field | Type | Notes |
|---|---|---|
| `id` | string (uuid) | |
| `firstName`, `lastName` | string | required in form |
| `email` | string | lowercased on CSV import |
| `phone`, `nationality` | string | |
| `dob` | string `YYYY-MM-DD` or null | |
| `gender` | `'' \| 'male' \| 'female' \| 'other'` | |
| `customerType` | `'tourist' \| 'local' \| 'recurrent'` (absent/'' ⇒ rental customer) | default `tourist` |
| `centerSkillLevel` | `'beginner' \| 'intermediate' \| 'advanced'` (`expert` mentioned in CSV notes) | default `beginner` |
| `isApproved` | boolean | default false; true for rental-location creations |
| `isActive` | boolean | set true on CSV import |
| `partnerId` / `partner_id` / `created_by_partner_id` | string | partner customers |
| `source` | string, e.g. `'partner'` | |
| `preferences` | object | `{bcdSize, finsSize, bootsSize, wetsuitSize: 'XS'…'XXL' (default 'M'), tankSize: '10L'\|'12L'\|'15L'\|'Nitrox 12L'\|'Nitrox 15L' (default '12L'), ownEquipment: bool, equipmentOwnership: {mask, snorkel, fins, boots, wetsuit, hood, bcd, regulator, computer, torch, camera, weights, tank(always false): bool}, suitPreferences: {style: 'full'\|'shorty', thickness: '3mm'\|'5mm'\|'7mm', hood: bool}}`; rental customers: `{gender, …sizes}` without ownership/suit/ownEquipment |
| `certifications[]` | array | `{agency: 'SSI'\|'PADI'\|'CMAS'\|'VDST', level: string, certificationNumber: string, issueDate: string\|null, expiryDate: string\|null, verified: bool (tri-state in display: true/false/undefined), verifiedDate: 'YYYY-MM-DD'\|null}` |
| `medicalCertificate` | object | `{hasCertificate, certificateNumber, issueDate, expiryDate, verified, verifiedDate?}` |
| `divingInsurance` | object | `{hasInsurance, insuranceProvider, policyNumber, issueDate, expiryDate, verified, verifiedDate?}` |
| `uploadedDocuments[]` | array | `{id, type: 'medical_certificate'\|'diving_insurance', fileName, fileSize, mimeType, fileData (base64), uploadedAt ISO, uploadedBy: 'admin'}` |
| `medicalConditions` | array | preserved, no UI |
| `createdAt`, `updatedAt` | ISO string | set client-side |

#### Booking — payload sent by BookingForm (create/update)

| Field | Type / values |
|---|---|
| `customerId`, `locationId` | string (uuid) |
| `bookingDate` | `YYYY-MM-DD` |
| `activityType` | `'diving' \| 'snorkeling' \| 'discover' \| 'specialty'` (rentals); legacy read values `try_dive`, `discovery` → `discover`; `orientation` supported by pricing only |
| `numberOfDives` | integer (rental days for rentals; 1 for diving in practice) |
| `price`, `discount`, `totalPrice` | number (EUR) |
| `status` | `'pending' \| 'confirmed' \| 'completed' \| 'cancelled' \| 'no_show'` (default `confirmed`) |
| `paymentStatus` | string (default form `'paid'`, fallback `'pending'`) |
| `paymentMethod` | string (default `'account'`) |
| `equipmentNeeded` | object (see below) or `[]` |
| optional | `boatId`, `diveSiteId`, `staffPrimaryId`, `specialRequirements`, `bonoId`, `stayId` |

`equipmentNeeded` variants:
- Diving-family: `{morning, afternoon, night, tenFifteen?: bool, ownEquipment: bool, rentedEquipment: {completeEquipment, Suit, BCD, Regulator, Torch, Computer, UWCamera, Mask, Fins, Boots: bool}, addons: {personalInstructor: bool}}`
- Bike: `{activityType: 'bike_rental', bikeType: 'street_bike'|'gravel_bike' ('mountain_bike' displayed), rentalDays, bikeEquipment: {click_pedals, helmet, gps_computer}, bikeInsurance?: 'one_day'|'one_week'|'one_month', startDate, endDate?}`
- Surf: `{activityType: 'surf', surfType, rentalDays, surfEquipment: {wetsuit, shoes, surf_leash, auto_rack}, startDate}`
- Kite: `{activityType: 'kite_surf', kiteType, rentalDays, kiteEquipment: {harness, kite_leash, helmet, impact_vest, wetsuit}, startDate}`

Booking fields read by the list only: `location_id`, `partnerId`/`partner_id`, `source`, `routeType` (`playitas_local`|`caleta_from_playitas`|`dive_trip`), `diveSessions`, `ownEquipment`, `rentedEquipment`, `notes`, `specialRequirements`. Form-only (not sent): `routeType`, `governmentPayment`, `customerPayment`, `equipmentRental`, `bikeInsuranceCost`, `diveInsurance`, `transferFee`, `nightDiveSurcharge`, `cumulativePricing`, `pricePerDive`.

#### Government bono (`governmentBonos`)

`{id, code, type ('discount_code' is the only type applied), discountPercentage: number, maxAmount: number}`.

#### Location (fields read)

`{id, name (substring 'playitas' triggers route logic), type: 'diving'|'bike_rental'|'surf'|'kite_surf'|…, pricing}` where `pricing` may contain:
- `customerTypes: {tourist: {pricing: 'tiered', diveTiers: [{dives, price}], discoverDive, orientationDive}, local: {pricing: 'fixed', pricePerDive}, recurrent: {pricing: 'fixed', pricePerDive}}`
- `addons: {night_dive, personal_instructor}`
- `bikeTypes: {<bikeType>: {rentalTiers: [{days, price}]}}`, `equipment: {click_pedals, helmet, gps_computer}`, `insurance: {one_day, one_week, one_month}`
- `surfTypes: {<key>: {name, rentalTiers: [{days, price}], extraDayPrice}}`, `surfEquipment: {wetsuit, shoes, surf_leash, auto_rack}` (per day)
- `kiteTypes: {<key>: {name, rentalTiers, extraDayPrice}}`, `kiteEquipment: {harness, kite_leash, helmet, impact_vest, wetsuit}` (per day)

#### Settings (fields read)

`settings[0]` (or object): `prices.equipment: {Suit, BCD, Regulator, Torch, Computer, UWCamera}`, `prices.addons.night_dive`, `certificationUrls` (also `certification_urls`, `value.certificationUrls`, `value.certification_urls`): `{SSI: url, PADI: url, CMAS: url, VDST: url}`.

#### Partner (fields read)

`{id, name | companyName | company_name}`.

#### Pricing config (localStorage `dcms_pricingConfig`)

`[{tiers: [{dives, price}], addons: {nightDive, personalInstructor}}]` — only `[0].tiers` used.

---

## Billing and financial

This area covers: the customer invoice produced when a stay ends (`/bill`), the list of saved customer bills (`/bills` and the "Historical Bills" tab), the partner invoices list (`/partner-invoices`), and the Financial page (`/financial`): daily income/expenses, closing the day, stored closed-day reports, and the quarterly IGIC declaration.

**Overview of persistence (important for the rebuild):**

| Data | Where it lives in the old app | Written by |
|---|---|---|
| Customer bills | API resource `customerBills` → `/customer-bills` | Bill page, "Mark Stay as Billed / Close Stay" button |
| Partner invoices | API resource `partnerInvoices` → `/partner-invoices` | Bill page (auto on load + on Close Stay); PartnerInvoices page (payment update) |
| "Stay is billed" flag | **localStorage only**: `dcms_billed_stays` (array of `"<customerId>|<stayStartDate>"`) | Bill page Close Stay; read by `stayService.getActiveStays` to hide billed stays |
| Expenses | **localStorage only**: `dcms_financial_expenses` | Financial page |
| Manual income | **localStorage only**: `dcms_financial_manual_income` | Financial page |
| Closed-day reports | **localStorage only**: `dcms_stored_reports` | Financial page "Store" button |
| Stay additional costs (read only here) | **localStorage only**: `dcms_stay_costs` (via `stayCostsService.getStayCosts`) | Stays area (outside scope) |

Context keys read throughout: `dcms_current_location` (selected location id), `dcms_dashboard_scope` (`'global'` or `'location'`), `dcms_locations` (read indirectly by `pricingService`).

Tax: "IGIC" (Canary Islands indirect tax). Default rate **0.07 (7%)** everywhere; configurable per location in `location.pricing.tax.igic_rate` / `tax_name`, but several places hard-code 7% (see quirks).

---

### Bill page

- **File**: `pages/Bill.jsx`
- **Route**: `/bill`, wrapped in `ProtectedRoute requiredPermission="stays"` (App.jsx). Not in the navigation menu. Reached only from the Stays page (`pages/Stays.jsx` `handleEndStay`: `navigate('/bill', { state: { stay } })`) — the stay object is passed via router location state.
- **Purpose**: Shows a printable invoice for one customer stay, computed on the fly, and lets staff close the stay (which saves the bill to the DB and marks the stay as billed). Also auto-creates partner invoices as a side effect of loading.
- **Structure**: `useBillData()` hook provides everything; renders `BillActions` (header bar) then `BillDocument` (the invoice), inside `Box p:3, maxWidth 1200, centered`.
- **Loading state**: while `loading || !calculatedBill` → text `Loading bill...`.
- **Test** (`pages/Bill.smoke.test.jsx`): mounts `/bill` with a stay in router state and asserts the page eventually shows text matching `/Invoice BILL-/` and the org name `Test Dive Center` (from settings).

### BillActions (component)

- **File**: `components/Bill/BillActions.jsx`
- **Where used**: top of Bill page. Purely presentational; props come from `useBillData()`.

**UI layout** (one row, space-between):
- Left: back arrow `IconButton` → `navigate('/stays')`; heading (h4) `Invoice {calculatedBill.billNumber}`.
- Right, in order:

| Button | Style | Condition | Action |
|---|---|---|---|
| `Email Bill` (email icon) | outlined | disabled when `!stay.customer.email` | `emailBill()` → opens `mailto:` (see hook) |
| `Print` (print icon) | outlined | always | `window.print()` (prints the whole app page) |
| `Download` (download icon) | outlined | always | `downloadBill()` → opens new window with generated HTML and calls `print()` |
| `Stay Closed` | contained, success, **disabled** | only if `stayBilled` | none (status indicator) |
| `Back to Stays` (back arrow) | outlined | always | `navigate('/stays')` |

No role checks beyond the route permission.

### BillDocument (component)

- **File**: `components/Bill/BillDocument.jsx`
- **Where used**: Bill page, under BillActions. Contains the Close Stay handler inline (~200 lines).

**Printable document layout** (MUI `Paper p:4`), in order:

1. **Company header** (centered):
   - h4: `orgName` = `settings.organisation.name` or `'Dive Center'`.
   - `settings.organisation.address` (if set).
   - `phone | email` joined by `' | '` (only non-empty ones; line shown if either set).
2. Divider.
3. **Customer block**: h6 `Bill To:`; `firstName lastName`; `email` (if set); `phone` (if set).
4. **Bill details row** (3 columns, space-between): `Invoice Number:` + billNumber (bold) · `Bill Date:` + billDate (raw `YYYY-MM-DD`) · `Stay Start:` + stayStartDate (raw).
5. **Items table**. Columns: `Description` | `Date` | `Qty` (right) | `Unit Price` (right) | `Total` (right) | `Paid By`.
   Row groups, in order:
   - **Partner-paid dives** (only if ≥1 dive has `isPartnerBooking`):
     - Group header row (colSpan 6, background `secondary.light`, business icon): `Activities Paid by Partner: {name}` where name = partner name of the first partner dive whose partner resolves, else `'Partner'`.
     - One row per partner dive: Description = dive site (bold) + session (caption, e.g. `Morning`); Date = `dive.date`; Qty `1`; Unit Price `€{price.toFixed(2)}`; Total `€{total.toFixed(2)}`; Paid By = Chip (secondary, business icon) with partner name or `'Partner'`.
   - **Customer-paid dives** (if any non-partner dive): an empty spacer row first if partner dives also exist; then one row per dive with same columns, Paid By = caption `Customer`.
   - **"Items Paid by Customer"** header row (colSpan 6, background `info.light`) — shown if equipment > 0 OR diveInsurance > 0 OR any additional costs OR any other items.
   - **Additional costs** (one row each, from `dcms_stay_costs`): Description = `cost.description || cost.category`; Date = `cost.date`; Qty = `cost.quantity || 1`; Unit Price = `cost.unitPrice || cost.total`; Total = `cost.total`; Paid By `Customer`.
   - **Equipment Rental** row (if `breakdown.equipment > 0`): only Total filled; Paid By `Customer`.
   - **Dive Insurance** row (if `breakdown.diveInsurance > 0`): only Total filled; Paid By `Customer`.
   - **Other items** (one row each): name, Qty 1, unit = total = price. (Always empty in practice — see quirks.)
   - **Payment Summary** (only if `partnerPaidTotal > 0`):
     - Header row `Payment Summary` (top border).
     - `Paid by Partner ({partner name of first partner dive} or 'Partner'):` → `€{partnerPaidTotal}` + caption `+ €{partnerTax} tax` (if partnerTax > 0).
     - `Paid by Customer:` → `€{customerPaidTotal}` + caption `+ €{customerTax} tax` (if > 0).
   - **Totals** (always): `Subtotal:` €subtotal (bold) · `IGIC (7%):` €tax · `Total:` €total (h6 bold). Label text `IGIC (7%)` is hard-coded even if the rate differs.
6. Divider.
7. **Footer** (centered): `Thank you for diving with {orgName}!`
   - If `!stayBilled`: green contained button **`Mark Stay as Billed / Close Stay`**.
   - If `stayBilled`: success Alert `This stay has been marked as billed and will no longer appear in active stays.`

No legal text (no tax ID/NIF, no invoice series, no payment terms) appears on the document.

**Action: `Mark Stay as Billed / Close Stay`** (anyone who can reach the page), step by step:
1. If `!calculatedBill` → `alert('Please calculate the bill first before closing the stay.')`, stop.
2. If `!partnerInvoicesCreated`: run the **partner invoice creation algorithm** (identical to the one in `useBillData`, see Business rules) and then `setPartnerInvoicesCreated(true)` unconditionally (even if all creations failed/skipped). Errors are only logged.
3. **Save the bill** (`dataService.create('customerBills', …)`):
   - `stayLocationId` = `stay.stayBookings[0].locationId` or localStorage `dcms_current_location`.
   - `bookingIds` = ids from `getCustomerStayBookings(customer.id, stayStartDate)` (fresh fetch).
   - `billItems` built as:
     - each dive → `{ type:'dive', date, session, diveSite, quantity: dive.dives || 1, unitPrice: dive.pricePerDive || 0, total: dive.total || 0, isPartnerBooking }`
     - each additional cost → `{ type:'additional_cost', date, category, description, quantity: quantity||1, unitPrice: unitPrice||0, total: total||0 }`
     - each other item with name and price>0 → `{ type:'other', name, quantity:1, unitPrice: price, total: price }`
     - if `equipmentTotal > 0` → `{ type:'equipment', description:'Equipment Rental', quantity:1, unitPrice: equipmentTotal, total: equipmentTotal }`
     - if `breakdown.diveInsurance > 0` → `{ type:'insurance', description:'Dive Insurance', quantity:1, unitPrice, total }`
   - Payload: `{ customerId, locationId, billNumber, stayStartDate, billDate, bookingIds, billItems, subtotal, tax, total, partnerPaidTotal||0, customerPaidTotal||0, partnerTax||0, customerTax||0, breakdown||{}, notes: 'Bill for stay starting {stayStartDate}' }`.
   - Failure is logged and ignored ("still mark as billed").
4. Append `"{customer.id}|{stayStartDate}"` to localStorage `dcms_billed_stays` (if not present).
5. `setStayBilled(true)`; `alert('Stay marked as billed. Bill saved for tax control. It will no longer appear in active stays.')`.
6. Any uncaught error → `alert('Error closing stay. Please try again.')`.
No navigation afterwards. Bookings are not updated (comment: `billId`/`billDate` do not exist on bookings; the link is `customerBills.bookingIds`).

### useBillData (hook)

- **File**: `hooks/useBillData.js`
- **Used by**: `pages/Bill.jsx` (spread into BillActions and BillDocument).
- **Signature**: `useBillData(): object` (no args). Reads `location.state.stay` from react-router.

**Returned values**: `navigate, stay, settings, locations, billData, otherItems, setOtherItems, calculatedBill, loading, partnerInvoicesCreated, setPartnerInvoicesCreated, stayBilled, setStayBilled, partners, getPartnerName, printBill, downloadBill, emailBill, orgName`.

**Data loaded** (on mount, when `stay` present):
- If no `stay` in router state → `navigate('/stays')`.
- `stayBilled` = `dcms_billed_stays` (localStorage) includes `"{customer.id}|{stayStartDate}"`.
- `dataService.getAll('settings')` → first element (or null).
- `dataService.getAll('locations')`.
- `dataService.getAll('partners')`.
- `initializeBillData()`:
  - `dataService.getAll('boatPreps')` (errors → []), `dataService.getAll('diveSites')` (errors → []).
  - `stayService.getCustomerStayBookings(customer.id, stayStartDate)` — all bookings of that customer with `bookingDate` in `[stayStart, stayStart + 30 days]`, sorted by date (no status filter).
  - For each booking build dive lines (see Business rules), then `setBillData({dives, equipment:[], otherItems:[]})`, `loading=false`.
- Recalculates the bill (`calculateBill`) whenever `settings`, `locations` (non-empty), `billData.dives` (non-empty), `stay` change.
- Partner-invoice effect runs whenever `calculatedBill` changes and `partnerInvoicesCreated` is false.

**Functions**:

| Function | Behaviour |
|---|---|
| `getPartnerName(partnerId)` | `partner.name || companyName || company_name || 'Partner'` from loaded partners; `null` if no id or not found. |
| `calculateBill()` | Builds `calculatedBill` (see Business rules). No-op if no stay/settings/dives. |
| `printBill()` | `window.print()`. |
| `downloadBill()` | `window.open('', '_blank')`, writes `generateBillHTML()`, `print()`. No file is actually downloaded. |
| `emailBill()` | If no bill or no customer email → `alert('Customer email address not available.')`. Else `window.location.href = mailto:{email}?subject=…&body=…`. Subject: `Invoice {billNumber} - {orgName}`. Body: `Dear {firstName} {lastName},\n\nPlease find attached your invoice for your stay.\n\nInvoice Number: {billNumber}\nStay Start Date: {stayStartDate}\nTotal Amount: €{total.toFixed(2)}\n\nBest regards,\n{orgName}`. Nothing is attached. |
| `generateBillHTML()` (internal) | Standalone HTML (Arial, bordered table): header `<h1>{org name or 'Dive Center'}</h1>`, `<p>{address}</p>` if any, `<h2>Invoice {billNumber}</h2>`; info block `Customer:`, `Email:` (or `N/A`), `Bill Date:`, `Stay Start:`; table `Description | Date | Qty | Unit Price | Total` with dive rows (`{diveSite} - {session}`, date, 1, price, total) and additional cost rows; then rows `Subtotal:`, `IGIC (7%):`, `Total:`. Omits equipment, insurance, other items and the partner/customer split. |

**Business rules — dive line construction (per booking)**:
- Dive site: find boatPrep with `bp.date === booking.bookingDate` and `bp.session === ('morning' if diveSessions.morning, else 'afternoon' if afternoon, else 'night')`; site name from `diveSites` by `boatPrep.diveSiteId`; else `'Dive Site TBD'`. (No customer match.)
- `activityType` = `booking.activityType || activity_type`; normalized: `'try_dive'` or `'discovery'` → `'discover'`.
- `numberOfDives` = count of true `diveSessions.morning/afternoon/night` if `diveSessions` exists, else `numberOfDives || number_of_dives || 1`. (If diveSessions exists but all false → 0 → no line is produced and price divides by 0.)
- Location for pricing: `stay.stayBookings[0].locationId` → `booking.locationId/location_id` → localStorage `dcms_current_location`.
- Customer type: `pricingService.getCustomerType(customer)` = `customer.customerType || 'tourist'`.
- `isPartnerBooking` = `booking.partnerId || booking.partner_id || booking.source === 'partner'`.
- Price per booking (`calculatedPrice`), **recomputed from current pricing, not the stored booking price**:
  - `diving` → `pricingService.calculateDivePrice(locationId, customerType, numberOfDives)`:
    - `recurrent`: `customerTypes.recurrent.pricePerDive × n` (fallback 32.00 × n);
    - `local`: `customerTypes.local.pricePerDive × n` (fallback 35.00 × n);
    - tourist with `customerTypes.tourist.diveTiers`: tiers sorted by `dives`; pick highest tier with `n >= tier.dives` (else first tier); `tier.price × n`;
    - fallback: per-dive 46 (1–2), 44 (3–5), 42 (6–8), 40 (9–12), 38 (13+) × n.
    - Note: n is **the booking's own dive count**, not the cumulative stay count.
  - `discover` / `snorkeling` / `orientation` → `pricingService.calculateActivityPrice(type, n, locationId)`: snorkeling `38 × n` (hard-coded); discover `(tourist.discoverDive || 100) × n`; orientation `(tourist.orientationDive || 32) × n`.
  - anything else → `booking.totalPrice || total_price || price || 0`.
  - `pricingService.getLocationPricing` reads locations from localStorage `dcms_locations`, not from the API.
- One line per dive `i in 0..n-1`: `{ date, diveSite, session, activityType, price: calculatedPrice/n, total: calculatedPrice/n, isPartnerBooking, partnerId }`. `session` is `'Morning'|'Afternoon'|'Night'` = first true session of the booking (default `'Morning'`) — all lines of a multi-session booking get the same label.

**Business rules — bill totals (`calculateBill`)**:
- `diveTotal` = Σ `dive.total`.
- `pricing` = location (by `stay.stayBookings[0].locationId` or `dcms_current_location`) `.pricing`, else `settings.prices`.
- `otherTotal` = Σ `otherItems.price` (otherItems state is `[{name:'',price:0}]` and never edited on this page → 0).
- `additionalCosts` = `stayCostsService.getStayCosts(customer.id, stayStartDate)` (localStorage `dcms_stay_costs`, match customerId and exact stayStartDate); `additionalCostsTotal` = Σ `cost.total`.
- **Equipment**: for each `stay.stayBookings[].rentedEquipment` entry `{ [name]: bool }` that is true and `settings.prices.equipment[name.toLowerCase()] != null`: `+= price × bookingDives` (bookingDives = count of true sessions, or `numberOfDives || 0`). Uses **global** `settings.prices.equipment`, not location pricing.
- **Dive insurance** (added automatically) unless: customer `divingInsurance.hasInsurance === true` with `expiryDate >= today` (date-only compare), OR any additional cost has `category === 'insurance'`, OR `pricing.diveInsurance` missing. Amount by `daysDifference = ceil((today − stayStartDate) / 1 day)`:
  - ≥ 365 and `one_year` set → `one_year` (45.00 fallback unreachable)
  - ≥ 30 and `one_month` → `one_month` (25.00)
  - ≥ 7 and `one_week` → `one_week` (18.00)
  - else → `one_day || 7.00`
  (Duration is measured from stay start to *today*, not stay length.)
- **Partner/customer split**: `partnerPaidTotal` = Σ totals of partner dives; `customerPaidTotal` = Σ non-partner dives + equipment + insurance + additional costs + other.
- `subtotal = diveTotal + otherTotal + equipmentTotal + diveInsuranceTotal + additionalCostsTotal`.
- `tax = subtotal × (pricing.tax.igic_rate || 0.07)`; `total = subtotal + tax`. Single rate applied to the whole subtotal; no discounts; no rounding (display uses `toFixed(2)`).
- `partnerTax = partnerPaidTotal/subtotal × tax` (if both > 0), `customerTax` likewise.
- **Bill number**: `BILL-${Date.now()}` (ms timestamp), regenerated on every recalculation. `billDate` = today as UTC `YYYY-MM-DD`.

**Business rules — partner invoice creation** (useEffect on every `calculatedBill` change while `partnerInvoicesCreated === false`; same algorithm duplicated in the Close Stay button):
1. Fetch stay bookings again (`getCustomerStayBookings`).
2. Group by `booking.partnerId || booking.partner_id || customerPartnerId`, where `customerPartnerId = customer.partnerId || partner_id || created_by_partner_id` (so *all* bookings of a partner-created customer go to that partner).
3. For each partner: `dataService.getById('partners', id)`; skip if missing or `isActive === false`; skip if `commissionRate || commission_rate` is 0/missing.
4. `bookingTotal` = Σ `booking.totalPrice || total_price || price || 0` (**stored booking prices**, unlike the bill which recomputes); skip if 0.
5. `commissionAmount = bookingTotal × commissionRate` (rate is a fraction, e.g. 0.15).
6. `amountDueBeforeTax = bookingTotal − commissionAmount`.
7. `tax = amountDueBeforeTax × 0.07` (**hard-coded 7%**).
8. `invoiceTotal = amountDueBeforeTax + tax`.
9. `dataService.create('partnerInvoices', { partnerId, customerId, locationId, invoiceDate: today, dueDate: today + 30 days, paymentTermsDays: 30, subtotal: amountDueBeforeTax, tax, total: invoiceTotal, bookingIds, notes })` — `billId` deliberately omitted. `notes` = `Partner invoice for bill {billNumber} - {n} booking(s). Customer paid: €{bookingTotal}, Partner commission ({rate×100 .1f}%): €{commission}, Amount due before tax: €{due}, Tax (7% IGIC): €{tax}, Total due: €{total}`. Invoice number is assigned by the backend.
10. Business model (code comment): customer pays full price to partner; partner keeps commission; partner pays the centre (price − commission) + IGIC.
11. Flag: set `partnerInvoicesCreated=true` if ≥1 invoice created or no partner bookings; otherwise leave false ("will retry on close stay").

**Quirks/bugs**:
- Partner invoices are created **merely by opening the Bill page** (not on closing). The flag is component state, so every reopen of the same stay creates duplicate partner invoices.
- If the stay has no bookings (or all have 0 sessions), `calculateBill` never runs → page stuck on `Loading bill...`. Same if `locations` is empty.
- `billItems` for dives read `dive.dives` and `dive.pricePerDive`, which don't exist on these lines → stored as `quantity: 1, unitPrice: 0`.
- `IGIC (7%)` label hard-coded on screen and HTML while the tax uses the configured rate; partner invoice tax always 7%.
- `settings.prices.equipment` access crashes if `settings.prices` undefined (inside a guard only for `.equipment`).
- "Stay billed" only in localStorage: another browser/device still shows the stay as active.
- `BillActions` renders `stay.customer.email` — no null guard.
- Other-items UI doesn't exist on this page (state kept from the old dialog).

### BillGenerator (component) — dead code

- **File**: `components/Bill/BillGenerator.jsx`
- **Where used**: nowhere (not imported by any file). Legacy dialog version of the bill. Props `{ open, onClose, stay }`; `stay` shape expected: `stay.customer.name/email`, `stay.breakdown[]` (from `stayService.getCustomerStaySummary`: `bookingDate`, `sessions|diveSessions`, `pricePerDive`, `customerId`), `stay.totalDives`, `stay.stayBookings`.
- **Data loaded** when opened: `settings` (first), `locations`, `boatPreps`, `diveSites`. Renders nothing until settings load.
- **Dive lines**: one per true session in each breakdown entry:
  - Morning: `sessionTime '9:00 AM'`, `pricePerDive = total = booking.pricePerDive`.
  - Afternoon: `'12:00 PM'`, same.
  - Night: `'Night Dive'`, `pricePerDive = booking.pricePerDive || 46`, `nightDiveSurcharge = settings.prices.addons.night_dive || 20`, `total = base + surcharge`.
  - Dive site: boatPrep matching date (first 10 chars), session (`'morning'` also matches `'10:15'`), and `diverIds` includes customer; else a **random** pick from `['Castillo Reef','El Bajo','La Catedral','Mole','Las Playitas Reef']`.
- **Dialog 1** "Generate Bill - {customer.name}", subtitle `Stay from {stayStartDate} • {totalDives} dives`:
  - Paper `Dives Summary`: table `Date | Session (+sessionTime caption) | Dive Site ('TBD') | Price per Dive | Total | Actions` with red remove icon (title `Remove dive`) removing the line.
  - Paper `Other Items`: rows of `Item Description` (text), `Price (€)` (number, min 0, step 0.01, parsed float, default 0), `Add` button (appends `{name:'',price:0}`), remove icon (disabled when only one row).
  - Actions: `Cancel` (onClose), `Calculate Bill` (calculator icon).
- **Calculation**: identical to `useBillData.calculateBill` minus the partner/customer split (same equipment, insurance, additional costs, `igic_rate || 0.07`, `BILL-{Date.now()}`).
- **Dialog 2** "Bill - {customer.name}", subtitle `Bill #{billNumber} • {billDate}`; `#bill-content`: org header (name/address/phone | email), `Bill To:` name + email; table `Description | Dive Site | Quantity | Unit Price | Total`: dive rows `{session} on {date}` (+sessionTime, + `+ €X night dive surcharge`), site (`(To be confirmed)` if TBD), other items, `Equipment Rental` (`-` qty/unit), `Dive Insurance (Mandatory)`, additional costs (description + `(Category)` capitalised); totals `Subtotal:`, `IGIC (7%):`, `Total:`; footer `Thank you for diving with us! Safe travels!`. Actions `Close`, `Print` (window.print), `Download PDF` (also just window.print).
- **Quirks**: dead; random dive-site names; totals rows have colSpan 3 + 1 cell (misaligned with 5 columns); `cost.unitPrice.toFixed` crashes if unitPrice missing.

---

### Bills page (Historical Bills, standalone)

- **File**: `pages/Bills.jsx`
- **Route**: `/bills`, `ProtectedRoute requiredPermission="stays"`. Not linked from the navigation menu (the same content exists as a Financial tab).
- **Purpose**: Read-only list of saved customer bills "for tax control", with filters and a detail dialog.
- **Data loaded**: `dataService.getAll('customerBills')` and `dataService.getAll('customers')` on mount; no location filtering (all bills, all customers). No sorting (API order).

**UI layout**:
1. Header: receipt icon, h4 `Historical Bills`, subtitle `View and manage all billed stays for tax control`; right: `Refresh` (outlined, reloads bills).
2. Summary cards (computed over **all** bills, not filtered): `Total Bills` (count), `Total Amount` (Σ total), `Total Tax` (Σ tax). Currency format `€{n.toFixed(2)}`, null → `€0.00`.
3. Filters paper (see Fields).
4. Table columns: `Bill Number` | `Customer` | `Bill Date` | `Stay Start` | `Subtotal` | `Tax` | `Total` (bold) | `Actions` (View eye icon tooltip `View Bill`, Print icon tooltip `Print`). Dates `dd/MM/yyyy` (`N/A` if missing).
   - Customer name: `bill.customer.firstName/first_name + lastName/last_name`, else `bill.customer.email`, else `Unknown` (no lookup in the customers list).
   - Empty states: no bills at all → `No bills found. Bills are created automatically when stays are closed.`; filters exclude all → `No bills match the selected filters.`
5. **View dialog** (maxWidth lg) — title `Bill Details - {billNumber}`:
   - Grid: `Customer`, `Bill Date`, `Stay Start`, `Total Amount` (h6).
   - `Bill Items` table (if any): `Type` (Chip with raw `item.type`: `dive`/`additional_cost`/`other`/`equipment`/`insurance`) | `Description` (`description || name || diveSite || '-'`) | `Date` (formatted or `-`) | `Quantity` (`|| 1`) | `Unit Price` | `Total`.
   - Info Alert if `partnerPaidTotal > 0`: `Partner Payment: €X (Tax: €Y)` and `Customer Payment: €X (Tax: €Y)`.
   - Summary box: `Subtotal`, `Tax (IGIC)` (literal), `Total`.
   - Actions: `Close`, `Print` (contained).
- Loading: `Loading bills...`.

**Fields (filters)**:

| Field | Data key | Control | Options/defaults | Validation | Conditions |
|---|---|---|---|---|---|
| Customer | `customerFilter` | Select (small) | `""` = `All Customers`; one item per customer `firstName lastName` (value = id) | – | matches `bill.customerId || customer_id` |
| Start Date | `startDate` | date input | empty | – | `billDate >= startDate` (string compare) |
| End Date | `endDate` | date input | empty | – | `billDate <= endDate` (string compare) |

**Actions**: `Refresh` reloads; View opens dialog; Print → `window.print()` (TODO in code — prints the whole page, not the bill). No create/edit/delete.

**Quirks**: the `(Tax: …)` condition `partnerTax || partner_tax > 0` has operator-precedence issues (works for camelCase). `DownloadIcon` imported unused. Filter by end date with a full ISO timestamp string would exclude same-day bills.

---

### PartnerInvoices page

- **File**: `pages/PartnerInvoices.jsx`
- **Route**: `/partner-invoices`, `ProtectedRoute requiredPermission="settings"`. Navigation: global menu item `nav.partnerInvoices` (permission `settings`).
- **Purpose**: List partner invoices (money partners owe the centre, net of commission) and record payments.
- **Data loaded**: `dataService.getAll('partnerInvoices')` (API `/partner-invoices`), `dataService.getAll('partners')`, on mount. No location filter, no sorting. Labels via `t('partnerInvoices.*')` (EN values quoted below).

**UI layout**:
1. Header: receipt icon, h4 `Partner Invoices`, subtitle `Manage partner invoices and commission payments`; `Refresh` button (reload invoices).
2. Summary cards (over **all** invoices): `Total Invoices` (count) · `Pending` (count of `status === 'pending'`, warning colour) · `Total Amount` (Σ total) · `Outstanding` (Σ total − Σ paidAmount, error colour).
3. Filters (see Fields).
4. Table columns: `Invoice Number` | `Partner` | `Invoice Date` | `Due Date` (red if overdue) | `Total` | `Paid` | `Outstanding` (= total − paid; red if > 0) | `Status` (chip) | `Actions` (only if `isAdmin()`).
   - Partner name: `invoice.partner.name || companyName || company_name`, else lookup in partners list, else `Unknown`.
   - Empty states: `No invoices found. Partner invoices are created automatically when bills are finalized for partner customers.` / `No invoices match the selected filters.` (colSpan 9 for admin else 8).
5. **Status chip** (computed): `isOverdue = status !== 'paid' && new Date(dueDate) < now`. Label/colour:

| Condition | Label | Colour |
|---|---|---|
| isOverdue | `Overdue` | error |
| status `paid` | `Paid` | success |
| status `partial` | `Partial` | info |
| status `overdue` | `Overdue` | error |
| otherwise (`pending`/other) | `Pending` | warning (pending) / default |

6. **Record Payment dialog** (maxWidth sm), title `Record Payment`: info Alert with `Invoice Number:`, `Partner:`, `Total Amount:`, `Already Paid:`; field `Paid Amount`; actions `Cancel`, `Save Payment` (contained, disabled when field empty).
7. Snackbar (6 s) with message (severity is stored but not rendered — plain snackbar).

**Fields**:

| Field | Data key | Control | Options/defaults | Validation | Conditions |
|---|---|---|---|---|---|
| Partner (filter) | `selectedPartner` | Select | `all` = `All Partners`; each partner (value id, label name/companyName) | – | matches `partnerId || partner_id` |
| Status (filter) | `statusFilter` | Select | `all` `All Statuses`, `pending` `Pending`, `partial` `Partial`, `paid` `Paid`, `overdue` `Overdue` | – | matches stored `status` exactly (computed overdue not considered) |
| Paid Amount | `paidAmount` | number (min 0, step 0.01) | pre-filled with `invoice.total` | must parse to number ≥ 0 else snackbar `Please enter a valid amount` | helper `Enter the amount paid (total: €X)` |

**Actions**:
- **Mark as Paid** (green check icon, tooltip `Mark as Paid`): visible only if `isAdmin()` (role admin or superadmin); disabled when `status === 'paid'`. Opens dialog.
- **Save Payment**: `dataService.update('partnerInvoices', id, { paidAmount: amount, status })` where `status = amount >= total ? 'paid' : amount > 0 ? 'partial' : 'pending'`. The amount **replaces** the cumulative paid amount (not added). Success snackbar `Payment updated successfully!`, close dialog, reload. Error → `error.message` or `Error updating payment`.
- `paidAt` is not sent by the frontend.

**Quirks**: `overdue` is never written — only displayed; the Status filter `Overdue` only matches invoices whose stored status is `overdue`. `Pending` card counts stored pending (incl. those displayed as Overdue). Unused imports (Edit, Download, Filter, Print icons).

---

### Financial page

- **File**: `pages/Financial.jsx`
- **Route**: `/financial`, `ProtectedRoute requiredPermission="settings"`. Nav: global menu (permission `settings`) and location menu (permission `settings`, roles `[admin]`).
- **Purpose**: Daily cash overview (booking income, manual income, expenses), day closing with a printable report, stored closed-day reports, historical bills, and the quarterly IGIC summary.
- **Layout**: h4 `t('financial.title')` = `Financial`; Paper with Tabs; active tab content; `FinancialDialogs` always mounted.
- **Tabs** (index depends on `isBikeRental`):

| Diving location (`isBikeRental=false`) | Bike/rental location (`isBikeRental=true`) | Label (EN) | Icon | Component |
|---|---|---|---|---|
| 0 | 0 | `Today's Financial` | money | CurrentFinancialTab |
| 1 | – (hidden) | `Closed Days` | history | PreviousClosedDaysTab |
| 2 | 1 | `Historical Bills` | receipt | HistoricalBillsTab |
| 3 | 2 | `Quarterly {tax} Declaration` (`{tax}` → `taxName`, e.g. `Quarterly IGIC Declaration`) | description | QuarterlyTaxDeclarationTab |

  `isBikeRental` = a current location exists and `!hasDivingFeatures(location, settings)` (`utils/locationTypes.js`: location type lacks feature `requiresDiveSites`). If the location switches to bike rental while on tab 1, the tab resets to 0.
- **Test** (`pages/Financial.smoke.test.jsx`): with admin user and mocked services, asserts (1) tablist renders and the expense `Fuel` row appears on the default tab; (2) tab 2 shows `Historical Bills`; (3) tab 3 shows a heading matching `/Quarterly/`; (4) tab 1 shows `Previous Closed Days`.

### useFinancialData (hook)

- **File**: `hooks/useFinancialData.jsx`
- **Used by**: `pages/Financial.jsx` (spread into all tabs and FinancialDialogs).
- **Signature**: `useFinancialData(): object`. Uses `useTranslation().t`, `useAuth().currentUser`.

**State and defaults**:

| State | Default |
|---|---|
| `activeTab` | 0 |
| `selectedDate` | `new Date()` |
| `selectedQuarter` | current quarter `floor(month/3)+1` |
| `selectedYear` | current year |
| `settings` | `{ prices: {} }` then first `settings` record |
| `expenseFormData` | `{ description:'', category:'gasoline', amount:'', date: today (UTC ISO date), notes:'' }` |
| `incomeFormData` | `{ description:'', amount:'', date: today, notes:'' }` |
| bills filters | `customerFilter ''`, `startDate ''`, `endDate ''` |
| `currentLocationId` | localStorage `dcms_current_location` |

- `isAdmin` (boolean) = `currentUser.role` is `admin` or `superadmin`.
- `taxName` = `currentLocation.pricing.tax.tax_name || currentLocation.settings.pricing.tax.tax_name || 'IGIC'`; `taxRate` = same path `igic_rate || 0.07`.
- `getExpenseCategories()` → `[{value:'gasoline',labelKey:'financial.gasoline'}, {value:'tank_net',…tankNet}, {value:'glue',…glue}, {value:'equipment',…equipment}, {value:'maintenance',…maintenance}, {value:'other',…other}]`. EN labels: `Gasoline`, `Tank Net`, `Glue`, `New Equipment`, `Maintenance`, `Other`.

**Data loaded / events**:
- Mount: `getAll('customers')`, `getAll('locations')`, `getAll('settings')`.
- Listens to `window` events `dcms_location_changed` and `storage` → re-read `dcms_current_location`.
- On tab change:
  - Current Financial → `loadFinancialSummary()` = `financialService.getDailyFinancialSummary(selectedDate as YYYY-MM-DD)` (also re-runs when `selectedDate` changes).
  - Closed Days → `loadStoredReports()`: localStorage `dcms_stored_reports`; unless scope `global`, keep only reports with `locationId === currentLocationId`. Re-loads on `dcms_location_changed` and on `storage` events for `dcms_dashboard_scope`.
  - Historical Bills → `loadBills()` (`getAll('customerBills')`; unless scope `global` and a current location exists, keep bills with `locationId === dcms_current_location`) + `loadCustomers()`.
  - Tax declaration → `loadIgicDeclaration()`; also re-runs on quarter/year change (only if `locations.length > 0`) and on `dcms_location_changed` / `storage` (`dcms_dashboard_scope`, `dcms_current_location`).
- `filterBills()` runs on bills/filter changes (same rules as Bills page).

**Exported (returned) functions**:

| Function | Inputs → output / side effects |
|---|---|
| `loadCustomers`, `loadLocations`, `loadSettings`, `loadBills`, `loadStoredReports`, `loadFinancialSummary`, `loadIgicDeclaration` | Loaders described above. |
| `getQuarterDateRange(q, year)` | `{start, end}` as `YYYY-MM-DD` via `toISOString()` of local `new Date(year, (q-1)*3, 1)` and `new Date(year, (q-1)*3+3, 0)`. |
| `handleDateChange(date)` | sets `selectedDate`. |
| `handleAddExpense()` / `handleAddIncome()` | reset form (date = selected date) and open dialog. |
| `handleSaveExpense()` | if `description` or `amount` empty → silently return. Else `financialService.addExpense(expenseFormData)`, close, reload summary. Error → `alert('Error saving expense. Please try again.')`. |
| `handleSaveIncome()` | same with `addManualIncome`; error `Error saving income. Please try again.` |
| `handleDeleteExpense(id)` | `confirm('Are you sure you want to delete this expense?')` → `deleteExpense`, reload. Error `Error deleting expense. Please try again.` |
| `handleDeleteIncome(id)` | `confirm('Are you sure you want to delete this income entry?')` → `deleteManualIncome`, reload. Error `Error deleting income. Please try again.` |
| `getCustomerName(customerId)` | `firstName lastName` or email or `Unknown`. |
| `getBillCustomerName(bill)` | from `bill.customer` (camel/snake), else customers lookup, else `Unknown`. |
| `formatDate(d)` | `dd/MM/yyyy`, `N/A` if falsy, raw on error. |
| `formatCurrency(n)` | `€{n.toFixed(2)}`, `€0.00` for null/undefined. |
| `generateDailyReportHTML()` | Daily report HTML string (below). |
| `handleCloseDay()` | generate HTML → `dailyReportHtml`, open Close Day dialog. |
| `handleDownloadReport()` | downloads `daily_financial_report_{YYYY-MM-DD}.html` (Blob `text/html`). |
| `handleStoreReport()` | see Day closing. |
| `handleEmailReport()` | `mailto:?subject=Daily Financial Report - {date}&body=Please find attached the daily financial report for {date}.\n\nTotal Income: €X\nTotal Expenses: €X\nNet Profit: €X\n\nThe detailed report is attached.\n\nBest regards,\nDCMS` (no recipient, nothing attached). |
| `handleViewBill(bill)` / `handlePrintBill()` | open bill dialog / `window.print()`. |
| `handleViewReport(report)` | open stored-report dialog. |
| `generateIgicDeclarationHTML(decl)` | Declaration HTML string (below). |
| plus all state values and setters | |

**Business rules — day closing ("Close the Day")**:
- Available only to `isAdmin` and not on bike-rental locations.
- Report is a snapshot of the currently loaded `financialSummary` for `selectedDate`.
- `handleStoreReport()`: if no `currentLocationId` and no `currentLocation` → `alert('Error: No location selected. Please select a location before closing the day.')`. Else push to localStorage `dcms_stored_reports`: `{ id: Date.now().toString(), date, locationId: currentLocationId, locationName: currentLocation.name || 'All Locations', html, storedAt: ISO now, financialSummary }`; `alert('Report stored successfully for {locationName}!')`; reload list.
- No lock: data can still be edited after closing; the same day can be stored multiple times; no cash counting / float / payment-method breakdown exists.

**Daily report HTML layout** (`generateDailyReportHTML`): title `Daily Financial Report - {date}`; header h1 `Daily Financial Report`, h2 location name (current location or `All Locations`), `Date:` long en-US date (e.g. `Monday, August 10, 2026`), `Generated:` locale timestamp. Four cards: `Total Income` (green), `Total Expenses` (red), `Net Profit` (orange), `Booking Income` (blue). Section `Income from Bookings`: table `Activity Type | Number of Dives | Total Income` with rows Diving / Discovery / Snorkeling (coloured badges). Section `Booking Details` (if any): `Activity Type | Customer | Number of Dives | Price`. Section `Manual Income` (if any): `Description | Amount | Notes` + bold row `Total Manual Income`. Section `Expenses` (if any): `Category | Description | Amount | Notes` + row `Total Expenses`. Footer: `This report was generated by DCMS - Dive Center Management System` and `{org name} - {org address}` (or `Dive Center`).

**Business rules — quarterly tax declaration (`loadIgicDeclaration`)**:
- Period: quarter `start`–`end` from `getQuarterDateRange`. Q1 Jan–Mar, Q2 Apr–Jun, Q3 Jul–Sep, Q4 Oct–Dec.
- Scope: if `dcms_dashboard_scope === 'global'` → all locations, `taxName 'IGIC'`, rate 0.07; else current location, `taxName` and `igicRate` from that location's `pricing.tax` (fallbacks `'IGIC'`, 0.07).
- **Sales (Ventas)**: customer bills with `billDate` (first 10 chars) in `[start, end]` and matching location.
  - `sales.baseImponible = Σ bill.subtotal`
  - `sales.cuotaDevengada = Σ bill.tax` (as stored on the bill, not recomputed)
  - `sales.numberOfBills`
- **Purchases (Compras)**: expenses from `financialService.getAllExpenses()` (localStorage) with `date` in range and matching `locationId`.
  - per expense: base = `exp.baseImponible` if defined, else `amount / (1 + igicRate)` (amount assumed tax-inclusive)
  - tax = `exp.tax` if defined, else `amount − base`
  - `purchases.baseImponible = Σ base`; `purchases.cuotaSoportada = Σ tax`; `numberOfExpenses`.
- `netIgicToPay = cuotaDevengada − cuotaSoportada`. ≥ 0 → "to Pay" (`Resultado a ingresar`); < 0 → "to Receive" (`Resultado a compensar`).
- Result object: `{ quarter, year, dateRange:{start,end}, sales:{baseImponible,cuotaDevengada,numberOfBills}, purchases:{baseImponible,cuotaSoportada,numberOfExpenses}, netIgicToPay, igicRate, taxName }`.
- The code does not name any official form (no "Modelo 420" etc.); the printed note says `Please verify all amounts before submitting to Hacienda/AEAT.` Manual income is not included in the declaration.

**Declaration HTML layout** (`generateIgicDeclarationHTML`): title `{taxName} Declaration - {quarterName} {year}`; header h1 `{taxName} Quarterly Declaration`, h2 location name or `All Locations`, `Period:` e.g. `Q1 (January - March) 2026`, `Date Range:` `dd/MM/yyyy - dd/MM/yyyy`, `Generated:`. Cards: `Sales Base (Base Imponible)` + `{n} bills`; `{tax} Collected (Cuota Devengada)` + `{tax} Rate: 7.0%`; `Purchases Base (Base Imponible)` + `{n} expenses`; `{tax} Paid (Cuota Soportada)`. Table `Concept | Base Imponible | {tax} (7.0%) | Total`: `Sales (Ventas)`, `Purchases (Compras)`, highlighted `Net {tax} to Pay|Receive` (absolute value; green bg if ≥ 0 else blue). Footer: `This declaration was generated by DCMS - Dive Center Management System`, org name – address, `Note: This is a summary document. Please verify all amounts before submitting to Hacienda/AEAT.`

**Quirks/bugs**:
- **Expenses and manual income never carry a `locationId`** (the forms have none), so: the daily summary shows all locations' expenses/income on every location; and the quarterly declaration **excludes all expenses** whenever a location is selected (location filter `exp.locationId === currentLocationId` always fails). Purchases are only non-zero in global scope.
- `getQuarterDateRange` uses `toISOString()` on local dates: in timezones ahead of UTC (e.g. Spain/Canaries summer time) start/end shift one day earlier (Q2 → `03-31` to `06-29`).
- `loadIgicDeclaration`'s `useCallback` does not depend on `locations` → may use stale (empty) locations and fall back to `IGIC`/0.07.
- `storage` event listeners are added with anonymous functions and never removed (leak / duplicate reloads).
- Expense category label lookup uses `.label` but categories only have `labelKey` → the raw value (e.g. `tank_net`) is shown in the expenses table chip and daily report.
- `selectedDate` default `new Date().toISOString()` is the UTC date (wrong day near midnight).
- Stored reports, expenses, income live only in the browser's localStorage.

### financialService (service)

- **File**: `services/financialService.js`
- **Depends on**: `dataService.getAll('bookings')`; localStorage keys `dcms_financial_expenses`, `dcms_financial_manual_income`, `dcms_dashboard_scope`, `dcms_current_location`.
- Exports named functions and a default object with all of them.

| Function | Signature | Behaviour |
|---|---|---|
| `getAllExpenses` | `() → Expense[]` | parse localStorage `dcms_financial_expenses`; [] on error/non-array. |
| `getAllManualIncome` | `() → Income[]` | same for `dcms_financial_manual_income`. |
| `getExpensesByDate` | `(date: Date|string) → Expense[]` | exact match `exp.date === YYYY-MM-DD` (Date → `toISOString` date). |
| `getManualIncomeByDate` | `(date) → Income[]` | same. |
| `addExpense` | `(data) → Expense` | `{ id: Date.now()+random base36(9 chars), ...data, createdAt: ISO }`, append, save. Throws on error. |
| `addManualIncome` | `(data) → Income` | same. |
| `deleteExpense` | `(id) → true` | filter out by id, save. |
| `deleteManualIncome` | `(id) → true` | same. |
| `getDailyIncomeFromBookings` | `async (date) → {diving, discovery, snorkeling, total, details[]}` | see rules. |
| `getDailyFinancialSummary` | `async (date) → Summary` | combines the above. |

**Business rules — daily booking income**:
- Bookings: all `bookings` from API with `bookingDate` (first 10 chars) == date, and (unless scope `global`) `locationId === dcms_current_location`. **No booking status filter** (cancelled/no-show included).
- `activityType` lower-cased; `price = parseFloat(booking.price || totalPrice || total_price || 0)`.
- Number of dives: `diving` → count of true `morning`, `afternoon`, `night`, and (`tenFifteen` or `'10:15'`) sessions; if 0 → `numberOfDives || number_of_dives || 1`. `discover|discovery|try_dive|try_scuba` → 1; `snorkeling|snorkel` → 1; others (incl. `orientation`) → 0.
- Buckets: `diving` → diving; `discover|discovery|try_dive|try_scuba|orientation` → discovery; `snorkeling|snorkel` → snorkeling; other types are **not counted** in any total.
- `details` gets every booking with `price > 0` (including uncounted types): `{ id, activityType, numberOfDives, price, customerId, bookingDate }`.
- `total = diving + discovery + snorkeling`.
- Summary: `{ date, bookingIncome, manualIncome:{entries,total}, expenses:{entries,total}, totalIncome = bookingIncome.total + manualIncome.total, netProfit = totalIncome − expenses.total }`. Prices are booking prices as stored (IGIC-inclusive or not is unclear from code); no payment-method breakdown.

### CurrentFinancialTab (component)

- **File**: `components/Financial/CurrentFinancialTab.jsx` — Financial tab 0.

**UI layout**:
1. Toolbar: `Select Date` date input (value = selectedDate as `YYYY-MM-DD`; change → `new Date(value)`). If `isAdmin`: `Add Expense` (outlined red, trending-down icon), `Add Income` (outlined green, trending-up icon), and if `!isBikeRental` `Close the Day` (contained primary, close icon).
2. `loading` → `Loading financial data...`; no summary → error Alert `Error loading financial data. Please try again.`
3. Cards: `Total Income` (primary) · `Total Expenses` (error) · `Net Profit` (green if ≥ 0 else red) · `Booking Income` (info).
4. Paper `Income from Bookings`: three columns `Diving: €X` / `Discovery: €X` / `Snorkeling: €X`, each with `Number of dives: N` (Σ `numberOfDives` of details in that group; discovery group includes `orientation`, snorkel includes `snorkel`). If details exist: table `Activity Type` (chip `Diving` primary / `Discovery` secondary / anything else `Snorkeling` info) | `Number of Dives` | `Price` | `Customer`.
5. Paper `Manual Income (Not from Bookings)` + `Total: €X`: table `Description | Amount | Notes ('-')` | `Actions` (admin: red delete icon). Empty: `No manual income entries for this date.`
6. Paper `Expenses` + `Total: €X` (red): table `Category` (red chip) | `Description` | `Amount` | `Notes` | `Actions` (admin delete). Empty: `No expenses recorded for this date.`

### FinancialDialogs (component)

- **File**: `components/Financial/FinancialDialogs.jsx` — always mounted in Financial page.

**Add Expense dialog** (title `Add Expense`; actions `Cancel`, `Save Expense` contained red):

| Field | Data key | Control | Options/defaults | Validation | Conditions |
|---|---|---|---|---|---|
| Category | `category` | Select | `gasoline` Gasoline (default), `tank_net` Tank Net, `glue` Glue, `equipment` New Equipment, `maintenance` Maintenance, `other` Other | – | – |
| Description | `description` | text | '' | required (save silently ignored if empty) | – |
| Amount (€) | `amount` | number step 0.01 min 0 | '' | required (silently ignored if empty); stored as string | – |
| Date | `date` | date | selected date | – | – |
| Notes | `notes` | multiline 3 rows | '' | – | – |

**Add Manual Income dialog** (title `Add Manual Income`; actions `Cancel`, `Save Income` contained green): `Description` (required, placeholder `e.g., Equipment sale, Service fee, etc.`), `Amount (€)` (number, required), `Date` (default selected date), `Notes` (multiline 3).

**Close the Day dialog** (lg, 90vh): title `Daily Financial Report - {YYYY-MM-DD}` + close icon; body iframe `srcDoc` = report HTML; actions: left `Print` (opens new window with HTML and prints); right `Download`, `Store`, `Share by Email` (contained).

**View Stored Report dialog** (lg, 90vh): title `Daily Financial Report - {report.date}`; iframe with stored `report.html`; actions `Close`, `Print`.

**View Bill dialog**: same as Bills page dialog, except customer name via `getBillCustomerName` (falls back to customer lookup) and summary label `Tax ({taxName})`.

### HistoricalBillsTab (component)

- **File**: `components/Financial/HistoricalBillsTab.jsx` — Financial tab 2 (diving) / 1 (bike).
- Same UI as `pages/Bills.jsx` with these differences: heading h5 `Historical Bills` + `Refresh`; bills are **location-filtered** (unless global scope); cards computed over the loaded (location-filtered) bills, not the filtered list; Customer filter "all" label `All Customers` (translated); customer name falls back to customers lookup; `Loading bills...` shown in place of the table while loading. Same columns, empty-state messages, View/Print icons.

### PreviousClosedDaysTab (component)

- **File**: `components/Financial/PreviousClosedDaysTab.jsx` — Financial tab 1, diving only.
- Header h5 `Previous Closed Days` + `Refresh` (reload from localStorage).
- Empty: info Alert `No stored reports found. Reports are stored when you close a day.`
- Scope `global` (localStorage `dcms_dashboard_scope`): one block per location — h6 location name (`report.locationName`, else location lookup, else `All Locations`) + table; reports without locationId grouped under key `unknown`.
- Otherwise: one table.
- Table columns: `Date` (dd/MM/yyyy) | `Stored At` (dd/MM/yyyy) | `Total Income` | `Total Expenses` | `Net Profit` (from stored `financialSummary`) | `Actions` (eye icon, tooltip `View Report` → View Stored Report dialog). Sorted by `date` descending (sorts the state array in place).
- No delete action.

### QuarterlyTaxDeclarationTab (component)

- **File**: `components/Financial/QuarterlyTaxDeclarationTab.jsx` — Financial tab 3 (diving) / 2 (bike).

**UI layout**:
1. h5 `Quarterly {taxName} Declaration` + `Refresh` (recalculate).
2. Selector paper:

| Field | Data key | Control | Options/defaults | Validation |
|---|---|---|---|---|
| Quarter | `selectedQuarter` | Select | `1` `Q1 (Jan - Mar)`, `2` `Q2 (Apr - Jun)`, `3` `Q3 (Jul - Sep)`, `4` `Q4 (Oct - Dec)`; default current quarter | – |
| Year | `selectedYear` | number (min 2020, max 2100 — HTML only) | current year; invalid → current year | – |

   plus text `Period: dd/MM/yyyy - dd/MM/yyyy` (or raw ISO range before the first calculation).
3. Loading: `Loading {taxName} declaration data...`. No declaration: info Alert `Select a quarter and year, then the declaration will be calculated automatically.`
4. Cards: `Sales Base (Base Imponible)` + `{n} bills` · `{tax} Collected (Cuota Devengada)` (green) + `{tax} Rate: 7.0%` · `Purchases Base (Base Imponible)` + `{n} expenses` · `{tax} Paid (Cuota Soportada)` (orange).
5. Result paper (green bg if net ≥ 0 else blue): `Net {tax} to Pay` / `to Receive`, subtitle `Resultado a ingresar` / `Resultado a compensar`, amount = `|netIgicToPay|` (h3).
6. `Detailed Breakdown` table: `Concept | Base Imponible | {tax} (7.0%) | Total` — rows `Sales (Ventas)`, `Purchases (Compras)` (Total = base + tax), `Net Result` (signed net in tax column, `-` elsewhere).
7. Buttons: `Print Declaration` (new window + print of declaration HTML), `Download Declaration` (file `{taxname lowercase}_declaration_Q{q}_{year}.html`).

No role restriction inside the tab (route permission `settings` only).

---

### Data shapes used in this area

**Stay (router state into `/bill`)** — from Stays page:
`{ customer: { id, firstName, lastName, email, phone?, customerType?('tourist'|'local'|'recurrent'), divingInsurance?: { hasInsurance: bool, expiryDate }, partnerId?/partner_id?/created_by_partner_id? }, stayStartDate: 'YYYY-MM-DD', stayBookings: [{ id, locationId, rentedEquipment?: { [equipmentName]: bool }, diveSessions?: {morning,afternoon,night}, numberOfDives? }] }`

**Booking (fields read)**: `id, customerId|customer_id, bookingDate|booking_date, activityType|activity_type ('diving'|'discover'|'discovery'|'try_dive'|'try_scuba'|'orientation'|'snorkeling'|'snorkel'|other), diveSessions|sessions {morning, afternoon, night, tenFifteen|'10:15'}, numberOfDives|number_of_dives, locationId|location_id, partnerId|partner_id, source ('partner'), totalPrice|total_price|price`.

**Calculated bill (in memory)**:
`{ customer, stayStartDate, billDate:'YYYY-MM-DD', billNumber:'BILL-<ms>', dives: DiveLine[], otherItems:[{name, price}], equipmentTotal, additionalCosts: StayCost[], additionalCostsTotal, subtotal, tax, total, partnerPaidTotal, customerPaidTotal, partnerTax, customerTax, breakdown:{ dives, equipment, diveInsurance, additionalCosts, other } }`

**DiveLine (Bill page)**: `{ date, diveSite, session:'Morning'|'Afternoon'|'Night', activityType, price, total, isPartnerBooking: bool, partnerId|null }`.
(BillGenerator variant: `{ date, session, sessionTime, diveSite, dives:1, pricePerDive, nightDiveSurcharge?, total }`.)

**StayCost (localStorage `dcms_stay_costs`)**: `{ id, customerId, stayStartDate, date, category ('insurance'|'equipment'|'clothes'|'goodies'|'other'), description, amount, quantity, unitPrice, total, notes, createdAt }`.

**Customer bill (`customerBills`, API `/customer-bills`)**:
`{ id, customerId, locationId, billNumber, stayStartDate, billDate, bookingIds: string[], billItems: BillItem[], subtotal, tax, total, partnerPaidTotal, customerPaidTotal, partnerTax, customerTax, breakdown:{dives,equipment,diveInsurance,additionalCosts,other}, notes, customer?(joined), location?(joined), createdAt, updatedAt }` (adapter also accepts snake_case).

**BillItem**: `{ type: 'dive'|'additional_cost'|'other'|'equipment'|'insurance', date?, session?, diveSite?, category?, description?, name?, quantity, unitPrice, total, isPartnerBooking? }`.

**Partner invoice (`partnerInvoices`, API `/partner-invoices`)**:
`{ id, partnerId, customerId|null, billId|null (never sent), locationId, invoiceNumber (server-generated), invoiceDate, dueDate, paymentTermsDays (30), subtotal (= booking total − commission), tax (7% of subtotal), total, paidAmount (default 0), status: 'pending'|'partial'|'paid'|'overdue' (default 'pending'), bookingIds[], notes, paidAt|null, createdAt, updatedAt, partner?(joined) }`.
Update payload from UI: `{ paidAmount, status }`.

**Partner (fields read)**: `id, name|companyName|company_name, commissionRate|commission_rate (fraction), isActive`.

**Settings (fields read)**: `organisation:{ name, address, phone, email }`, `prices:{ tax:{ igic_rate }, equipment:{ [name]: price }, diveInsurance:{ one_day, one_week, one_month, one_year }, addons:{ night_dive } }`.

**Location pricing (fields read)**: `pricing:{ tax:{ igic_rate, tax_name }, diveInsurance:{…}, customerTypes:{ tourist:{ diveTiers:[{dives, price}], discoverDive, orientationDive }, local:{ pricePerDive }, recurrent:{ pricePerDive } }, divePacks }` (also `settings.pricing.tax.*` fallback).

**Expense (localStorage `dcms_financial_expenses`)**: `{ id, description, category: 'gasoline'|'tank_net'|'glue'|'equipment'|'maintenance'|'other', amount: string, date:'YYYY-MM-DD', notes, createdAt }` (optionally read: `baseImponible`, `tax`, `locationId` — never written by the UI).

**Manual income (localStorage `dcms_financial_manual_income`)**: `{ id, description, amount: string, date, notes, createdAt }`.

**Daily financial summary**: `{ date, bookingIncome:{ diving, discovery, snorkeling, total, details:[{ id, activityType, numberOfDives, price, customerId, bookingDate }] }, manualIncome:{ entries, total }, expenses:{ entries, total }, totalIncome, netProfit }`.

**Stored closed-day report (localStorage `dcms_stored_reports`)**: `{ id: '<ms>', date:'YYYY-MM-DD', locationId, locationName, html, storedAt: ISO, financialSummary }`.

**Tax declaration (in memory, not persisted)**: `{ quarter:1-4, year, dateRange:{start,end}, sales:{ baseImponible, cuotaDevengada, numberOfBills }, purchases:{ baseImponible, cuotaSoportada, numberOfExpenses }, netIgicToPay, igicRate, taxName }`.

**Billed stays (localStorage `dcms_billed_stays`)**: `string[]` of `"<customerId>|<stayStartDate>"`.

---

## Operations: schedule, trips, boat preparation, breaches

Covers the dive schedule (calendar views, Mole/boat slot assignment, guide coverage), the Trip Details page, the Boat/Dive Preparation workflow (preparation, post-dive reports, compliance reports), and the GDPR data-breach register.

General conventions in this area:
- **Current location** is always read from `localStorage['dcms_current_location']` (a location UUID, or in BoatPrep possibly a short name such as `caleta`/`playitas`, see useBoatPrepData).
- Data goes through `services/dataService.js` (`getAll/getById/create/update/remove(resource, ...)`, `getAvailableEquipment(category)`). In API mode it maps resources to REST endpoints in `services/api/realApiAdapter.js`: `boatPreps` → `/boat-preps`, `scheduleSlotGuides` → `/schedule-slot-guides`, `diveSites` → `/dive-sites`; others use their own name (`/bookings`, `/boats`, `/staff`, `/customers`, `/locations`, `/equipment`). `create` = POST, `update` = PUT `/{endpoint}/{id}`, `remove` = DELETE.
- Breaches do **not** use dataService. They use `services/breachService.js`, which calls `fetch` directly.
- None of the files here check roles themselves. Access is controlled only by the route guards in `App.jsx` (`ProtectedRoute requiredPermission=...`), listed per page below.
- No polling. Only `useBoatPrepData` listens to window events (listed there).
- Labels written as `t('x.y')` come from `utils/translations.js`. The English value is given next to each one.

---

### Schedule page (`pages/Schedule.jsx`)

- **File**: `pages/Schedule.jsx`
- **Route**: `/schedule`, guarded by `requiredPermission="boatPrep"`.
- **Purpose**: The operations calendar. It shows each day's bookings as Mole (shore: discovery/try-scuba/orientation) and boat trips. Staff use it to assign bookings to Mole time slots or to boat sessions, and to set which guides cover each slot. All state comes from `useScheduleData()`.

#### Data loaded
All data comes from `useScheduleData` (see below). The page makes no direct calls of its own.

#### UI layout (in order)
1. While `loading` is true, the page shows only the text `Loading schedule...`.
2. **Header row** (flex, wraps):
   - Title `t('schedule.diveSchedule')` = "Dive Schedule".
   - Button **"Add New Dive Trip"** (contained, success/green, small, + icon). It navigates to `/bookings/new`, i.e. it creates a booking; there is no trip entity.
   - **View toggle** (3 plain Buttons, not tabs). The active one is `contained` and the others are `outlined`:
     - `t('schedule.tripSchedules')` = "Trip Schedules" → `viewMode='month'` (the **default**).
     - "Daily Summary" (color `warning`) → `viewMode='daily'`.
     - `t('schedule.week')` = "Week" → `viewMode='week'`.
   - **Navigation**: "Previous", "Today", "Next".
     - In month mode, Previous/Next move ±1 month.
     - In **any other mode (daily and week)** they move ±1 **week**.
     - Today sets `currentDate = new Date()`.
   - **Date display** (h6, min width 200):
     - month: `MMMM yyyy`
     - daily: `EEEE, MMMM d, yyyy`
     - week: `MMM d - MMM d, yyyy`, where the first date is `displayStart` and the second is `displayEndDate`.
3. The body shows one of: `<MonthView>`, `<DailyView>` or `<WeekView>`. Each receives the full hook return value as props.
4. **Month day-detail dialog**
   - Open when `selectedDate !== null && viewMode === 'month'`. Size maxWidth md, fullWidth.
   - Title: the date as `EEEE, MMMM d, yyyy`, plus a close (X) icon.
   - Content: `<DayDetailView slot={{type:'day', date}}>` with discovery/dive bookings for that date, `boats=activeBoats`, staff, slotAssignments and slotGuides.
   - Its `onSlotClick(type, date, boatId, sessionTime)` handler:
     - closes this dialog,
     - switches `viewMode` to `'week'`,
     - sets `selectedSlot` to `{type:'mole', date}` or `{type:'boat', date, boatId, sessionTime}`. This opens the Slot Detail dialog on top of the week view.
   - Action: "Close".
5. **Slot detail dialog**
   - Open when `!!selectedSlot && viewMode === 'week'`. Size maxWidth md.
   - Title:
     - mole: `Mole - Discovery/Try Scuba/Orientation Slots`
     - boat: `{boat name|'Boat'} - Morning Session`. This always says "Morning", even when the session is afternoon.
     - otherwise: `Day Schedule`
   - Subtitle: the date as `EEEE, MMMM d, yyyy`.
   - Content:
     - mole: `<SlotDetailView bookings=getDiscoveryBookings(date)>`
     - boat: `<SlotDetailView bookings=getDiveBookings(date) onRemoveBoatAssignment=...>`
   - Action: "Close". This calls `handleCloseDialog`, which sets `selectedSlot = null`.

#### Quirks
- In the daily view, "Previous"/"Next" move by a whole week, not by a day.
- The boat slot dialog title is hard-coded to "Morning Session".

#### Smoke test (`pages/Schedule.smoke.test.jsx`)
It mocks dataService so that only `boats` returns one active boat at `loc-1`. It asserts:
- the month view renders "Add New Dive Trip" and the "Mon" header;
- clicking "Daily Summary" renders "Daily Summary for …";
- clicking the week toggle (untranslated key `schedule.week` in tests) renders at least one "Mole" box.

---

### `hooks/useScheduleData.js`

- **File**: `hooks/useScheduleData.js`. Default export is `useScheduleData()`, with no arguments.
- **Used by**: `pages/Schedule.jsx`. It is also spread as props into MonthView, DailyView and WeekView.
- **Purpose**: Holds all state, data loading and mutations for the Schedule page.
- **Dependencies**:
  - `dataService`
  - `useTranslation` (`utils/languageContext`)
  - `useNavigate`
  - `utils/scheduleConstants.js`: `MOLE_START_TIME`, `MOLE_SLOT_DURATION`, `MOLE_SLOT_INTERVAL`

#### Constants (`utils/scheduleConstants.js`)

| Constant | Value |
|---|---|
| `MOLE_START_TIME` | `'09:30'` |
| `MOLE_SLOT_DURATION` | `60` (minutes) |
| `MOLE_SLOT_INTERVAL` | `30` (minutes between slot starts) |
| `BOAT_SESSIONS` | `[{name:'Morning', time:'09:00', duration:240}, {name:'Afternoon', time:'12:00', duration:240}, {name:'Night', time:'18:00', duration:120}]` |

#### State

| State | Initial value | Meaning |
|---|---|---|
| `currentDate` | `new Date()` | Anchor date for all views. |
| `viewMode` | `'month'` | `'month' \| 'week' \| 'daily'` |
| `selectedSlot` | `null` | `{type:'mole', date}` or `{type:'boat', date, boatId, sessionTime}`. Opens the slot dialog. |
| `selectedDate` | `null` | Date whose day-detail dialog is open in month view. |
| `locations`, `boats`, `bookings`, `customers`, `diveSites`, `staff` | `[]` | Loaded data. |
| `loading` | `true` | Load in progress. |
| `slotAssignments` | `{}` | `{ slotId: [bookingId, ...] }` |
| `slotGuides` | `{}` | `{ slotKey: [staffId, ...] }` |
| `slotGuideRecordIds` | `{}` | `{ slotKey: scheduleSlotGuides.id }`. Tells `handleUpdateGuides` whether to create or update. |

#### Derived date values

| Value | Formula |
|---|---|
| `monthStart` | `startOfMonth(currentDate)` |
| `monthEnd` | `endOfMonth(currentDate)` |
| `daysInMonth` | every day from `monthStart` to `monthEnd` |
| `daysBeforeMonth` | Empty leading cells for a **Monday-first** grid: `getDay()===0 ? 6 : getDay()-1`, where `getDay()` is taken on `monthStart`. |
| `weekStart` | `startOfWeek(startOfDay(currentDate), {weekStartsOn:1})` (Monday) |
| `displayStart` | `weekStart - 1 week` |
| `displayEnd` | `weekStart + 3 weeks` |
| `displayEndDate` | `endOfWeek(displayEnd, {weekStartsOn:1})` |
| `daysToDisplay` | every day from `displayStart` to `displayEndDate`: **28 days** (1 week back, the current week, 2 weeks forward) |

#### `loadData()` (runs once on mount; re-run after every mutation)
1. `Promise.all` of `dataService.getAll` for: `locations`, `boats`, `bookings`, `customers`, `diveSites`, `staff`, `scheduleSlotGuides`.
2. Filters applied:
   - **boats**: `(locationId||location_id) === currentLocationId && isActive !== false`.
   - **staff**: `isActive !== false` only. Staff are **not** filtered by location.
   - **bookings**: all bookings are stored, with **no status filter**. Cancelled or pending bookings also appear on the calendar.
3. **slotAssignments rebuilt**: for every booking that has `moleSlotTime` (or `mole_slot_time`) and `bookingDate`:
   - `slotId = 'mole-' + bookingDate.split('T')[0] + '-' + moleSlotTime.replace(':','-')`, for example `mole-2025-06-01-10-30`;
   - the booking id is pushed into `slotAssignments[slotId]`;
   - the result is merged with the previous state as `{...prev, ...new}`, and each slot's array is unioned with its previous array. The code does this to preserve optimistic updates.
4. **slotGuides rebuilt** from the `scheduleSlotGuides` records where `(locationId||location_id) === currentLocationId`:
   - `slotGuides[slotKey] = guideIds || guide_ids || []`
   - `slotGuideRecordIds[slotKey] = record.id`
   - Both are merged with the previous state.
5. Errors go to `console.error` only. `loading` is set to false in `finally`.

#### Exported values and functions

| Name | Signature | Behaviour |
|---|---|---|
| `activeBoats` | memo | `boats` at the current location with `isActive !== false`. Sort order: any boat whose lowercase name **contains** `white`, then `black`, then `grey`, in that order. All other boats follow, sorted alphabetically (`localeCompare`). Returns `[]` if there is no current location. |
| `generateMoleSlots(date)` | → `[{start, end, id}]` | Slots start at 09:30 and a new one starts every 30 minutes. Each lasts 60 minutes. A slot is kept only if its end is ≤ 13:00. This gives **6 slots**: 09:30–10:30, 10:00–11:00, 10:30–11:30, 11:00–12:00, 11:30–12:30, 12:00–13:00. `id = 'mole-' + format(start,'yyyy-MM-dd-HH-mm')`. It is exported but not used by the views; SlotDetailView contains its own copy of the logic. |
| `getBookingsForDate(date)` | → bookings | `bookingDate.split('T')[0] === format(date,'yyyy-MM-dd')` **and** booking location `=== currentLocationId`. |
| `getDiscoveryBookings(date)` | → bookings | Bookings for that date whose `activityType ∈ {'discovery','discover','try_dive','orientation','try_scuba'}`. These are the "Mole" bookings: discovery, try scuba and orientation always take place at Mole. |
| `getDiveBookings(date)` | → bookings | Bookings for that date whose `activityType === 'diving'` exactly. Snorkeling and specialty bookings are **not** shown on boats here. |
| `getCustomerName(customerId)` | → string | `"first last"` trimmed; otherwise the email; otherwise `'Unknown'`. |
| `getDiveSiteName(booking)` | → string\|null | Name of the site matching `diveSiteId`. |
| `getBoatNameForBooking(booking)` | → string\|null | Name of the boat matching `boatId` (looked up in the location-filtered `boats`). |
| `formatTripEntry(booking)` | → string | Calendar label in the form `"{time} ({count}) {Shore\|Boat}{, location}"`, e.g. `9a (1) Shore, Jemelos`. Rules below. |
| `handlePreviousWeek/NextWeek` | | `currentDate ∓ 1 week` |
| `handlePreviousMonth/NextMonth` | | `currentDate ∓ 1 month` |
| `handleToday` | | `currentDate = now` |
| `handleDayClick(date)` | | Does nothing. |
| `handleMonthDayClick(date)` | | `setSelectedDate(date)`, which opens the day-detail dialog. |
| `handleMoleClick(date, e)` | | `e.stopPropagation()`, then `selectedSlot = {type:'mole', date}`. |
| `handleBoatClick(date, boatId, e)` | | `e.stopPropagation()`, then `selectedSlot = {type:'boat', date, boatId, sessionTime:'morning'}`. The session is always morning. |
| `handleCloseDialog()` | | `selectedSlot = null` |
| `handleAssignCustomer(bookingId, slotId, slotType, boatId=null, sessionTime=null)` | async | Steps below. |
| `handleRemoveAssignment(slotId, slotType, bookingIdToRemove=null)` | async | Steps below. |
| `handleRemoveBoatAssignment(bookingId, boatId)` | async | `update('bookings', id, {boatId:null, session:null})`, then `loadData()`. |
| `handleUpdateGuides(slotKey, guideIds, context={})` | async | Steps below. `context = {slotType:'mole'\|'boat', date: Date, boatId?}`. |

The hook also returns `t`, `navigate`, all state values with their setters, `daysInMonth`, `daysBeforeMonth`, `displayStart`, `displayEndDate` and `daysToDisplay`.

##### `formatTripEntry(booking)` rules
- **Time source**: `bookingTime || booking_time || bookingDate || '09:00'`. The default label is `'9a'`.
  - If the value contains `T`, the hour comes from the part after `T`.
  - Else if it contains `:`, the hour is the first two characters.
- **Hour formatting**:
  - hour 9 → `9a`
  - hour 12 → `12p`
  - any other hour → `${h}${h>=12?'p':'a'}`. There is **no 12-hour conversion**, so 14:00 shows as `14p`.
- **Count**: always `1`, because each booking is one customer.
- **Shore/Boat**: "Shore" if activityType ∈ {discovery, discover, try_dive, orientation}. Note that `try_scuba` is not in this list, so a try_scuba booking is labelled **"Boat"** even though it is listed under Mole.
- **Location suffix**: the dive site name; otherwise (non-shore only) the boat name; otherwise nothing.

##### `handleAssignCustomer` steps
1. Look up the booking. If it is not found, log and return.
2. Build the update:
   - **mole**: split `slotId` (`mole-yyyy-MM-dd-HH-mm`) on `-`. If there are at least 6 parts, set `moleSlotTime = parts[4] + ':' + parts[5]` (HH:mm). Otherwise log a warning and persist nothing.
   - **boat**: `{boatId, session: sessionTime || 'morning'}`.
3. If the update is non-empty: `dataService.update('bookings', bookingId, update)`.
4. Optimistically append `bookingId` to `slotAssignments[slotId]` and merge the update into the local booking.
5. `await loadData()`.
6. On error, remove `bookingId` from `slotAssignments[slotId]`, and delete the key if the slot is now empty.

Business rule stated in the code comments: **multiple customers may be assigned to one slot**, both Mole and boat. There is no capacity check here. A comment says "personal-instructor customers count as 2 in capacity calculations elsewhere"; that calculation is not in these files.

##### `handleRemoveAssignment` steps
1. If the slot has no assignments, return.
2. Work out which ids to remove: `bookingIdToRemove` if given, otherwise every id in the slot.
3. For each id:
   - boat → `update('bookings', id, {boatId:null, session:null})`
   - mole → `update('bookings', id, {moleSlotTime:null})`
4. Update local state:
   - if `bookingIdToRemove` was given, filter that id out and delete the key if the slot becomes empty;
   - otherwise delete the whole slot key.
5. `loadData()`. Errors are logged only.

##### `handleUpdateGuides` steps
1. Optimistically set `slotGuides[slotKey] = guideIds`.
2. If `currentLocationId`, `context.slotType` or `context.date` is missing, log a warning and return. The optimistic state stays; nothing is persisted.
3. If `slotGuideRecordIds[slotKey]` exists: `update('scheduleSlotGuides', id, {guideIds})`.
4. Otherwise: `create('scheduleSlotGuides', {locationId, date: 'yyyy-MM-dd', slotType, slotKey, boatId: context.boatId||null, guideIds})`, then store the returned `id`.
5. On error, restore the previous `slotGuides[slotKey]`.

**Slot key formats (these are persisted)**:
- Mole: `mole-{yyyy-MM-dd}-{HH}-{mm}`
- Boat guides: `boat-{boatId}-{yyyy-MM-dd}-{session}`
- Boat *assignment* slotId: `boat-{boatId}-{session}`. This one has no date and is only used in local `slotAssignments`; boat assignment itself is persisted through `booking.boatId` and `booking.session`.

#### Quirks
- **Stale Mole display after moving a booking**: when a booking moves to another Mole slot, its old slot keeps showing it until a full remount. `moleSlotTime` is a single column, but the merge in `loadData` preserves `prev` keys.
- The `totalBookings` and `dayBookings` values computed in the views are never used.

---

### MonthView (`components/Schedule/MonthView.jsx`)

- **File**: `components/Schedule/MonthView.jsx`. Used by Schedule when `viewMode==='month'`.
- **Purpose**: A Monday-first month grid showing each day's trip entries.
- **Layout**:
  - **Header row**: 7 columns labelled `Mon Tue Wed Thu Fri Sat Sun` (bold captions).
  - **Grid**: `daysBeforeMonth` empty cells (min height 100), then one Paper per day of the month. Each day Paper has:
    - min height 100, pointer cursor;
    - **today** styling: border 2 in `primary.main`, background `primary.light`, bold day number;
    - other days: border 1 in `divider`, background `background.paper`. Out-of-month days would be `action.hover` at opacity 0.5, but none are rendered.
    - **Hover**: `primary.main` if today, otherwise `action.hover`; border colour `primary.dark`.
    - The day number (`d`).
    - **Discovery entries** (all of them): small boxes in `info.main` (blue) with white 0.65rem text, labelled `formatTripEntry(booking)`. Clicking one stops propagation and navigates to `/schedule/trip/{yyyy-MM-dd}/mole`.
    - **Dive entries**: only the **first 2**, in `primary.main`. Clicking one navigates to `/schedule/trip/{date}/boat/{boatId}/morning` **only if the booking has a boatId**; otherwise the click does nothing.
    - If there are more than 2 dive bookings: caption `+{n-2} more`.
- **Actions**: clicking the day cell calls `handleMonthDayClick(date)`, which opens the day-detail dialog.

---

### DailyView (`components/Schedule/DailyView.jsx`)

- **File**: `components/Schedule/DailyView.jsx`. Used when `viewMode==='daily'`.
- **Purpose**: A text list of the day's trips for `currentDate`.
- **Layout**:
  - Heading: `Daily Summary for {EEEE, MMMM d, yyyy}`.
  - A Paper containing:
    - **"Shore Dives (Discovery/Try Scuba)"** (subtitle, `info.main`), shown if there are discovery bookings. One bordered row per booking: `{customerName} - {formatTripEntry}`.
    - **"Boat Dives"** (subtitle, `primary.main`), shown if there are dive bookings. One row per booking: `{customerName} - {formatTripEntry} ({boatName | 'Unassigned'})`.
    - **Empty state**: `No trips scheduled for this day`.
  - Customer name here is `first last` trimmed, or `'Unknown'`. There is no email fallback.
- **Actions**: none. The view is read-only.

---

### WeekView (`components/Schedule/WeekView.jsx`)

- **File**: `components/Schedule/WeekView.jsx`. Used when `viewMode==='week'`.
- **Purpose**: A 4-week rolling grid (`daysToDisplay`, 28 days). Each day shows a clickable Mole box and one box per boat that is needed.
- **Layout** (one Paper per day, flex-wrap):
  - **Responsive widths**: xs 100%, sm 50%, md 33.33%, lg 14.28%, i.e. 7 per row on large screens.
  - Min height 140. Today has border 2 in `primary.main`.
  - **Header**: `EEE d` (0.65rem, bold). Primary colour if today.
  - **Mole box**:
    - always shown, even with no bookings;
    - border `info.main`, background `rgba(33,150,243,0.08)` (hover 0.15);
    - label `Mole`, plus ` ({n})` when there are discovery bookings;
    - click → `handleMoleClick(day, e)`.
  - **Boat boxes**: shown only if the day has dive bookings. Which boats appear is decided by the rule below.
    - Each box shows `{boat.name}`, plus ` ({count})` when that boat has bookings assigned.
    - Background `primary.light` if it has bookings, otherwise `action.hover`.
    - Click → `handleBoatClick(day, boat.id, e)`, which opens the morning session.

**Rule for which boats appear in the week view (exact)**:
1. `totalDivers = Σ (numberOfDives || number_of_dives || 1)` over the day's dive bookings. Note that this sums *dives*, not divers.
2. `defaultCapacity = activeBoats[0].capacity || 8`, or `8` if there are no boats.
3. `boatsNeeded = ceil(totalDivers / defaultCapacity)`.
4. Every boat with at least one assigned booking (`booking.boatId === boat.id`) is always shown.
5. If there are unassigned dive bookings:
   - `unassignedDivers = Σ numberOfDives` over those bookings;
   - also show the first `min(ceil(unassignedDivers/defaultCapacity), activeBoats.length)` boats, taken in `activeBoats` order.
6. Otherwise, if no boat has bookings and `boatsNeeded > 0`: show the first `min(boatsNeeded, activeBoats.length)` boats.
7. Boats are rendered in `activeBoats` order.

---

### DayDetailView (`components/Schedule/DayDetailView.jsx`)

- **File**: `components/Schedule/DayDetailView.jsx`. Used inside the month day-detail dialog, always with `slot.type === 'day'`.
- **Props**: `slot, discoveryBookings, diveBookings, customers, boats, staff, slotAssignments, slotGuides, onSlotClick, onAssign, onRemoveAssignment, onUpdateGuides`.
- **Purpose**: An overview of one day's slots, with entry points into slot assignment and Trip Details.
- **Layout (type `'day'`)**:
  - Subtitle: `All Slots for {EEEE, MMMM d, yyyy}`.
  - **Mole Paper** (border `secondary.main`):
    - Title: `Mole - Discovery / Try Scuba / Orientation`.
    - Button **"View Slots"** (outlined, secondary) → `onSlotClick('mole', date)`.
    - Button **"Trip Details"** (contained, secondary) → navigates to `/schedule/trip/{yyyy-MM-dd}/mole`.
    - Line: `{n} booking(s) (Discovery/Try Scuba/Orientation)`. The "s" is added when n ≠ 1.
    - Italic caption: `All discovery, try scuba, and orientation dives are done at Mole`.
  - **Boat Papers**: one each for **at most the first 3** of `boats` (activeBoats order). Border `primary.main`. Each contains:
    - The boat name.
    - Buttons **"Morning (9AM)"** → `onSlotClick('boat', date, boat.id, 'morning')` and **"Afternoon (12PM)"** → `onSlotClick('boat', date, boat.id, 'afternoon')`.
    - Full-width **"Trip Details"** button. It sets `window.location.href = /schedule/trip/{date}/boat/{boatId}/morning`, which forces a full page reload and always opens the morning session.
    - Caption: `{n} dive booking(s) available`, where n counts dive bookings with `b.boatId === boat.id` **or** no `boatId` (camelCase field only).
- **Fallback**: for any other `slot.type`, it renders SlotDetailView. This path is unreachable from current callers.

---

### SlotDetailView (`components/Schedule/SlotDetailView.jsx`)

- **File**: `components/Schedule/SlotDetailView.jsx`. Used in the Schedule slot dialog.
- **Props**: `slot, bookings, customers, boats, staff, slotAssignments, slotGuides, onAssign, onRemoveAssignment, onUpdateGuides, onRemoveBoatAssignment`.
- **Purpose**: Assign customers to Mole time slots or to a boat session (by drag-and-drop or click), and pick the guides covering each slot.
- **Local state**: `draggedBookingId`, `dragOverSlotId`, `dragOverBoatId`.
- **Drag and drop**:
  - Uses HTML5 DnD with `dataTransfer` type `text/plain` holding the bookingId.
  - The dragged element gets opacity 0.5 while dragging.
  - On drop:
    - mole → `onAssign(bookingId, slotId, 'mole')`
    - boat → `onAssign(bookingId, 'boat-{boatId}-{session}', 'boat', boatId, session)`
  - A drop target being hovered gets border `success.main` and background `success.light`.

#### Mole mode (`slot.type==='mole'`)
- Subtitle: `Available Slots (30-minute intervals, 1-hour duration)`.
- It generates the same **6 slots** as `generateMoleSlots` (09:30 to 13:00, same ids).
- **One Paper per slot**, in this order:
  - **Header**: `HH:mm - HH:mm`, plus a chip that reads `{n} assigned` (primary) or `Available` (default).
  - **Paper styling**: when assigned, border `primary.main` and background `primary.light`; otherwise border `divider`.
  - **"Assigned customers:"** list: medium primary chips (person icon, customer name).
    - The chip's delete (x) calls `onRemoveAssignment(slotId, 'mole', bookingId)`.
    - Chips are draggable, so a customer can be dragged to another slot.
  - **Guides** multi-select:
    - Label `Guides`. With nothing selected it renders `Select guides`.
    - Options: staff whose `role ∈ {divemaster, instructor, assistant}`, labelled `first last`, falling back to email, then id.
    - onChange → `onUpdateGuides(slotId, ids, {slotType:'mole', date})`.
  - **Assignable customers**:
    - Caption: `Add more customers (drag & drop or click):` when the slot has assignments, otherwise `Drag customers here or click to assign:`.
    - Shows every one of the day's discovery bookings **not already in this slot**. A booking assigned to another slot therefore still appears here, and choosing it moves it.
    - Small clickable, draggable chips; clicking → `onAssign(id, slotId, 'mole')`.
    - Empty state: `No unassigned customers`.

#### Boat mode (`slot.type==='boat'`)
- `sessionKey = slot.sessionTime || 'morning'`. The session is looked up in `BOAT_SESSIONS` by lowercase name.
- Subtitle: `{boat name|'Boat'} - {Morning|Afternoon} ({time})`.
- One Paper, which is the drop target. Its contents:
  - **Header**: `{Name} Session - {time} ({duration} min)`, e.g. `Morning Session - 09:00 (240 min)`. Plus the chip `{n} assigned` / `Available`.
  - **Assigned bookings**: bookings with `boatId === slot.boatId && (session || 'morning') === sessionKey`. Bookings with no session count as morning.
    - Draggable primary chips.
    - Delete → `onRemoveBoatAssignment(bookingId, boatId)`.
  - **Guides** multi-select: same options as Mole mode. Key `boat-{boatId}-{yyyy-MM-dd}-{session}`; context `{slotType:'boat', date, boatId}`.
  - **Unassigned bookings**: the day's dive bookings with **no boatId**.
    - Medium clickable chips that are **not draggable**.
    - Click → `onAssign(id, 'boat-{boatId}-{session}', 'boat', boatId, session)`.
    - Empty state: `No unassigned dive bookings for this date`.
- **Capacity**: no capacity limit is enforced here.
- **Reachable sessions**: only morning and afternoon. The Night session exists in the constants but no UI opens it.

---

### Trip Details page (`pages/TripDetails.jsx`)

- **File**: `pages/TripDetails.jsx`
- **Route**: `/schedule/trip/:date/:type/:boatId?/:session?` (guard `boatPrep`).
  - If a path parameter is missing, the page reads query parameters instead: `?date=`, `?type=`, `?boatId=`, `?session=`.
  - Defaults: `type='boat'`, `session='morning'`.
  - `type` is `'mole' | 'boat'`.
- **Purpose**: A per-trip roster ("Dive Trip Details") listing the customers on one Mole day or one boat trip. For each booking you can edit the boat assignment, activity, dive site, number of dives and rental equipment. A sidebar lets you search for divers or create new ones.

#### Data loaded
- Runs on mount and again whenever `date`, `type`, `boatId` or `session` changes.
- `getAll` for: `bookings`, `customers`, `boats`, `diveSites`, `staff`, `locations`, `scheduleSlotGuides`.
- **Trip booking filter (`tripBookings`)**:
  - Date: `bookingDate.split('T')[0] === date` (a `T` in the URL date is stripped first).
  - Location: if a current location is set, `booking location === current location`; if none is set, all bookings match.
  - `mole`: `activityType ∈ {discovery, discover, try_dive, orientation, try_scuba}`.
  - `boat`: `activityType ∈ {diving, snorkeling, specialty}`. If `boatId` is in the URL, the booking must also have `boatId === URL boatId`.
  - **Not filtered by session.** The URL session is only used when reassigning a booking to a boat.
- **Per-booking editable state (`selectedBookings[bookingId]`)**, initialised from each booking:
  - `activity` = `activityType`
  - `equipment`: `equipmentNeeded` parsed as follows:
    - a JSON string is parsed first;
    - if the object has a `rentedEquipment` object, that inner object is used;
    - otherwise the object itself is used;
    - arrays and non-JSON strings are ignored and give `{}`.
  - `notes` = `booking.notes || ''`
  - `diet` = `dietaryRequirements || ''` (kept in state but never shown)
  - `assignment` = `boatId || 'unassigned'`
  - `diveSiteId` = `diveSiteId || ''`
  - `numberOfDives` = `numberOfDives || 1`

#### UI layout
1. **Loading**: `Loading trip details...`.
2. **Header**:
   - H4 `Dive Trip Details`.
   - Chips, in order:
     - `Shore` or `Boat` (info)
     - boat name (success), boat trips only, when the boat is found
     - calendar icon + date formatted `dd MMM yyyy HH:mm` from `new Date(date)` (success)
     - `{n} Customers` (info)
     - `{0} Staff` (success). This is **hard-coded to 0**.
     - `{Σ numberOfDives||1} dives` (success)
   - Button **"Back to list"** (back arrow) → `/schedule`.
3. **Mode tabs**: `Diving Mode` (index 0, the default) and `Equipment Mode` (index 1).
4. **Main column** (md=8): one card per trip booking.
   - Empty state: `No bookings for this trip`.
   - Each card shows an Avatar (the first letter of the first name, or `?`), the customer name (h6, primary), the mode-specific fields below, and a red **X** IconButton that removes the diver.
5. **Sidebar** (md=4), titled **"Add Diver"**:
   - Search field, placeholder `Search divers...`. Matches the first name, last name or email (case-insensitive substring) and shows at most **10** results, each as an outlined button labelled with the customer name.
   - Divider, then the subtitle `Diver doesn't exist? Add new`.
   - Fields `First Name` and `Surname`.
   - Button **"Create New Diver"**.

#### Fields (per booking card)

| Field (label) | Data key → persisted as | Control | Options / defaults | Validation | Conditions |
|---|---|---|---|---|---|
| Assignment | `assignment` → `booking.boatId` + `booking.session` | Select | `Unassigned` (value `unassigned`) plus active boats at the current location | none | boat trips only; shown in both modes |
| Activity | `activity` → `booking.activityType` | free TextField | the current activityType | none. The value is saved to the API **on every keystroke** and is not constrained to an enum. | Diving Mode |
| Assigned Guides | read-only | chips | small primary chips for the guides found, otherwise italic `No guides assigned` | – | Diving Mode |
| Dive Site | `diveSiteId` → `booking.diveSiteId` (`''` → `null`) | Select | `None` plus dive sites at the current location, labelled `nameEn \|\| name_en \|\| name \|\| 'Unnamed Site'` | none | Diving Mode, boat only |
| Number of Dives | `numberOfDives` → `booking.numberOfDives` | number TextField | min 1; `parseInt(v) \|\| 1` | min 1 | Diving Mode, boat only |
| Notes | `notes` → **not persisted** (local state only; the code comments say `bookings` has no such column) | multiline, 2 rows | `booking.notes` | none | Diving Mode. Full width on Mole trips, half width on boat trips. |
| Equipment Needed | `equipment` → `booking.equipmentNeeded = JSON.stringify({rentedEquipment: {...}})` | checkboxes | keys and labels listed below; each defaults to `false` | – | Equipment Mode |

Equipment checkboxes, in order (key → label):

| Key | Label |
|---|---|
| `completeEquipment` | Complete Equipment |
| `Suit` | Wetsuit |
| `BCD` | BCD |
| `Regulator` | Regulator |
| `Mask` | Mask |
| `Fins` | Fins |
| `Boots` | Boots |
| `Torch` | Torch |
| `Computer` | Dive Computer |
| `UWCamera` | UW Camera |

Each checkbox change saves the whole object immediately.

Sidebar fields:

| Field (label) | Data key | Control | Validation | Notes |
|---|---|---|---|---|
| (search) | `searchQuery` | TextField, placeholder `Search divers...` | – | No results are shown for an empty query. |
| First Name | `newDiverForm.firstName` | TextField | required: the button stays disabled until it is filled | |
| Surname | `newDiverForm.lastName` | TextField | required | |

#### Actions
- **`handleUpdateBookingField(bookingId, field, value)`**
  1. Maps the field to a backend update:
     - `activity` → `{activityType}`
     - `equipment` → `{equipmentNeeded: JSON.stringify({rentedEquipment: value})}`
     - `notes` / `diet` → nothing is sent
     - `assignment` → `'unassigned'` gives `{boatId:null, session:null}`; anything else gives `{boatId:value, session: URL session}`
     - `diveSiteId` → `{diveSiteId: value || null}`
     - `numberOfDives` → `{numberOfDives}`
  2. Calls `dataService.update('bookings', id, data)` if there is anything to send.
  3. Updates local `selectedBookings`. The page does **not** reload the data.
  4. Errors are logged only.
- **Remove diver (X)**: no confirmation.
  - Mole trip → `update('bookings', id, {moleSlotTime:null})`.
  - Boat trip → `update('bookings', id, {boatId:null, session:null})`.
  - Then `loadData()`.
  - On error: alert `Error removing diver. Please try again.`
  - Because the Mole filter does not look at `moleSlotTime`, the booking **stays listed** on a Mole trip. It also stays listed on a boat trip opened without a `boatId`.
- **Search result click**: calls `handleAddDiver(customerId)`, which is an **empty TODO stub**. Nothing happens.
- **Create New Diver**:
  1. `dataService.create('customers', {firstName, lastName, customerType:'tourist'})`.
  2. `loadData()`, then reset the form.
  3. Call `handleAddDiver(newId)`, which does nothing.
  - On error: alert `Error creating new diver. Please try again.`
- **Guide names (`getGuideNames(booking)`)**:
  - Builds the slot key from the booking itself:
    - if it has `moleSlotTime`: `mole-{date}-{HH-mm}`;
    - else if it has `boatId`: `boat-{boatId}-{date}-{session||'morning'}`.
  - Finds the `scheduleSlotGuides` record with that `slotKey`, then maps each `guideIds` entry to a staff name (`first last`, falling back to email, then id).
  - Records are **not** filtered by location.

#### Quirks
- The date chip uses `new Date('yyyy-MM-dd')`, which is parsed as UTC midnight, so the time shown is the local-timezone offset (e.g. `01:00`).
- Changing a booking's Assignment does not remove it from the current list until the page reloads.
- The Mole-type list includes `try_scuba`; BoatPrep's boat-activity list does not include it.

---

### BoatPrep page (`pages/BoatPrep.jsx`)

- **File**: `pages/BoatPrep.jsx`
- **Route**: `/boat-prep` (guard `boatPrep`).
- **Purpose**: The Dive Preparation workflow. Staff assign divers to boats (or a shore group), assign staff and planned dive sites, save "boat preps", then confirm them after the dive. Compliance reports can be exported for Spanish regulations.
- **Layout**: MUI `Tabs`, `mb 3`:

| Index | Label | Component | Condition |
|---|---|---|---|
| 0 | `t('boatPrep.divePreparation')` = "Dive Preparation" | DivePreparationTab | always |
| 1 | `t('boatPrep.postDiveReports')` = "Post-Dive Reports" | PostDiveReportsTab | always |
| 2 | `"Compliance Reports"` (hard-coded) | ComplianceReportsTab | only when `isComplianceReportsEnabled` |

  - `isComplianceReportsEnabled` is `currentLocation.settings.complianceReportsMandatory === true`.
  - If the flag turns off while tab 2 is active, the page switches to tab 0.
  - Every tab receives the full `useBoatPrepData()` result as props.
- **Smoke test (`pages/BoatPrep.smoke.test.jsx`)**: with all dataService calls mocked to return empty data, it asserts the tablist renders at least 2 tabs, that switching to tab 1 shows "Post-Dive Reports", and that switching back to tab 0 does not crash.

---

### `hooks/useBoatPrepData.jsx`

- **File**: `hooks/useBoatPrepData.jsx`. Default export is `useBoatPrepData()`, with no arguments.
- **Used by**: `pages/BoatPrep.jsx` and the 3 BoatPrep tab components.
- **Purpose**: The whole BoatPrep business logic, covering:
  - which bookings belong to a date and session;
  - boat vs shore mode;
  - boat assignment, including auto-assign and persisting assignments to bookings;
  - staff rules and validation;
  - dive-site suggestions;
  - equipment allocation;
  - saving boat preps;
  - post-dive reports;
  - CSV/PDF compliance export.
- **Dependencies**: `dataService` (`getAll`, `create`, `update`, `remove`, `getAvailableEquipment`), `useTranslation`, and date-fns (`format`, `subDays`).

#### Module-level pure helpers (all exported through the hook's return value)

| Function | Signature | Rule |
|---|---|---|
| `getDiverSkillLevel(customer)` | → `'beginner'\|'intermediate'\|'advanced'` | `customer.centerSkillLevel` lowercased; any value outside those three becomes `'beginner'`. The default is `'beginner'`. |
| `allowedDifficultyForGroup(customers)` | → `'beginner'\|'advanced'` | `'beginner'` if **any** diver is a beginner, otherwise `'advanced'`. |
| `getRecentDiveSiteIdsForCustomers(customerIds, allBookings, days=3)` | → `Set<diveSiteId>` | The `diveSiteId` of every booking with `bookingDate >= format(today − days, 'yyyy-MM-dd')` belonging to one of those customers. The comparison is a string compare, and future-dated bookings are included too. |
| `suggestDiveSites(locationId, customers, allDiveSites, allBookings)` | → up to **5** sites | Sites where `site.locationId === locationId`. If there are no customers, the first 5 sites. Otherwise, sites where (difficulty `(difficultyLevel\|\|difficulty\|\|'beginner')` lowercased is `'beginner'`, **when the group includes any beginner**) **and** the site is not in the group's dive sites from the last **3 days**. The first 5 matches are returned. |
| `getSkillCounts(customers)` | → `{beginner, intermediate, advanced}` | Counts divers per skill level. |
| `isShoreDive(diveSiteId, session, allDiveSites)` | → bool | `false` if there is no dive site. Otherwise `session === 'night'` **or** the site name, lowercased, contains `'mole'`. Night dives are always at Mole (shore). |
| `requiresCaptain(diveSiteId, session, sites)` | → bool | `!isShoreDive(...)`. So a captain **is required whenever no dive site has been selected yet**. |
| `requiresGuide(session)` | → bool | `session === 'morning' \|\| session === 'afternoon'`. `'10:15'` and `'night'` need no guide. |

#### Location resolution

| Value | Rule |
|---|---|
| `storedLocationId` | `localStorage['dcms_current_location']` |
| `locations` | Loaded on mount with `getAll('locations')`. |
| `currentLocation` | The location whose `id === stored`. Failing that, the first location whose lowercase name includes the stored value, or whose `code === stored`. Otherwise `null`. |
| `locationId` | `currentLocation?.id \|\| storedLocationId` |
| `resolvedLocationId` (used for all matching) | See steps below. |

`resolvedLocationId` rules:
1. If the stored value contains `-`, it is treated as a UUID and used as is.
2. Otherwise look for a location whose id contains `-` and whose name includes the stored value.
3. Otherwise use the **hard-coded fallbacks**: `caleta` → `550e8400-e29b-41d4-a716-446655440001`, `playitas` → `550e8400-e29b-41d4-a716-446655440002`.
4. Otherwise use the raw stored value.

#### State (with defaults)

| State | Default | Meaning |
|---|---|---|
| `activeTab` | `0` | Selected tab. |
| `date` | today (`yyyy-MM-dd`) | Preparation date. |
| `reportDate` | today | Date used by Post-Dive and Compliance tabs. |
| `session` | `'morning'` | `'morning' \| '10:15' \| 'afternoon' \| 'night'` |
| `allBoats`, `allCustomers`, `allStaff`, `bookings`, `diveSites`, `boatPreps` | `[]` | Loaded data. |
| `refreshKey` | `0` | Incremented to trigger a reload. |
| `searchQuery` | `''` | Unassigned-diver search. |
| `boatAssignments` | `{}` | `{ boatId: [customerId] }` |
| `isInitializing` | `false` | Suppresses the persistence effect while assignments are rebuilt. |
| `staffAssignments` | `{}` | `{ boatId: {captain: staffId\|null, guides: [staffId], trainees: [staffId]} }`. **Local only until save.** |
| `shoreDiveGroupId` | const `'shore-dive-group'` | Exported, unused. |
| `shoreDiveAssignments` | `[]` | `[customerId]` |
| `shoreDiveStaff` | `{guides: [], trainees: []}` | Shore-group staff. |
| `shoreDiveSiteId` | `''` | Shore-group dive site. |
| `boatDiveSites` | `{}` | `{ boatId: diveSiteId }` (planned site) |
| `boatDiveSiteStatus` | `{}` | `{ boatId: {confirmed, completed} }` |
| `boatActualDiveSites` | `{}` | `{ boatId: actualDiveSiteId }` |
| `boatPostDiveNotes` | `{}` | `{ boatId: notes }` |
| `allocateRental` | `true` | "Auto-allocate rental equipment" checkbox. |
| `showAllBoats` | `false` | Show every boat rather than only those needed. |
| `editingReports` | `{}` | `{ prepId: {actualDiveSiteId?, notes?, timestamps?: {entryTime?, exitTime?}} }` |

#### Data loading and events
- **On mount**: `Promise.all` of `getAll` for `boats`, `customers`, `staff`, `bookings`, `diveSites`, `boatPreps`. On error, all of them are set to `[]`.
- **Refresh**: when `refreshKey > 0`, it reloads `customers`, `bookings` and `boatPreps`.
- **Window events** that increment `refreshKey`: `dcms_booking_created`, `dcms_booking_updated`, `dcms_bookings_synced`, `dcms_customer_created`, `dcms_customer_updated`, `dcms_customers_synced`, and the browser `storage` event. The listeners are removed on unmount.
- `boats` = `allBoats` where `(locationId||location_id) === resolvedLocationId && isActive !== false`. `hasBoats = boats.length > 0`.
- If `session === '10:15'` and the location has no boats, the session is reset to `'morning'`.
- `activeStaff` = `allStaff.filter(isActive)`. It is exported but not used by the tabs.

#### Which bookings belong to the prep (`bookingsForDate`)
A booking is included when **all** of the following hold:
1. **Date**: `bookingDate.split('T')[0] === date`.
2. **Location**:
   - A booking without a location is excluded.
   - A location value with no `-` is treated as a short name and resolved: `caleta`/`playitas` map to the hard-coded UUIDs; otherwise it is matched against a location's `code` (case-insensitive exact); otherwise against a location name (exact, or starting with the value plus a space).
   - The result must equal `resolvedLocationId`.
3. **Status**: `status === 'confirmed' || paymentStatus === 'paid' || status === 'paid'`.
4. **Session**:
   - `diveSessions` is taken from `b.diveSessions`. If that is missing and the booking is a `diving` booking whose `equipmentNeeded` is an object containing a `morning`, `afternoon`, `night`, `tenFifteen` or `10:15` key, `equipmentNeeded` is used as `diveSessions` (legacy public-website format). JSON strings are parsed.
   - If a `diveSessions` object exists:
     - for session `'10:15'`: `diveSessions.tenFifteen === true || diveSessions['10:15'] === true`;
     - otherwise `diveSessions[session]` must be `true`, `1` or `'true'`.
   - Else, if it is a `diving` booking with `numberOfDives`, it matches the **morning** session only.
   - Else, a non-`diving` booking matches **every** session.
   - Else (a `diving` booking with no sessions and no numberOfDives): no match.

Further rules:
- **`normalizeActivityType(t)`**: lowercases and trims; `discover`/`discovery` → `discovery`; `try-dive` → `try_dive`.
- **`boatPrepBookings`**: `bookingsForDate` whose normalised activity is `diving`, `snorkeling` or `specialty`.
- **`shouldUseBoatPrep` (boat mode vs shore mode)**:
  - `session === 'night'` → `false` (shore).
  - No bookings for the date and session → `hasBoats`.
  - Otherwise → `boatPrepBookings.length > 0`.
- **`customersWithBookings`**: customers whose id appears in `boatPrepBookings` (boat mode) or in `bookingsForDate` (shore mode).
- **`filteredCustomers`**: `customersWithBookings` filtered by the search query against `"first last"` or email (case-insensitive).
- **`assignedIds`**: boat mode uses the union of all `boatAssignments`; shore mode uses `shoreDiveAssignments`.
- **`unassignedCustomers`**: `filteredCustomers` not in `assignedIds`.
- **`allAssignedCustomers`**: customer objects for all boat assignments (boat mode) or the shore customers (shore mode).

#### Boat assignment persistence (important: assignments are written to bookings immediately)
- **Initialisation effect** (runs on changes to `bookingsForDate`, `shouldUseBoatPrep`, `date` or `session`):
  1. If in shore mode or there are no bookings: `boatAssignments = {}`.
  2. Otherwise, set `isInitializing = true` and build `boatAssignments` from each booking in `bookingsForDate` that has a `boatId`: `{boatId: [customerId...]}`, without duplicates.
  3. Clear `isInitializing` on the next tick (`setTimeout 0`).
- **Sync effect** (skipped while initialising, in shore mode, or with no bookings):
  1. Build a map `customerId → boatId` from `boatAssignments`.
  2. For each booking in `bookingsForDate` whose `boatId` differs from the expected value (`null` when unassigned), queue an update.
  3. After a **500 ms debounce**, send `Promise.all(update('bookings', id, {boatId, session: boatId ? session : null}))`.
  - So "Clear All", auto-assign and every manual move are persisted to bookings with no Save click. This is also how the Schedule shows the boat assignment. Errors are logged.

#### Capacity and boat display

**Boats needed (`calculateBoatsNeeded`)**:
1. `totalDivers = customersWithBookings.length`. If it is 0, the result is 0.
2. `avgDiverCapacityPerBoat = boats.length ? max(1, boats[0].capacity − 2) : 8`. The 2 represents an assumed 1 captain + 1 guide.
3. `boatsNeeded = ceil(totalDivers / avgDiverCapacityPerBoat)`.
4. Result: `max(boatsNeeded, boatsWithAssignments || (assignedCount>0 ? 1 : 0), assignedCount>0 ? 1 : 0)`.

**Boats displayed (`boatsToDisplay`)**:
- If `showAllBoats` is on: every boat.
- Else, if some boats have divers: those boats, plus other boats in `boats` order until the count reaches `boatsNeeded`.
- Else: `boats.slice(0, max(1, boatsNeeded))`.

**Per-boat diver capacity (used in the UI and in auto-assign)**:
- `diverCapacity = boat.capacity − staffCount`, where `staffCount = (captain?1:0) + guides.length + trainees.length`.
- The tab's display uses `boat.capacity || 10` for this; the other code uses raw `boat.capacity`.

#### Exported functions

| Function | Signature | Behaviour / side effects |
|---|---|---|
| `assignDiverToBoat(customerId, boatId)` | | If the target boat would not be displayed, sets `showAllBoats = true`. Removes the customer from every boat, then adds them to `boatId` (if given). The sync effect then persists the change. |
| `removeDiverFromBoat(customerId, boatId)` | | Filters the customer out of that boat. |
| `autoAssignDivers()` | | Algorithm below. |
| `clearAllAssignments()` | | `window.confirm('Clear all boat assignments?')`. If confirmed: `boatAssignments = {}`, which is persisted as `boatId:null` on all of the session's bookings. |
| `getBoatCustomers(boatId)` | → customers | |
| `getBoatStaff(boatId)` | → `{captain, guides, trainees}` | Defaults to `{captain:null, guides:[], trainees:[]}`. |
| `setBoatStaff(boatId, staff)` | | Local state only. |
| `getStaffByRole(role)` | → staff | `allStaff.filter(s => s.role === role)`. **Inactive staff are included.** |
| `getStaffAssignedBoat(staffId)` | → boatId\|null | The first boat where this person is captain, a guide or a trainee. |
| `staffWorksAtLocation(staff, locationId)` | → bool | True if there is no location. If `locationIds`/`location_ids` is an array: true when it is empty (meaning all locations) or includes the location. Otherwise legacy: `!staff.locationId \|\| staff.locationId === locationId`. |
| `getAvailableStaffForBoat(boatId\|null, role)` | → staff | Rules below. |
| `getStaffValidationErrors(boatId)` | → string[] | Error messages listed below. |
| `getBoatDiveSiteSuggestions(boatId)` | | `suggestDiveSites(resolvedLocationId, boat's customers, diveSites, bookings)` |
| `setBoatDiveSite` / `getBoatDiveSite` | | Planned site per boat; `getBoatDiveSite` defaults to `''`. |
| `getBoatDiveSiteStatus(boatId)` | | Defaults to `{confirmed:false, completed:false}`. |
| `setBoatDiveSiteStatusValue(boatId, status)` | | Merges `status` into the boat's entry. When `status.completed` is set and the boat has no actual site yet, the actual site is initialised to the planned site. |
| `setBoatActualDiveSite` / `getBoatActualDiveSite` | | `getBoatActualDiveSite` falls back to the planned site, then `''`. |
| `setBoatPostDiveNotes` / `getBoatPostDiveNotes` | | Never called by any UI. |
| `handleAllocate()` | | Equipment allocation, steps below. |
| `savePreparation()` | async | Steps below. |
| `renderDiverItem(customer, showRemove=false, boatId=null)` | → JSX `ListItem` | Label format below. With `showRemove && boatId`, adds a delete icon that calls `removeDiverFromBoat`. |
| `allDiveSites` | memo | `diveSites` where `locationId === resolvedLocationId`. |
| `postDivePreparations` | memo | Filter rules in the Post-Dive section below. |
| `updatePostDiveReport(prepId, field, value)` | | Sets `editingReports[prepId][field]`. |
| `updatePostDiveTimestamp(prepId, type, value)` | | Sets `editingReports[prepId].timestamps[type]`, where type is `'entryTime'\|'exitTime'`. |
| `deleteBoatPrep(prepId)` | async | Steps below. |
| `savePostDiveReport(prepId, markCompleted=false)` | async | Steps below. |
| `exportComplianceReport(completedPreps)` | | CSV download, described below. |
| `exportComplianceReportPDF(completedPreps)` | | Print-to-PDF window, described below. |

The hook also returns all state values with their setters, the derived values above, `t`, `locations` and `currentLocation`.

`renderDiverItem` label: bold `First Last`, then ` — {skill} · Tank: {tankSize||'12L'} · {equipment}`. `{equipment}` is `Own equipment` when `preferences.ownEquipment`, otherwise `Rental (BCD {bcdSize|-}, Fins {finsSize|-}, Boots {bootsSize|-}, Wetsuit {wetsuitSize|-})`.

`deleteBoatPrep(prepId)`:
1. `window.confirm('Are you sure you want to delete this boat preparation? This action cannot be undone.')`
2. `dataService.remove('boatPreps', id)`
3. Reload `boatPreps`.
4. alert `Boat preparation deleted successfully.`
- On error: alert `Error deleting boat preparation. Please try again.`

##### `autoAssignDivers()` algorithm
1. Candidates: `customersWithBookings` not already assigned. Return if there are none.
2. Available capacity per boat: `boat.capacity − (captain + guides + trainees)`, using the current staff assignments.
3. **Single-boat pass**: walk `boats` in order. The first boat whose available capacity is ≥ the number of candidates gets all of them.
4. Otherwise, **by skill**: group candidates into beginner, intermediate and advanced. Process the groups in that order. For each diver:
   - (a) The first boat with space (`count < capacity`) whose current auto-assigned divers are **all** the same skill, or which is empty.
   - (b) Otherwise the first boat with space.
   - (c) Otherwise the diver stays unassigned.
5. Merge the result into the existing `boatAssignments` without duplicates. The sync effect persists it to bookings.

##### Staff rules (`getAvailableStaffForBoat` and the tab)
- **Roles**: Captain = `boat_captain`; Guides = `divemaster` + `instructor` + `assistant`; Interns/Trainees = `intern`.
- **For a boat**:
  - The location is the boat's `locationId`, and staff must pass `staffWorksAtLocation`.
  - A person is available if they are on no boat, or on this boat.
  - **A person can be on only one boat per session.**
- **For shore (`boatId === null`)**:
  - The location is `resolvedLocationId`.
  - A person is excluded if they are on any boat **or already in the shore guides/trainees list**.

##### Validation (`getStaffValidationErrors(boatId)`), exact messages
- If `requiresCaptain(site, session)` and there is no captain: `Captain required for boat dives`.
- If `requiresGuide(session)` and there are no guides: `At least one guide required for morning/afternoon dives`.
- If the captain is assigned to another boat: `Captain already assigned to {boat name|'another boat'}`.
- For each guide or trainee on another boat: `{name|'Guide'} already assigned to {boat|'another boat'}` or `{name|'Trainee'} already assigned to {boat|'another boat'}`.
- These errors are shown live in each boat card as a red Alert.

##### `handleAllocate()` (equipment allocation; button "Allocate Equipment Now")
For each customer in `allAssignedCustomers`:
1. `wantsRental = !preferences.ownEquipment`; `tankSize = preferences.tankSize || '12L'`.
2. `available = dataService.getAvailableEquipment('diving')`.
3. **Tank**, allocated for every diver even if they own their own equipment:
   - Consider `available` items with `type` (lowercased) `'tank'`.
   - Pick the first whose size equals, contains or is contained in `tankSize` (case-insensitive), otherwise the first tank.
   - `update('equipment', id, {isAvailable:false})`. This call is not awaited.
4. If `allocateRental` is on and the diver wants rental: for each type in `['BCD','Regulator','Mask','Fins','Boots','Wetsuit','Computer','Torch']`:
   - pick an exact size match (sizes: BCD → `bcdSize`, Fins → `finsSize`, Boots → `bootsSize`, Wetsuit → `wetsuitSize`), otherwise the first item of that type;
   - mark it `isAvailable:false`.

Alerts at the end:
- `Allocated {t} tank(s) and {o} other equipment item(s) for {n} divers`
- `Allocated {t} tank(s) for {n} divers`
- `No equipment available to allocate`

Bugs:
- In API mode, `getAvailableEquipment` returns a **Promise**, so `.filter` throws. The function only works in mock mode.
- The availability list is re-read per diver, but the writes before it are not awaited, so the same item may be allocated twice. Whether this happens is unclear from the code.
- The checkbox says "on save", but `savePreparation` **never** allocates equipment.

##### `savePreparation()`
**Boat mode**:
1. For every boat in `boatAssignments` with at least one diver, collect the staff validation errors, each prefixed `"{boat}: "`. If there are any: alert `Please fix the following issues:\n\n` + the lines, and stop.
2. For every boat with divers but no planned dive site, collect `{boat}: Dive site not selected`. If there are any: alert `Please select dive sites for all boats with assigned divers:\n\n` + the lines, and stop.
3. For each boat with divers, build this payload and send them all with `Promise.all(create('boatPreps', payload))`:
   - `date`, `session`, `boatId`, `diverIds`, `locationId: resolvedLocationId`, `diveSiteId` (planned)
   - `actualDiveSiteId: actual || planned`
   - `diveSiteStatus: {confirmed, completed, confirmedAt: confirmed ? now : null, completedAt: completed ? now : null}`
   - `postDiveReport: completed ? {actualDiveSiteId, notes, reportDate: now} : null`
   - `staff: {captain, guides, trainees}`
   - `createdAt: now`. The adapter drops this field before sending.
4. Reload `boatPreps`, set `reportDate = date`, then alert `Boat preparation saved for all boats.`

**Shore mode**:
1. Validate:
   - if a guide is required and there are none: `At least one guide required for morning/afternoon dives`;
   - if there are no divers: `No divers assigned`.
   - If there are errors, alert `Please fix the following issues:\n\n...` and stop. **The dive site is not validated.**
2. Create one prep: `{date, session, boatId:null, diverIds: shoreDiveAssignments, locationId, diveSiteId: shoreDiveSiteId, actualDiveSiteId: shoreDiveSiteId, staff:{captain:null, guides, trainees}, createdAt}`.
3. Reload, set `reportDate = date`, then alert `Shore dive preparation saved.`

Notes:
- **Each save creates new records.** There is no update and no de-duplication, so saving twice duplicates the preps.
- `diveSiteStatus` is never set to true from the preparation UI, so new preps are always `{confirmed:false, completed:false}`.

##### `savePostDiveReport(prepId, markCompleted)`
1. Find the prep in `postDivePreparations`. If it is missing: alert `Error: Could not find preparation to update.`
2. Build the full updated prep:
   - `actualDiveSiteId` = the edited value, otherwise `prep.actualDiveSiteId || prep.diveSiteId`.
   - `diveSiteStatus`:
     - `confirmed: true` (always)
     - `completed: markCompleted || previous completed || false`
     - `confirmedAt`: the previous value, otherwise now
     - `completedAt`: now if `markCompleted`, otherwise the previous value, otherwise null
   - `postDiveReport`: `{actualDiveSiteId, notes (edited value or previous or ''), entryTime, exitTime (edited value or previous or null), reportDate: now}`.
3. `update('boatPreps', id, updatedPrep)`, reload, and clear `editingReports[id]`.
4. Alert `Dive confirmed and marked as completed.` or `Post-dive report saved successfully.`
- On error: alert `Error saving post-dive report. Please try again.`

##### Compliance exports
Both exports take the completed preps for `reportDate` (see ComplianceReportsTab).

**CSV (`exportComplianceReport`)**:
- Header: `Date,Session,Boat/Dive Type,Dive Site,Entry Time,Exit Time,Total Divers,Male Divers,Female Divers,Unspecified Gender,Total Guides,Captain,Notes`
- One row per prep:
  - Boat/Dive Type: the boat name, or `Shore Dive`.
  - Dive Site: the name of the actual site (`postDiveReport.actualDiveSiteId || actualDiveSiteId || diveSiteId`), or `Unknown`.
  - Gender counts: `gender === 'male'` / `'female'` / anything else, counted as unspecified.
  - Guides come from `prep.guideIds`; Captain from `prep.captainId` (`name`, otherwise `first + ' ' + last`).
- Quoting: string fields are wrapped in quotes, but only the notes have `"` escaped.
- File name: `compliance_report_{reportDate||'all'}.csv`, downloaded through a hidden anchor.

**PDF (`exportComplianceReportPDF`)**: builds an HTML document, opens it as a blob URL in a new window, and calls `print()` 250 ms after load.
- Title: `Compliance Report - {date}`.
- H1: `Dive Compliance Report - Spanish Regulations`.
- Summary box: `Report Date`, `Total Completed Dives`, `Generated` (`toLocaleString`).
- One section per dive, titled `Dive {i}: {boat|Shore Dive} - {session}`, containing:
  - a key/value table: Date, Session, Boat/Dive Type, Dive Site, Entry Time, Exit Time, Total Divers, Male Divers, Female Divers, Unspecified Gender, Total Guides, Captain, Notes. Missing values print as `N/A`, or `None` for notes.
  - a "Divers List" table with columns Name, Gender, Certification, Nationality. Certification is the **first** certification's `agency level`, or `No certification`. Gender is capitalised, or `Not specified`. Nationality falls back to `-`.
  - a "Guides" list: `{name} - {role|'Guide'}`.
- Footer: `This report is generated for compliance with Spanish diving regulations (RD 933/2021 and Marine Reserve reporting requirements).` and `Generated by DCMS - Dive Center Management System`.

**Bug**: preps store staff as `staff.captain` and `staff.guides`, but both exports and the compliance tab read `prep.captainId` and `prep.guideIds`, which never exist (confirmed in `transformBoatPrepFromBackend`). As a result, **Captain is always empty and Total Guides is always 0**.

**Spanish regulation checks**: nothing beyond the staff rules above (a captain for boat dives, at least one guide for morning/afternoon) and the export content. There is no depth, ratio or certification validation.

#### Quirks
- `staffAssignments`, planned dive sites and shore staff are **not re-loaded** from saved preps. After a reload the preparation tab starts empty, except for the boat assignments that come from bookings.
- Shore mode at a location **with** boats (i.e. the night session): the unassigned list shows per-boat buttons instead of "Add to Shore Dive Group". Divers therefore cannot be added to the shore group, and the save always fails with "No divers assigned".
- Shore guide select: the selected guides are excluded from the options, so the selected chips do not render.
- The "On {boat}" warning chip in the staff selects can never appear, because staff on other boats are already filtered out.

---

### DivePreparationTab (`components/BoatPrep/DivePreparationTab.jsx`)

- **File**: `components/BoatPrep/DivePreparationTab.jsx`. It is tab 0 of BoatPrep.
- **Purpose**: A three-step preparation per boat (1. staff, 2. planned site, 3. divers), or the same steps for a single shore group, plus the unassigned-diver pool and the save and allocate actions.

#### Layout (in order)
1. **Header**:
   - H5 title: `Boat Preparation` in boat mode, `Shore Dive Preparation` in shore mode.
   - Boat mode only: **"Auto-Assign"** (sparkle icon) → `autoAssignDivers`, and **"Clear All"** (red outlined) → `clearAllAssignments`.
2. **Plan section**:
   - **Date** field.
   - **Session** field.
   - Text: `Global Dive Site (optional - can be set per boat)` with caption `Select dive sites individually for each boat below` (boat mode), or `Dive Site Selection` with caption `Select dive site for this shore dive session below` (shore mode). This is text only; there is no global site control.
3. **Boat mode**:
   - Info Alert, shown when `boats.length > boatsToDisplay.length` and not showing all: `Showing {x} of {n} boats (based on {d} divers)`, with action button `Show All {n} Boats`.
   - Info Alert, shown when showing all and `boats.length > calculateBoatsNeeded`: `Showing all {n} boats (only {k} needed for {d} divers)`, with action button `Show Only Needed Boats`.
   - **One card per displayed boat** (md = half width):
     - **Title**: the boat name, plus a chip `{assigned}/{diverCapacity} divers`. The chip is red when over capacity, orange when exactly full, grey otherwise.
     - **Caption**: `Total capacity: {capacity||10} | Staff: {staffCount} | Available for divers: {diverCapacity}`.
     - **Over capacity**: red border (2px) and `error.light` background, plus Alert `Over capacity! {n} too many divers`.
     - **"1. Assign Staff"**:
       - `Captain *` single select (`None` plus captains), shown only if `requiresCaptain`.
       - `Guides *` multi-select with chips, shown only if `requiresGuide`.
       - `Interns/Trainees` multi-select, always shown.
       - Each option shows the staff `name` and a warning chip `On {other boat}`. That chip is never shown in practice (see useBoatPrepData quirks).
       - Changing a selection also removes the person from their previous boat.
       - The live validation errors are shown in a red Alert.
     - **"2. Assign Planned Dive Site"**:
       - Caption `Suggested sites for this boat's divers: {names}` when there are suggestions.
       - Select `Select Dive Site`: `None selected` plus `allDiveSites`, each shown as the name followed by `({difficultyLevel})` in grey.
       - Changing the site resets the confirmed/completed status if either was set.
       - When a site is chosen: `Planned site: {name}` and `(Confirmation will be done after the dive in Post-Dive Reports)`.
     - **"3. Assign Divers (by skill level)"**:
       - Chips `{n} Beginner` (info/blue), `{n} Intermediate` (warning/orange), `{n} Advanced` (success/green), each shown only when n > 0.
       - The list of assigned divers, max height 300, each with a delete icon. Empty state `No divers assigned` / `{remaining} spots available`.
       - Caption `{remaining} spot(s) available` when `remaining > 0`.
4. **Shore mode** (a single Paper):
   - Info Alert `Shore dive location - No boats required. All dives are from the shore.`
   - **"1. Assign Staff"**:
     - `Guides *` multi-select, only if `requiresGuide`.
     - `Interns/Trainees` multi-select.
     - Error: `At least one guide required for morning/afternoon dives`.
   - **"2. Assign Dive Site"**:
     - Caption `Suggested sites for assigned divers: …`.
     - Select `Select Dive Site`: `None selected` plus sites where `site.locationId === locationId`. This uses `locationId`, not `resolvedLocationId`.
     - `Selected: {name}` once chosen.
   - **"3. Assign Divers (by skill level)"**:
     - Skill chips.
     - List (max height 400) of shore divers with a delete icon that removes them from `shoreDiveAssignments`.
     - Empty state `No divers assigned yet`.
5. **Unassigned Divers** Paper:
   - Title `Unassigned Divers ({n})`.
   - Caption `Showing divers with bookings for {date} - {Morning|10:15|Afternoon|Night} session`.
   - Search field (placeholder `Search divers...`, search icon, clear-X button).
   - **Quick-add buttons**, one per displayed boat: `Add to {boat}` (person-add icon). Each adds the **first** unassigned diver to that boat. Disabled when no divers are unassigned or the boat is full (`assigned >= capacity − staff`).
   - `Show All Boats ({n})` (secondary), when some boats are hidden.
   - **Each unassigned diver**: `renderDiverItem`, followed by:
     - if the location has boats: one button per displayed boat, `{boat} ({k} left)`, or `{boat} (Full)` and disabled. Click → `assignDiverToBoat`.
     - otherwise: `Add to Shore Dive Group`, which appends to `shoreDiveAssignments`.
   - Empty state `All divers assigned`.
6. **Actions** Paper:
   - Checkbox `Auto-allocate rental equipment on save` (bound to `allocateRental`, default checked).
   - Button **"Allocate Equipment Now"** → `handleAllocate`.
   - Button `t('boatPrep.saveAll')` = "Save All Boat Preparations" (boat mode) or `t('boatPrep.saveShore')` = "Save Shore Dive Preparation" (shore mode) → `savePreparation`.

#### Fields

| Field (label) | Data key | Control | Options / defaults | Validation | Conditions |
|---|---|---|---|---|---|
| Date | `date` | date input | today | – | always |
| Session | `session` | select | `Morning` (`morning`), `10:15` (`10:15`, only if the location has boats), `Afternoon` (`afternoon`), `Night` (`night`). Default `morning`. | – | always |
| Captain * | `staffAssignments[boatId].captain` | select | `None` (value `''`) plus available `boat_captain` staff | required when `requiresCaptain` (checked on save) | boat mode, `requiresCaptain` |
| Guides * | `staffAssignments[boatId].guides` | multi-select | available divemaster, instructor and assistant staff | ≥1 for morning/afternoon | boat mode, `requiresGuide` |
| Interns/Trainees | `staffAssignments[boatId].trainees` | multi-select | available `intern` staff | – | boat mode |
| Select Dive Site | `boatDiveSites[boatId]` | select | `None selected` plus location sites | required on save for boats with divers | boat mode |
| Guides * | `shoreDiveStaff.guides` | multi-select | available guides (shore rules) | ≥1 for morning/afternoon | shore mode, `requiresGuide` |
| Interns/Trainees | `shoreDiveStaff.trainees` | multi-select | interns | – | shore mode |
| Select Dive Site | `shoreDiveSiteId` | select | `None selected` plus sites | not validated | shore mode |
| Search divers... | `searchQuery` | text | `''` | – | always |
| Auto-allocate rental equipment on save | `allocateRental` | checkbox | `true` | – | always; has no effect on save |

---

### PostDiveReportsTab (`components/BoatPrep/PostDiveReportsTab.jsx`)

- **File**: `components/BoatPrep/PostDiveReportsTab.jsx`. It is tab 1 of BoatPrep.
- **Purpose**: After boats return, staff confirm each saved prep, record the actual dive site, entry and exit times and notes, and mark the dive completed.
- **Data (`postDivePreparations`)**: `boatPreps` where:
  - `date.split('T')[0] === reportDate`;
  - location is `resolvedLocationId`, **or the prep has no location**;
  - the prep has a `diveSiteId` (or `dive_site_id`).
  - Both completed and pending preps are listed.
- **Layout**:
  - H5 `Post-Dive Reports`, plus a `Date` field bound to `reportDate`.
  - Info Alert: `Confirm and complete dives after boats return. Update the actual dive site if it differs from the planned site, and add notes for official marine authority documentation.`
  - **Empty state**: `No prepared dives found for {reportDate}`, followed by `t('boatPrep.preparedDivesHint')` = "Prepared dives will appear here after they are saved in the Dive Preparation section."
  - **One card per prep** (half width on md):
    - The border is `success.main` when completed.
    - Title: `{boat name | 'Shore Dive'} - {session}`, with a chip `Completed` (green) or `Pending Confirmation` (orange).
    - Line: `Date: {date} | Divers: {diverIds.length}`.
    - `Planned Dive Site: **{name|Unknown}**`.
    - If not confirmed: info Alert `This dive needs to be confirmed after the boat returns.`
    - Fields (see table below).
    - If the planned site exists and differs from the current actual site: warning Alert `Note: Planned site was {planned}, but actual site is {actual|Unknown}`.
    - Buttons:
      - Primary button: `Confirm & Complete Dive` (contained) → `savePostDiveReport(id, true)`. When the prep is already completed it reads `Already Completed` (outlined, green) and calls `savePostDiveReport(id, false)`, which still saves the edits.
      - `Save (Don't Complete)` (outlined), shown only when not completed → `savePostDiveReport(id, false)`.
      - `Delete/Cancel Dive` (red, delete icon) → `deleteBoatPrep(id)`, with confirmation.

#### Fields

| Field (label) | Data key | Control | Default | Validation |
|---|---|---|---|---|
| Date (header) | `reportDate` | date | today; set to the prep date after a save | – |
| Actual Dive Site (Official Report) | `editingReports[id].actualDiveSiteId` → `postDiveReport.actualDiveSiteId` and `actualDiveSiteId` | select of `allDiveSites` (name + difficulty) | `postDiveReport.actualDiveSiteId \|\| actualDiveSiteId \|\| diveSiteId` | – |
| Entry Time | `editingReports[id].timestamps.entryTime` → `postDiveReport.entryTime` | time (`HH:mm`) | the saved value or empty | – |
| Exit Time | `...timestamps.exitTime` → `postDiveReport.exitTime` | time | the saved value or empty | – |
| Post-Dive Notes (Optional) | `editingReports[id].notes` → `postDiveReport.notes` | multiline, 3 rows. Placeholder: "Add any additional notes about the dive (conditions, changes, etc.) for official documentation..." | the saved value | – |

- **Status lifecycle of a prep** (`diveSiteStatus`):
  - created: `{confirmed:false, completed:false}` → shown as "Pending Confirmation";
  - after any post-dive save: `confirmed:true`;
  - after "Confirm & Complete Dive": `completed:true` with `completedAt`.
  - Completion cannot be undone in the UI.
- **Quirk**: entry and exit times cannot be cleared back to empty, because of the `||` fallbacks to the previous value.

---

### ComplianceReportsTab (`components/BoatPrep/ComplianceReportsTab.jsx`)

- **File**: `components/BoatPrep/ComplianceReportsTab.jsx`. It is tab 2 of BoatPrep, shown only when `location.settings.complianceReportsMandatory === true`.
- **Purpose**: A regulatory summary of completed dives for one date (Spanish regulations), with CSV and PDF export.
- **Data**: `postDivePreparations` (for `reportDate`) filtered to `diveSiteStatus.completed === true`.

#### Layout
1. **Header**:
   - H5 `Compliance Reports (Spanish Regulations)`.
   - `Report Date` field (shares `reportDate` with the Post-Dive tab).
   - If there are completed preps: **"Download CSV"** (primary) → `exportComplianceReport(completed)` and **"Download PDF"** (secondary) → `exportComplianceReportPDF(completed)`.
2. **Info Alert**: `This report contains all data required for Spanish regulatory compliance, including gender breakdown and certifications. Only completed dives are included in compliance reports.`
3. **Empty state**: `No completed dives found for {reportDate}` / `Complete dives in the Post-Dive Reports tab to generate compliance reports.`
4. **One full-width card per completed prep** (2px primary border):
   - **Title**: `{boat|Shore Dive} - {session} - {date}`, plus a `Completed` chip.
   - **"Dive Site Information"**:
     - `Planned:` the site name or `Unknown`.
     - `Actual:` the actual site, falling back to the planned site, then `Unknown`.
     - `Entry Time:` and `Exit Time:`, each shown only if present.
   - **"Staff"**:
     - `Captain:`, only if `prep.captainId`, so never in practice.
     - `Guides ({n}):` with bullets `• {name} - {role|'Guide'}`, followed by the caption `Gender breakdown: {0}M / {0}F / {n}U`. The guide gender split is **hard-coded** to all unspecified.
   - **"Divers ({n} total)"** table (small, max height 300):

     | Column | Value |
     |---|---|
     | Name | first + last name |
     | Gender | capitalised, or `Not specified` |
     | Certification | highest certification (rule below) |
     | Nationality | `nationality`, or `-` |

     Caption below the table: `Gender breakdown: {m} Male / {f} Female / {u} Unspecified`.
   - **"Regulatory Compliance Summary"** (grey box): Date, Session, Total Divers, Total Guides.
   - **"Additional Notes"**: the post-dive notes, shown only if present.
- **Highest certification rule**:
  - Sort `customer.certifications` by the lowercased level using `{instructor:10, dm:9, rescue:8, aow:7, ow:6}`; any other level counts as 0.
  - Display `"{agency} {level}"` of the top one, or `No certification` if there are none.
  - The PDF export does **not** sort; it uses the first certification.
- **Quirk**: Captain and Guides are always empty (the `captainId`/`guideIds` bug described under useBoatPrepData).

---

### Breaches page (`pages/Breaches.jsx`)

- **File**: `pages/Breaches.jsx`
- **Route**: `/breaches`, guarded by `requiredPermission="settings"`.
- **Purpose**: The GDPR data-breach register. Staff log breaches, track their status (detected → assessed → reported → resolved), and track the **72-hour** authority-notification deadline and customer notification.

#### Data loaded
- `breachService.getAllBreaches({status?, limit:100})`. There is no status filter for "All".
- `breachService.getBreachStatistics()`.
- Both reload whenever the status filter (tab) changes, and after every create or update.
- A load error would show a snackbar `Error loading breaches: …`, but in practice `getAllBreaches` swallows errors and returns an empty list.

#### Constants (option lists)

| List | value → label (colour) |
|---|---|
| `BREACH_TYPES` | `unauthorized_access` → Unauthorized Access; `data_loss` → Data Loss; `data_disclosure` → Data Disclosure; `data_modification` → Data Modification; `other` → Other |
| `SEVERITY_LEVELS` | `low` → Low (success/green); `medium` → Medium (info/blue); `high` → High (warning/orange); `critical` → Critical (error/red) |
| `STATUS_OPTIONS` | `detected` → Detected (error); `assessed` → Assessed (warning); `reported` → Reported (info); `resolved` → Resolved (success) |
| `DATA_TYPES` | `customer_data` → Customer Data; `booking_data` → Booking Data; `financial_data` → Financial Data; `equipment_data` → Equipment Data; `staff_data` → Staff Data; `certification_data` → Certification Data; `medical_data` → Medical Data |

#### UI layout (in order)
1. **Header**: H4 `t('breaches.management')` = "Data Breach Management". Button `t('breaches.reportNew')` = "Report New Breach" (contained, red, + icon) opens the create dialog.
2. **Six statistic cards**:

   | Card | Value | Colour |
   |---|---|---|
   | Total Breaches | `total` | default |
   | Detected | `detected` | red |
   | Assessed | `assessed` | warning.main |
   | Reported | `reported` | info.main |
   | Resolved | `resolved` | success.main |
   | Overdue | `overdue` | red |

   `requiringCustomerNotification` is loaded but not displayed.
3. **Overdue alert** (red), shown if `overdue > 0`: `Warning: {n} breach(es) are overdue for authority notification (past 72-hour deadline).`
4. **Tabs**: All / Detected / Assessed / Reported / Resolved (translated). They map to `filterStatus` = `all`, `detected`, `assessed`, `reported`, `resolved`.
5. **Table**:

   | Column | Content |
   |---|---|
   | ID | first 8 characters of `id` + `...`, monospace |
   | Type | label from `BREACH_TYPES`, or the raw `breach_type` |
   | Severity | chip with the uppercased severity; colour from `getSeverityColor` |
   | Status | chip with the uppercased status; colour from `getStatusColor` |
   | Detected | `detected_at` formatted `MMM dd, yyyy HH:mm`, or `N/A` |
   | Deadline | `notification_deadline` formatted the same way; then a red `OVERDUE` chip if overdue, otherwise the caption `{h}h remaining` when h > 0 |
   | Affected Customers | `affected_customers_count \|\| 0` |
   | Authority Notified | green chip with `authority_name \|\| 'Yes'` if `reported_to_authority`; otherwise grey chip `No` |
   | Actions | Edit icon (tooltip `Update Status`) that opens the status dialog |

   - Overdue rows have the background `error.light`.
   - **Empty state**: `No breaches found` (spans all 9 columns).
6. **Create dialog** "Report New Data Breach" (fields below).
   - Buttons: `Cancel`, and **"Create Breach Record"** (red). The create button is disabled until Description is filled.
7. **Status dialog** "Update Breach Status":
   - Info Alert showing `Breach:` with the first 100 characters of the description (+ `...` if longer).
   - `Notification Deadline:` with the date, plus an `OVERDUE` chip when overdue.
   - Fields below.
   - When the chosen status is `resolved`: success Alert `Marking this breach as resolved will close the incident record.`
   - Buttons: `Cancel`, and **"Update Status"**.
8. **Snackbar**: auto-hides after 4000 ms and shows plain `message`. The `severity` prop is ignored because there is no Alert inside it.

#### Fields: create dialog

| Field (label) | Data key (sent) | Control | Options / default | Validation |
|---|---|---|---|---|
| Breach Type | `breachType` | select | BREACH_TYPES; default `unauthorized_access` | – |
| Severity | `severity` | select | SEVERITY_LEVELS; default `medium` | – |
| Description | `description` | multiline, 4 rows | `''` | **required**: the submit button is disabled while it is empty |
| Occurred At (Optional) | `occurredAt` | datetime-local | `''`. Sent as an ISO string, or `undefined` when empty. | – |
| Affected Data Types | `affectedDataTypes` | multi-select | DATA_TYPES; default `[]` | – |
| Root Cause (Optional) | `rootCause` | multiline, 2 rows | `''` | – |
| Containment Measures (Optional) | `containmentMeasures` | multiline, 2 rows | `''` | – |
| Mitigation Actions (Optional) | `mitigationActions` | multiline, 2 rows | `''` | – |
| Notes (Optional) | `notes` | multiline, 2 rows | `''` | – |
| (hidden) | `affectedCustomerIds` | – | always `[]`; there is no UI for it | – |

#### Fields: status dialog

| Field (label) | Data key (sent) | Control | Default | Condition |
|---|---|---|---|---|
| Status | `status` | select | STATUS_OPTIONS; current `breach.status` or `detected` | always |
| Authority Notification Date | `authorityNotificationDate` (ISO) | datetime-local | `breach.authority_notification_date` | status is `reported` or `resolved` |
| Authority Name | `authorityName` | text, placeholder `e.g., Spanish DPA (AEPD)` | `breach.authority_name` | status is `reported` or `resolved` |
| Customer Notification Date | `customerNotificationDate` (ISO) | datetime-local | `breach.customer_notification_date` | `breach.customer_notification_required` |
| Customers Notified Count | `customersNotifiedCount` | number; `parseInt \|\| 0` | `breach.customers_notified_count \|\| 0` | `breach.customer_notification_required` |

- **Update payload**: `{status, ...updates}`. Empty or zero values are dropped, so a count of `0` is never sent.
- **Pre-filled dates**: the date fields are pre-filled with raw backend values, which may be full ISO strings that do not fit `datetime-local`. Whether they display correctly is unclear from the code.

#### Actions and business rules
- **Create**: `createBreach({...formData, occurredAt})`. Success snackbar `Breach record created successfully`; error `Error creating breach: {msg}`. Afterwards the dialog closes and the data reloads.
- **Update status**: `updateBreachStatus(id, status, updates)`. Success `Breach status updated successfully`; error `Error updating breach status: {msg}`.
- **Status transitions are unrestricted.** Any status can be set from any other; the client enforces no order.
- **The deadline is computed by the backend.** The client only reads `notification_deadline`; the "72-hour" rule appears only in the UI text and service comments.
- **Overdue** is decided by `isBreachOverdue` (see breachService).

---

### `services/breachService.js`

- **File**: `services/breachService.js`. It has named exports plus a default object containing all of them.
- **Base URL**: `import.meta.env.VITE_API_URL || 'http://localhost:3003/api'`.
- **Transport**: every call uses raw `fetch` with the `Content-Type: application/json` header **and no auth header**. It bypasses the app's httpClient and authentication.

| Function | HTTP | Input | Output / on failure |
|---|---|---|---|
| `createBreach(breachData)` | `POST /breaches`, JSON body | the camelCase form payload | the parsed JSON. **Throws** `Breach creation failed: {statusText}` on a non-OK response. |
| `getAllBreaches(filters={})` | `GET /breaches?status&severity&limit&offset` (only the params that are set) | `{status?, severity?, limit?, offset?}` | JSON `{breaches: [], total}`. On failure: `{breaches: [], total: 0}` (never throws). |
| `getBreachStatistics()` | `GET /breaches/statistics` | – | `{total, detected, assessed, reported, resolved, overdue, requiringCustomerNotification}`. On failure: all zeros. |
| `getOverdueBreaches()` | `GET /breaches/overdue` | – | an array, or `[]` on failure. Not used by the page. |
| `getBreach(id)` | `GET /breaches/{id}` | – | an object, or `null`. Not used by the page. |
| `updateBreachStatus(id, status, updates={})` | `PATCH /breaches/{id}/status`, body `{status, ...updates}` | – | JSON. **Throws** `Breach update failed: {statusText}`. |
| `getHoursUntilDeadline(deadline)` | – | a date | `Math.ceil((deadline − now) / 3 600 000)`, or `null` if there is no deadline. The result can be negative. |
| `isBreachOverdue(breach)` | – | a breach | `false` if there is no `notification_deadline`, if `reported_to_authority` is truthy, or if `status === 'resolved'`. Otherwise `new Date(notification_deadline) < now`. |
| `getSeverityColor(sev)` | – | a severity | critical → `error`, high → `warning`, medium → `info`, low → `success`, anything else → `default` (case-insensitive) |
| `getStatusColor(status)` | – | a status | resolved → `success`, reported → `info`, assessed → `warning`, detected → `error`, anything else → `default` |

---

### Data shapes used in this area

#### Booking: fields read and written by Schedule, TripDetails and BoatPrep
Fields are read as camelCase with a snake_case fallback.

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `customerId` | string | |
| `locationId` | UUID | BoatPrep also accepts the short names `caleta` and `playitas`. |
| `bookingDate` | `yyyy-MM-dd` or ISO string | Compared as the part before `T`. |
| `bookingTime` | string (`HH:mm` or ISO) | Only used for calendar labels. |
| `activityType` | enum | `diving`, `snorkeling`, `specialty`, `discovery`, `discover`, `try_dive`, `try-dive`, `try_scuba`, `orientation` |
| `status` | string | BoatPrep requires `confirmed` or `paid`. |
| `paymentStatus` | string | `paid` also qualifies in BoatPrep. |
| `boatId` | string\|null | Boat assignment. **Written** by Schedule, TripDetails and BoatPrep. |
| `session` | `'morning'\|'afternoon'\|'10:15'\|'night'\|null` | Boat session. **Written** together with `boatId`. A missing session is treated as `morning`. |
| `moleSlotTime` | `'HH:mm'`\|null | Mole slot start time. **Written** by Schedule and TripDetails. |
| `diveSiteId` | string\|null | **Written** by TripDetails. |
| `numberOfDives` | int ≥ 1 | Default 1. **Written** by TripDetails. |
| `equipmentNeeded` | JSON string or object | TripDetails writes `JSON.stringify({rentedEquipment: {completeEquipment, Suit, BCD, Regulator, Mask, Fins, Boots, Torch, Computer, UWCamera: bool}})`. The legacy form may instead hold the session flags. |
| `diveSessions` | object or JSON string | `{morning, afternoon, night, tenFifteen \| '10:15': true\|1\|'true'}` |
| `notes` | string | Read only here; TripDetails does not persist it. |
| `dietaryRequirements` | string | Read only here; TripDetails does not persist it. |

#### scheduleSlotGuides record (`/schedule-slot-guides`)

```
{ id, locationId, date: 'yyyy-MM-dd', slotType: 'mole'|'boat',
  slotKey: 'mole-{yyyy-MM-dd}-{HH}-{mm}' | 'boat-{boatId}-{yyyy-MM-dd}-{session}',
  boatId: string|null, guideIds: string[] (staff ids), createdAt, updatedAt }
```
- Create sends `{locationId, date, slotType, slotKey, boatId, guideIds}`.
- Update sends `{guideIds}`.

#### Boat prep record (`boatPreps` → `/boat-preps`)

```
{ id, locationId (UUID), date: 'yyyy-MM-dd', session: 'morning'|'10:15'|'afternoon'|'night',
  boatId: string|null (null = shore dive),
  diverIds: customerId[],
  diveSiteId: string|null            // planned site
  actualDiveSiteId: string|null,
  diveSiteStatus: { confirmed: bool, completed: bool, confirmedAt: ISO|null, completedAt: ISO|null },
  postDiveReport: null | { actualDiveSiteId, notes: string, entryTime: 'HH:mm'|null, exitTime: 'HH:mm'|null, reportDate: ISO },
  staff: { captain: staffId|null, guides: staffId[], trainees: staffId[] },
  createdAt, updatedAt }
```
- The adapter sends only: `locationId, date, session, boatId, diverIds, diveSiteId, actualDiveSiteId, diveSiteStatus, postDiveReport, staff`.
- Shore preps omit `diveSiteStatus` and `postDiveReport` on create.
- `captainId` and `guideIds` are read by the compliance code but do **not** exist on the record.

#### Local (unsaved) BoatPrep structures
- `boatAssignments`: `{ [boatId]: customerId[] }`
- `staffAssignments`: `{ [boatId]: {captain, guides[], trainees[]} }`
- `shoreDiveStaff`: `{guides[], trainees[]}`
- `boatDiveSites`: `{ [boatId]: siteId }`
- `boatDiveSiteStatus`: `{ [boatId]: {confirmed, completed} }`
- `editingReports`: `{ [prepId]: {actualDiveSiteId?, notes?, timestamps?: {entryTime?, exitTime?}} }`

#### Customer fields used

| Field | Used for |
|---|---|
| `id`, `firstName`, `lastName`, `email` | names and search |
| `centerSkillLevel` | `beginner\|intermediate\|advanced` |
| `gender` | `male\|female\|other/empty` |
| `nationality` | compliance reports |
| `certifications[]` | `{agency, level}` |
| `preferences.ownEquipment` | bool |
| `preferences.tankSize` | default `'12L'` |
| `preferences.bcdSize`, `finsSize`, `bootsSize`, `wetsuitSize` | equipment sizes |
| `customerType` | `'tourist'` when created from Trip Details |

#### Other entities

| Entity | Fields used |
|---|---|
| Staff | `id`, `firstName`, `lastName`, `name` (built by the adapter), `email`, `role` (`boat_captain`, `divemaster`, `instructor`, `assistant`, `intern`, …), `isActive`, `locationIds[]` (empty = all locations), legacy `locationId` |
| Boat | `id`, `name`, `capacity` (int; defaults to 8 in the week view and 10 in the prep card display), `locationId`, `isActive` |
| Dive site | `id`, `name`, `nameEn`, `locationId`, `difficultyLevel` / `difficulty` (`beginner`, …) |
| Location | `id`, `name`, `code`, `settings.complianceReportsMandatory` (bool) |
| Equipment (allocation) | `id`, `type` (`Tank`, `BCD`, `Regulator`, `Mask`, `Fins`, `Boots`, `Wetsuit`, `Computer`, `Torch`), `size`, `category` (`'diving'`), `isAvailable` (**written** `false`) |

#### Breach

**Read (snake_case from the API)**:

```
{ id, breach_type: 'unauthorized_access'|'data_loss'|'data_disclosure'|'data_modification'|'other',
  severity: 'low'|'medium'|'high'|'critical',
  status: 'detected'|'assessed'|'reported'|'resolved',
  description, detected_at, notification_deadline, affected_customers_count,
  reported_to_authority: bool, authority_name, authority_notification_date,
  customer_notification_required: bool, customer_notification_date, customers_notified_count }
```

**Create (camelCase)**:

```
{ breachType, severity, description, occurredAt?: ISO,
  affectedDataTypes: ('customer_data'|'booking_data'|'financial_data'|'equipment_data'|'staff_data'|'certification_data'|'medical_data')[],
  affectedCustomerIds: [], rootCause, containmentMeasures, mitigationActions, notes }
```

**Status update**:

```
{ status, authorityNotificationDate?: ISO, authorityName?, customerNotificationDate?: ISO, customersNotifiedCount?: int }
```

**Statistics**:

```
{ total, detected, assessed, reported, resolved, overdue, requiringCustomerNotification }
```

---

## Dashboard, equipment, stays and pricing

This section covers the Dashboard (`/`), the Equipment page (`/equipment`, with the Equipment and Tanks tabs), the Current Customers / Stays page (`/stays`), and the services behind stay pricing, stay extra costs, tank metadata, bulk booking repricing and the dive pricing model.

Conventions used below:
- `t('x.y')` labels are shown with their **English** text from `utils/translations.js` (the `en` block). The translation function `t()` returns the **key string itself** when a key is missing. Because of this, fallbacks like `t('equipment.noResults') || 'No equipment found'` never apply, and the raw key is displayed.
- "dataService" means `services/dataService.js`. Its `getAll/getById/create/update/remove(resource, …)` send calls to `api/mockDataService` (mock mode) or `apiService` (API mode), depending on `config/apiConfig.isMockMode()`.
- "Global admin" (equipment/dashboard sense) means a user with no `locationAccess`, or `locationAccess` equal to `[]`.
- Money is always shown as `€` + `toFixed(2)`.

---

### Dashboard page

- **File**: `pages/Dashboard.jsx`
- **Route/where used**: `/` in `App.jsx`, wrapped in `<ProtectedRoute requiredPermission="dashboard">`.
- **Purpose**: Landing page. It shows booking and revenue KPIs, charts, top customers, and an "Upcoming Bookings" list or calendar. The data is scoped either globally or to the selected location.

#### Data loaded
| When | Call | Use |
|---|---|---|
| Mount, and whenever `currentUser` changes | `dataService.getAll('locations')` | Location list for "Per Location Overview" and for choosing the default scope |
| On mount and **every 5000 ms** (`setInterval`), re-armed when `daysToShow`, `tabScope` or `selectedLocationId` changes | `dataService.getStatistics()` (result is **unused**), `dataService.getAll('bookings')`, `dataService.getAll('customers')` | All KPIs, charts and lists |

**Scope resolution (`tabScope`)**: the value is `'all'` or a location id.
- `selectedLocationId` = localStorage `dcms_current_location`, or else the first location's id, or else `null`.
- `hasGlobalAccess` = `!currentUser.locationAccess || locationAccess.length === 0`.
- If `hasGlobalAccess` and localStorage `dcms_dashboard_scope === 'global'`, then `tabScope = 'all'`.
- Otherwise `tabScope` = stored location, or else the first location id, or else `'all'`.
- The scope is set from the top AppBar (`components/Common/Navigation.jsx`). That component writes `dcms_dashboard_scope` (`'global'`/`'location'`) and dispatches `dcms_location_changed`.

**Window events listened to**:
- `dcms_location_changed`: `e.detail` is either a string or `{locationId}`. On this event the page re-reads `selectedLocationId` and recomputes the scope with the same rule as above (it falls back to `newLoc || 'all'`).
- `storage`: same handler as `dcms_location_changed`.
- `dcms_booking_created`: calls `window.location.reload()` (a full page reload).

**Filtering**:
- `locationFilteredBookings` = all bookings when `tabScope === 'all'`. Otherwise it keeps only bookings where `(b.locationId || b.location_id) === tabScope`.
- **Upcoming bookings** are the scoped bookings where `new Date(bookingDate) >= now` and `<= now + daysToShow days`, sorted by date ascending. `bookingDate` falls back to `booking_date`.
- **Today** is `new Date().toISOString().slice(0,10)`, a UTC date. A booking is "today's" when `bookingDate === todayStr` (exact string match).

#### KPI computations (from the scoped bookings)
| Stat | Formula |
|---|---|
| `todaysBookings` | count of today's bookings |
| `todaysRevenue` | Σ `parseFloat(totalPrice ‖ total_price ‖ 0)` over today's bookings |
| `totalBookings` | count of scoped bookings (all time) |
| `totalRevenue` | Σ `parseFloat(totalPrice ‖ total_price ‖ 0)` over scoped bookings (all time) |
| `pendingBookings` / `confirmedBookings` | counts where `(status ‖ 'pending')` is `'pending'` / `'confirmed'`. These are computed but **not displayed**. |

#### UI layout (in order)
1. `h4` **"Dashboard"**.
2. **Per Location Overview** (only when `tabScope === 'all'`). Heading "Per Location Overview". There is one card per location (a 2-column grid on md). Each card has the location name and 2 StatCards:
   - "Total Bookings" = count of **all** bookings (global list) with `b.locationId === loc.id`. Only the camelCase key is checked.
   - "Total Revenue" = `€` Σ `(b.totalPrice || 0)` for those bookings. There is no `parseFloat`.
   - Per-location "today" values are computed but not displayed.
3. **Stat cards row**. Each StatCard shows an icon, an `h6` title and an `h4` value:
   | Title | Value | Icon/colour | Visible to |
   |---|---|---|---|
   | "Today's Bookings" | `todaysBookings` | Event / primary | everyone |
   | "Today's Revenue" | `€todaysRevenue` | Euro / success | `isAdmin()` only |
   | "Total Bookings" | `totalBookings` | TrendingUp / info | everyone |
   | "Total Revenue" | `€totalRevenue` | Euro / warning | `isAdmin()` only |

   `isAdmin()` (from `utils/authContext`) returns true for role `admin` or `superadmin`.
4. **Revenue chart** (admin only, md=8). It has a period Select in the top-right with options `7` "Last 7 days", `14` "Last 14 days" and `30` "Last 30 days". The default is **7**. Title: "Revenue Trend (Last {n} Days)". The chart is `RevenueChart` fed by `getRevenueData(scopedBookings, period)`.
5. **Revenue by Activity** pie (admin only, md=4), from `getRevenueByActivity(scopedBookings)`.
6. **Booking Trends** line chart. It spans md=8 for admins and md=12 for others. It has the same period Select, with a default of **14**. Title: "Booking Trends (Last {n} Days)". Data comes from `getBookingTrends(scopedBookings, period)`.
7. **Top Customers** list (admin only, md=4), from `getTopCustomers(scopedBookings, customers, 5)`.
8. **Upcoming Bookings panel** (Paper):
   - Title: "Upcoming Bookings (Next {n} Days)". Subtitle: "Showing bookings from today through {date}", where the date is `now + n days` in the browser's locale.
   - Buttons:
     - "List" (BarChart icon) sets `viewMode='list'`, which is the default.
     - "Calendar" (Calendar icon) sets `viewMode='calendar'`. The active mode's button is `contained`; the other is `outlined`.
     - "-" decrements `daysToShow` (minimum 1; the button is disabled at ≤1).
     - A label shows "{n} days".
     - "+" increments `daysToShow` (maximum 7; disabled at ≥7). **The default is 3.**
     - "New Booking" (contained) navigates to `/bookings/new`.
   - **Calendar mode** renders `BookingCalendar` with the upcoming bookings. Clicking a booking navigates to `/bookings/{id}`.
   - **List mode, empty**: shows "No upcoming bookings for the next {n} days".
   - **List mode**: bookings are grouped by `booking.bookingDate`. Each group has a date header formatted `toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})`. Each booking is an Accordion:
     - **Summary**: customer name (`firstName lastName`, or "Unknown Customer") and a status Chip. Chip colours: confirmed=success, pending=warning, completed=info, cancelled=error, anything else=default. On the right are `activityType` and `€totalPrice` (or `€0.00`).
     - **Details, left column**:
       - "Booking ID: {first 8 chars}..."
       - "Date: {bookingDate}"
       - "Activity: {activityType}"
       - "Dive Sessions:". When `diveSessions` exists, this shows "Morning (9AM)" and/or "Afternoon (12PM)", joined by ", " (night is not shown). Otherwise it shows `"{numberOfDives||1} dives"`.
       - "Status"
       - "Payment Method: {paymentMethod||'N/A'}"
       - "Payment Status: {paymentStatus||'pending'}"
     - **Details, right column**:
       - `h6 €totalPrice`
       - "Own Equipment: Yes" if `ownEquipment` is set
       - "Rented Equipment:" followed by outlined chips for each truthy key of `rentedEquipment` (the chip label is the raw key)
       - "Special Requirements: …" and "Notes: …" when present
     - **Button** "Edit Booking" (Edit icon) navigates to `/bookings/{id}`.

#### Actions
Every action is navigation or view state. The page writes no data.

#### Quirks/bugs
- Upcoming uses `new Date('YYYY-MM-DD')`, which is UTC midnight, compared with `>= now`. Today's bookings are therefore excluded from "Upcoming" (in UTC and positive time-zone offsets). The group header date can also show the previous day in negative-offset time zones.
- "Today" uses the UTC date (`toISOString`), so it can differ from the local date.
- The 5 s polling refetches bookings and customers in full.
- `dcms_booking_created` triggers a full page reload.
- `getStatistics()` is called on every poll, and its result is discarded.
- Per-location cards ignore `location_id`.
- Chart helpers use only `b.bookingDate` / `b.totalPrice`. snake_case records contribute 0 to them.

---

### BookingCalendar component

- **File**: `components/Dashboard/BookingCalendar.jsx`
- **Where used**: Dashboard Upcoming panel, calendar mode.
- **Props**: `bookings`, `customers`, `onBookingClick(booking)`.
- **Purpose**: A month grid that shows a count chip per day. Clicking a day opens a dialog listing that day's bookings.

#### UI layout
- **Header**: a ChevronLeft IconButton (previous month), the title `format(currentDate,'MMMM yyyy')`, and a ChevronRight IconButton (next month). It starts on the current month.
- **Day headers**: `Sun Mon Tue Wed Thu Fri Sat`. The week starts on Sunday.
- **Leading cells**: `monthStart.getDay()` empty cells, each 80 px high.
- **Day cell** (80 px, bordered, clickable):
  - Shows the day number.
  - Today gets a `primary.light` background and a bold number.
  - If the day has bookings, a small Chip shows their count.
  - Bookings are matched by `b.bookingDate === 'yyyy-MM-dd'`.
- **Dialog** (sm, fullWidth):
  - Title: "Bookings for {EEEE, MMMM d, yyyy}".
  - Empty state: "No bookings for this date".
  - Each booking is a clickable box showing:
    - the customer name ("Unknown" if not found)
    - `"{activityType} - {numberOfDives} dive(s)"`
    - a status Chip (same colour map as the Dashboard)
    - `€totalPrice`
  - Clicking a booking calls `onBookingClick(booking)` and closes the dialog.
  - Action: "Close".

#### Quirks
- The Dashboard only passes the upcoming bookings (next 1–7 days), so other months always show no chips.

---

### RevenueChart component

- **File**: `components/Dashboard/RevenueChart.jsx`. Used by the Dashboard (admin).
- **Props**: `data` (from `getRevenueData`) and `title` (default "Revenue Trend").
- **Chart**: Recharts `AreaChart`, 300 px high.
  - `CartesianGrid` dash "3 3".
  - X axis = `date` (`'MMM dd'`); Y axis is numeric.
  - A single `Area` with `dataKey="revenue"`, monotone, stroke and fill `#1976d2`, fillOpacity 0.6.
  - Tooltip shows `[€value.toFixed(2), 'Revenue']` on a white background with a `#ccc` border.
  - There is no legend. (`Line`, `LineChart` and `Legend` are imported but unused.)

### BookingTrendsChart component

- **File**: `components/Dashboard/BookingTrendsChart.jsx`. Used by the Dashboard (all users).
- **Props**: `data` (from `getBookingTrends`) and `title` (default "Booking Trends").
- **Chart**: Recharts `LineChart`, 300 px high, with grid "3 3", X = `date`, Y numeric, Tooltip and Legend. There are 3 monotone lines with strokeWidth 2:

| Series | dataKey | Colour |
|---|---|---|
| "Confirmed" | `confirmed` | `#4caf50` |
| "Pending" | `pending` | `#ff9800` |
| "Completed" | `completed` | `#2196f3` |

- `count` (the total) is not plotted, and cancelled bookings are not plotted.

### RevenueByActivityChart component

- **File**: `components/Dashboard/RevenueByActivityChart.jsx`. Used by the Dashboard (admin).
- **Props**: `data` = `[{name, value}]` from `getRevenueByActivity`.
- **UI**: Title "Revenue by Activity". Recharts `PieChart`, 300 px high.
  - `Pie` with `dataKey="value"`, centred, outerRadius 80, no label lines.
  - Slice label: `"{name}: {percent}%"`, where the percent has 0 decimals.
  - Slice colours cycle through `['#1976d2','#4caf50','#ff9800','#f44336','#9c27b0','#00bcd4']`.
  - Tooltip shows `€value.toFixed(2)`. Legend is shown.

### TopCustomersList component

- **File**: `components/Dashboard/TopCustomersList.jsx`. Used by the Dashboard (admin).
- **Props**: `customers` = `[{id, name, revenue, bookings}]` from `getTopCustomers(…, 5)`.
- **Empty state**: title "Top Customers" and the text "No customer data available".
- **Otherwise**: title "Top Customers by Revenue", with a List item per customer containing:
  - an avatar (Person icon)
  - the primary text `name`
  - the secondary text `"€{revenue} revenue"` and `"{n} booking"` or `"{n} bookings"` (plural unless n = 1)
  - a right-aligned `h6` rank `#1…#5`
  - a divider between items

---

### Chart data utilities

- **File**: `utils/chartData.js`. It uses `date-fns` (`format`, `subDays`, `startOfWeek`, `endOfWeek`, `eachDayOfInterval`). Only the camelCase fields `bookingDate`, `totalPrice`, `status`, `activityType` and `customerId` are read.

| Export | Signature | Output | Rules |
|---|---|---|---|
| `getRevenueData` | `(bookings, days = 7)` | `[{date:'MMM dd', fullDate:'yyyy-MM-dd', revenue, bookings}]`, one entry per day from `today-(days-1)` to today | revenue = Σ `totalPrice‖0` of bookings with `bookingDate === fullDate`; `bookings` = the count |
| `getBookingTrends` | `(bookings, days = 14)` | `[{date, fullDate, count, confirmed, pending, completed}]` per day | counts by exact `status` |
| `getRevenueByActivity` | `(bookings)` | `[{name, value}]` | groups by `activityType‖'other'`; `name` is capitalised on the first letter (e.g. `diving` becomes "Diving"); value = Σ `totalPrice‖0`; all-time |
| `getStatusDistribution` | `(bookings)` | `[{name, value}]` | count by `status‖'unknown'`, capitalised. **Unused.** |
| `getWeeklyRevenue` | `(bookings)` | `[{day:'EEE', fullDay:'EEEE', date, revenue, bookings}]` for Monday–Sunday of the current week (`weekStartsOn:1`) | **Unused.** |
| `getMonthlyRevenue` | `(bookings)` | `[{month:'MMM yyyy', fullMonth:'YYYY-MM', revenue, bookings}]`, sorted ascending, **last 6 months that have data** | uses `bookingDate.substring(0,7)`. **Unused.** |
| `getTopCustomers` | `(bookings, customers, limit = 5)` | `[{id, name, revenue, bookings}]` sorted by revenue descending, sliced to `limit` | name = `firstName lastName`, or "Unknown" if the customer is not found; all-time within the scope |

---

### Equipment page

- **File**: `pages/Equipment.jsx`
- **Route/where used**: `/equipment`, `<ProtectedRoute requiredPermission="equipment">`.
- **Purpose**: A tab router with two tabs, "Equipment" (rental/inventory) and "Tanks / Cylinders" (a cylinder testing tracker). It also hosts the shared Snackbar. All state comes from `useEquipmentData()`, and the whole hook return value is spread as props into each tab.

#### UI layout
- **Tabs**:
  - `0` "Equipment" (ScubaDiving icon).
  - `1` "Tanks / Cylinders" (LocalGasStation icon). This tab is **disabled** when the current location type is `bike_rental`, `surf` or `kite_surf`.
- Tab 0 renders `EquipmentTab`. Tab 1 renders `TanksTab`, and only if the location is not bike rental.
- **Snackbar**: `autoHideDuration` 6000 ms. It contains an `Alert` with the severity from state (`success`/`error`/`warning`) and the message text.

### Equipment page smoke test

- **File**: `pages/Equipment.smoke.test.jsx` (Vitest + Testing Library).
- **Mocks**:
  - `dataService`: `getAll('equipment')` returns `[{id:'eq-1', name:'BCD Mares', category:'diving', type:'standard', isAvailable:true, locationId:'loc-1'}]`; `getAll('locations')` returns `[{id:'loc-1', name:'Test Bay', type:'diving'}]`; everything else returns `[]`.
  - `tankService`: identity enrich and empty metadata.
  - `useAuth`: returns `{ user: { role:'admin', locationAccess: [] } }`.
- **Cases**:
  1. The Equipment tab renders by default. There are 2 tabs, and "BCD Mares" is displayed.
  2. Clicking tab 2 shows the text "Tanks / Cylinders Testing Tracker".
  3. Switching back to tab 1 shows "BCD Mares" again.
- **Note**: the test mocks `useAuth` returning a `user` key. That matches what the hook destructures, but the real `AuthContext` exposes `currentUser`, not `user` (see the hook quirks below). The test therefore masks the bug.

---

### useEquipmentData hook

- **File**: `hooks/useEquipmentData.js` (default export `useEquipmentData()`).
- **Where used**: `pages/Equipment.jsx` only.
- **Purpose**: Holds all state, loading, permissions, CRUD handlers, CSV imports, filtering, sorting and counters for both Equipment tabs.
- **Dependencies**: `useTranslation` (`utils/languageContext`), `useAuth` and `USER_ROLES` (`utils/authContext`), `dataService`, `tankService`, and date-fns (`parseISO`, `isBefore`, `addMonths`, `addDays`).

#### Identity and permissions
- `currentUser` is taken as `const { user: currentUser } = useAuth()`.
- `currentLocationId` = localStorage `dcms_current_location`, read on every render.
- `isGlobalAdmin` = `!currentUser?.locationAccess || locationAccess.length === 0`.
- `canManageEquipment` (create/edit/delete) = `isGlobalAdmin || role === 'boat_pilot' || role === 'trainer'`. Per the code comment, "Owners (BOAT_PILOT, TRAINER) and Global Admins"; guides and interns can only view and toggle availability.
- `USER_ROLES`: `superadmin, admin, boat_pilot, guide, trainer, intern`.

#### State and defaults
| State | Default |
|---|---|
| `equipment`, `locations`, `tanks` | `[]` |
| `currentLocation` | `null` |
| `searchQuery` | `''` |
| `filterType` | `'all'` |
| `addDialogOpen`, `bulkDialogOpen`, `tankDialogOpen`, `tankBulkDialogOpen` | `false` |
| `editingEquipment`, `editingTank` | `null` |
| `snackbar` | `{open:false, message:'', severity:'success'}` |
| `activeTab` | `0` |
| `tankFilter` | `'all'` (`all`, `overdue`, `dueSoon`, `ok`) |
| `tankSizeFilter` | `'all'` (`'6'`, `'7'`, `'10'`, `'12'`, `'15'`) |
| `tankOrderBy` | `'number'` |
| `tankOrder` | `'asc'` |
| `formData` | see the Equipment form fields; `condition:'excellent'`, `isAvailable:true`, `locationId: isGlobalAdmin ? '' : currentLocationId`, all other fields `''` |
| `tankFormData` | `{size:'', number:'', lastVisualTest:'', nextVisualTest:'', lastHydrostaticTest:'', nextHydrostaticTest:'', serialNumber:'', netColour:'', remarks:'', locationId: isGlobalAdmin ? '' : currentLocationId}` |

#### Data loading
The effect runs on mount and whenever `currentLocationId` or `isGlobalAdmin` changes. It calls `loadEquipment()`, `loadLocations()`, `loadCurrentLocation()` and `loadTanks()`.

- **Tank detection rule** (shared by both loaders): an equipment row is a *tank* when `category.toLowerCase() === 'tank'`, or `name.toLowerCase()` contains `'tank'` or `'cylinder'`.
- `loadEquipment()`:
  - Calls `getAll('equipment')` and excludes tanks.
  - If not a global admin, keeps only rows where `(locationId‖location_id) === currentLocationId`.
  - Result goes to `equipment`.
- `loadTanks()`:
  - Calls `getAll('equipment')` and keeps only tanks.
  - Applies the same location filter.
  - Maps each row through `tankService.enrichTankWithMetadata`.
  - Result goes to `tanks`.
- `loadLocations()`: only for global admins. Calls `getAll('locations')`, and the result goes to `locations`.
- `loadCurrentLocation()`:
  - Calls `getAll('locations')` and finds the row with id `currentLocationId`.
  - If `loc.settings.pricing` exists and `loc.pricing` does not, it sets `loc.pricing = loc.settings.pricing`.
  - Result goes to `currentLocation`.
- **Location type flags** (from `currentLocation.type`):
  - `isBikeRental` = `'bike_rental'`
  - `isSurfRental` = `'surf'`
  - `isKiteSurfRental` = `'kite_surf'`

#### Rental-location pseudo-equipment (read-only, built from the location pricing)
For bike, surf and kite locations, the Equipment tab does **not** show inventory rows. It shows items generated from `currentLocation.pricing` (or `settings.pricing`):

| Location type | Source | Generated item |
|---|---|---|
| `surf` | `pricing.surfTypes` `{key: {name, description}}` | `{id:'surf-type-{key}', name: st.name ‖ key with '_' replaced by ' ', category/type:'surf_type', description, isAvailable:true, surfTypeKey:key}` |
| `surf` | `pricing.surfEquipment` `{key: price}` | `{id:'surf-equipment-{key}', name: label, category/type:'surf_accessory', description:'€{price}/day', price, isAvailable:true, equipmentKey}`. Labels: `wetsuit`→"Wetsuit", `shoes`→"Shoes", `surf_leash`→"Surf Leash", `auto_rack`→"Auto Rack" |
| `kite_surf` | `pricing.kiteTypes` | `{id:'kite-type-{key}', category/type:'kite_type', kiteTypeKey, …}` |
| `kite_surf` | `pricing.kiteEquipment` `{key: price}` | `{id:'kite-equipment-{key}', category/type:'kite_accessory', description:'€{price}/day', price}`. Labels: `harness`→"Harness", `kite_leash`→"Kite Leash", `helmet`→"Helmet", `impact_vest`→"Impact Vest", `wetsuit`→"Wetsuit" |
| `bike_rental` | `pricing.bikeTypes` | `{id:'bike-type-{key}', name: bt.name ‖ key, category/type:'bike_type', description, isAvailable:true, isBikeType:true, bikeTypeKey}` |
| `bike_rental` | `pricing.equipment` `{key: price}` | `{id:'rental-equipment-{key}', category/type:'rental_equipment', description:'Rental equipment - Charged once per rental', price, isAvailable:true, isRentalEquipment:true, equipmentKey}`. Labels: `click_pedals`→"Click Pedals", `helmet`→"Helmet", `gps_computer`→"GPS Computer" |

`allEquipmentList` is the surf, kite or bike generated list for those location types. Otherwise it is `equipment` (the inventory rows).

#### Filtering and counters (equipment)
- `filteredEquipment` keeps rows matching both conditions:
  - **Search** (case-insensitive substring, active when `searchQuery.trim()` is not empty) on `name`, `brand`, `model`, `size` or `serialNumber`.
  - **Type**: `filterType === 'all'`, or `eq.type === filterType`, or `eq.category === filterType`.
- `availableCount` = count of `isAvailable` rows. `totalCount` = length of `allEquipmentList`.
- `overdueCount` / `dueSoonCount` = counts of `getRevisionStatus(nextRevisionDate)` equal to `'overdue'` / `'dueSoon'`.

#### Status rules
- **Equipment revision** (`getRevisionStatus(nextRevisionDate)`):
  - `null` if there is no date.
  - `'overdue'` if the date is before now.
  - `'dueSoon'` if it is before now + **3 months**.
  - `'ok'` otherwise.
- **Tank test** (`getTestStatus(nextTestDate)`):
  - `null` if there is no date or the parse fails.
  - `'overdue'` if the date is before now.
  - `'dueSoon'` if it is before now + **30 days**.
  - `'ok'` otherwise.
- **Condition colour** (`getConditionColor`): `excellent`→success, `good`→info, `fair`→warning, `poor`→error, anything else→default.

#### Tank filtering, sorting and counters
- `getTankMetadata(tank)` returns `{number, nextVisualTest, nextHydrostaticTest}`. Each value is read from the tank row first (also `tankNumber`, `nextVisualTestDate`, `nextHydrostaticTestDate`) and then from `tankService.getTankMetadata(id)`.
- `filteredTanks`:
  1. If `tankSizeFilter !== 'all'`, the rule is `String(tank.size).trim() === tankSizeFilter`.
  2. For `tankFilter`:
     - `all`: every tank.
     - `overdue`: visual or hydro status is overdue.
     - `dueSoon`: visual or hydro status is dueSoon.
     - `ok`: **both** statuses are `'ok'`. A tank with a missing date (status `null`) is excluded from "All Tests OK".
- `handleTankSort(property)`: if the column is already sorted asc, it toggles to desc; otherwise it sets asc. The column becomes `property`.
- `sortedTanks` (memoised), compared per column:
  - `size`: `parseFloat`.
  - `number`: `parseFloat(number‖tankNumber‖'0')`.
  - `serialNumber`, `netColour`, `remarks` (`remarks‖notes`): lowercase string.
  - The 4 date columns: `new Date(v)`, with missing values as `new Date(0)`.
- `overdueTanks` = count with any overdue status.
- `dueSoonTanks` = count with any dueSoon status **and** no overdue status.

#### Actions / handlers
| Handler | Gate | Steps / writes | Messages (snackbar) |
|---|---|---|---|
| `handleSearch(q)` | none | sets `searchQuery` | none |
| `handleAddEquipment()` | `canManageEquipment` | Resets `formData` to defaults. `category` becomes `'bike_equipment'` for bike rental, otherwise `'diving'`; `type` becomes `'bike_accessory'` for bike rental, otherwise `''`. Clears editing and opens the dialog. | denied: "You do not have permission to add equipment" (error) |
| `handleEditEquipment(item)` | `canManageEquipment` | `formData = item` (the whole object), sets `editingEquipment`, opens the dialog | "You do not have permission to edit equipment" |
| `handleToggleAvailability(item)` | **no gate** | `dataService.update('equipment', id, {...item, isAvailable: !item.isAvailable})`, then reloads the equipment | "Equipment marked as available" / "Equipment marked as unavailable" (success) |
| `handleSaveEquipment()` | `canManageEquipment` | Validates that `name`, `category` and `type` are non-empty. A non-global user must have `formData.locationId === currentLocationId`. Then it calls `update('equipment', editing.id, formData)` or `create('equipment', formData)`, reloads equipment **and** tanks, and closes the dialog. | "You do not have permission to save equipment"; "Please fill in all required fields"; "You can only modify equipment for your location"; "Equipment updated successfully" / "Equipment added successfully"; "Error saving equipment" |
| `handleDeleteEquipment(id)` | `canManageEquipment` | `window.confirm('Are you sure you want to delete this equipment?')`, then `remove('equipment', id)` and a reload | "You do not have permission to delete equipment"; "Equipment deleted successfully"; "Error deleting equipment" |
| `handleBulkImport(event)` | Only via the button, which is visible to global admins with manage rights | Reads the CSV text and splits on `\n`. **Line 0 is skipped** as the header, and header names are ignored. For each non-blank line it splits on `,` and trims, then builds a row by position (see the table after this one). It fires `dataService.create` for each row **without awaiting**, reloads, and closes the dialog. | "{n} equipment items imported successfully" (success); on exception "Error importing file. Please check the format." |
| `handleAddTank()` | **no gate** (the button is gated in the UI) | `tankFormData` reset with `locationId = isGlobalAdmin ? '' : (currentLocationId ‖ localStorage dcms_current_location)`; opens the dialog | none |
| `handleEditTank(tank)` | `canManageEquipment` | Fills `tankFormData` from the tank row, falling back to metadata. Aliases: `tankNumber`, `*Date` variants, `serial_number`, `notes`, `location_id`. Opens the dialog. | "You do not have permission to edit tanks" |
| `handleSaveTank()` | `canManageEquipment` | Detailed after this table. | Detailed after this table. |
| `handleBulkImportTanks(event)` | the button is gated in the UI | See the "Tank CSV import" subsection below. | See below. |
| `handleDeleteTank(id)` | `canManageEquipment` | `confirm('Are you sure you want to delete this tank?')`, then `remove('equipment', id)`, `tankService.deleteTankMetadata(id)` and a reload | "You do not have permission to delete tanks"; "Tank deleted successfully"; "Error deleting tank" |

Row built by `handleBulkImport`, by column position:

| Column | Field | Default if empty |
|---|---|---|
| `[0]` | `name` | `''` |
| `[1]` | `category` | `'diving'` |
| `[2]` | `type` | `'standard'` |
| `[3]` | `size` | `''` |
| `[4]` | `serialNumber` | `''` |
| `[5]` | `condition` | `'excellent'` |
| `[6]` | `notes` | `''` |

Every imported row also gets `locationId:'550e8400-e29b-41d4-a716-446655440001'` (**hard-coded**) and `isAvailable:true`.

**`handleSaveTank()` steps**:
1. Size, Number and Serial Number are required.
2. `effectiveLocationId = tankFormData.locationId ‖ currentLocationId`. This value is required.
3. A non-global user must use their own location.
4. The equipment row written is `{name:'Tank {number} - {size}L', category:'diving', type:'diving', size, serialNumber, locationId, isAvailable:true, condition:'good'}`, via `update` or `create`. For `create`, the result must have an `id`.
5. It then calls `tankService.saveTankMetadata(equipmentId, {number, netColour‖'', lastVisualTest‖null, nextVisualTest‖null, lastHydrostaticTest‖null, nextHydrostaticTest‖null, remarks‖''})`.
6. It reloads the tanks and closes the dialog.

**`handleSaveTank()` messages**:
- "You do not have permission to save tanks"
- "Please fill in Size, Number, and Serial Number"
- "Location ID is required. Please select a location."
- "You can only modify tanks for your location"
- "Tank updated successfully" / "Tank added successfully"
- "Error saving tank: {message}" (for example "Failed to create tank - no result or ID returned")

#### Tank CSV import (`handleBulkImportTanks`) — exact algorithm
1. Read the file as text and split on `\r?\n`.
2. **Merge multi-line quoted values**:
   - Track the quote state per line. A `""` pair is treated as an escaped quote.
   - While inside quotes, append the next line with `\n`.
   - When a row completes, push `{line: trimmed, originalIndex}`.
   - Blank lines are dropped.
3. **Find the header row.** It is the first line whose comma-split, trimmed, uppercased columns meet all three conditions:
   - It contains a column exactly `SIZE`.
   - It contains a column exactly `NUMBER` that is not adjacent to a `SERIAL…` column (it must be more than 1 index away).
   - It contains "serial number", either as one column containing both `SERIAL` and `NUMBER`, or as `SERIAL` and `NUMBER` in adjacent columns.

   If no row qualifies, the error is `Could not find header row. Please ensure the CSV has a header row with "SIZE", "NUMBER", and "SERIAL NUMBER" columns.`
4. **Map the columns** on the lowercased header:
   - `size` = the first header containing "size" and not "serial".
   - `number` = the first header containing "number" and not "serial".
   - `serial` = the first header containing "serial".
   - `netColour` = a header containing "net" and "colour".
   - `remarks` = a header containing "remark".
   - The first header containing "last"+"test" is the **visual last** test; the second is the **hydro last** test. "next"+"test" works the same way for the next tests.
   - If size, number or serial is missing, the error is `Missing required columns. Found: SIZE={i}, NUMBER={i}, SERIAL NUMBER={i}`.
5. **Choose the location**:
   - Global admin: `tankFormData.locationId` (from the dialog's Location select), or else the first location's id.
   - Otherwise: `currentLocationId`, or else localStorage `dcms_current_location`.
   - If none is found, the error is "Please select a location in the import dialog before importing tanks." (global) or "Location ID is required. Please ensure you have a location assigned."
6. **Date parsing** (`parseDate`):
   - Strip quotes and turn newlines into spaces.
   - These values give `null`: empty, `missing` (in any case), `?` and `-`.
   - `D/M/YYYY` or `DD/MM/YYYY` (day and month parts of ≤2 chars, a 4-digit year) becomes `YYYY-MM-DD`.
   - A string containing `-` with length ≥10 is truncated to its first 10 chars (assumed ISO).
   - Month names only (`jan…dec`, plus `july`, `sept`) give `null`.
   - Anything else gives `null`.
7. **Parse each data row** after the header:
   - Split on commas, with a quote toggle.
   - Strip quotes and newlines, collapse whitespace, and pad the row to the header length.
   - If size, number or serial is empty, skip the row with the reason `Missing required fields - Size: "…", Number: "…", Serial: "…"`.
   - Otherwise create the equipment row `{name:'Tank {number} - {size}L', category:'diving', type:'diving', size, serialNumber, locationId, isAvailable:true, condition:'good'}` **sequentially (awaited)**, then save the metadata `{number, netColour, lastVisualTest, nextVisualTest, lastHydrostaticTest, nextHydrostaticTest, remarks}`.
   - A missing id skips the row with "Failed to create equipment record - no ID returned". A thrown error skips it with `Create error: {msg}`.
8. **Result message**:
   - Some rows imported: `{n} tank(s) imported successfully`, plus `. {m} row(s) skipped.` if there are skips. Severity: success.
   - None imported, some skipped: `No tanks imported. {m} row(s) skipped. Check browser console (F12) for details.` Severity: warning.
   - Neither: `No data rows found to import.` Severity: error.
   - After any of these, it reloads the tanks and closes the dialog.
   - A fatal error shows `Error importing file: {msg ‖ 'Please check the format.'}`.

#### Returned API
`t, currentUser, isGlobalAdmin, canManageEquipment, equipment, locations, currentLocation, searchQuery, filterType/setFilterType, addDialogOpen/set…, bulkDialogOpen/set…, editingEquipment, snackbar/setSnackbar, activeTab/setActiveTab, tanks, tankDialogOpen/set…, tankBulkDialogOpen/set…, editingTank, tankFilter/set…, tankSizeFilter/set…, tankOrderBy, tankOrder, formData/setFormData, tankFormData/setTankFormData, isBikeRental, isSurfRental, isKiteSurfRental, handleSearch, handleAddEquipment, handleEditEquipment, handleToggleAvailability, handleSaveEquipment, handleDeleteEquipment, getRevisionStatus, getTestStatus, handleAddTank, handleEditTank, handleSaveTank, handleBulkImportTanks, handleDeleteTank, getTankMetadata, filteredTanks, handleTankSort, sortedTanks, overdueTanks, dueSoonTanks, handleBulkImport, allEquipmentList, filteredEquipment, getConditionColor, availableCount, totalCount, overdueCount, dueSoonCount`.

#### Quirks/bugs
- **Auth bug (major).** `useAuth()` from `utils/authContext.jsx` returns `{currentUser, isAdmin, …}` and has **no `user` key**, so `currentUser` in this hook is always `undefined`. As a result, `isGlobalAdmin` is always `true` and `canManageEquipment` is always `true`. In practice every user can create, edit and delete equipment, sees all locations' equipment, sees admin-only fields, and sees the bulk import. The intended rules (global admin, boat_pilot, trainer) are the ones documented above.
- The tank data (number, net colour, visual/hydro test dates, remarks) is stored **only in browser localStorage** (`dcms_tank_metadata`). It is not visible on other devices, and it is lost when storage is cleared. The DB row only has name, size, serial number and location.
- Tanks are saved with `category:'diving'`. They are recognised as tanks only because their generated name contains "Tank". If a tank is renamed without "tank" or "cylinder", it moves to the Equipment tab.
- In the Equipment form, category `bike_equipment` and type `bike_accessory` are preset for bike rental, but those values are not in the Select options.
- A code comment says the backend enum for category/type is `'diving', 'snorkeling', 'accessory'`. The form offers `safety`, `maintenance` and `own_equipment`, and the type values are free-form labels (`BCD`, …). Whether the backend accepts them is unclear from the code.
- The toggle and edit handlers send the whole item object in the update (all fields, including `id`).
- The equipment CSV import uses a hard-coded location id, does not parse quotes, and does not await the creates.
- `activeTab` is not reset if the location changes to a rental type while tab 1 is selected. The tab is disabled, but for surf and kite locations the TanksTab still renders (only bike is excluded).

---

### EquipmentTab component

- **File**: `components/Equipment/EquipmentTab.jsx`. It is presentational only; all props come from the hook.
- **Where used**: Equipment page, tab 0.

#### UI layout
1. **Header**:
   - `h4` title: "Global Equipment Inventory" if global admin, otherwise "Equipment".
   - If `canManageEquipment`: an "Bulk Import" outlined button (Upload icon; **global admin only**) that opens the bulk dialog, and an "Add Equipment" contained button (Add icon) that calls `handleAddEquipment`.
   - If the user cannot manage: an info Alert "You can view equipment and update availability status. Equipment management is restricted to owners and administrators."
2. **KPI cards** (3 columns of md=4, or 4 columns of md=3 when global admin):
   | Title | Value | Colour |
   |---|---|---|
   | "Total Equipment" | `totalCount` | primary |
   | "Available" | `availableCount` | success |
   | "In Use" | `totalCount - availableCount` | warning |
   | "Revision Due/Overdue" (global admin only) | `overdueCount + dueSoonCount` | error if `overdueCount > 0`, otherwise warning |
3. **Revision alerts** (global admin only):
   - error: "{n} equipment item(s) have overdue revisions"
   - warning: "{n} equipment item(s) need revision within 3 months"
4. **Filters**:
   - A full-width search box with placeholder "Search equipment..." and a search icon.
   - A Select "Filter by Type", `minWidth` 200. It always starts with "All Types" (`all`). The other options depend on the location type:
     | Location type | Options |
     |---|---|
     | surf | `surf_type` "Board Types", `surf_accessory` "Accessories" |
     | kite_surf | `kite_type` "Equipment Types", `kite_accessory` "Accessories" |
     | bike_rental | `bike_type` "Bike Types", `rental_equipment` "Rental Equipment" |
     | diving/other | `BCD`, `Regulator`, `Mask`, `Fins`, `Boots`, `Wetsuit`, `Semi-Dry`, `Dry Suit`, `Computer`, `Torch`, `Accessory` (label = value) |
5. **Empty state**: an icon (Surfing for surf and kite, DirectionsBike for bike, ScubaDiving otherwise). The text is `t('equipment.noResults')` when searching (a missing key, so it shows the literal "equipment.noResults"), otherwise "No equipment registered".
6. **Card grid** (xs 12, sm 6, md 4). Each card contains:
   - **Title**: `item.name` for pricing-generated surf and bike items. Otherwise `"{brand} {model}"` trimmed, falling back to `name`. (Kite items use the brand/model branch; they have none, so the name is shown.)
   - **Chips (top right)**:
     - "Available" (success, CheckCircle) or "In Use" (error, Cancel).
     - Global admin with a revision status: "Overdue" (error) or "Due Soon" (warning), with a Warning icon.
   - **Body**:
     - Surf/kite generated items: the description, or else "Board type" / "Equipment type" / "Accessory". If `price != null`, also `€{price}/day`.
     - Bike generated items: the description, or else `Type: {type}`. If there is a price, also `Price: €{price}`.
     - Inventory items: `Type: {type} ({size})`.
   - `Serial: {serialNumber}` when present.
   - **Global admin only**:
     - `Location: {location name ‖ 'Unknown'}`
     - `Purchase: {purchaseDate} (Warranty: {warranty})`
     - `Next Revision: {nextRevisionDate}`
     - For `type === 'Regulator'` with `firstStageBrand` set, a grey box with "1st: {brand} {model}", "2nd: …" and "Oct: …".
   - **Condition chip** (inventory items only): the label is `condition ‖ 'excellent'`, coloured by condition.
   - **Actions row**:
     - Generated rental items: an info Alert "Pricing configured in Settings > Prices" ("Bike type configured in Settings > Prices" for bike types).
     - Users who can manage: "Edit" (outlined) and "Delete" (outlined, error).
     - Everyone else: a Switch (success) labelled "Available" or "In Use" that calls `handleToggleAvailability`.

#### Add/Edit Equipment dialog (md, fullWidth)
- **Title**: "Edit Equipment" when editing, otherwise "Add New Equipment".
- **Buttons**: "Cancel", and a contained "{Update|Add} Equipment" (built as `t('common.update'|'common.add') + ' ' + t('nav.equipment')`) that calls `handleSaveEquipment`.

| Field (label) | Data key | Control | Options / default | Validation | Condition |
|---|---|---|---|---|---|
| "Equipment Name *" | `name` | text | `''` | required (checked on save) | always |
| "Category" | `category` | Select | `diving` "Diving", `snorkeling` "Snorkeling", `safety` "Safety", `maintenance` "Maintenance", `own_equipment` "Own Equipment". Default `diving` (or `bike_equipment` for bike rental) | required | always |
| "Type" | `type` | Select | `BCD`, `Regulator`, `Mask`, `Fins`, `Boots`, `Wetsuit`, `Semi-Dry`, `Dry Suit`, `Tank`, `Computer`, `Torch`, `Accessory`. Default `''` (or `bike_accessory` for bike rental) | required | always |
| "Size" | `size` | text, placeholder "e.g., M, L, XL, 12L" | `''` | – | always |
| "Serial Number" | `serialNumber` | text | `''` | – | always |
| "Brand" | `brand` | text, placeholder "e.g., Mares, Cressi, Aqualung" | `''` | – | always |
| "Model" | `model` | text, placeholder "e.g., Avant Quattro, Pro Light" | `''` | – | always |
| "Thickness (for wetsuits)" | `thickness` | text, placeholder "e.g., 3mm, 5mm, 7mm" | `''` | – | always |
| "Style (for wetsuits)" | `style` | text, placeholder "e.g., Shorty, Full, Semi-Dry" | `''` | – | always |
| "Hood (for wetsuits)" | `hood` | text, placeholder "e.g., Yes, No" | `''` | – | always |
| "Condition" | `condition` | Select | `excellent` "Excellent", `good` "Good", `fair` "Fair", `poor` "Poor". Default `excellent` | – | always |
| "Location *" | `locationId` | Select of `locations` (by name) | `''` for global admins, otherwise the current location | Non-global users must use their own location (they never see this field) | global admin only |
| "Purchase Date" | `purchaseDate` | date | `''` | – | global admin only |
| "Warranty" | `warranty` | text, placeholder "e.g., 2 years, 3 years" | `''` | – | global admin only |
| "Last Revision Date" | `lastRevisionDate` | date | `''` | – | global admin only |
| "Next Revision Date" | `nextRevisionDate` | date | `''` (drives the revision status) | – | global admin only |
| "1st Stage Brand" / "1st Stage Model" | `firstStageBrand` / `firstStageModel` | text | `''` | – | global admin **and** `type === 'Regulator'`, under the subtitle "Regulator Details" |
| "2nd Stage Brand" / "2nd Stage Model" | `secondStageBrand` / `secondStageModel` | text | `''` | – | same |
| "Octopus Brand" / "Octopus Model" | `octopusBrand` / `octopusModel` | text | `''` | – | same |
| "Notes" | `notes` | multiline, 3 rows, placeholder "Additional notes about this equipment..." | `''` | – | always |

`isAvailable` is not in the form. It defaults to `true` on create and is changed with the card switch.

#### Bulk Import Equipment dialog (sm)
- Title: "Bulk Import Equipment".
- Text: "Upload a CSV file with equipment data. The file should have the following columns:"
- Column list: `name,category,type,size,serialNumber,condition,notes`.
- Label "Example:" followed by:
  ```
  BCD Mares, diving, standard, M, BCD001, excellent, Good condition
  Regulator Aqualung, diving, premium, -, REG001, good, Recently serviced
  Mask Cressi, diving, standard, -, MASK001, excellent, New
  ```
- A file input (`accept=".csv"`) that calls `handleBulkImport`.
- Button: "Close".

---

### TanksTab component

- **File**: `components/Equipment/TanksTab.jsx`. It is presentational only.
- **Where used**: Equipment page, tab 1.

#### UI layout
1. **Header**: `h4` "Tanks / Cylinders Testing Tracker". If `canManageEquipment`, it shows "Bulk Import" (outlined, Upload icon), which opens the tank bulk dialog, and "Add Tank" (contained), which calls `handleAddTank`.
2. **Alerts**:
   - error: "{overdueTanks} tank(s) have overdue tests"
   - warning: "{dueSoonTanks} tank(s) need testing within 30 days"
3. **Filters**:
   - "Filter by Size": `all` "All Sizes", `6` "6 Liters", `7` "7 Liters", `10` "10 Liters", `12` "12 Liters", `15` "15 Liters".
   - "Filter by Test Status": `all` "All Tanks", `overdue` "Overdue Tests", `dueSoon` "Due Soon (30 days)", `ok` "All Tests OK".
4. **Empty state**: a tank icon and "No tanks found".
5. **Table**:
   - Header row on a `primary.main` background with white bold text. Every column except Actions is sortable (TableSortLabel calls `handleTankSort`). The default sort is `number` asc.
   - Row background: `#ffebee` if any test is overdue, `#fff3e0` if any is due soon, otherwise white.

| Column | Content |
|---|---|
| "Size (L)" | `size` or "-" |
| "#" | `number` or "-" |
| "Last Visual Test" | `dd/MM/yyyy` or "-" |
| "Next Visual Test" | date, plus a Chip "OVERDUE" (error) or "DUE SOON" (warning) |
| "Last Hydrostatic Test" | `dd/MM/yyyy` or "-" |
| "Next Hydrostatic Test" | date plus the same chips |
| "Serial Number" | `serialNumber‖serial_number‖'-'` |
| "Net Colour" | A Chip if set. Black → bg `#424242`; Blue → `#2196f3`; Yellow → `#ffeb3b`; White → `#f5f5f5`. Text is black on yellow/white, white otherwise. |
| "Remarks" | `remarks‖notes‖'-'` |
| "Actions" (managers only) | Edit IconButton (calls `handleEditTank`) and Delete IconButton (error colour, calls `handleDeleteTank`) |

#### Add/Edit Tank dialog (md)
- Title: "Edit Tank" or "Add Tank".
- Buttons: "Cancel" and "{Update|Add} Tank".

| Field | Key | Control | Options/default | Validation |
|---|---|---|---|---|
| "Size (Liters)" | `size` | Select | `6`, `7`, `10`, `12`, `15`. Default `''` | required |
| "Number" | `number` | text, placeholder "Sequential number" | `''` | required |
| "Serial Number" | `serialNumber` | text | `''` | required |
| "Net Colour" | `netColour` | Select | `Black`, `Blue`, `Yellow`, `White` | – |
| "Last Visual Test" | `lastVisualTest` | date | `''` | – |
| "Next Visual Test" | `nextVisualTest` | date | `''` | – |
| "Last Hydrostatic Test" | `lastHydrostaticTest` | date | `''` | – |
| "Next Hydrostatic Test" | `nextHydrostaticTest` | date | `''` | – |
| "Remarks" | `remarks` | multiline, 3 rows, placeholder "Location, painted dates, test status, etc." | `''` | – |

- There is **no location field** in the Add/Edit Tank dialog. For a global admin, `locationId` stays `''` on add. The save then falls back to `currentLocationId`, and fails with "Location ID is required. Please select a location." if that is empty too.
- **No automatic next-date computation.** Next visual and hydrostatic dates are entered by hand; no test interval is coded. The only rule is the 30-day "due soon" window.

#### Bulk Import Tanks dialog (sm)
- **Location**: when global admin and locations exist, a Select "Location *" bound to `tankFormData.locationId`.
- **Text**: "Upload a CSV file with tank data. The file should have the following columns:"
- **Columns**: `SIZE, NUMBER, SERIAL NUMBER, NET COLOUR, LAST TEST (VISUAL), NEXT TEST (VISUAL), LAST TEST (HYDROSTATIC), NEXT TEST (HYDROSTATIC), REMARKS`.
- **Example**:
  ```
  7, 1, 12431042, Black, 30/04/2020, 30/03/2026, 01/03/2028, 01/03/2028, basement
  10, 2, 2027/159, Blue, 31/01/2026, 01/04/2021, 01/02/2028, 01/04/2021, Painted feb 2024
  12, 3, D24374, Yellow, 01/05/2025, 01/05/2027, 30/05/2027, 01/05/2027, Las playitas 230923
  ```
- **Help text**: "**Required fields:** SIZE, NUMBER, SERIAL NUMBER / **Date formats:** DD/MM/YYYY or YYYY-MM-DD (leave empty or use "-" for missing dates) / **Note:** Dates can be left empty if not available".
- A file input (`.csv`) that calls `handleBulkImportTanks`.
- Button: "Close".

#### Quirks
- The documented example header is a single line. The parser, however, requires `NUMBER` to be a separate column not adjacent to a `SERIAL` column. The documented column order (SIZE, NUMBER, SERIAL NUMBER) passes because "SERIAL NUMBER" is one column. The parser also expects the visual test columns before the hydrostatic ones.

---

### tankService

- **File**: `services/tankService.js`. Pure localStorage; no API calls.
- **Storage**: localStorage key **`dcms_tank_metadata`** holds a JSON object `{ [equipmentId]: {number, netColour, lastVisualTest, nextVisualTest, lastHydrostaticTest, nextHydrostaticTest, remarks, updatedAt} }`.

| Export | Signature | Behaviour |
|---|---|---|
| `getAllTankMetadata()` | `() → object` | Parses the key. Returns `{}` on error or if missing. |
| `getTankMetadata(equipmentId)` | `→ object` | Returns the entry, or `{}`. |
| `saveTankMetadata(equipmentId, metadata)` | `→ saved entry` | Overwrites the entry with `{...metadata, updatedAt: ISO now}`. Throws on a storage error. |
| `deleteTankMetadata(equipmentId)` | `→ true` | Removes the entry. |
| `enrichTankWithMetadata(equipment)` | `→ merged` | `{...equipment, ...metadata}`, then for `number`, `netColour` and the 4 test dates it takes the metadata value, or else the equipment value. `remarks = metadata.remarks ‖ equipment.remarks ‖ equipment.notes`. |

The default export is an object with all 5 functions.

---

### Stays page (Current Customers)

- **File**: `pages/Stays.jsx`
- **Route/where used**: `/stays`, `<ProtectedRoute requiredPermission="stays">`. The nav label is "Current Customers".
- **Purpose**: Lists every customer with an open (unbilled) "stay". For each stay it shows the cumulative dive pricing breakdown, lets staff record additional costs (insurance, merchandise, beverages…), and hands off to the bill generator.

#### What a "stay" is
Stays are computed by `stayService.getActiveStays(30)`:
- Take all bookings dated on or after **today − 30 days**, and group them by customer.
- Stay start = that customer's **earliest** booking date within the window.
- Stay key = `"{customerId}|{stayStartDate}"`.
- A stay is hidden if its key is in localStorage `dcms_billed_stays`, which the bill page writes. It is also hidden if **any** of its bookings has `billId`/`bill_id`.
- Bookings in the stay are the customer's bookings dated from `stayStart` to `stayStart + 30 days` inclusive. Bookings earlier than the start, or more than 30 days after it, are excluded.

#### Data loaded
- On mount:
  - `stayService.getActiveStays(30)`
  - `dataService.getAll('partners')` (used for partner names)
  - `dataService.getAll('settings')` (only the first row is used, for the beverage price)
- When `activeStays` changes: costs for each stay come from `stayCostsService.getStayCosts(customerId, stayStartDate)` (localStorage), keyed `customerId|stayStartDate`.
- There is no polling. A **Refresh** button reloads the stays.

#### UI layout
1. **Loading state**: "Loading stays...".
2. **Header**: `h4` "Current Customers". Buttons: "Refresh" (outlined, Refresh icon; calls `loadActiveStays`) and "New Booking" (contained; navigates to `/bookings/new`).
3. **Empty state**: a receipt icon, "No active stays found", "Customers with bookings in the last 30 days will appear here", and a "Create First Booking" button that navigates to `/bookings/new`.
4. **One Accordion per stay** (key = customer id, `defaultExpanded`).
   - **Summary, left**: customer name (`h6`), email, and "Stay started: {DD/MM/YYYY}" (`en-GB`).
   - **Summary, right**: a volume Chip, `€{totalPrice}` (`h6` primary), and "{totalDives} dives @ €{pricePerDive} each".

     Volume chip rules (by `totalDives`):
     | totalDives | Label | Colour |
     |---|---|---|
     | ≥ 9 | "High Volume" | success |
     | ≥ 6 | "Medium Volume" | info |
     | ≥ 3 | "Low Volume" | warning |
     | < 3 | "New Stay" | default |

   - **Details: "Stay Breakdown"** table (small, outlined):
     | Column | Content |
     |---|---|
     | "Date" | `DD/MM/YYYY`. For partner bookings it adds a Business icon and the caption "Paid by Partner: {partner name ‖ 'Partner'}". The partner name comes from `name ‖ companyName ‖ company_name ‖ 'Partner'`. |
     | "Sessions" | "Morning (9AM)" and/or "Afternoon (12PM)", joined by ", ". If none: "No sessions". If `sessions` is null: "N/A". Night is not listed. |
     | "Dives" | `dives` |
     | "Price per Dive" (right) | `€pricePerDive` |
     | "Total" (right) | Non-partner bookings: `€totalForBooking`. Partner bookings: `€baseActivityPrice (Partner)`, and if `extrasPrice > 0`, a line "+€{extrasPrice} (Customer)". |
   - **Info Alert**: "**Cumulative Pricing:** All dives in this stay are priced at €{pricePerDive} per dive based on the total volume of {totalDives} dives. This ensures customers get the best possible rate for their entire stay."
   - **"Additional Costs"** Paper, with a button "Add Cost" (outlined, small).
     - Empty: "No additional costs recorded yet" (italic).
     - Table columns: "Date" (DD/MM/YYYY), "Category" (Chip), "Description", "Quantity", "Unit Price", "Total", "Actions" (Edit icon and Delete icon; delete has **no confirm**).
     - Footer: "Total Additional Costs: €{Σ total}".
     - Category labels: `insurance` "Insurance", `equipment` "Equipment", `clothes` "Clothes", `goodies` "Goodies", `beverages` "Beverages", `drinks` "Drinks", `other` "Other". Unknown categories show the raw key.
   - **Footer buttons**:
     - "Add Booking" navigates to `/bookings/new?customerId={id}`.
     - "View Customer" navigates to `/customers?id={id}`.
     - "End Stay & Generate Bill" (contained, success, ReceiptLong icon) navigates to `/bill` with router state `{ stay }` (the whole stay summary object).

#### Add/Edit Cost dialog (sm)
- **Title**: "Edit Cost" or "Add Additional Cost".
- **Buttons**: "Cancel", and "{Update|Add} Cost". The save button is **disabled** when `!unitPrice`, or when the category is not `beverages` and the description is empty.

| Field | Key | Control | Options/default | Validation / behaviour |
|---|---|---|---|---|
| "Date" | `date` | date | today (`toISOString().split('T')[0]`) | – |
| "Category" | `category` | Select | `insurance` "Insurance" (default), `equipment` "Equipment", `clothes` "Clothes", `goodies` "Goodies", `beverages` "Beverages", `other` "Other" | A change resets the description to `''`. For beverages, unitPrice = `settings.prices.beverages.price` (toFixed 2) if > 0, otherwise `''`. For other categories, unitPrice resets to `''`. |
| "Description" | `description` | text | `''`. Placeholder: "e.g., Water, Soda, Beer, Wine (optional)" for beverages, otherwise "e.g., Dive Insurance, T-shirt, Equipment purchase" | required unless the category is beverages |
| "Quantity" | `quantity` | number, min 1 | 1 | `parseInt ‖ 1` |
| "Unit Price (€)" | `unitPrice` | number, min 0, step 0.01 | `''` | Required. **Disabled for beverages** (it uses the settings price). Helper text for beverages: "Price from settings: €{price}" or "Beverage price not set in settings". An effect also re-applies the beverage price while the dialog is open. |
| "Total (€)" | – | number, read-only | `unitPrice × quantity` | helper "Calculated automatically" |
| "Notes (Optional)" | `notes` | multiline, 2 rows | `''` | – |

- **Save** (`handleSaveCost`):
  - Splits the stay key and builds `{date, category, description, quantity: parseInt‖1, unitPrice: parseFloat(unitPrice) ‖ parseFloat(amount) ‖ 0, notes}`.
  - When editing, it calls `stayCostsService.updateStayCost(id, data)`. Otherwise it calls `addStayCost(customerId, stayStartDate, data)`.
  - It then re-reads the costs and closes the dialog. Errors are only logged to the console.
- **Edit** pre-fills `amount = cost.total`, `unitPrice = cost.unitPrice`, and the other fields as stored.
- **Delete** calls `stayCostsService.deleteStayCost(id)` immediately (no confirm) and re-reads the costs.

#### Quirks
- Stay extra costs live **only in localStorage** (`dcms_stay_costs`). The billed-stay flags do too (`dcms_billed_stays`).
- If `settings.prices.beverages.price` is a string, the helper text's `.toFixed` throws.
- Accordions are keyed by customer id, which is fine because there is 1 stay per customer.
- The stay total shown excludes the additional costs.

---

### stayService

- **File**: `services/stayService.js`
- **Depends on**: `dataService` (`getAll('bookings'|'locations'|'settings')`, `getById('customers')`, `update('bookings')`) and `pricingService.calculateActivityPrice`. (`calculateDivePrice` and `getCustomerType` are imported but unused.)
- **Used by**:
  - `pages/Stays.jsx` (`getActiveStays`)
  - `components/Booking/BookingForm.jsx` (`getCumulativeStayPricing(customerId, bookingDate)`)
  - `components/Bill/BillGenerator.jsx`, `components/Bill/BillDocument.jsx` (`getCustomerStayBookings`)
  - `hooks/useBillData.js`
  - `bookingRepricingService` (`getCustomerStaySummary`)

**Dive counting** is applied per booking:
- With `diveSessions`: `morning + afternoon + night`, each worth 1.
- Otherwise: `numberOfDives ‖ number_of_dives ‖ 0`.

**Activity normalisation**: `try_dive` and `discovery` become `discover`.

#### Exports
| Function | Signature | Output / behaviour |
|---|---|---|
| `getCustomerStayBookings` | `async (customerId, stayStartDate = null)` | Returns the customer's bookings (matched on `customerId‖customer_id`). If a start date is given, only bookings with date in `[start, start+30d]` are kept. Sorted by date ascending. Returns `[]` if `getAll` does not return an array. |
| `getCustomerStayDiveCount` | `async (customerId, stayStartDate)` | Σ dives over bookings whose normalised activity is **`'diving'` only**. Discover, snorkeling and orientation are not counted toward the volume. |
| `getCumulativeStayPricing` | `async (customerId, stayStartDate)` | Returns `{totalDives, pricePerDive, totalPrice, breakdown[], stayBookings[]}`. The algorithm is below. |
| `recalculateCustomerStayPricing` | `async (customerId, stayStartDate)` | For every stay booking: `newPrice = dives × pricePerDive`, then `dataService.update('bookings', id, {price: newPrice, totalPrice: newPrice + (booking.discount ‖ 0)})`. Returns the cumulative pricing. **Not called anywhere.** |
| `getCustomerStaySummary` | `async (customerId, stayStartDate = null)` | `{customer: {id, name: "first last" trimmed ‖ email, email, divingInsurance: divingInsurance‖diving_insurance‖null} ‖ null, stayStartDate: arg ‖ first booking date ‖ null, totalDives, pricePerDive, totalPrice, breakdown, bookingCount}` |
| `getActiveStays` | `async (days = 30)` | See "What a stay is" under the Stays page. Returns the stay summaries, excluding null results and summaries with a null customer. |

#### `getCumulativeStayPricing` — step by step
1. `stayBookings` = `getCustomerStayBookings(...)`. `totalDives` = the diving-only dive count.
2. `customerType` = `customer.customerType` (via `getById('customers')`). The default is `'tourist'`.
3. **Location** = the location of the **first** stay booking (`locationId‖location_id`), looked up in `getAll('locations')`. Its pricing is `location.pricing.customerTypes[customerType]`:
   - `pricing === 'tiered'` with a `diveTiers` array: the tiers are `[{dives, price}]`.
   - `pricing === 'fixed'`: `pricePerDive` is used.
4. **pricePerDive**:
   - If no location config was found, the fallback applies:
     | customerType | €/dive |
     |---|---|
     | `recurrent` | 32.00 |
     | `local` | 35.00 |
     | tourist (anything else) | tiered by `totalDives`: ≥13 → **38**; ≥9 → **40**; ≥6 → **42**; ≥3 → **44**; otherwise **46** |
   - Tiered config: find the first tier `i` where `totalDives >= tiers[i].dives` and (it is the last tier, or `totalDives < tiers[i+1].dives`). The tiers are **not sorted**. If no tier matches, the **last** tier is used.
   - Fixed config: `pricePerDive` from the config.
5. **Playitas special rules**. These apply when the location name, lowercased, contains `"playitas"`.
   - `caletaDivesCount` = Σ dives of bookings with `routeType === 'caleta_from_playitas'`. This counts sessions and `numberOfDives`, for all activity types.
   - `playitasCaletaTierPrice` = the **tourist** `diveTiers` price for `caletaDivesCount`. It uses the same tier search, and falls back to the last tier.
6. **Settings** = the first row of `getAll('settings')` (or `{}`). `locationPricingFull = location.pricing ‖ {}`.
7. **Per-booking breakdown**:
   - **Non-diving activities** (`discover`, `snorkeling`, `orientation`):
     - `basePrice = calculateActivityPrice(activity, dives, stayLocationId)`
     - `perDive = basePrice / dives` (0 if there are no dives)
   - **Diving** (everything else):
     - `perDive = pricePerDive`.
     - At Playitas, by `routeType`:
       | routeType | perDive | Extra |
       |---|---|---|
       | `playitas_local` | **35** | – |
       | `dive_trip` | **45** | – |
       | `caleta_from_playitas` | the Caleta tier price (if set) | **+15 €** transfer (once per booking, when dives > 0) |
     - `basePrice = dives × perDive`.
   - **Night dive surcharge** (only when the activity is diving and `diveSessions.night` is set): `location.pricing.addons.night_dive ?? settings.prices.addons.night_dive ?? 20`. It is charged once per booking.
   - **Personal instructor** (`booking.addons.personalInstructor`): `location.pricing.addons.personal_instructor ?? settings.prices.addons.personal_instructor ?? 100`.
   - `equipmentRental = booking.equipmentRental ‖ 0` and `diveInsurance = booking.diveInsurance ‖ 0` are taken **as stored on the booking**.
   - `totalForBooking = basePrice + nightDiveSurcharge + addonPrice + extra + equipmentRental + diveInsurance`.
   - `isPartnerBooking = !!(partnerId ‖ partner_id ‖ source === 'partner')`.
   - Entry: `{bookingId, bookingDate, dives, pricePerDive: perDive, totalForBooking, activityType (normalised), isPartnerBooking, partnerId, baseActivityPrice: base + night + addon + extra, extrasPrice: equipmentRental + diveInsurance, sessions: {morning, afternoon, night} ‖ null}`.
8. `totalPrice` = Σ `totalForBooking`. If that sum is 0, it falls back to `totalDives × pricePerDive`.

**Price override precedence note**: the pricing only reads `location.pricing` as returned by the API. It does not use the `settings.pricing` fallback that the Equipment hook uses.

#### Quirks
- The tier search does not sort the tiers.
- Below the first tier's threshold (for example `totalDives = 0`, or the first tier starting at 3), the **last (cheapest)** tier is selected. `pricingService` would select the first tier instead.
- The location is taken from the first booking only, so multi-location stays are priced with that location.
- `recalculateCustomerStayPricing` *adds* the discount to `totalPrice` and ignores the activity type and add-ons. It is unused.
- `calculateActivityPrice` reads the location pricing from localStorage `dcms_locations`, not from the API list (see pricingService).

---

### stayCostsService

- **File**: `services/stayCostsService.js`. It uses localStorage key **`dcms_stay_costs`** (a JSON array). `dataService` is imported but unused.
- **Used by**: `pages/Stays.jsx`, `components/Bill/BillGenerator.jsx`, `hooks/useBillData.js`.

| Export | Signature | Behaviour |
|---|---|---|
| `getStayCosts` | `(customerId, stayStartDate) → cost[]` | Filters where both values match exactly. Returns `[]` on error. |
| `addStayCost` | `(customerId, stayStartDate, costData) → cost` | Builds `{id: 'cost-{Date.now()}-{9 random base36 chars}', customerId, stayStartDate, date: costData.date ‖ today, category, description, amount: parseFloat(amount)‖0, quantity: parseInt‖1, unitPrice: parseFloat(unitPrice) ‖ parseFloat(amount) ‖ 0, total: unitPrice × quantity, notes ‖ '', createdAt: ISO}` and pushes it. |
| `updateStayCost` | `(costId, updates) → cost` | Merges the updates and recomputes `total = (updates.unitPrice ?? old) × (updates.quantity ?? old)`. Throws `'Cost not found'` if the id is not found. |
| `deleteStayCost` | `(costId) → true` | Removes the cost. |
| `getStayCostsTotal` | `(customerId, stayStartDate) → number` | Σ `total`. |
| `getStayCostsByCategory` | `(customerId, stayStartDate) → {category: cost[]}` | Groups the costs, with `other` as the default category. |

---

### bookingRepricingService

- **File**: `services/bookingRepricingService.js`
- **Used by**: `pages/Bookings.jsx`, `handleRecalculatePrices`. That handler first asks `confirm('Recalculate all booking prices using the latest customer types and price table?')`. Its messages are "Recalculated {n} booking(s)", "No bookings required price updates", and "Failed to recalculate prices. Please try again."
- **Export**: `recalculateAllBookingPrices() → Promise<{updated, total}>`.
  1. `bookings = getAll('bookings')`, `customers = getAll('customers')`. If there are no bookings, it returns `{updated: 0, total: 0}`.
  2. For each customer, it calls `getCustomerStaySummary(customer.id)` **with no stay start date**, so **all** of that customer's bookings ever are treated as one stay.
  3. For each breakdown entry: `newTotal = round2(totalForBooking)` and `prev = round2(totalPrice ‖ price ‖ 0)`. If `newTotal >= 0` and `|newTotal - prev| >= 0.01`, it counts as updated and sets `price = totalPrice = newTotal`.
  4. If `updated > 0`:
     - It calls `dataService.update('bookings', id, {price, totalPrice})` for **every** booking, not only the changed ones.
     - It writes all bookings to localStorage `dcms_bookings`.
     - It dispatches `window` event `dcms_bookings_synced` (detail = the bookings).
     - It calls `window.syncService.syncAll?.()`.
  5. It returns `{updated, total: bookings.length}`.
- `round2(v) = Math.round((v + Number.EPSILON) × 100) / 100`.

#### Quirks
- The caller in `Bookings.jsx` does **not await** the promise, so `result.updated` is `undefined` and the snackbar always shows "No bookings required price updates".
- All of a customer's history is priced as one stay, so volume tiers span years.
- It uses `import * as dataService` (the named exports), which works because `dataService.js` exports named `getAll`/`update`.

---

### pricingService

- **File**: `services/pricingService.js`. It is "the pricing logic used on the public website" and is pure calculation.
- **Config source**: all location pricing is read from **localStorage `dcms_locations`**, not the API. The equipment price is read from localStorage `dcms_settings`. In the codebase, only the mock-data initialiser (`data/mockData.js`) and `services/sharedStorage.js` write `dcms_locations`. In API mode the config may therefore be absent, and every call then uses the hard-coded fallbacks (unclear from the code whether something else populates it).
- **Used by**: `stayService`, `components/Booking/BookingForm.jsx`, `hooks/useBillData.js` (`calculateActivityPrice`, `calculateDivePrice`, `getCustomerType`). `getPackPrice` and `calculateDivePriceWithPacks` are only used internally and in tests.

#### Exports
| Function | Signature | Rules |
|---|---|---|
| `getLocationPricing` | `(locationId) → object` | `location.pricing` from `dcms_locations`. Returns `{}` if the location is not found, has no pricing, or the JSON is invalid. |
| `getPackPrice` | `(locationId, numberOfDives, withEquipment) → number \| null` | Returns the first `pricing.divePacks[]` entry where `p.dives === numberOfDives` and `!!p.withEquipment === !!withEquipment`, as `pack.price`. Otherwise `null`. |
| `calculateDivePriceWithPacks` | `(locationId, customerType, numberOfDives, withEquipment = false) → number` | 1) Use the pack price if one matches. 2) Otherwise `calculateDivePrice(...)`, plus, if `withEquipment`, `(dcms_settings.prices.equipment.complete_equipment ?? 13) × numberOfDives`. |
| `calculateDivePrice` | `(locationId, customerType, numberOfDives) → number` (a **total**, not per dive) | See the pricing steps below. |
| `calculateActivityPrice` | `(activityType, numberOfDives = 1, locationId) → number` | `snorkeling`: **38 × n** (flat, config ignored). `discover`: `(pricing.customerTypes.tourist.discoverDive ‖ 100) × n`. `orientation`: `(pricing.customerTypes.tourist.orientationDive ‖ 32) × n`. Anything else: `0`. |
| `getCustomerType` | `(customer) → string` | `customer?.customerType ‖ 'tourist'`. |

#### `calculateDivePrice` — step by step
1. If `numberOfDives` is falsy or ≤ 0, return **0**.
2. `ct = getLocationPricing(locationId).customerTypes ‖ {}`.
3. **recurrent**: `ct.recurrent.pricePerDive × n` if that price is set (truthy), otherwise **32 × n**.
4. **local**: `ct.local.pricePerDive × n` if set, otherwise **35 × n**.
5. **Tourist, and any unrecognised type**:
   - If `ct.tourist.diveTiers` is non-empty: sort a copy by `dives` ascending and start with the first tier. Walk the tiers and pick the last one with `n >= tier.dives` (stop at the first tier not met). Return `tier.price × n`. **Below the lowest threshold, the lowest tier is used.**
   - Otherwise use the hard-coded "Deep Blue Diving 2025 pricelist" fallback:

| Dives in booking (n) | € per dive |
|---|---|
| 1–2 | 46 |
| 3–5 | 44 |
| 6–8 | 42 |
| 9–12 | 40 |
| 13+ | 38 |

#### Consolidated price table (defaults and fallbacks across this area)
| Item | Value | Source |
|---|---|---|
| Tourist dive, 1–2 / 3–5 / 6–8 / 9–12 / 13+ dives | 46 / 44 / 42 / 40 / 38 € per dive (volume = dives in the booking in `pricingService`; diving dives in the whole stay in `stayService`) | fallback when no `customerTypes.tourist.diveTiers` |
| Local dive | 35 €/dive | fallback when there is no `customerTypes.local.pricePerDive` |
| Recurrent dive | 32 €/dive | fallback when there is no `customerTypes.recurrent.pricePerDive` |
| Discover (try dive) | 100 € × n | `customerTypes.tourist.discoverDive` |
| Orientation dive | 32 € × n | `customerTypes.tourist.orientationDive` |
| Snorkeling | 38 € × n | hard-coded |
| Complete equipment rental | 13 €/dive | `dcms_settings.prices.equipment.complete_equipment` (only in `calculateDivePriceWithPacks`) |
| Dive packs | `pricing.divePacks[{dives, withEquipment, price}]`, an exact-match override of the total | location config |
| Night dive surcharge | 20 € per booking with a night session | `location.pricing.addons.night_dive` → `settings.prices.addons.night_dive` → 20 |
| Personal instructor | 100 € per booking | `location.pricing.addons.personal_instructor` → `settings.prices.addons.personal_instructor` → 100 |
| Playitas: local route | 35 €/dive | `routeType 'playitas_local'` |
| Playitas: dive trip | 45 €/dive | `routeType 'dive_trip'` |
| Playitas: Caleta route | tourist tier price for the Caleta dive count, plus a 15 € transfer per booking | `routeType 'caleta_from_playitas'` |
| Beverages (stay cost) | `settings.prices.beverages.price` | settings row via the API |
| Equipment rental / dive insurance within a stay | taken as stored on the booking (`equipmentRental`, `diveInsurance`) | booking |
| Rental accessories (surf/kite) | `€{price}/day` from `pricing.surfEquipment` / `pricing.kiteEquipment` | location pricing (display only) |
| Bike rental equipment | `pricing.equipment[key]`, "Charged once per rental" | location pricing (display only) |

Taxes (e.g. `pricing.tax.igic_rate`) appear only in a test fixture. They are not used by these files.

#### pricingService.test.js — cases and expected values
Setup: `localStorage.clear()` before each case. Helpers write `dcms_locations` and `dcms_settings`.

| Group | Case | Expected |
|---|---|---|
| getLocationPricing | configured location `{tax:{igic_rate:0.07}}` | returns that object |
| | location not found | `{}` |
| | location without pricing | `{}` |
| | key missing, or `'not json'` | `{}` |
| getPackPrice | pack `{dives:5, withEquipment:true, price:200}`; query (5, true) | `200` |
| | same pack; query (5, false) | `null` |
| | no packs | `null` |
| calculateDivePrice | 0 or −3 dives | `0` |
| | recurrent configured at 25, 4 dives | `100` |
| | recurrent unconfigured, 3 dives | `96` (32×3) |
| | local configured at 30, 2 dives | `60` |
| | local unconfigured, 2 dives | `70` (35×2) |
| | tourist tiers [1→46, 3→44, 6→42]: 1 / 3 / 5 / 6 dives | `46` / `132` / `220` / `252` |
| | tiers out of order [6→42, 1→46, 3→44], 4 dives | `176` (4×44) |
| | fallback table: 2 / 5 / 8 / 12 / 13 dives | `92` / `220` / `336` / `480` / `494` |
| | unknown type equals tourist (2 dives) | equal to the tourist price |
| calculateDivePriceWithPacks | pack `{5, false, 180}` beats tiers | `180` |
| | no pack, settings `complete_equipment: 15`, 2 dives with equipment | base(92) + 30 = `122` |
| | no settings, 1 dive with equipment | base(46) + 13 = `59` |
| | withEquipment false, 3 dives | base (`132`) |
| calculateActivityPrice | snorkeling, 3 | `114` |
| | discover configured at 90 | `90` |
| | discover unconfigured, 2 | `200` |
| | orientation configured at 28 | `28` |
| | orientation unconfigured | `32` |
| | `'kayaking'` | `0` |
| | snorkeling, `undefined` dives | `38` |
| getCustomerType | `{customerType:'local'}` | `'local'` |
| | `{}` | `'tourist'` |
| | `null` / `undefined` | `'tourist'` |

#### Pricing model quirks
- `pricingService` tiers are based on dives **in the booking**. `stayService` tiers are based on **diving dives across the stay**, and its per-dive price overrides the booking's own tiers in the Stays view.
- Tier selection differs between the two services when the dive count is below the first threshold (first tier vs last tier) and when tiers are unsorted.
- A configured `pricePerDive` of `0` is falsy, so `pricingService` falls back to 32 or 35.
- The two services read different config sources: `pricingService` uses localStorage `dcms_locations`/`dcms_settings`, while `stayService` uses API `locations`/`settings`.

---

### Data shapes used in this area

**Booking (as read here)**:
- `id`
- `customerId‖customer_id`
- `locationId‖location_id`
- `bookingDate‖booking_date` (`'YYYY-MM-DD'`)
- `activityType‖activity_type`: `diving | discover | try_dive | discovery | snorkeling | orientation | …`; free text is shown on the Dashboard
- `status`: `pending | confirmed | completed | cancelled`
- `diveSessions {morning, afternoon, night: bool}` **or** `numberOfDives‖number_of_dives`
- `totalPrice‖total_price` (number)
- `price`, `discount`
- `paymentMethod`, `paymentStatus` (default display `'pending'`)
- `ownEquipment: bool`
- `rentedEquipment {[itemKey]: bool}`
- `equipmentRental: number`, `diveInsurance: number`
- `addons {personalInstructor: bool}`
- `routeType`: `playitas_local | dive_trip | caleta_from_playitas`
- `partnerId‖partner_id`, `source` (`'partner'`)
- `billId‖bill_id`
- `specialRequirements`, `notes`

**Customer**:
- `id`, `firstName‖first_name`, `lastName‖last_name`, `email`
- `customerType`: `tourist` (default) | `local` | `recurrent`
- `divingInsurance‖diving_insurance`
- `locationAccess` is on the *user*, not the customer.

**User (auth)**:
- `role`: `superadmin | admin | boat_pilot | guide | trainer | intern`
- `locationAccess`: `string[]` (empty or missing means global)

**Location**:
- `id`, `name`
- `type`: `diving | bike_rental | surf | kite_surf`
- `pricing` (or `settings.pricing`):
  - `customerTypes`:
    - `tourist {pricing:'tiered', diveTiers:[{dives:number, price:number}], discoverDive:number, orientationDive:number}`
    - `local {pricing:'fixed', pricePerDive}`
    - `recurrent {pricing:'fixed', pricePerDive}`
  - `divePacks: [{dives, withEquipment: bool, price}]`
  - `addons {night_dive, personal_instructor}`
  - `bikeTypes {key: {name, description}}`, `equipment {click_pedals|helmet|gps_computer: price}`
  - `surfTypes {key: {name, description}}`, `surfEquipment {wetsuit|shoes|surf_leash|auto_rack: price}`
  - `kiteTypes {key: {name, description}}`, `kiteEquipment {harness|kite_leash|helmet|impact_vest|wetsuit: price}`
  - `tax {igic_rate}` (appears in a test only)

**Settings (first row of `getAll('settings')`, or localStorage `dcms_settings`)**:
- `prices.beverages.price` (number)
- `prices.addons.night_dive`
- `prices.addons.personal_instructor`
- `prices.equipment.complete_equipment`

**Partner**: `id`, `name‖companyName‖company_name`.

**Equipment item (API resource `equipment`)**:
| Field | Type / values |
|---|---|
| `id` | string |
| `name` | string (required) |
| `category` | `diving \| snorkeling \| safety \| maintenance \| own_equipment` (UI); `bike_equipment` (bike preset); `tank` recognised on read. A code comment says the backend enum is `diving \| snorkeling \| accessory`. |
| `type` | `BCD \| Regulator \| Mask \| Fins \| Boots \| Wetsuit \| Semi-Dry \| Dry Suit \| Tank \| Computer \| Torch \| Accessory` (UI); `standard`/`premium` (CSV example); `bike_accessory`; `diving` (tanks) |
| `size` | string (tanks: `'6' \| '7' \| '10' \| '12' \| '15'` litres) |
| `serialNumber‖serial_number` | string |
| `condition` | `excellent` (default) \| `good` (tanks) \| `fair` \| `poor` |
| `locationId‖location_id` | string |
| `isAvailable` | bool (default true; "In Use" when false) |
| `notes`, `brand`, `model`, `thickness`, `style`, `hood`, `warranty` | string |
| `purchaseDate`, `lastRevisionDate`, `nextRevisionDate` | `'YYYY-MM-DD'` |
| `firstStageBrand/Model`, `secondStageBrand/Model`, `octopusBrand/Model` | string (Regulator) |

**Tank** = an equipment row `{name:'Tank {number} - {size}L', category:'diving', type:'diving', size, serialNumber, locationId, isAvailable:true, condition:'good'}` merged with its localStorage metadata `dcms_tank_metadata[id]`:
- `number` (string)
- `netColour`: `Black | Blue | Yellow | White`
- `lastVisualTest`, `nextVisualTest`, `lastHydrostaticTest`, `nextHydrostaticTest`: `'YYYY-MM-DD'` or null
- `remarks` (string)
- `updatedAt` (ISO)

Read aliases: `tankNumber`, `lastVisualTestDate`, `nextVisualTestDate`, `lastHydrostaticTestDate`, `nextHydrostaticTestDate`, `notes`.

**Rental pseudo-item (generated, not stored)**:
- `id` (`surf-type-*`, `surf-equipment-*`, `kite-type-*`, `kite-equipment-*`, `bike-type-*`, `rental-equipment-*`)
- `name`, `category = type` (`surf_type | surf_accessory | kite_type | kite_accessory | bike_type | rental_equipment`)
- `description`, `price?`, `locationId`, `isAvailable: true`
- `surfTypeKey | kiteTypeKey | bikeTypeKey | equipmentKey`, `isBikeType?`, `isRentalEquipment?`

**Stay summary (computed, not stored)**:
- `customer {id, name, email, divingInsurance}`
- `stayStartDate` (`'YYYY-MM-DD'`)
- `totalDives`, `pricePerDive`, `totalPrice`, `bookingCount`
- `breakdown[]`, where each entry is `{bookingId, bookingDate, dives, pricePerDive, totalForBooking, activityType, isPartnerBooking, partnerId, baseActivityPrice, extrasPrice, sessions {morning, afternoon, night} | null}`
- Stay key: `"{customerId}|{stayStartDate}"`
- Billed stays: localStorage `dcms_billed_stays` = `string[]` of stay keys.

**Stay cost (localStorage `dcms_stay_costs`, an array)**:
- `id` (`'cost-{ms}-{rand9}'`), `customerId`, `stayStartDate`
- `date` (`'YYYY-MM-DD'`)
- `category`: `insurance | equipment | clothes | goodies | beverages | other` (plus the label for legacy `drinks`)
- `description`, `amount`, `quantity` (int ≥ 1), `unitPrice`, `total` (= unitPrice × quantity)
- `notes`, `createdAt` (ISO)

**Chart rows**:
- `getRevenueData`: `{date:'MMM dd', fullDate, revenue, bookings}`
- `getBookingTrends`: `{date, fullDate, count, confirmed, pending, completed}`
- `getRevenueByActivity`: `{name, value}`
- `getTopCustomers`: `{id, name, revenue, bookings}`

**localStorage keys touched in this area**:
- `dcms_current_location`, `dcms_dashboard_scope` (`global`/`location`)
- `dcms_tank_metadata`, `dcms_stay_costs`, `dcms_billed_stays` (read)
- `dcms_locations`, `dcms_settings` (pricing, read)
- `dcms_bookings` (written by repricing)

**Window events**:
- Listened: `dcms_location_changed`, `storage`, `dcms_booking_created`.
- Dispatched: `dcms_bookings_synced`.

---

## Settings, users, partners and navigation

This section covers the admin shell (navigation bar and drawer, language switcher), authentication (admin login, mock user selector, route guards, password change), the Settings page and its ten sub-components, the admin Partners page, and the partner portal (login and dashboard).

**Shared dependencies** (these are outside this section's scope. They are named here so the calls below make sense):

- `services/dataService.js` provides `getAll(resource)`, `getById(resource,id)`, `create(resource,data)`, `update(resource,id,data)` and `remove(resource,id)`. It routes to `mockDataService` (localStorage) when `isMockMode()`, and to `apiService` (REST) otherwise. `config/apiConfig.js` hardcodes `API_CONFIG.mode: 'api'`, so the real app always uses the REST API. In API mode every call returns a Promise.
- `services/api/httpClient.js` handles raw REST calls and sends `Authorization: Bearer <token>` plus `X-Tenant-Slug` (from `getTenantSlug()`). The token it sends is `localStorage.partner_token || localStorage.auth_token`: **the partner token takes precedence**. `setAuthToken(token, type)` writes `partner_token` or `auth_token`. `setAuthToken(null)` removes **both**.
- `services/api/realApiAdapter.js` provides `transformResponse('users', user)`, which maps the backend user to `{id, username, name, email, role, permissions, locationAccess, tenantSlug, tenant_id, isActive, createdAt, updatedAt}`. The password hash is never included.
- `utils/authContext.jsx` provides `useAuth`, `USER_ROLES`, `AVAILABLE_PERMISSIONS` and `ALL_PERMISSIONS`. See "Roles and permissions" below.
- `utils/partnerAuthContext.jsx` provides `usePartnerAuth`.
- `utils/locationTypes.js` provides `getLocationTypes`, `hasDivingFeatures`, `getDisplayName`, `getTypeColor`, `isValidTypeId`, `FEATURE_KEYS` and `DEFAULT_FEATURES`.
- `utils/tenantContext.js` provides `getTenantSlug`.
- `utils/languageContext.jsx` provides `useTranslation` → `{t, language, setLanguage}`. The language is stored in localStorage `dcms_language` and defaults to `'en'`.

---

### Cross-cutting business rules

#### Roles (`USER_ROLES` in utils/authContext.jsx)

| Constant | Value | Chip/avatar colour | Label (UserSelector) |
|---|---|---|---|
| SUPERADMIN | `superadmin` | error (red) | Superadmin |
| ADMIN | `admin` | primary | Admin |
| BOAT_PILOT | `boat_pilot` | info | Boat Pilot |
| GUIDE | `guide` | secondary | Guide |
| TRAINER | `trainer` | success | Trainer |
| INTERN | `intern` | warning | Intern |

#### Permissions (`AVAILABLE_PERMISSIONS`, in this order = `ALL_PERMISSIONS`)

| Key | Label | Routes it gates (App.jsx) |
|---|---|---|
| `dashboard` | Dashboard | `/` |
| `bookings` | Bookings | `/bookings`, `/bookings/new`, `/bookings/:id` |
| `customers` | Customers | `/customers` |
| `stays` | Current Customers | `/stays`, `/bill`, `/bills` |
| `equipment` | Equipment | `/equipment` |
| `boatPrep` | Boat Preparation | `/boat-prep`, `/schedule`, `/schedule/trip/:date/:type/:boatId?/:session?` |
| `settings` | Settings | `/settings`, `/breaches`, `/partners`, `/partner-invoices`, `/financial` |

**Access rules (`canAccess(route)`)**

- No `currentUser`: false.
- `role === 'superadmin'`: always true.
- `route === 'settings'`: true only if the user has the `settings` permission **and** is "global". Global means `locationAccess` is missing or an empty array. A location-restricted user never gets Settings, even with the permission.
- Otherwise: `user.permissions.includes(route)`. If there is no permissions array, the result is false. The role alone grants nothing. Roles are used only for menu grouping, colours and the delete guards.

**Other role helpers**

- `isAdmin()`: role is `admin` or `superadmin`. This gates CRUD inside the Settings components.
- `isSuperAdmin()`: role is `superadmin`.
- `isGuide()`: role is `guide`.

#### Location access model

- `user.locationAccess` is an array of location ids. An empty array or a missing value means global access to all current and future locations.
- `hasLocationAccess(user, locId)`, `getAccessibleLocations(user)` (returns `['all']` for global) and `isMultiLocationUser(user)` are exported from authContext.
- The current location is stored in localStorage `dcms_current_location`.
- The dashboard scope is stored in localStorage `dcms_dashboard_scope`, with value `'global' | 'location'`.

#### Multi-tenant model

- **Tenant** = one company (a dive center or a rental company). The superadmin manages tenants.
- The tenant is resolved by `getTenantSlug()` in this order:
  1. Hostname. `admin.*` or `api.*` → `null` (platform level). `{slug}.(dcms|admin|api).…` → `slug`.
  2. `dcms_current_user.tenantSlug`. If the user has only `tenant_id`, it returns `null` and the backend uses the header/JWT.
  3. localStorage `dcms_tenant_slug`.
- Tenant URLs have the form `{protocol}//{slug}.{adminHost}`. `adminHost` defaults to `admin.couteret.fr`.
- A user may belong to several tenants ("memberships"). Login then asks "Which center?", and the user menu offers "Switch Center".

#### Location types (diving vs rental)

- Types are stored in `settings.locationTypes[]`. The list starts empty.
- A location's `type` is a slug (VARCHAR(50)).
- Features per type: `requiresBoats`, `requiresDiveSites`, `requiresCertifications`, `requiresMedicalClearance`.
- Fallback `DEFAULT_FEATURES` applies when a type is not configured:
  - `diving`: all four true.
  - `bike_rental`, `surf`, `kite_surf`, `wing_foil`, `windsurf`, `stand_up_paddle`, `future`: all four false.
- `hasDivingFeatures(loc, settings)` is the same as `requiresDiveSites`. When false, the app hides diving-only UI:
  - The menu paths `/schedule`, `/boat-prep` and `/stays`.
  - Diving price cards (Prices tab).
  - The location from the compliance-report table (Dive Sites tab).
  - The equipment icon changes from ScubaDiving to DirectionsBike.
- `RENTAL_TYPE_IDS` = `bike_rental, surf, kite_surf, wing_foil, windsurf, stand_up_paddle`.

#### localStorage keys used by this area

| Key | Content |
|---|---|
| `dcms_current_user` | JSON of the logged-in admin-side user (transformed, no password in API mode) |
| `auth_token` | Admin JWT |
| `dcms_tenant_slug` | Tenant slug; set on login if the user has `tenantSlug`, removed on logout |
| `dcms_current_location` | Selected location id |
| `dcms_dashboard_scope` | `'global'` or `'location'` |
| `dcms_language` | `es` / `ca` / `en` / `fr` / `de` |
| `partner_token` | Partner JWT |
| `partner_data` | JSON of the partner object |

#### Window events

- `dcms_location_changed` (CustomEvent, `detail: {locationId}`). It is dispatched by Navigation when the location changes.

---

### ProtectedRoute

- **File:** `components/Auth/ProtectedRoute.jsx`.
- **Where used:** `App.jsx` wraps the whole admin portal (`/*`) with `<ProtectedRoute>` (no permission). Each inner route is wrapped again with `<ProtectedRoute requiredPermission="…">` (see the permissions table above).
- **Purpose:** The single gate for authenticated admin pages. It shows login when needed and "Access Denied" when a permission is missing.

**Logic, in order**

1. `loading` (auth context still reading localStorage): full-height centred text "Loading...".
2. `hasValidAuth = isAuthenticated() && (isMockMode() || !!localStorage.auth_token)`. In API mode a stored user without a JWT is **not** a valid session.
3. Not valid and API mode: render `<AdminLogin />`.
4. Not valid and mock mode: heading "Please select a user to continue" with a "Select User" button. The button opens `<UserSelector>`.
5. `requiredPermission && !canAccess(requiredPermission)`: heading "Access Denied" (red) and "You don't have permission to access this page."
6. Otherwise: render the children.

**Test** (`ProtectedRoute.test.jsx`): asserts the loading state, AdminLogin in API mode, the user-selector prompt in mock mode, the login form when a user exists without a JWT, children rendered with a JWT, "Access Denied" when a permission is missing, and children rendered when the permission is present.

---

### AdminLogin

- **File:** `components/Auth/AdminLogin.jsx`.
- **Where used:** rendered by ProtectedRoute in API mode. It has no route of its own.
- **Purpose:** Username/password login against the backend. It supports multi-tenant accounts through a "Which center?" picker.

**Layout**

- Centred Paper (max width 400).
- Title "DCMS Admin Login".
- Subtitle "Enter your username and password".
- Dismissible error Alert.
- Fields (see table).
- Button "Login" ("Logging in..." while loading).
- A dev hint appears only when the API base URL contains `localhost` or `127.0.0.1`: "Default: superadmin / <redacted> or admin / <redacted>. Can't connect? In backend run: npm run reset-password".

| Field | Data key | Control | Validation |
|---|---|---|---|
| Username | `username` | text, autofocus, autocomplete=username | required; trimmed when sent |
| Password | `password` | password with a show/hide eye toggle | required |

The submit button is disabled while `loading || !username.trim() || !password`.

**Login flow**

1. `POST {API_CONFIG.baseURL}/users/login` with body `{username: trimmed, password}`. This uses raw `fetch`, not httpClient.
2. Non-OK response: error = `data.message || data.error || "Login failed (<status>)"`.
3. If the response has `data.requiresTenantSelection`, open the Dialog "Which center?":
   - Text: "Your account has access to more than one diving center. Choose which one to log into."
   - A list of `data.tenants[]`. Each item shows primary = `name || slug || tenantId` and secondary = `role`.
   - Clicking an item calls `POST /users/login/select-tenant` with `{username, password, tenantId}`.
   - On error the dialog closes and the error is shown.
4. On success (`{access_token, user}`; if either is missing → "Invalid login response"):
   - `realApiAdapter.transformResponse('users', user)`.
   - `httpClient.setAuthToken(access_token)` stores `auth_token`.
   - `useAuth().login(user)` stores `dcms_current_user` and, if present, `dcms_tenant_slug`.
   - `onSuccess?.()` is called.
5. Network failures (`'Failed to fetch'` or a `TypeError`) show: "Cannot reach the API at <base><path>. Check that the backend is running and that <hostname> can access it (DNS, VPN, CORS)."

**Test** (`AdminLogin.test.jsx`): asserts the button is disabled until both fields are filled, a single-tenant login stores the JWT and calls login/onSuccess, a multi-tenant response shows the "Which center?" popup with tenant names, picking a center calls `/users/login/select-tenant` with the credentials and tenantId, the server message is shown on 401, and a network-specific message is shown when fetch rejects.

---

### UserSelector

- **File:** `components/Auth/UserSelector.jsx`.
- **Where used:** ProtectedRoute, **mock mode only**.
- **Purpose:** A passwordless demo login: pick any user from the list.
- **Data loaded:** `dataService.getAll('users')`.

**UI**

- Dialog "Select User".
- Empty state: "No users found. Please create users in Settings."
- Each list item shows:
  - A coloured Avatar with a role icon: superadmin VerifiedUser, admin AdminPanelSettings, boat_pilot DirectionsBoat, guide PersonPin, trainer School, intern Work, default Person.
  - The user's name.
  - Chips:
    - Superadmin: "Superadmin (Full Access)".
    - Otherwise the first 2 permission labels (outlined), plus a "+N" chip.
    - No permissions: "No permissions".
  - Secondary text: `email || username`.
- Dividers separate the items.

**Action:** click → `login(user)` → close. No password is checked.

---

### ChangePasswordDialog

- **File:** `components/Auth/ChangePasswordDialog.jsx`.
- **Where used:** Navigation user menu → "Change Password".
- **Purpose:** Change the current user's password. The code comment says it is designed for mock mode: "Updates the user's password in localStorage".
- **Data:** When the dialog opens, `dataService.getById('users', currentUser.id)` is called **synchronously**. The result, or `currentUser` as a fallback, becomes `userRecord`. `requiresCurrentPassword = Boolean(userRecord.password)`.

**UI**

- Dialog "Change Password".
- Intro text:
  - With a current password: "Enter your current password and a new password."
  - Without one: "This account does not have a password yet. Set one now to secure access."

| Field | Control | Notes |
|---|---|---|
| Current Password | password | only shown if `requiresCurrentPassword` |
| New Password | password | helper "Minimum 6 characters" |
| Confirm New Password | password | |

**Validation, in order, with exact messages**

1. No `userRecord.id`: "Unable to identify the current user."
2. Current password ≠ stored `userRecord.password`: "Current password is incorrect." (a client-side plain-text comparison)
3. New password shorter than 6 characters: "New password must be at least 6 characters long."
4. New password equals the old one: "New password must be different from the current password."
5. Confirm password mismatch: "New passwords do not match."

"Save Password" is disabled while submitting, when the new password is shorter than 6 characters, when new ≠ confirm, or when the current password is required but empty. "Cancel" closes the dialog.

**Write:** `dataService.update('users', id, {password, passwordLastUpdated: ISO})` → `login(updatedUser)` → "Password updated successfully." → closes after 600 ms. On error: "Unable to update password. Please try again."

**Quirks**

- In API mode `getById` returns a Promise. `userRecord` is then that Promise, `.id` is undefined, and every submit fails with "Unable to identify the current user." **The dialog is effectively non-functional in the real (API) app.**
- The mock-mode design keeps plain-text passwords in localStorage and compares them client-side (a security concern).
- `login(updatedUser)` would store the returned user object, including `password`, in `dcms_current_user`.

---

### Navigation (AppBar + permanent Drawer)

- **File:** `components/Common/Navigation.jsx`.
- **Where used:** the layout of the authenticated admin portal (App.jsx).
- **Purpose:**
  - Top bar: title, location tabs, language, user menu.
  - Left drawer (width 240): role/permission-filtered menu.

**Data loaded**

- `dataService.getAll('locations')` whenever `currentUser` changes. The list is filtered to `currentUser.locationAccess` unless that is empty or missing.
  - The selected location is initialised from `dcms_current_location` if it is still accessible, otherwise the first accessible location. The result is written back to localStorage.
- `dataService.getAll('boats')` once. The result is used to compute `hasBoats`, i.e. whether the current location has any active boats.
  - Boats match on `locationId || location_id` and `isActive ?? is_active`.
  - `hasBoats` is computed but not used anywhere visible.
- `httpClient.get('/users/{currentUser.id}/tenant-memberships')`. This is skipped for the superadmin. It returns `[{tenantId, name, slug, role}]` and fills `tenantOptions`.
- `dataService.getAll('settings')[0].organisation.name` → `orgName`.

**Scope**

- `userHasGlobalAccess` = `locationAccess` is missing or empty.
- `scope = 'location'` in two cases:
  - The user is not global.
  - The user is global, there is at least one location, and `dcms_dashboard_scope === 'location'`.
- Otherwise `scope = 'global'`.

**Drawer menu: global scope (`globalMenu`)**

| Order | Label (en) | Route | Icon | Permission |
|---|---|---|---|---|
| 1 | Dashboard | `/` | Dashboard | dashboard |
| 2 | Settings | `/settings` | Settings | settings |
| 3 | Data Breaches | `/breaches` | Security | settings |
| 4 | Partners | `/partners` | Business | settings |
| 5 | Partner Invoices | `/partner-invoices` | Receipt | settings |
| 6 | Financial | `/financial` | AccountBalance | settings |

**Drawer menu: location scope (`locationMenu`)**

Items are grouped by role. The `roles` property is **declarative only**: filtering is by permission, and duplicates are removed by path, keeping the first occurrence. The effective order is therefore the order of first appearance:

| Group (roles tag) | Items in order (label → route, icon, permission) |
|---|---|
| Admin team (`admin`) | Dashboard → `/` (Dashboard, dashboard); Bookings → `/bookings` (Event, bookings); New Booking → `/bookings/new` (Add, bookings); Current Customers → `/stays` (Receipt, stays); Financial → `/financial` (AccountBalance, settings); Customers → `/customers` (People, customers) |
| Owners/Trainers (`boat_pilot`, `trainer`) | Dashboard; Equipment → `/equipment` (ScubaDiving or DirectionsBike, equipment); Schedule → `/schedule` (CalendarMonth, boatPrep); Dive → `/boat-prep` (DirectionsBoat, boatPrep); Bookings; Customers |
| Guides (`guide`) | Dashboard; Schedule; Dive; Equipment; Customers; Bookings |
| Interns (`intern`) | Dashboard; Schedule; Dive; Equipment; Customers; Bookings |

Resulting effective location menu, for any user holding the permissions:

1. Dashboard
2. Bookings
3. New Booking
4. Current Customers
5. Financial
6. Customers
7. Equipment
8. Schedule
9. Dive

**Filtering**

- No `currentUser` → empty menu.
- If a current location exists and `!hasDivingFeatures(location)`, the paths `/schedule`, `/boat-prep` and `/stays` are removed.
- Each item requires `canAccess(item.permission)`. Financial is effectively visible only to global users with `settings`.
- De-duplication is by path.
- Superadmin: if `/settings` is not already in the list, the item "Tenant Management" (Domain icon, `/settings`) is appended. Normally Settings is already present because the superadmin passes every permission, so it shows as "Settings".
- The equipment icon, and the logo above the menu, are the ScubaDiving icon when there is no current location or it has diving features, and the DirectionsBike icon otherwise.

**Selected highlighting**

- An item is selected when the pathname equals its path.
- The Bookings item is also highlighted for `/bookings/new` and any `/bookings/<id>`.

**AppBar contents, left to right**

1. Title "DCMS - {X}". X = "Platform Admin" if the user is a superadmin and `getTenantSlug()` is null; otherwise `orgName || 'Dive Center'`.
2. **Location tabs.** Shown when there is a current user and either there is at least one location or the user is a global superadmin.
   - A "Global" tab (value `__global__`) appears only for global users.
   - One tab per accessible location, labelled with the location name.
   - The value shown is the selected location id if `dcms_dashboard_scope === 'location'`, otherwise `__global__`.
   - Selecting Global: `dcms_dashboard_scope='global'`, then navigate `/`.
   - Selecting a location: set state, `dcms_current_location=<id>`, `dcms_dashboard_scope='location'`, navigate `/`, and dispatch `dcms_location_changed`.
3. `<LanguageSwitcher/>`.
4. User Chip: the user's name with a Person icon, coloured by role (colour table above). Clicking it opens the menu:
   - A disabled item "{name} ({role})".
   - Superadmin only: "Tenant Management" (Domain icon) → `/settings`.
   - If `tenantOptions.length > 1`: "Switch Center" (SwapHoriz icon) → opens the Switch Center dialog.
   - "Change Password" (LockReset icon) → ChangePasswordDialog.
   - "Logout" (Logout icon) → `logout()` removes `dcms_current_user`, `dcms_tenant_slug` and `auth_token`, then `window.location.href='/'`.

**Drawer footer:** Divider, then the caption "DCMS v1.6.6".

**Switch Center dialog**

- Title "Switch Center". Text "Choose which center to switch into."
- A list of memberships: primary = `name || slug || tenantId`, secondary = `role`.
- The current tenant (`currentUser.tenant_id`) is disabled.
- Clicking an entry:
  1. `POST /users/switch-tenant {tenantId}` → `{access_token, user}` (missing → "Invalid response while switching center").
  2. Transform the user, `setAuthToken`, `login`.
  3. Full reload with `window.location.href='/'`, so tenant-scoped caches are cleared.
- Errors are shown in an Alert. Fallback message: "Failed to switch center".
- The dialog cannot be closed while switching.

---

### LanguageSwitcher

- **File:** `components/Common/LanguageSwitcher.jsx`.
- **Where used:** the Navigation AppBar.
- **Control:** a small Select (min width 120, white text).

| Option value | Label |
|---|---|
| `es` | Español |
| `ca` | Català |
| `en` | English |
| `fr` | Français |
| `de` | Deutsch |

- On change: `setLanguage(code)` → persisted to localStorage `dcms_language`. The default is `en`.

---

### Settings page

- **File:** `pages/Settings.jsx`.
- **Route:** `/settings`, `requiredPermission="settings"` (global users only; see `canAccess`).
- **Purpose:** A thin tab router. Each tab is a self-contained component that loads and saves its own data.

**Superadmin view** (`isSuperAdmin()`)

- There are no tabs.
- Header with a Domain icon: "Tenant Management".
- Subtitle: "Create and configure tenants. Define company name, number of locations, location type (diving/bike rental). Operational settings (prices, boats, partners, users) are managed by each tenant's admin."
- Then `<TenantManagement/>`.

**Tenant admin view** (everyone else who reaches the page)

- Header with a Settings icon: "Settings" / "Configure system settings and preferences".
- Scrollable tabs, in this order (default = 0):

| # | Label | Icon | Component |
|---|---|---|---|
| 0 | Organisation | Domain | OrganisationSettings |
| 1 | Locations | LocationOn | LocationsManagement |
| 2 | Location Types | Category | LocationTypesManagement |
| 3 | Prices | AttachMoney | Prices |
| 4 | Dive Sites | LocationOn | DiveSitesManagement |
| 5 | Boats | DirectionsBoat | BoatsManagement |
| 6 | User Management | People | UserManagement |
| 7 | Partners | Business | PartnersManagement |
| 8 | Certification Verification | VerifiedUser | CertificationVerification |

- All tabs are shown regardless of location type. For example, Dive Sites and Boats also show for a bike-only tenant.
- Footer on both views: "DCMS v1.6.6 - Dive Center Management System".
- Each component re-reads the single `settings` row, `dataService.getAll('settings')[0]`, on mount. It then saves the **whole** row back with `update('settings', id, fullObject)`, or `create` if no row exists.

**Test** (`Settings.smoke.test.jsx`): asserts the Organisation tab renders by default, that clicking through all 8 other tenant-admin tabs mounts without crashing (the Certification tab shows the default PADI URL `https://www.padi.com/verify`), and that a superadmin sees the "Tenant Management" h4 and no tablist.

---

### OrganisationSettings (Settings tab 0)

- **File:** `components/Settings/OrganisationSettings.jsx`.
- **Purpose:** The business name and contact details used on bills, reports and the app header. Navigation and PartnerLogin read `organisation.name`.
- **Data:** `getAll('settings')[0]` is merged into state `{organisation: {}}`.
- **UI:** Paper with the heading "Organisation" and the text "Business name and contact details used on bills, reports, and the app header."

| Field | Data key | Control | Placeholder |
|---|---|---|---|
| Display name | `settings.organisation.name` | text | e.g. Deep Blue Diving |
| Legal name (optional) | `settings.organisation.legalName` | text | Legal entity name |
| Address | `settings.organisation.address` | text (single line, full width) | Street, postal code, city, country |
| Phone | `settings.organisation.phone` | text | +34 928 163 712 |
| Email | `settings.organisation.email` | text | info@example.com |

- There is no validation.
- **Action:** "Save organisation" calls update or create on the whole settings row. Messages: "Settings saved successfully!" or "Error saving settings" (Snackbar).
- There is no role gating inside the component.

---

### LocationsManagement (Settings tab 1)

- **File:** `components/Settings/LocationsManagement.jsx`.
- **Purpose:** CRUD for business locations: name, activity type, address, contact details and active flag.

**Data**

- `getAll('settings')[0]` for `locationTypes`.
- `getAll('locations')`, normalised as follows:
  - `isActive = isActive ?? is_active ?? true`.
  - `contactInfo = contactInfo || contact_info || {}`.

**Gating:** everything renders only if `isAdmin()`. Non-admins see nothing apart from the Snackbar.

**UI**

- Paper titled "Locations Configuration", with the text "Configure location names and activity types. This is the initial setup for your business locations."
- Button "Add Location". It is disabled when there are no location types.
- If there are no types, an info Alert: "Add at least one activity type in the **Location Types** tab before creating locations."
- Empty list states:
  - No types: "Add activity types first, then create your first location."
  - Otherwise: 'No locations configured. Click "Add Location" to create your first location.'
- Table columns:
  - **Location Name** (bold).
  - **Activity Type**: Chip with `getDisplayName(settings, type)` and colour `getTypeColor`.
  - **Address**: "`street, city`", or "Not set".
  - **Status**: Chip "Active" (success) or "Inactive" (default).
  - **Actions**: Edit, Delete (red).

**Dialog "Add Location" / "Edit Location"**

Type options = the configured types plus "orphan" type ids used by existing locations but missing from the config. Orphans are shown by humanised id.

| Field | Data key | Control | Default | Validation / notes |
|---|---|---|---|---|
| Location Name | `name` | text | '' | required; trimmed; helper "Enter the name of this location (e.g., 'Caleta de Fuste', 'Las Playitas')" |
| Activity Type | `type` | Select of type options (displayName) | first configured type id | required; disabled if no options; caption "Select the primary activity type for this location" or "Add activity types in the Location Types tab first." |
| Street Address | `address.street` | text | '' | section "Address Information" |
| City | `address.city` | text | '' | |
| Postal Code | `address.postalCode` | text | '' | |
| Country | `address.country` | text | '' | |
| Phone | `contactInfo.phone` | text | '' | section "Contact Information" |
| Mobile | `contactInfo.mobile` | text | '' | |
| Email | `contactInfo.email` | email | '' | |
| Website | `contactInfo.website` | text | '' | |
| Active Location | `isActive` | Switch | true | caption "Inactive locations will be hidden from selection lists" |

**Actions**

- **Create/Update:**
  - An empty name shows "Location name is required".
  - The payload is `{name, type, address, contactInfo, isActive}`. `createdAt` is deliberately not sent, because the backend rejects non-whitelisted fields.
  - Messages: "Location created successfully!" / "Location updated successfully!" / "Error saving location".
  - The dialog resets and the list reloads.
- **Delete:** confirm "Are you sure you want to delete this location? This action cannot be undone." → `remove('locations', id)`. Messages: "Location deleted successfully!" / "Error deleting location".
- **Cancel:** resets the form.

**Quirks**

- Inactive types are still offered in the type select.
- `location.settings` (pricing, `complianceReportsMandatory`) is not edited here.

---

### LocationTypesManagement (Settings tab 2)

- **File:** `components/Settings/LocationTypesManagement.jsx`.
- **Purpose:** Define activity types stored in `settings.locationTypes`. They are used when creating locations and they drive the feature flags.
- **Data:** `getAll('settings')[0]`. `locationTypes` is forced to an array and sorted by `order` via `getLocationTypes`.
- **Gating:** `isAdmin()` only. There is no message for non-admins.

**UI**

- Paper titled "Location Types", with the text "Define activity types (e.g. Diving, Bike Rental). Used when creating locations. Start from scratch—add types as needed."
- Button "Add type".
- Empty state (info Alert): "No location types configured. Add types (e.g. Diving, Bike Rental) to use when creating locations."
- Table columns:
  - **ID** (monospace).
  - **Display name**.
  - **Features**: an outlined chip for each true feature, with the "requires" prefix removed (e.g. "Boats", "DiveSites", "Certifications", "MedicalClearance"), or "—".
  - **Status**: Active/Inactive chip.
  - **Actions**: Edit, Delete (red).

**Dialog "Add location type" / "Edit location type"**

| Field | Data key | Control | Default | Validation / notes |
|---|---|---|---|---|
| Type ID | `id` | text, lower-cased and trimmed on input | '' | required; must match `/^[a-z][a-z0-9_]*$/`; disabled on edit (helper "Cannot change after create"; otherwise "Slug: lowercase, letters, numbers, underscores"); placeholder "e.g. diving, bike_rental, surf, kite_surf, wing_foil"; must be unique on create |
| Display name | `displayName` (also copied to `name`) | text | '' | required; placeholder "e.g. Diving, Bike Rental" |
| Color | `color` | Select: `primary` Primary, `secondary` Secondary, `default` Default, `success` Success, `warning` Warning, `error` Error | `primary` | |
| Order | `order` | number (parseInt, 0 fallback) | number of existing types | on create, the value typed is **overwritten** with `list.length` |
| Active | `isActive` | Switch | true | |
| Features | `features.requiresBoats`, `.requiresDiveSites`, `.requiresCertifications`, `.requiresMedicalClearance` | 4 checkboxes labelled "Boats", "Dive Sites", "Certifications", "Medical Clearance" | all false (on edit: `DEFAULT_FEATURES[id]` merged with the saved features) | caption "e.g. Requires dive sites → diving-only UI (schedule, boat-prep, stays)" |

The `icon` field has no control and is always `'scuba_diving'`.

**Actions**

- **Add/Update.** Error messages:
  - "Display name is required".
  - "Type ID must be a slug: lowercase, letters/numbers/underscores (e.g. snorkeling, kayak_rental)".
  - `Type "<id>" already exists`.

  On success the whole settings row is saved with the new `locationTypes`, then "Location type added." / "Location type updated." On failure: "Error saving location type".
- **Delete:** confirm "Remove this location type? Locations using it will keep the type id but lose custom display/features until you re-add it."
  - Then it removes the type and saves: "Location type removed."
  - If no settings row exists: "Location type removed (save settings to persist)."
  - On error: "Error removing location type".
  - Locations using the type are not checked.

---

### Prices (Settings tab 3)

- **File:** `components/Settings/Prices.jsx`.
- **Purpose:** Configure every price. Some prices are **global** (in `settings.prices`); others are **per location** (in `location.settings.pricing`). Which cards appear depends on the selected location's type.

**Data loaded**

1. `getAll('settings')[0]`, deep-merged over the defaults below (`equipment`, `addons`, `diveInsurance` and `tax` are merged key by key). If there is no row, the defaults are used.
2. `getAll('locations')`. For each location:
   - If `loc.settings.pricing` exists and `loc.pricing` does not, then `pricing = loc.settings.pricing` is used **as-is, without defaults**.
   - Otherwise `initializeLocationPricing(loc)` fills the defaults below.
3. The selected location is `dcms_current_location` if it exists, otherwise the first location.

There is no role gating inside the component.

#### Global prices (`settings.prices`), with defaults labelled "Deep Blue Diving 2025 pricelist"

| Path | Default | UI label | Helper |
|---|---|---|---|
| `prices.equipment.complete_equipment` | 13 | COMPLETE EQUIPMENT | "Full equipment set (first 8 dives only)" |
| `prices.equipment.Suit` | 5 | SUIT | |
| `prices.equipment.BCD` | 5 | BCD | |
| `prices.equipment.Regulator` | 5 | REGULATOR | |
| `prices.equipment.Torch` | 5 | TORCH | |
| `prices.equipment.Computer` | 3 | COMPUTER | |
| `prices.equipment.UWCamera` | 20 | UWCAMERA | |
| `prices.addons.night_dive` | 20 | Night dive | "Surcharge for night dive" |
| `prices.addons.personal_instructor` | 100 | Personal instructor | |
| `prices.addons.transfer_to_caleta` | (not in the defaults; added by a button) | Transfer to caleta | "Transfer fee when booking Caleta dive from Playitas" |
| `prices.addons.dive_trip_gran_tarajal_lajita` | (added by a button) | Dive trip gran tarajal lajita | "Dive trip to Gran Tarajal/La Lajita" |
| `prices.diveInsurance.one_day` | 7 | ONE DAY | "1 day insurance" |
| `prices.diveInsurance.one_week` | 18 | ONE WEEK | "1 week insurance" |
| `prices.diveInsurance.one_month` | 25 | ONE MONTH | "1 month insurance" |
| `prices.diveInsurance.one_year` | 45 | ONE YEAR | "1 year insurance" |
| `prices.beverages.price` | 0 | Price per Beverage | "This price applies to all beverages (water, soda, beer, wine, coffee, etc.)" |
| `prices.tax.tax_name` | `'IGIC'` | (not editable here) | |
| `prices.tax.igic_rate` | 0.07 | (not editable here) | |

- Any equipment item priced 0 shows the helper "Free (included in dive price)".
- Equipment labels are `key.replace('_',' ').toUpperCase()`.
- Addon labels are underscores → spaces, with the first letter capitalised.
- The equipment, addon and insurance lists are rendered from the object keys, so any extra saved key appears as a field.

#### Per-location pricing (`location.settings.pricing`): defaults from `initializeLocationPricing`

"Playitas" detection: `name === 'Las Playitas'`, or `id === 'playitas'`, or `id === '550e8400-e29b-41d4-a716-446655440002'` (hardcoded).

**Tourist customer type: `pricing.customerTypes.tourist`**

| Key | Default |
|---|---|
| `orientationDive` | 32 |
| `discoverDive` | 100 |
| `pricePerDive` | 35 (Playitas only: "local Playitas dive") |
| `diveTiers` | see below |

Default `diveTiers`. The `dives` field means "from N dives", and `price` is per dive:

| dives | Caleta de Fuste (default) | Las Playitas ("Caleta dives from Playitas") | description |
|---|---|---|---|
| 1 | 46 | 45 | "1-2 dives" |
| 3 | 44 | 43 | "3-5 dives" |
| 6 | 42 | 41 | "6-8 dives" |
| 9 | 40 | 39 | "9-12 dives" |
| 13 | 38 | 37 | "13+ dives" |

**Local and recurrent customer types**

- `pricing.customerTypes.local.pricePerDive` and `pricing.customerTypes.recurrent.pricePerDive`.
- There is no default; the UI shows 0.

**Addons (Playitas only): `pricing.addons`**

- `transfer_to_caleta` = 15.
- `dive_trip_gran_tarajal_lajita` = 45.

**Tax: `pricing.tax`**

- `{tax_name: 'IGIC', igic_rate: 0.07}`. The rate is stored as a fraction.

**Dive packs: `pricing.divePacks[]`**

Default (T = the dive tiers above, complete equipment = 13):

| dives | withEquipment | price formula | Caleta value |
|---|---|---|---|
| 2 | false | T[0]×2 | 92 |
| 2 | true | T[0]×2 + 13×2 | 118 |
| 5 | false | T[1]×5 | 220 |
| 5 | true | T[1]×5 + 13×5 | 285 |
| 10 | false | T[3]×10 | 400 |
| 10 | true | T[3]×10 + 13×**8** | 504 |

The equipment charge on the 10-dive pack is capped at 8 dives.

**Bike rental (`type === 'bike_rental'`, when `bikeTypes` is empty)**

- `bikeTypes.street_bike` = `{name:'Street Bike', description:'Street bike rental', rentalTiers:[{days:2,price:80,description:'2 days'},{days:7,price:200,description:'7 days'}]}`.
- `bikeTypes.gravel_bike` = the same tiers, with name 'Gravel Bike' and description 'Gravel bike rental'.
- `equipment` = `{click_pedals:10, helmet:10, gps_computer:15}`. The card subheader says "Charged once per rental".
- `insurance` = `{one_day:5, one_week:15, one_month:25}`.

**Kite surf (`type === 'kite_surf'`)**

`kiteTypes` (source: Point Break school):

| key | name | description | tiers (days:price) 1/2/3/4/5 | extraDayPrice |
|---|---|---|---|---|
| complete_equipment | Complete Equipment | Kite + Bar + Leash + Board + Pump | 50 / 95 / 140 / 180 / 210 | 35 |
| kite_bar_leash | Kite + Bar + Leash | Kite, bar and leash only | 25 / 50 / 75 / 95 / 105 | 20 |
| kiteboard | Kiteboard | Board only | 25 / 50 / 75 / 95 / 105 | 20 |

- `kiteEquipment` (€/day): `harness:6, kite_leash:1, helmet:1, impact_vest:1, wetsuit:3`.
- Tier descriptions are "N day"/"N days".

**Surf (`type === 'surf'`)**

`surfTypes`:

| key | name | description | tiers 1/2/3/4/5 days | extraDayPrice |
|---|---|---|---|---|
| softboard | Softboard | Beginner – soft, stable, high buoyancy | 11 / 22 / 33 / 40 / 47 | 7 |
| performance_softboard | Performance Softboard | Beginner/intermediate – responsive, maneuverable | 15 / 30 / 45 / 55 / 65 | 10 |
| shortboard | Shortboard | Intermediate/advanced – speed, control | 15 / 30 / 45 / 55 / 65 | 10 |
| midlength | Mid-length | Intermediate/advanced – volume + maneuverability | 15 / 30 / 45 / 55 / 65 | 10 |
| longboard | Longboard | Intermediate/advanced – stability, nose riding | 25 / 50 / 75 / 95 / 115 | 20 |

- `surfEquipment` (€/day): `wetsuit:5, shoes:3, surf_leash:3, auto_rack:3`.

`wing_foil`, `windsurf`, `stand_up_paddle` and custom types have **no** pricing cards. Only the Save button shows.

#### UI layout, in order

1. Heading "Price Management" and the text "Manage all pricing configurations for dives, equipment, and services."
2. "Pricing Location:" select with all locations. It is not filtered by type or access, and changing it does not update `dcms_current_location`.
3. **Bike rental cards** (if `bike_rental`):
   - "Bike Rental Pricing" / "Tiered pricing for bike rentals".
   - Sub-cards "Street Bike" and "Gravel Bike", each a table with columns Days (int) | Price (€) | Description. Tiers cannot be added or removed.
   - "Bike Rental Equipment Prices" (Click Pedals, Helmet, GPS Computer).
   - "Bike Rental Insurance Prices" (1 Day, 1 Week, 1 Month).
4. **Surf cards** (if `surf`):
   - "Surf Rental Pricing" / "Surfboard types and tiered pricing (Point Break style)". Five board cards, each with a Days | Price (€) | Description table and "Extra day (€)".
   - "Surf Accessories" / "Wetsuit, shoes, leash, rack", with fields labelled "Wetsuit (€/day)", "Shoes (€/day)", "Surf Leash (€/day)", "Auto Rack (€/day)".
5. **Kite surf cards** (if `kite_surf`):
   - "Kite Surf Rental Pricing" / "Equipment types and tiered pricing (Point Break style)". Three type cards plus "Extra day (€)".
   - "Kite Surf Accessories" / "Harness, leash, helmet, vest, wetsuit (€/day)".
6. **Diving cards**, shown only if `hasDivingFeatures(selectedLocation, settings)`:
   - **Dive Packs**. Subheader "Pre-defined pack prices (2, 5, 10 or custom dives, with or without equipment). Customers can choose a pack for a fixed total price."
     - Button "Add Pack" adds `{dives:2, withEquipment:false, price:92}`.
     - Table columns: Dives (placeholder "2, 5, 10...") | With Equipment (No/Yes select) | Pack Price (€) | Actions (delete).
     - Empty state: "No packs defined. Add packs for 2, 5, 10 dives (or custom) with or without equipment. Packs offer a fixed total price."
   - **Customer Type Pricing** / "Different pricing models for different customer types":
     - **"Tourist Pricing"** / "Volume discounts for visiting divers", with button "Add Tier". A new tier is `{dives: max+1, price: 38, description: "<max+1>+ dives"}`, and tiers are re-sorted by dives.
       - Playitas only: "Playitas Dive Price (Fixed)", helper "Fixed price for local Playitas dives (route: playitas_local)".
       - "Orientation Dive Price", helper "Special price for orientation dive".
       - "Discovery Dive Price", helper "Price for discovery dive (try diving)".
       - Playitas only: the label "Caleta Dive Pricing (Tiered) - for dives from Playitas to Caleta:".
       - Tier table: From Dives | Price per Dive | Description | Actions. Delete is disabled when only one tier is left.
     - **"Local Pricing"** / "Fixed price for local residents": "Price per Dive".
     - **"Recurrent Pricing"** / "Fixed price for regular customers": "Price per Dive".
   - **Equipment Rental Prices**: global `settings.prices.equipment`.
   - **Addon Services**: global `settings.prices.addons`. At Playitas only, buttons "Add Transfer to Caleta (15€)" and "Add Dive Trip Gran Tarajal/La Lajita (45€)" appear if those keys are missing from the global addons.
   - **Beverage Price** / "Single price for all beverages".
   - **Dive Insurance Prices** / "Mandatory insurance for all divers".
   - **Tax Settings** (per location):
     - "Tax Name", helper "Tax name (e.g., IGIC, IVA, TVA, VAT)".
     - "<TaxName> Rate" as a %: the display is rate×100 to 1 decimal; input is stored ÷100. Helper: "<TaxName> rate (e.g., 7% = 0.07 for IGIC, 21% = 0.21 for IVA)".
     - Both fields are disabled when no location is selected.
7. "Save All Prices" button ("Saving..." while saving).

#### Save logic

1. If a location is selected, `update('locations', id, {settings: {...loc.settings, pricing: loc.pricing}})`. Only `settings` is sent, because the backend rejects unknown fields.
2. If settings exist, `update('settings', settings.id, settings)`. Otherwise `create('settings', settings)`.
3. Messages: "Prices updated successfully" / "Error saving prices" (Alert snackbar).

#### Quirks

- Only the **currently selected** location's pricing is saved. Edits made to another location and then switched away from are kept in memory but not saved unless you switch back before saving.
- The **Tax Settings card is inside the diving-only block**, so rental locations cannot edit their tax rate here.
- Display fallbacks use `||`: a tax rate of 0 displays as 7%, and orientation 0 displays as 32. Zero values are shown as defaults.
- Playitas addon defaults are written to `location.pricing.addons`, but the Addon Services card reads and writes the **global** `settings.prices.addons`. The location-level addons have no UI.
- Location-specific defaults (Caleta/Playitas prices, the Playitas UUID) are hardcoded for Deep Blue Diving.
- The global `settings.prices.tax` exists but is not editable. Tax is edited per location.

---

### DiveSitesManagement (Settings tab 4)

- **File:** `components/Settings/DiveSitesManagement.jsx`.
- **Purpose:** Dive-site CRUD, plus a per-location "compliance reports mandatory" toggle.
- **Data:** `getAll('settings')[0]`, `getAll('locations')`, `getAll('diveSites')`.
- **Gating:** `isAdmin()`. Otherwise a warning: "You don't have permission to manage dive sites. Only administrators can access this section."

**UI, in order**

1. Accordion (expanded by default) "Dive Sites" / "Configure dive sites, difficulty levels, and site information".
2. Text "Manage all dive sites for each location. Configure difficulty levels, depth ranges, and site descriptions." and the button "Add Dive Site".
3. **"Compliance Reports Settings (per Location)"**:
   - Text: "Enable compliance reports for diving locations in natural reserves. When enabled, the Compliance Reports tab will appear in Dive Preparation."
   - A table of locations where `hasDivingFeatures`. Columns: **Location** | **Compliance Reports Mandatory** (Switch).
   - Toggling the switch immediately calls `update('locations', id, {settings: {...location.settings, complianceReportsMandatory: bool}})`. Messages: "Compliance reports setting updated for <name>" / "Error saving setting".
   - Empty state: "No diving locations found".
4. Dive sites **grouped by reef**:
   - The group key is `site.conditions.reef`. Only "Castillo Reef" and "Salinas Reef" are recognised, in that order. Any other value, or none, goes to "Other", which is listed last.
   - Each group is an Accordion titled "<reef> (<n> site|sites)". The recognised reefs are expanded by default.
   - Table columns:
     - **Name** (bold).
     - **Depth Range**: "min-max m" if both are truthy, else `site.depth`, else "N/A".
     - **Difficulty Level** chip: beginner = success, intermediate = info, advanced = warning, anything else = error.
     - **Status**: Active/Inactive.
     - **Actions**: Edit, Delete.
   - Sites are **not** filtered by location.
   - Empty state: 'No dive sites found. Click "Add Dive Site" to create one.'

**Dialog "Add Dive Site" / "Edit Dive Site"**

| Field | Data key (saved) | Control | Default / options |
|---|---|---|---|
| Dive Site Name | `name` | text, required | '' |
| Location | `locationId` | Select of all locations, required | first location |
| Type | `type` | Select: `diving` Diving, `beach` Beach, `cave` Cave, `reef` Reef | `diving` |
| Difficulty Level | `difficultyLevel` | Select: `beginner` Beginner, `intermediate` Intermediate, `advanced` Advanced, `expert` Expert | `beginner` |
| Min Depth (meters) | `depthRange.min` | number ≥0 | 0 |
| Max Depth (meters) | `depthRange.max` | number ≥0 | 0 |
| Current | `conditions.current` | text, placeholder "e.g., little-medium, moderate, strong" | '' |
| Waves | `conditions.waves` | text, placeholder "e.g., protected, unprotected, low, medium" | '' |
| Travel Time | `conditions.travelTime` | text, placeholder "e.g., 5-10 min, 15-20 min" | '' |
| Active | `isActive` | Switch | true |
| Reef / Area | `conditions.reef` | text, placeholder "e.g., Castillo Reef, Salinas Reef", helper "Group dive sites by reef/area" | '' |
| Description | `conditions.description` | multiline, 4 rows, placeholder "Describe the dive site, marine life, points of interest..." | '' |

**Save**

- A missing name or location shows "Please fill in all required fields".
- The payload is `{name, locationId, type, depthRange, difficultyLevel, conditions (only non-empty keys; undefined if none), isActive, updatedAt}`, plus `createdAt` on create.
- Messages: "Dive site created successfully!" / "Dive site updated successfully!".
- **Delete:** confirm `Are you sure you want to delete "<name>"?`, then "Dive site deleted successfully!".
- When editing, legacy fields are read as fallbacks: `site.difficulty`, top-level `current`, `waves`, `travelTime` and `description`.

**Quirks**

- Create, update and delete are **not awaited**. The success message shows even if the call fails, and the reload can race the write.
- The edit form does **not** prefill `reef`, so saving an edit **drops `conditions.reef`**.
- The reef grouping is hardcoded to two Deep Blue reef names.

---

### BoatsManagement (Settings tab 5)

- **File:** `components/Settings/BoatsManagement.jsx`.
- **Purpose:** Boat CRUD: location, capacity, onboard equipment and active flag.
- **Data:** `getAll('locations')`, `getAll('boats')`.
- **Gating:** `isAdmin()`. Otherwise: "You don't have permission to manage boats. Only administrators can access this section."

**UI**

- Accordion "Boats" / "Configure boats, capacity, and onboard equipment".
- Text "Manage all boats for each location. Configure capacity and onboard equipment." and the button "Add Boat".
- Table columns:
  - **Name**.
  - **Location**: name via `boat.locationId`, or "Unknown".
  - **Capacity**: 0 fallback.
  - **Equipment**: the first 3 items as chips (underscores → spaces), plus "+N more".
  - **Status**: Active/Inactive.
  - **Actions**: Edit, Delete.
- Empty state: 'No boats found. Click "Add Boat" to create one.'

**Dialog "Add Boat" / "Edit Boat"**

| Field | Data key | Control | Default | Validation |
|---|---|---|---|---|
| Boat Name | `name` | text | '' | required |
| Location | `locationId` | Select of all locations | first location | required |
| Capacity | `capacity` | number, min 1 | 10 | required (parseInt, 0 fallback) |
| Active | `isActive` | Switch | true | |
| Onboard Equipment | `equipmentOnboard[]` | checkboxes | [] | options: `oxygen`, `first_aid`, `radio`, `mobile_phone`, `gps`, `life_jackets`, `flares`, `dive_ladder`, `anchor`, `compass` (labels with underscores → spaces) |

**Save**

- A missing name or location shows "Please fill in all required fields".
- The payload is the form plus `updatedAt`, and `createdAt` on create.
- Messages: "Boat created successfully!" / "Boat updated successfully!".
- **Delete:** confirm `Are you sure you want to delete "<name>"?`, then "Boat deleted successfully!".

**Quirk:** the calls are not awaited, the same as Dive Sites.

---

### UserManagement (Settings tab 6)

- **File:** `components/Settings/UserManagement.jsx`.
- **Purpose:** Create and edit login accounts (`users`). Each user is also a **staff** record (`staff`), linked by **email**.

**Data**

- `getAll('users')`, `getAll('staff')` and `getAll('locations')`. Staff is loaded twice.
- `getStaffForUser(email)` finds the staff member whose `email` matches. Its `roles` are derived like this:
  1. The entries of `staff.certifications` that are one of the staff-role values.
  2. Otherwise `[staff.role]`.

**Gating**

- The table requires `isAdmin()`. Otherwise: "You don't have permission to manage users. Only administrators can access this section."
- The dialog is always mounted (`keepMounted`).

**Staff role options (`STAFF_ROLE_OPTIONS`)**

| Value | Label |
|---|---|
| `boat_captain` | Boat Captain |
| `instructor` | Instructor |
| `divemaster` | Divemaster |
| `assistant` | Assistant |
| `manager` | Manager |
| `owner` | Owner |
| `mechanic` | Mechanic |
| `intern` | Intern |
| `admin` | Admin |

**UI**

- Accordion "User Management" / "Create and manage user accounts with granular permissions".
- Help text (en translation): "Manage system users and their roles. Admins have full access, guides can access bookings, customers, and equipment."
- Button "Add User".
- Table columns:
  - **Name**.
  - **Username**.
  - **Email** (or "-").
  - **Phone**: from staff, or "-".
  - **Staff Roles**: chips; `boat_captain` is primary colour.
  - **Permissions**:
    - Superadmin: chip "Superadmin (Full Access)" with an icon.
    - Otherwise the first 3 permission labels, plus "+N more".
    - None: "No permissions".
  - **Status**: Active/Inactive.
  - **Actions**: Edit, Delete.
- Empty state: 'No users found. Click "Add User" to create one.'

**Dialog "Add New User" / "Edit User"**

| Field | Data key | Control | Default | Validation / conditions |
|---|---|---|---|---|
| Username | `username` | text | '' | required |
| First Name | `firstName` (→ staff.firstName; user.name = "first last") | text | '' (edit: from staff, else the first word of name) | required |
| Last Name | `lastName` | text | '' (edit: from staff, else the rest of name) | required |
| Email | `email` | email | '' | not required, but it is the user↔staff link |
| Password / "New Password (leave blank to keep current)" | `password` | password with a show/hide toggle | '' | required on create; ≥6 chars if given; helper "Minimum 6 characters" or "Leave blank to keep current password" |
| Confirm Password | `confirmPassword` | password with a toggle | '' | shown on create or when a new password is typed; must match |
| (info) | — | Alert "This is a Superadmin account with full access to all features." | | only if role = superadmin |
| Permissions | `permissions[]` | checkboxes, one per `ALL_PERMISSIONS` (Dashboard, Bookings, Customers, Current Customers, Equipment, Boat Preparation, Settings) | [] | hidden for superadmin; with none selected, the warning "No permissions selected. This user will not be able to access any features." |
| Location Access | `locationAccess[]` | "All Locations (Global Access)" checkbox (`__ALL__`) + one checkbox per location (hidden when All is checked) | [] (create) / `['__ALL__']` if the saved value is empty (edit) | the caption changes: hint / "Global access to all current and future locations" / "Access to N locations" |
| Phone | staff `phone` | text | '' | |
| Staff Roles * | staff `certifications[]`; the first one becomes staff `role` | checkboxes of STAFF_ROLE_OPTIONS | [] | at least 1 required; warning "Please select at least one staff role." |
| Locations (where this staff can work) * | staff `locationIds[]` | "All Locations" (`__ALL__`) + per-location checkboxes | `['__ALL__']` | at least 1 required; caption "Global access to all current and future locations" (translation) or "N locations selected" |
| Employment Start Date | staff `employmentStartDate` | date | '' | |
| Active | `isActive` (user and staff) | Switch | true | |

- Text above Permissions: 'Select the features this user can access. You can grant access from "almost everything" to "only boat preparation" and all options in between.'
- Text above Staff Roles: "Select all roles that apply. Staff can have multiple roles (e.g., Boat Captain and Instructor)."
- Text above staff Locations: "Select one, several, or All Locations. Staff can be assigned to boats and dives at their selected locations."
- Submit button: "Create" / "Update". It is disabled when username, first name or last name is missing, when the password is missing on create, when no staff role is selected, or when no staff location is selected.

**Save, step by step**

1. Validation messages:
   - "Password is required for new users".
   - "Password must be at least 6 characters long".
   - "Passwords do not match".
   - "First name and last name are required".
   - "At least one staff role is required".
   - "Select at least one location or All Locations".
2. `locationAccess` = `[]` if it contains `__ALL__`, else the selected ids.
3. User payload: `{username, name: "First Last", email, role, permissions, locationAccess, isActive}` (+`password` if typed). Then `update('users', id, …)` or `create('users', {...,createdAt})`. Messages: "User updated successfully!" / "User created successfully!".
4. Staff payload: `{firstName, lastName, email, phone, role: staffRoles[0] || 'assistant', locationId: first selected || first location || null, locationIds ([] = all), certifications: staffRoles, emergencyContact: {}, employmentStartDate || null, isActive}`.
   - If a staff record with the same email exists, `update('staff', …)`. Otherwise `create('staff', …)`.
5. Close the dialog and reload. On any error: "Error saving user".

**Delete**

- Confirm "Are you sure you want to delete this user?".
- Guards:
  - "Cannot delete the last superadmin user".
  - "Cannot delete the last admin user" (counts admin + superadmin).
- The delete button is disabled for:
  - the last superadmin;
  - the last admin/superadmin;
  - a superadmin row when the current user is not a superadmin.
- `remove('users', id)` is not awaited. Then "User deleted successfully!".

**Quirks / business-rule gaps**

- **There is no control for `role`.** The form default is `admin`, and edit keeps the existing role. So every user created here gets **role `admin`**, and access is governed only by the `permissions` checkboxes. The auth role (`admin`/`boat_pilot`/…) is separate from the staff roles (`boat_captain`/`instructor`/…).
- On create, "All Locations" starts **unchecked** with `locationAccess: []`. Saving without ticking anything therefore gives **global** access.
- Deleting a user does not delete the linked staff record.
- Staff is linked by email. A user without an email creates a new staff record on every save.
- `staff.certifications` is overloaded to hold the staff roles.
- Passwords are sent to the backend in plain text for hashing (normal). The mock mode stores them in localStorage.

---

### PartnersManagement (Settings tab 7)

- **File:** `components/Settings/PartnersManagement.jsx`.
- **Purpose:** Manage third-party partner accounts (resellers, agencies) that use the partner API or portal. This is a near-duplicate of the `/partners` page.
- **Data:** `getAll('locations')`, `getAll('partners')`.
- **Gating:** `isAdmin()`. Otherwise: "You don't have permission to manage partners. Only administrators can access this section."

**UI**

- Accordion "Partner Accounts" / "Manage 3rd party partner accounts and API access".
- Text "Create and manage partner accounts for 3rd party integrations. Partners can create bookings and manage customers via the API." and the button "Add Partner".
- Table columns:
  - **Name**.
  - **Company**.
  - **Email**.
  - **Commission**: `commissionRate×100` with 1 decimal, plus "%". If `commissionRate` (camelCase) is null or undefined, "-".
  - **Locations**: "All" chip if empty; otherwise the first 2 location-name chips (or the first 8 characters of the id), plus "+N".
  - **Status**: Active/Inactive.
  - **Actions**: Edit (primary), Regenerate API Key (VpnKey, secondary), Delete (error).
- Empty state: 'No partners found. Click "Add Partner" to create one.'

**Partner dialog** ("Add Partner" / "Edit Partner"). The fields are the same as on the Partners page (see the table there). The labels come from translations: Partner Name, Company, Contact Email, Phone, Webhook URL.

**Credentials view** (replaces the form when `newPartnerCredentials` is set)

- Warning Alert: "⚠️ Save these credentials now. The API secret will not be shown again." and "Copy both the API Key and API Secret. The secret is only displayed once."
- Read-only "API Key" with a copy button.
- "API Secret" (password type) with a copy button and the helper "This secret will only be shown once. Make sure to save it securely."
- Button "I've Saved the Credentials".

**Actions**

- **Save:**
  - `commissionRate` is sent as `parseFloat` or `null`.
  - Update: "Partner updated successfully!".
  - Create: if the response has `apiSecret`, the credentials view is set, and the message is "Partner created successfully! Save the API credentials shown below."
  - Then reload. The dialog is closed if `!newPartnerCredentials` (see the quirk).
  - Error: `error.message` or "Error saving partner".
- **Delete:** confirm "Are you sure you want to delete this partner? This action cannot be undone." Messages: "Partner deleted successfully!" / "Error deleting partner".
- **Regenerate:**
  - Confirm "Are you sure you want to regenerate the API key? The old key will no longer work."
  - Raw `fetch(POST ${VITE_API_URL || 'http://localhost:3003/api'}/partners/{id}/regenerate-api-key)`, **without an Authorization header or tenant header**.
  - If the response has `apiSecret`, the credentials are set and the message is "API key regenerated! Save the new credentials shown below."
  - Error: "Error regenerating API key".
- **Copy:** `navigator.clipboard.writeText` → "Copied to clipboard!".

**Quirks**

- After create, `if (!newPartnerCredentials) close` reads the **stale** (null) state, so the dialog closes immediately. The one-time secret is effectively never shown.
- Regenerate sets the credentials but never opens the dialog, and it is sent unauthenticated to a possibly wrong base URL.

---

### CertificationVerification (Settings tab 8)

- **File:** `components/Settings/CertificationVerification.jsx`.
- **Purpose:** Configure, per certification agency, the URL of the external verification portal. Customer-certification screens open these URLs in a popup.
- **Data:** `getAll('settings')[0]`, shallow-merged over `{certificationUrls: DEFAULTS}`.

**Default URLs (`DEFAULT_CERTIFICATION_URLS`)**

| Agency | URL |
|---|---|
| SSI | `https://www.divessi.com/en/verify-certification` |
| PADI | `https://www.padi.com/verify` |
| CMAS | `https://www.cmas.org/certification-verification` |
| VDST | `https://www.vdst.de/zertifikatspruefung` |

**UI**

- Accordion "Certification Verification" / "Configure verification portal URLs for certification agencies".
- Description: "Configure the verification portal URLs for each certification agency. These URLs will be opened in popup windows when verifying customer certifications."
- One field per agency key in `settings.certificationUrls`:
  - Label "<AGENCY> Verification URL".
  - Placeholder "Enter <AGENCY> verification portal URL".
  - A "Test URL" button, disabled if the URL is empty.
- Button "Save Certification Settings".
- Info Alert: "**Tip:** Make sure the URLs are correct and accessible. You can test each URL using the "Test URL" button. If a popup is blocked, check your browser's popup blocker settings."

**Actions**

- **Test URL:** `window.open(url, 'certification-verification', 'width=800,height=600,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no')`. Messages:
  - Blocked: "Popup blocked. Please allow popups for this site." (warning).
  - Success: "<AGENCY> verification URL opened successfully".
  - No URL: "Please enter a URL first".
- **Save:** update or create the whole settings row. Messages: "Settings saved successfully!" / "Error saving settings".

**Quirks**

- Agencies cannot be added or removed in the UI.
- A saved `certificationUrls` object replaces the defaults entirely. Agencies missing from it disappear.
- There is no role gating.

---

### TenantManagement (superadmin Settings view)

- **File:** `components/Settings/TenantManagement.jsx`.
- **Where used:** Settings page when `isSuperAdmin()`.
- **Purpose:** Platform-level CRUD of tenants, plus quotas and usage.

**Data**

- In parallel:
  - `dataService.getAll('tenants')`.
  - `httpClient.get('/tenants/platform/metrics')`. Failure is ignored → `null`. `metrics.data || metrics` is used.
- While loading: "Loading tenants...".
- Errors are shown in a dismissible Alert.

**UI**

- Header "Tenant Management" and the button "Add Tenant".
- Card "Platform overview" (if metrics exist):
  - "Storage: <storage.usedMB> MB".
  - "Tenants: <tenants>".
  - "Customers: <totalCustomers>".
  - "Bookings: <totalBookings>".
- Text: "Each tenant is a dive center or bike rental company. Access URL: **{slug}.<adminHost>**".
- Table columns:
  - **Company**.
  - **Slug**: outlined chip.
  - **URL**: a link to `<protocol>//<slug>.<adminHost>` with a Link icon, opened in a new tab.
  - **Locations, Dive Sites, Boats, Users, Customers**: usage bars from `tenant.usage.<key>.{used, authorized}`. The bar shows "used/authorized" with a tooltip. Colour: ≥100% error, ≥80% warning, otherwise primary.
  - **Storage**: bar from `usage.storage.{usedBytes, authorizedBytes, usedGB, usedMB, authorizedGB, pricePerGbPerMonth}`. The text is "X.XX GB" (or "N MB" below 0.001 GB) "/ N GB". The tooltip adds "· €P/GB/mo". "-" if absent.
  - **Status**: Active/Inactive, based on `is_active`.
  - **Actions**: Edit; Deactivate (Delete icon) only when the tenant is active.
- Empty state: "No tenants yet. Add one to get started."
- `adminHost` is resolved from the hostname:
  - `localhost` → `admin.couteret.fr`.
  - `*.admin.X` → `admin.X`.
  - `*.dcms.X` → `dcms.X`.
  - A host starting with `admin.` → as-is.
  - Anything else → `admin.<host>`.

**Dialog "Add Tenant" / "Edit Tenant"**

| Field | Data key | Control | Default / options | Rules |
|---|---|---|---|---|
| Company name | `name` | text, required, placeholder "e.g. Deep Blue Diving" | '' | typing auto-fills the slug on create |
| URL slug | `slug` | text, placeholder "e.g. deep-blue-diving", helper "URL: <slug>.<adminHost>" | slugify(name) | disabled on edit. slugify = lowercase, trim, strip `[^\w\s-]`, spaces→`-`, collapse `-`, trim `-`; empty → `tenant` |
| Number of locations | `numberOfLocations` | Select 1–10 | 1 | create only; clamped to 1–20 when sent |
| Location type | `locationType` | Select: `diving` Diving center, `bike_rental` Bike rental, `surf` Surf, `kite_surf` Kite Surf, `wing_foil` Wing Foil, `windsurf` Windsurf, `stand_up_paddle` Stand Up Paddle | `diving` | create only |
| Custom domain (optional) | `domain` | text, placeholder "e.g. deepbluediving.com" | '' | sent as `null` if empty |
| Authorized limits (quotas) | `settings.quotas.*` | number fields, edit only | locations 20, dive_sites 15, boats 10, users 20, customers 500, storage_gb 5, storage_price_per_gb_per_month 0 | integer ≥0; the price is a float (step 0.01) with helper "Off-season billing per GB/month" |

Quota field labels: Locations, Dive Sites, Boats, Users, Customers, Storage (GB), €/GB/month.

**Actions**

- **Create:** `create('tenants', {name, slug, numberOfLocations, locationType, domain})`. The backend presumably seeds the locations; unclear from code. Quotas are not sent on create.
- **Update:** `update('tenants', id, {name, slug, domain, settings: {...existing settings, quotas}})`.
- **Deactivate:** confirm `Deactivate tenant "<name>"? Their data will be preserved but they won't appear in the list.` → `remove('tenants', id)`. This is a soft delete.
- Save button: "Create" / "Update", disabled if the name is empty.
- Error fallbacks: "Failed to save tenant", "Failed to delete tenant", "Failed to load tenants".

---

### Partners page (admin)

- **File:** `pages/Partners.jsx`.
- **Route:** `/partners`, `requiredPermission="settings"`. It is in the Navigation global menu.
- **Purpose:** Manage partner accounts and API access. This is the standalone version of the PartnersManagement tab, with stats and extra key actions.
- **Data:** `getAll('partners')`, `getAll('locations')`.

**UI**

- Header with a Business icon: "Partners" (`t('partners.title')`) / "Manage partner accounts and API access".
- Buttons: "Refresh" (reloads partners) and, for `isAdmin()` only, "Add Partner".
- Summary cards:

| Card | Value |
|---|---|
| Total Partners | count |
| Active Partners | count where `isActive !== false` |
| Avg Commission Rate | average of `commissionRate || commission_rate || 0` over all partners ×100, 1 decimal, "%" |

- Table columns:
  - **Name** (medium weight).
  - **Company**.
  - **Email**.
  - **API Key**: a chip with the first 20 characters + "...". Tooltip "Click to copy"; clicking copies the key. "N/A" if there is no key.
  - **Commission**: "x.x%", or "Not set" when camelCase `commissionRate` is null or undefined.
  - **Locations**: chip "All Locations" (primary outlined) if empty, else "N location(s)".
  - **Status**: Active/Inactive.
  - **Actions** (admin only), each with a tooltip:
    - "Show API Key" (VpnKey): copies the key → "API Key copied to clipboard!".
    - "Regenerate API Key" (Refresh, warning).
    - "Edit Partner".
    - "Delete Partner" (error).
- Empty state: 'No partners found. Click "Add Partner" to create one.' (colSpan 8 or 7).

**Partner dialog fields** (shared with PartnersManagement)

| Field | Data key | Control | Default | Validation / notes |
|---|---|---|---|---|
| Partner Name | `name` | text | '' | required |
| Company Name | `companyName` | text | '' | required |
| Contact Email | `contactEmail` | email | '' | required |
| Contact Phone | `contactPhone` | text | '' | |
| Webhook URL (optional) | `webhookUrl` | text | '' | helper "URL for receiving booking notifications" |
| Commission Rate (%) | `commissionRate` (stored as a **fraction**: input 10 → 0.10) | number, min 0, max 100, step 0.1, "%" adornment | null | helper "Enter as percentage (e.g., 10 for 10%)"; an empty value → null |
| Allowed Locations | `allowedLocations[]` | "All Locations" checkbox (checked when the list is empty; ticking it clears the list) + one checkbox per location | [] | caption "Select locations this partner can access. Leave empty to allow all locations."; when empty, info "Partner will have access to all locations" |
| Active | `isActive` | Switch | true | |

- Buttons: "Cancel", and "Create"/"Update" (disabled without name, company or email).
- When editing, the snake_case fallbacks `company_name`, `contact_email`, `contact_phone`, `webhook_url`, `commission_rate`, `allowed_locations` and `is_active` are read.

**Actions**

- **Save:** same as PartnersManagement.
  - Create shows the credentials view if `apiSecret` is returned, with "Partner created successfully! Save the API credentials shown below."
  - Update shows "Partner updated successfully!".
  - Error: `error.message` or "Error saving partner".
- **Regenerate API Key:**
  - Confirm `Regenerate API key for <name>? The old key will be invalid. The new secret will only be shown once.`
  - `httpClient.post('/partners/{id}/regenerate-api-key', {})`, which is authenticated.
  - If `apiSecret` is returned, the credentials are set and the dialog is opened in the credentials view.
  - Message "API key regenerated! Save the new credentials." Error: "Error regenerating API key".
- **Delete:** confirm "Are you sure you want to delete this partner? This action cannot be undone." Messages: "Partner deleted successfully!" / error message.
- **Credentials view:** the same text as PartnersManagement, except the headline is hardcoded: "⚠️ Save these credentials now! The API secret will not be shown again." Button "I've Saved the Credentials".

**Quirks**

- The create flow has the same stale-state bug, so the secret is not shown after create. Regenerate here does work.
- A commission of 0 is saved as `null` (falsy check).
- A row whose data has only `commission_rate` shows "Not set".

---

### ProtectedPartnerRoute

- **File:** `components/Partner/ProtectedPartnerRoute.jsx`.
- **Where used:** wraps `/partner/dashboard`.
- **Logic:**
  - While `loading`: a centred CircularProgress.
  - If `!isAuthenticated()` (partner and token both required): `<Navigate to="/partner/login" replace/>`.
  - Otherwise: the children.

---

### PartnerLogin

- **File:** `pages/partner/PartnerLogin.jsx`.
- **Route:** `/partner/login` (public, outside the admin shell).
- **Purpose:** Partner portal login using the API credentials.
- **Data:** `getAll('settings')[0].organisation.name` → `orgName`, for branding. This is an unauthenticated call, so it may fail silently.

**UI**

- Paper with a Business icon.
- Title "Partner Portal", subtitle "<orgName || 'Dive Center'> - Partner Access".
- Error Alert.
- Toggle "Email" / "API Key" (default **Email**).
- Fields (see table).
- Button "Login" ("Logging in...").
- Footer: "Use your API credentials provided by <orgName || 'Dive Center'>".

| Field | Shown when | Control | Helper |
|---|---|---|---|
| Email Address | method = email | email, required | "Use the email address associated with your partner account" |
| API Key | method = apiKey | text, required | "Your partner API key" |
| "Password (API Secret)" / "API Secret" | always | password with a show/hide toggle, required | "Enter your API Secret (this acts as your password)" / "Your partner API secret" |

**Flow**

1. `usePartnerAuth().login(identifier, apiSecret, method)` → `POST /partner-auth/login`. The body is `{email, apiSecret}` or `{apiKey, apiSecret}`.
2. On success it stores `partner_token` and `partner_data`, sets the httpClient partner token, and navigates to `/partner/dashboard`.
3. On failure: the error text after the first ":" of `error.message`, else "Login failed. Please check your credentials."

**Business rule:** a partner has no separate password. The **API secret is the password**, and login works with either the contact email or the API key.

---

### PartnerDashboard

- **File:** `pages/partner/PartnerDashboard.jsx`.
- **Route:** `/partner/dashboard` (ProtectedPartnerRoute).
- **Purpose:** Partner self-service: see commission and invoices, list or create their customers and bookings.

**Data (reloaded when `partner` changes and by "Refresh")**

- `dataService.getAll('partnerInvoices')`, filtered client-side to `partnerId === partner.id || partner_id === partner.id`. This is the admin resource called with the partner token; whether the backend scopes it is unclear from code.
- `httpClient.get('/partner/bookings')`.
- `httpClient.get('/partner/customers')`.
- `dataService.getAll('locations')`, filtered to `partner.allowedLocations || allowed_locations` when that list is non-empty.

**Layout**

- Header "Welcome, <partner.name || companyName>" / "Partner Dashboard", with the buttons "Refresh" and "Logout".
- Stat cards:

| Card | Value |
|---|---|
| Total Invoices | count |
| Total Commission | sum of `invoice.total` (€) |
| Total Bookings | count |
| Total Customers | count |

- Tabs:
  - **Dashboard**. Paper "Commission Information":
    - "Commission Rate": `commissionRate×100` to 1 decimal "%", or "Not set".
    - "Outstanding Amount" (red): Σtotal − Σ(paidAmount|paid_amount).
  - **Customers**. "Customers" with the button "Add Customer".
    - Table: Name | Email | Phone | Nationality.
    - States: "Loading..." / "No customers yet".
  - **Bookings**. "Bookings" with the button "Create Booking".
    - Table:
      - Date: `booking_date` as dd/MM/yyyy, or N/A.
      - Customer: `booking.customers || customer` first + last name.
      - Activity: `activity_type`.
      - Location: name.
      - Total (right-aligned): `total_price`.
      - Status chip: paid = success, partial = info, overdue = error, pending = warning, otherwise default; the label defaults to "pending".
    - Empty state: "No bookings yet".
  - **Invoices**. "Recent Invoices", **first 10 only**.
    - Columns: Invoice Number | Date | Due Date | Subtotal | Tax | Total (bold) | Paid | Outstanding (red and bold if >0) | Status chip | Details ("View").
    - Empty state: "No invoices yet".

**Dialog "Create New Customer"**

| Field | Key | Required |
|---|---|---|
| First Name | `firstName` | yes |
| Last Name | `lastName` | yes |
| Email | `email` (type email) | no |
| Phone | `phone` | no |
| Date of Birth | `dob` (date) | no |
| Nationality | `nationality` | no |

- "Create" is disabled without first and last name.
- It calls `POST /partner/customers` with the form. Messages: "Customer created successfully!" / `error.message` or "Error creating customer". Then reload.

**Dialog "Create New Booking"**

| Field | Key | Control | Default | Notes |
|---|---|---|---|---|
| Create New Customer? | `createNewCustomer` | Select: `no` "Use Existing Customer", `yes` "Create New Customer" | no | |
| First Name / Last Name / Email / Phone | `customer.{firstName,lastName,email,phone}` | text | '' | only when creating a new customer; first and last name required |
| Customer | `customerId` | Select of the partner's customers ("First Last (email)") | '' | only when using an existing customer; required |
| Location | `locationId` | Select of the allowed locations | '' | required |
| Booking Date | `bookingDate` | date | '' | required |
| Activity Type | `activityType` | Select: `scuba_diving` Scuba Diving, `snorkeling` Snorkeling, `discover_scuba` Discover Scuba, `dive_course` Dive Course | `scuba_diving` | required |
| Number of Dives | `numberOfDives` | number, min 1 | 1 | parseInt, 1 fallback |
| Price | `price` | number, € | 0 | the partner types the price freely |
| Discount | `discount` | number, € | 0 | |
| Total Price | `totalPrice` | read-only, formatted € | price − discount | |
| Special Requirements | `specialRequirements` | multiline, 3 rows | '' | |

- "Create Booking" is disabled without a location, a date, and either a customer or a new first + last name.
- It calls `POST /partner/bookings` with the form and `totalPrice = price − discount`. It sends `customer` (and drops `customerId`) when creating a customer, and drops `customer` otherwise.
- Messages: "Booking created successfully!" / `error.message` or "Error creating booking".

**Dialog "Invoice Details - <number>"**

- Invoice Date and Due Date.
- "Breakdown": `invoice.notes`, with preserved line breaks.
- "Invoice Summary":
  - "Subtotal (Amount due before tax):".
  - "Tax (IGIC 7%):". This label is hardcoded.
  - "Total Due:".
  - Caption: "This is the amount you pay to the diving center (booking total - your commission + tax)".
- Paid and Outstanding.
- Buttons: "Close", and conditionally **"Fix Calculation"** (warning).

**"Fix Calculation"**

- Shown when `subtotal > 0 && total < subtotal × 0.2`. This heuristic detects the "old" invoice format.
- Steps:
  1. `dataService.getById('partners', invoice.partnerId)` → commission rate (default **0.1**).
  2. `bookingTotal = subtotal`, `commission = bookingTotal × rate`, `due = bookingTotal − commission`, `tax = due × 0.07`, `total = due + tax`.
  3. `update('partnerInvoices', id, {subtotal: due, tax, total, notes: "Partner invoice - <billId>. Customer paid: €X, Partner commission (R%): €C, Amount due before tax: €D, Tax (7% IGIC): €T, Total due: €Z"})`.
  4. Reload and close. Messages: "Invoice recalculated successfully!" / "Error recalculating invoice: <msg or 'Please try again.'>".
- **The partner can rewrite its own invoice amounts from the portal.** Whether the backend permits this is unclear from code.

**Partner business model (as implemented)**

- A partner (agency or reseller) has:
  - an API key and secret (the secret is shown once);
  - an optional webhook URL for booking notifications;
  - a commission rate (fraction);
  - allowed locations (empty = all);
  - an active flag.
- The partner creates customers and bookings for the dive center, at prices the partner enters.
- A **partner invoice** is what the partner owes the center:
  - `subtotal = booking total − partner commission`;
  - `tax = subtotal × 7%` (IGIC);
  - `total = subtotal + tax`.
- Per the PartnerInvoices translation, invoices are created automatically when bills are finalised for partner customers.
- Invoice status values: `pending`, `partial`, `paid`, `overdue`.
- Admin-side invoice management (`/partner-invoices`) is documented elsewhere.

**Quirks**

- `commissionRate` is checked in camelCase only; a snake_case value is ignored for display.
- Partner logout calls `httpClient.setAuthToken(null)`, which also removes the admin `auth_token`, logging out an admin session in the same browser.
- `partner_token` takes precedence over `auth_token` in every request. A browser with both tokens sends the partner token on admin calls.

---

### Security observations (factual)

- The JWTs (`auth_token`, `partner_token`) and user/partner JSON are stored in localStorage.
- In mock mode, user passwords are stored and compared in plain text in localStorage (ChangePasswordDialog, UserSelector with no password at all).
- AdminLogin shows the default credentials whenever the API base URL is localhost.
- PartnersManagement "Regenerate API key" calls the endpoint without authentication headers.
- Partner portal: invoice amounts can be recalculated and written by the partner client-side ("Fix Calculation").
- Authorisation in the UI is client-side (`canAccess`, `isAdmin`). The backend enforcement is not visible from these files.

---

### Data shapes used in this area

**User** (`users`, as read after `transformUserFromBackend` and as written by UserManagement)

```
{ id, username, name, email, role: 'superadmin'|'admin'|'boat_pilot'|'guide'|'trainer'|'intern',
  permissions: Array<'dashboard'|'bookings'|'customers'|'stays'|'equipment'|'boatPrep'|'settings'>,
  locationAccess: string[] /* [] = global */, tenantSlug?: string|null, tenant_id?: string,
  isActive: boolean, createdAt, updatedAt,
  password?: string /* write-only; mock mode stores it */, passwordLastUpdated?: ISO /* ChangePasswordDialog */ }
```

**Login responses**

- `POST /users/login` → `{access_token, user}` or `{requiresTenantSelection: true, tenants: [{tenantId, name, slug, role}]}`.
- `POST /users/login/select-tenant` and `POST /users/switch-tenant` → `{access_token, user}`.
- `GET /users/:id/tenant-memberships` → `[{tenantId, name, slug, role}]`.

**Staff** (`staff`, linked to a user by `email`)

```
{ id, firstName, lastName, email, phone, role /* primary staff role */, locationId|null, locationIds: string[] /* [] = all */,
  certifications: string[] /* holds staff roles: boat_captain|instructor|divemaster|assistant|manager|owner|mechanic|intern|admin */,
  emergencyContact: {}, employmentStartDate: 'YYYY-MM-DD'|null, isActive }
```

**Settings** (single row, `settings[0]`; every component saves the whole object)

```
{ id,
  organisation: { name, legalName, address, phone, email },
  locationTypes: LocationType[],
  certificationUrls: { SSI, PADI, CMAS, VDST, ...: url },
  prices: {
    equipment: { complete_equipment, Suit, BCD, Regulator, Torch, Computer, UWCamera, ...: number },
    addons: { night_dive, personal_instructor, transfer_to_caleta?, dive_trip_gran_tarajal_lajita?, ...: number },
    diveInsurance: { one_day, one_week, one_month, one_year },
    beverages: { price },
    tax: { tax_name, igic_rate /* fraction */ } } }
```

**LocationType** (`settings.locationTypes[]`)

```
{ id /* slug ^[a-z][a-z0-9_]*$ */, name, displayName, icon /* always 'scuba_diving' */,
  color: 'primary'|'secondary'|'default'|'success'|'warning'|'error', order: number, isActive: boolean,
  features: { requiresBoats, requiresDiveSites, requiresCertifications, requiresMedicalClearance: boolean } }
```

**Location** (`locations`; read with snake_case fallbacks `is_active`, `contact_info`)

```
{ id, name, type /* location type id */, isActive,
  address: { street, city, postalCode, country },
  contactInfo: { phone, mobile, email, website },
  settings: { complianceReportsMandatory?: boolean, pricing?: LocationPricing },
  pricing?: LocationPricing /* in-memory copy used by Prices.jsx */ }
```

**LocationPricing** (`location.settings.pricing`)

```
{ customerTypes: {
    tourist: { orientationDive, discoverDive, pricePerDive? /* Playitas */, diveTiers: [{ dives /* from N */, price /* per dive */, description }] },
    local: { pricePerDive }, recurrent: { pricePerDive } },
  divePacks: [{ dives, withEquipment: boolean, price /* pack total */ }],
  addons?: { transfer_to_caleta, dive_trip_gran_tarajal_lajita },
  tax: { tax_name, igic_rate },
  // bike_rental
  bikeTypes?: { street_bike|gravel_bike: { name, description, rentalTiers: [{ days, price, description }] } },
  equipment?: { click_pedals, helmet, gps_computer }, insurance?: { one_day, one_week, one_month },
  // surf
  surfTypes?: { softboard|performance_softboard|shortboard|midlength|longboard: { name, description, rentalTiers[], extraDayPrice } },
  surfEquipment?: { wetsuit, shoes, surf_leash, auto_rack },
  // kite_surf
  kiteTypes?: { complete_equipment|kite_bar_leash|kiteboard: { name, description, rentalTiers[], extraDayPrice } },
  kiteEquipment?: { harness, kite_leash, helmet, impact_vest, wetsuit } }
```

**Boat** (`boats`)

```
{ id, name, locationId /* Navigation also reads location_id */, capacity: int, isActive /* also is_active */,
  equipmentOnboard: Array<'oxygen'|'first_aid'|'radio'|'mobile_phone'|'gps'|'life_jackets'|'flares'|'dive_ladder'|'anchor'|'compass'>,
  createdAt, updatedAt }
```

**DiveSite** (`diveSites`)

```
{ id, name, locationId, type: 'diving'|'beach'|'cave'|'reef',
  difficultyLevel: 'beginner'|'intermediate'|'advanced'|'expert' /* legacy: difficulty */,
  depthRange: { min, max } /* legacy: depth string */,
  conditions?: { current, waves, travelTime, description, reef },
  isActive, createdAt, updatedAt }
```

**Partner** (`partners`; camelCase with snake_case fallbacks)

```
{ id, name, companyName|company_name, contactEmail|contact_email, contactPhone|contact_phone,
  webhookUrl|webhook_url, commissionRate|commission_rate /* fraction 0–1 or null */,
  allowedLocations|allowed_locations: string[] /* [] = all */, isActive|is_active,
  apiKey|api_key, apiSecret /* only in create/regenerate responses */ }
```

**Partner endpoints**

- `POST /partner-auth/login` → `{access_token, partner}`.
- `POST /partners/:id/regenerate-api-key` → `{apiKey|api_key, apiSecret}`.
- `GET|POST /partner/customers`.
- `GET|POST /partner/bookings`.

**Partner-created customer** (`POST /partner/customers`; read back as `first_name|firstName`, …)

```
{ firstName, lastName, email, phone, dob: 'YYYY-MM-DD', nationality }
```

**Partner-created booking** (`POST /partner/bookings`; read back with snake_case `booking_date`, `activity_type`, `total_price`, `status`, nested `customers|customer`, `locations|location`)

```
{ customerId? | customer?: { firstName, lastName, email, phone }, locationId, bookingDate: 'YYYY-MM-DD',
  activityType: 'scuba_diving'|'snorkeling'|'discover_scuba'|'dive_course', numberOfDives, price, discount, totalPrice,
  specialRequirements, createNewCustomer }
```

Booking status values (as displayed): `pending`, `partial`, `paid`, `overdue`.

**PartnerInvoice** (`partnerInvoices`)

```
{ id, partnerId|partner_id, billId|bill_id, invoiceNumber|invoice_number, invoiceDate|invoice_date, dueDate|due_date,
  subtotal /* booking total − commission */, tax /* subtotal × 0.07 */, total, paidAmount|paid_amount,
  status: 'pending'|'partial'|'paid'|'overdue', notes /* human-readable breakdown */ }
```

**Tenant** (`tenants`)

```
{ id, name, slug, domain|null, is_active,
  settings: { quotas: { locations, dive_sites, boats, users, customers, storage_gb, storage_price_per_gb_per_month } },
  quotas? /* read fallback */, locations?[], _count?.locations,
  usage: { locations|dive_sites|boats|users|customers: { used, authorized },
           storage: { usedBytes, authorizedBytes, usedGB, usedMB, authorizedGB, pricePerGbPerMonth } } }
// create payload: { name, slug, numberOfLocations (1–20), locationType, domain }
```

**Platform metrics** (`GET /tenants/platform/metrics`, may be wrapped in `data`)

```
{ storage: { usedMB }, tenants, totalCustomers, totalBookings }
```

**Partner auth state** (localStorage `partner_data`)

- The partner object as returned by `/partner-auth/login`.
- Fields read: `id`, `name`, `companyName`, `commissionRate|commission_rate`, `allowedLocations|allowed_locations`.

---

## Data layer and data models

Scope: `src/services/api/httpClient.js`, `src/services/api/mockApiAdapter.js`, `src/services/api/mockDataService.js`, `src/services/api/realApiAdapter.js`, `src/services/apiService.js`, `src/services/dataService.js`, `src/services/sharedStorage.js`, `src/services/syncService.js`, `src/data/mockData.js`, `src/config/apiConfig.js`, `src/config/README.md`.

Notation used below: `U(nnn)` = the UUID `550e8400-e29b-41d4-a716-446655440nnn` (all seed IDs share this prefix; only the last three digits differ).

### Architecture

#### Layers

```
components / pages / hooks
        │
        ▼
dataService.js  ── isMockMode()? ──yes──► api/mockDataService.js ──► localStorage (dcms_<resource>)
        │                                       ▲                         │
        │ no                                    │                         └─► window.syncService.syncToServer() (mock only)
        ▼                                       │
apiService.js ── adapter chosen once at import ─┤
        │          isMockMode() ? mockApiAdapter : realApiAdapter
        ▼
api/realApiAdapter.js ──► api/httpClient.js ──► fetch(`${API_CONFIG.baseURL}${endpoint}`)
```

- `dataService.js` is the entry point most components use. In **mock mode** it calls `mockDataService` functions **synchronously** (returns plain values). In **api mode** it delegates to `apiService`, which returns **Promises**. The same function names therefore return different types depending on mode.
- `apiService.js` picks the adapter **once at module load** (`const adapter = isMockMode() ? mockApiAdapter : realApiAdapter`). Every method wraps the adapter call in try/catch, `console.error`s, and rethrows.
- `mockApiAdapter` is a thin async wrapper over `mockDataService` (same functions, but async).
- `realApiAdapter` maps frontend resource names to REST paths, transforms payloads (frontend → backend DTO) and responses (backend snake_case → frontend camelCase), and unwraps `response.data || response`.

#### How the mode is chosen

`config/apiConfig.js`:

| Item | Value | Notes |
|---|---|---|
| `API_CONFIG.mode` | `'api'` (hard-coded) | `'mock'` = localStorage, `'api'` = real backend. No env var controls it; must edit the file. |
| `API_CONFIG.baseURL` | getter → `getApiBaseURL()` | Re-evaluated on each request (httpClient passes a function). |
| `API_CONFIG.timeout` | `30000` ms | |
| `API_CONFIG.enableCache` | `false` | "future enhancement"; unused. |
| `isMockMode()` | `API_CONFIG.mode === 'mock'` | |
| `isApiMode()` | `API_CONFIG.mode === 'api'` | |

`getApiBaseURL()` resolution order:

1. If `import.meta.env.VITE_API_URL` is set and `window` exists: parse it as URL, **replace its protocol with the current page protocol** (`window.location.protocol`), return `url.toString()` (comment: avoids `ERR_CERT_AUTHORITY_INVALID`). If parsing throws, fall through.
2. If `VITE_API_URL` set (non-browser): return it verbatim.
3. Otherwise derive from `window.location.hostname` (default `'localhost'`, protocol default `'http:'`):
   - `apiHost = hostname.replace(/^(admin|dcms)\./, 'api.').replace(/\.(admin|dcms)\./, '.api.')`
   - `port = hostname.includes('couteret.fr') ? '' : ':3003'`
   - `useApexApi = hostname.includes('couteret.fr') && apiHost !== 'api.couteret.fr' && apiHost.includes('.')` → if true, host becomes `api.couteret.fr` (so `deepblue.admin.couteret.fr` → `api.couteret.fr`, tenant carried by header instead).
   - Result: `${protocol}//${finalHost}${port}/api` — e.g. `localhost` → `http://localhost:3003/api`; `admin.couteret.fr` → `https://api.couteret.fr/api`.

`config/README.md` (documentation only, partly stale): describes switching `mode` between `'mock'` and `'api'`, shows `baseURL: 'http://localhost:3001/api'` (no longer the code's default), and says `.env` `VITE_API_URL=http://localhost:3001/api` overrides the base URL. It claims "No component changes needed" because components use `dataService`; in reality api mode returns Promises where mock mode returns values.

#### Environment variables

| Variable | Used in | Effect |
|---|---|---|
| `VITE_API_URL` | `apiConfig.js` | Overrides API base URL (protocol forced to page protocol in browser). |
| `import.meta.env.DEV` | `syncService.js` | Only gates `console.warn` messages. |

#### localStorage keys

| Key | Written by | Content |
|---|---|---|
| `dcms_<resource>` | `mockDataService.saveAll`, `initializeMockData`, `syncService` | JSON array of entity records (mock mode storage). Resources seeded: `bookings`, `customers`, `equipment`, `boats`, `diveSites`, `locations`, `pricingConfig`, `governmentBonos`, `settings`, `boatPreps`, `packPurchases`, `users`. Any other resource name used with `create()` creates a new `dcms_<name>` key. |
| `dcms_shared_sync` | `sharedStorage.js` | `{ timestamp: <ms>, source: 'public' \| 'admin' }` |
| `auth_token` | `httpClient.setAuthToken(token,'admin')` | Admin JWT (Bearer). |
| `partner_token` | `httpClient.setAuthToken(token,'partner')` | Partner token (Bearer). Takes precedence over `auth_token`. |
| `dcms_current_user` | (read by `utils/tenantContext.getTenantSlug`, outside scope) | Logged-in user; `tenantSlug` / `tenant_id` read for tenant header. |
| `dcms_tenant_slug` | (`utils/tenantContext.setTenantSlug`, outside scope) | Superadmin tenant switcher fallback. |

#### HTTP headers on every real API request

| Header | Value | Source |
|---|---|---|
| `Content-Type` | `application/json` | always (can be overridden via `options.headers`) |
| `Authorization` | `Bearer <token>` | `localStorage.partner_token` \|\| `localStorage.auth_token`; omitted if neither |
| `X-Tenant-Slug` | tenant slug | `getTenantSlug()`: (1) `null` if hostname's first label is `admin` or `api`; (2) subdomain match `^([a-z0-9-]+)\.(dcms\|admin\|api)\.` → slug; (3) `dcms_current_user.tenantSlug` (returns `null` if user only has `tenant_id`); (4) `localStorage.dcms_tenant_slug`. Omitted when null. |

#### Public site ↔ admin synchronisation (mock mode only)

Two mechanisms exist, both POC-era and inactive in the shipped config (`mode: 'api'`):

1. **`syncService.js`** (imported in `index.jsx`, exposed as `window.syncService`): pushes/pulls `bookings`, `customers`, `locations`, `equipment` to a separate sync server at `http://localhost:3002` (health `GET /health`, data `/api/sync/<resource>`). Only active when `isMockMode()`.
2. **`sharedStorage.js`**: a class that only ensures `dcms_*` keys exist; it never copies data across origins. It is **not imported anywhere** (dead code).

In api mode, the backend is the single source of truth; no sync occurs.

#### Browser events

| Event name | Dispatched by | `detail` | Listeners (outside scope, for reference) |
|---|---|---|---|
| `dcms_customer_updated` | `mockDataService.update('customers', …)` | updated customer object | `pages/Customers.jsx`, `hooks/useBoatPrepData.jsx` |
| `dcms_<resource>_synced` (`dcms_bookings_synced`, `dcms_customers_synced`, `dcms_locations_synced`, `dcms_equipment_synced`) | `syncService.syncAll` when pulled data differs | merged array | `pages/Bookings.jsx`, `pages/Customers.jsx`, `hooks/useBoatPrepData.jsx`; `dcms_bookings_synced` is also dispatched by `services/bookingRepricingService.js` |
| `dcms_data_changed` | nobody in scope | – | listened to by `sharedStorage.js` (dead) |
| `storage` (native) | browser | – | listened to by `sharedStorage.js` (dead) |

### services/api/httpClient.js

Singleton: `export const httpClient = new HttpClient(() => API_CONFIG.baseURL, API_CONFIG.timeout)`.

| Method | Signature | Behaviour |
|---|---|---|
| `constructor` | `(baseURL, timeout = 30000)` | `baseURL` may be a string or a function (resolved per request). |
| `request` | `async (endpoint, options = {})` | URL = `${base}${endpoint}`. Creates `AbortController`, aborts after `timeout`. Merges headers (see above). Calls `fetch`. |
| `get` | `(endpoint, params = {})` | Appends `?` + `new URLSearchParams(params)` when non-empty. `GET`. |
| `post` | `(endpoint, data)` | `POST`, body `JSON.stringify(data)`. |
| `put` | `(endpoint, data)` | `PUT`, JSON body. |
| `patch` | `(endpoint, data)` | `PATCH`, JSON body. (Not used by realApiAdapter.) |
| `delete` | `(endpoint)` | `DELETE`. |
| `getAuthToken` | `()` | `localStorage.getItem('partner_token') \|\| localStorage.getItem('auth_token')`. |
| `setAuthToken` | `(token, type = 'admin')` | Stores in `partner_token` if `type === 'partner'`, else `auth_token`. Falsy token → removes **both** keys. |
| `clearAuthToken` | `()` | Removes `auth_token` and `partner_token`. |

Response handling:
- `!response.ok`: builds message `API Error: <status> <statusText>`; if body is JSON, appends `: <errorData.message>` or `: <errorData.error>` (stringified if not string) or `: <JSON of body>`; else appends `: <text>` if non-empty. Throws `Error` with extra props `status` and `statusText`. Body-parse failure only `console.warn`s.
- OK + `content-type` contains `application/json` → `response.json()`; otherwise `response.text()` (so empty 204 bodies return `''`).
- `AbortError` → throws `new Error('Request timeout')`.
- **No retries**, no token refresh, no 401 handling in this layer.

### services/api/realApiAdapter.js

#### Resource → endpoint mapping

Default endpoint = resource name as-is. Explicit mappings per method:

| Frontend resource | Backend path | getAll | getById | create | update | delete |
|---|---|---|---|---|---|---|
| `users` | `/users` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `diveSites` | `/dive-sites` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `governmentBonos` | `/government-bonos` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `boatPreps` | `/boat-preps` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `partners` | `/partners` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `partnerInvoices` | `/partner-invoices` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `customerBills` | `/customer-bills` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `staff` | `/staff` | ✓ | ✓ | (default, same) | ✓ | ✓ |
| `tenants` | `/tenants` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `scheduleSlotGuides` | `/schedule-slot-guides` | ✓ | ✓ | ✓ | ✓ | **✗ → `/scheduleSlotGuides/:id`** (bug) |
| anything else (`customers`, `bookings`, `boats`, `equipment`, `locations`, `settings`, `stays`, …) | `/<resource>` unchanged | | | | | |

#### Generic CRUD

| Function | HTTP | Request transform | Response |
|---|---|---|---|
| `getAll(resource)` | `GET /<endpoint>` | – | `transformResponse(resource, res.data \|\| res)` |
| `getById(resource, id)` | `GET /<endpoint>/<id>` | – | `transformResponse(...)` |
| `create(resource, data)` | `POST /<endpoint>` | per-resource `transform*ToBackend` (table below); `tenants` pass-through | `transformResponse(...)` |
| `update(resource, id, data)` | `PUT /<endpoint>/<id>` (never PATCH) | same as create | `transformResponse(...)` |
| `delete(resource, id)` | `DELETE /<endpoint>/<id>` | – | `res.data \|\| res` (no transform) |

To-backend transforms applied on create/update: `customers`, `users`, `settings`, `partners`, `staff`, `boats`, `diveSites`, `boatPreps`, `equipment`, `partnerInvoices`, `customerBills`, `scheduleSlotGuides`. **Bookings, locations, governmentBonos, tenants and all others are sent as-is.**

From-backend transforms (`transformResponse`): `customers`, `bookings`, `users`, `settings`, `partners`, `staff`, `boats`, `diveSites`, `boatPreps`, `equipment`, `scheduleSlotGuides`, `partnerInvoices`, `customerBills`. Handles arrays (map) and single objects. Others returned raw.

#### Specialised operations

| Function | HTTP | Notes |
|---|---|---|
| `getBookingsByDate(date)` | `GET /bookings?date=<date>` | Returns `res.data \|\| res` **without** booking transform (raw snake_case if backend sends it). |
| `getTodaysBookings()` | via `getBookingsByDate(today)` | `today = new Date().toISOString().split('T')[0]` (UTC date). |
| `getUpcomingBookings(days = 3)` | `GET /bookings` (via `getAll`) | Filters in memory: `new Date(b.bookingDate \|\| b.booking_date)` between `now` and `now + days`. |
| `getCustomerBookings(customerId)` | `GET /bookings?customerId=<id>` | No transform. |
| `searchCustomers(query)` | `GET /customers?search=<query>` | No transform. |
| `getAvailableEquipment(category)` | `GET /equipment?available=true[&category=<c>]` | No transform. |
| `calculatePrice(numberOfDives, addons)` | none | `console.warn` + returns `numberOfDives * 46`. |
| `getVolumeDiscountPrice(cumulativeDives)` | none | `console.warn` + returns `46`. |
| `getStatistics(locationId?)` | `GET /statistics[?locationId=<id>]` | `apiService.getStatistics()` never passes `locationId`. |

#### Transform functions (field-level)

`transformCustomerToBackend(data)` → body with only defined fields:
- Passed through if defined: `firstName`, `lastName`, `email`, `phone`, `dob`, `nationality`, `address`, `restrictions`, `notes`, `isActive`.
- `customerType`: included only if not `undefined`/`null`/`''`.
- "Diving customer" = `customerType` is non-empty. `medicalConditions` sent **only** for diving customers.
- `preferences` (always sent) = `data.preferences` cleaned + extra fields:
  - always: `gender: data.gender || ''`
  - diving only (when defined): `isApproved`, `centerSkillLevel`, `certifications` (array), `medicalCertificate`, `divingInsurance`, `uploadedDocuments` (array).
  - non-diving: deletes from existing preferences `isApproved`, `centerSkillLevel`, `certifications`, `medicalCertificate`, `divingInsurance`, `equipmentOwnership`, `suitPreferences`, `ownEquipment` (keeps `uploadedDocuments`, `gender`). Note: `uploadedDocuments` on `data` root is not re-added for non-diving customers.
  - `undefined`/`null` extra values are dropped.

`transformCustomerFromBackend(data)`:
- `firstName ← first_name||firstName`, `lastName ← last_name||lastName`, `email`, `phone`, `dob`, `nationality`, `address`, `restrictions`, `notes` copied; `gender ← preferences.gender || data.gender || ''`; `isActive ← is_active ?? isActive ?? true`; `createdAt/updatedAt ← created_at/updated_at`.
- `preferences` returned with `isApproved`, `centerSkillLevel`, `certifications`, `medicalCertificate`, `divingInsurance`, `uploadedDocuments`, `gender` removed (hoisted to root).
- Diving customer (`customer_type||customerType` non-empty): `customerType` as-is; `centerSkillLevel ← prefs || center_skill_level || centerSkillLevel || 'beginner'`; `medicalConditions ← medical_conditions||medicalConditions||[]`; `isApproved ← prefs ?? is_approved ?? false`; `certifications ← prefs || certifications || customer_certifications || []`; `medicalCertificate ← prefs || medical_certificate || medicalCertificate || {hasCertificate:false}`; `divingInsurance ← … || {hasInsurance:false}`; `uploadedDocuments ← … || []`.
- Non-diving (e.g. bike-rental customers): `customerType = undefined`, `centerSkillLevel = undefined`, `medicalConditions = []`, `isApproved = false`, `certifications = []`, `medicalCertificate = {hasCertificate:false}`, `divingInsurance = {hasInsurance:false}`, `uploadedDocuments = []`.
- Finally spreads **all other raw keys** of `data` except `first_name, last_name, customer_type, center_skill_level, medical_conditions, is_active, is_approved, customer_certifications, medical_certificate, diving_insurance, uploaded_documents, created_at, updated_at, preferences` — raw camelCase keys from the backend (e.g. `customerType`, `certifications`) therefore overwrite the computed values.

`transformBookingFromBackend(data)` (no to-backend transform exists):

| Frontend field | Backend source (first found) | Default |
|---|---|---|
| `id` | `id` | |
| `customerId` | `customer_id`, `customerId` | |
| `locationId` | `location_id`, `locationId` | |
| `boatId` | `boat_id`, `boatId` | |
| `diveSiteId` | `dive_site_id`, `diveSiteId` | |
| `staffPrimaryId` | `staff_primary_id`, `staffPrimaryId` | |
| `bookingDate` | `booking_date`, `bookingDate` | |
| `activityType` | `activity_type`, `activityType` | |
| `numberOfDives` | `number_of_dives`, `numberOfDives` | `1` |
| `price` | `price` | |
| `discount` | `discount` | `0` |
| `totalPrice` | `parseFloat(total_price \|\| totalPrice)` | `0` |
| `paymentMethod` | `payment_method`, `paymentMethod`; value `'deferred'` → **`'account'`** | |
| `paymentStatus` | `payment_status`, `paymentStatus` | `'pending'` |
| `status` | `status` | `'pending'` |
| `specialRequirements` | `special_requirements`, `specialRequirements` | |
| `equipmentNeeded` | `equipment_needed` (if defined) else `equipmentNeeded` | |
| `bonoId` | `bono_id`, `bonoId` | |
| `stayId` | `stay_id`, `stayId` | |
| `moleSlotTime` | `mole_slot_time`, `moleSlotTime` | `null` |
| `session` | `session` | `null` |
| `createdAt` / `updatedAt` | `created_at` / `updated_at` | |
| `diveSessions` | = `equipmentNeeded` when `activityType === 'diving'` and `equipmentNeeded` is a plain object containing any key `morning`, `afternoon`, `night`, `tenFifteen`, `'10:15'` (public-site bookings store dive sessions inside `equipment_needed`) | |
| `customer` | `transformCustomerFromBackend(data.customers)` | |
| `location` | `data.locations` (raw) | |
| `boat` | `data.boats` (raw) | |
| `diveSite` | `data.dive_sites \|\| data.diveSites` (raw) | |

Then spreads all other raw keys except `customer_id, location_id, boat_id, dive_site_id, staff_primary_id, booking_date, activity_type, number_of_dives, total_price, payment_method, payment_status, special_requirements, equipment_needed, bono_id, stay_id, created_at, updated_at, customers, locations, boats, dive_sites` (so `mole_slot_time` stays duplicated, and a raw camelCase `paymentMethod: 'deferred'` would override the mapped `'account'`).

`transformUserToBackend` → `{ username, name, email, password, role, permissions: data.permissions||[], locationAccess: data.locationAccess||[], isActive: data.isActive ?? true }` (password in cleartext, hashed server-side; `password: undefined` on edits without password is dropped by `JSON.stringify`).
`transformUserFromBackend` → `{ id, username, name, email, role, permissions||[], locationAccess ← location_access||locationAccess||[], tenantSlug ← tenantSlug||tenant_slug||null, tenant_id, isActive ← is_active??isActive??true, createdAt, updatedAt }` (password hash never copied).

`transformSettingsToBackend(data)` → `{ key: data.key || 'default', value: <all fields except id, key, description, createdAt, updatedAt>, description }`.
`transformSettingsFromBackend(data)` → if `data.value` is an object: `{ id, key, description, ...data.value, createdAt, updatedAt }` (value flattened to root); else `{ ...data, createdAt, updatedAt }`.

`transformPartnerToBackend` → `{ name, companyName, contactEmail, contactPhone, webhookUrl, commissionRate, allowedLocations: []default, settings: {}default, isActive: true default }` (each accepts camelCase or snake_case input; `commissionRate` uses `||`, so `0` becomes `undefined`).
`transformPartnerFromBackend` → `{ id, name, companyName ← company_name, contactEmail ← contact_email, contactPhone ← contact_phone, webhookUrl ← webhook_url, commissionRate ← parseFloat(commission_rate) or null, allowedLocations ← allowed_locations||[], apiKey ← api_key, apiSecret (only on create/regenerate), isActive ← is_active??true, settings||{}, createdAt, updatedAt }`.

`transformStaffToBackend` → `{ firstName, lastName, email, phone, role, locationId ← locationId||location_id||locationIds[0]||null, locationIds (array), certifications||[], emergencyContact||{}, employmentStartDate, isActive ?? true }`.
`transformStaffFromBackend` → same fields read from snake_case, plus `id`, computed `name = "<first> <last>".trim()`, `locationIds ← location_ids||locationIds||[location_id]`, `createdAt`, `updatedAt`.

`transformBoatToBackend` → `{ name, locationId, capacity, equipmentOnboard||[], isActive??true }` (camelCase; comment says a previous snake_case version was rejected by the backend's `forbidNonWhitelisted`).
`transformBoatFromBackend` → `{ id, name, locationId ← location_id, capacity, equipmentOnboard ← equipment_onboard||[], isActive ← is_active??true, createdAt, updatedAt }`.

`transformDiveSiteToBackend` → `{ name, locationId, type||'diving', depthRange||{min:0,max:0}, difficultyLevel||'beginner', conditions||{}, isActive??true }`. Mock-only fields `current`, `waves`, `travelTime`, `description`, `difficulty`, `depth` are **dropped**.
`transformDiveSiteFromBackend` → `{ id, name, locationId ← location_id, type||'diving', depthRange ← depth_range||{min:0,max:0}, difficultyLevel ← difficulty_level||'beginner', conditions||{}, isActive??true, createdAt, updatedAt }`.

`transformBoatPrepToBackend` → `{ locationId, date, session, boatId||null, diverIds||[], diveSiteId||null, actualDiveSiteId||null, diveSiteStatus||{}, postDiveReport||null, staff||{} }` (createdAt/updatedAt intentionally omitted — backend rejects them).
`transformBoatPrepFromBackend` → same from snake_case (`boat_id`, `diver_ids`, `dive_site_id`, `actual_dive_site_id`, `dive_site_status`, `post_dive_report`) + `id`, `createdAt`, `updatedAt`.

`transformEquipmentToBackend` → only defined fields among `locationId`, `name`, `category`, `type`, `size`, `condition`, `serialNumber`, `isAvailable`, `isActive`, plus **always** `details` = `data.details` overlaid with any defined root keys from `DETAIL_KEYS` = `notes, brand, model, thickness, style, hood, purchaseDate, warranty, lastRevisionDate, nextRevisionDate, firstStageBrand, firstStageModel, secondStageBrand, secondStageModel, octopusBrand, octopusModel`.
`transformEquipmentFromBackend` → `{ id, locationId, name, category, type, size, condition, serialNumber||'', isAvailable??true, isActive??true, <each DETAIL_KEY flattened from details, default ''>, details, createdAt, updatedAt }`.

`transformScheduleSlotGuideToBackend` → only defined: `locationId`, `date`, `slotType`, `slotKey`, `boatId` (||null), `guideIds` (||[]).
`transformScheduleSlotGuideFromBackend` → `{ id, locationId, date, slotType ← slot_type, slotKey ← slot_key, boatId||null, guideIds ← guide_ids||[], createdAt, updatedAt }`.

`transformPartnerInvoiceToBackend` → only defined: `partnerId`, `customerId`(||null), `billId`(||null), `locationId`, `invoiceDate`, `dueDate`, `paymentTermsDays`(||30), `subtotal`, `tax`, `total`, `bookingIds`(||[]), `notes`, `paidAmount`, `status`.
`transformPartnerInvoiceFromBackend` → `{ id, partnerId, customerId||null, billId||null, locationId, invoiceNumber ← invoice_number, invoiceDate, dueDate, paymentTermsDays||30, subtotal/tax/total (parseFloat, 0), paidAmount (parseFloat, 0), status||'pending', bookingIds||[], notes||null, paidAt ← paid_at||null, createdAt, updatedAt, partner ← transformPartnerFromBackend(data.partners) or null }`.

`transformCustomerBillToBackend` → `{ customerId, locationId, billNumber, stayStartDate, billDate, bookingIds||[], billItems||[], subtotal||0, tax||0, total||0, partnerPaidTotal||0, customerPaidTotal||0, partnerTax||0, customerTax||0, breakdown||{}, notes }`.
`transformCustomerBillFromBackend` → same (numbers `parseFloat`ed) + `id`, `customer ← data.customers||data.customer`, `location ← data.locations||data.location`, `createdAt`, `updatedAt`.

### services/api/mockApiAdapter.js

Async object delegating 1:1 to `mockDataService`: `getAll(resource)`, `getById(resource, id)`, `create(resource, data)`, `update(resource, id, data)`, `delete(resource, id)` → `mockDataService.remove`, `getBookingsByDate(date)`, `getTodaysBookings()`, `getUpcomingBookings(days = 3)`, `getCustomerBookings(customerId)`, `searchCustomers(query)`, `getAvailableEquipment(category)`, `calculatePrice(numberOfDives, addons = {})`, `getVolumeDiscountPrice(cumulativeDives)`, `getStatistics()`. No transforms.

### services/api/mockDataService.js

Calls `initializeMockData()` at import. Storage key per resource: `dcms_${resource}`.

| Function | Behaviour |
|---|---|
| `saveAll(resource, data)` (internal) | `localStorage.setItem('dcms_'+resource, JSON)`; then if `window.syncService` exists, `syncToServer(resource, data)` (errors warned). |
| `generateId()` (internal) | `` `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` `` — not a UUID. |
| `getAll(resource)` | Parsed array or `[]`. |
| `getById(resource, id)` | `find(item.id === id)` (strict equality) or `undefined`. |
| `create(resource, data)` | `{...data, id: generateId()}` appended (any `id` in data is overwritten); saves; returns new item. |
| `update(resource, id, data)` | Shallow merge ignoring `undefined` values; saves; for `customers` dispatches `dcms_customer_updated`; returns item or `null` if not found. |
| `remove(resource, id)` | Filters out id; saves; always returns `true`. |
| `getBookingsByDate(date)` | `booking.bookingDate === date`. |
| `getTodaysBookings()` | UTC today (`toISOString`). |
| `getUpcomingBookings(days = 3)` | `todayStr <= bookingDate <= todayStr+days` (string compare, inclusive), sorted by `bookingDate` asc. |
| `getCustomerBookings(customerId)` | `booking.customerId === customerId`. |
| `searchCustomers(query)` | Case-insensitive substring on `firstName`, `lastName`, `email`; case-sensitive substring on `phone`. Throws if a customer lacks `firstName`/`lastName`. |
| `getAvailableEquipment(category)` | `eq.isAvailable` truthy, optionally `eq.category === category`. |
| `calculatePrice(numberOfDives, addons = {})` | Uses `getAll('pricingConfig')[0]` (the **tourist** config). Fallback `numberOfDives * 46` if missing. `tier = tiers.find(t => t.dives >= numberOfDives) \|\| last tier`; `price = tier.price * numberOfDives + (addons.nightDive ? config.addons.nightDive : 0) + (addons.personalInstructor ? config.addons.personalInstructor : 0)`. |
| `getVolumeDiscountPrice(cumulativeDives)` | Same tier lookup, returns `tier.price` (fallback `46`). |
| `getStatistics()` | `{ totalBookings, todaysBookings, totalRevenue (Σ totalPrice), todaysRevenue, pendingBookings (status 'pending'), confirmedBookings (status 'confirmed') }`. |

### services/apiService.js

Unified async interface. Default export object and named exports:

`getAll(resource)`, `getById(resource, id)`, `create(resource, data)`, `update(resource, id, data)`, `remove(resource, id)` (→ `adapter.delete`), `getBookingsByDate(date)` (default-object only, not a named export), `getTodaysBookings()`, `getUpcomingBookings(days = 3)`, `getCustomerBookings(customerId)`, `searchCustomers(query)`, `getAvailableEquipment(category)`, `calculatePrice(numberOfDives, addons = {})`, `getVolumeDiscountPrice(cumulativeDives)`, `getStatistics()`, `getMode()` → `API_CONFIG.mode`, `isMockMode()`.

Each: `try { return await adapter.X(...) } catch (e) { console.error('<message>', e); throw e; }`. No retries.

### services/dataService.js

Calls `initializeMockData()` at import (also in api mode — so seed data is written to localStorage even when unused). Exports (named + default object): `getAll`, `getById`, `create`, `update`, `remove`, `getBookingsByDate` (named only; missing from default export), `getTodaysBookings`, `getUpcomingBookings(days = 3)`, `getCustomerBookings`, `searchCustomers`, `getAvailableEquipment`, `calculatePrice`, `getVolumeDiscountPrice`, `getStatistics`. Each checks `isMockMode()` **per call**: mock → `mockDataService.X` (sync value), api → `apiService.X` (Promise).

### services/sharedStorage.js

Singleton `SharedStorageSync`, **never imported** (dead code). Constants: `SYNC_KEY = 'dcms_shared_sync'`, `SYNC_INTERVAL = 1000` ms, `DCMS_KEYS = ['dcms_bookings','dcms_customers','dcms_locations','dcms_equipment']`.

| Member | Behaviour |
|---|---|
| constructor | `isPublic = location.port === '3000'`; `isAdmin = port === '3001' \|\| port === ''`; calls `init()`. |
| `init()` | `startSync()`; listens to `storage` and `dcms_data_changed`. |
| `handleStorageChange(e)` | If `e.key` starts with `dcms_` → `markForSync()`. |
| `handleDataChange()` | `markForSync()`. |
| `markForSync()` | Writes `{timestamp: Date.now(), source: 'public'\|'admin'}` to `dcms_shared_sync`. |
| `startSync()` | `sync()` now and every 1 s. |
| `sync()` | If no `dcms_shared_sync`, writes it; else, for each `DCMS_KEYS` key missing, writes `[]`. Does not copy data. |
| `ensureSynced()` | `sync()`. |
| `destroy()` | Clears interval; `removeEventListener` with unbound handlers (ineffective). |

### services/syncService.js

Singleton, constructed at import; `index.jsx` sets `window.syncService`. Everything is a no-op unless `isMockMode()`.

Constants: `SYNC_SERVER_URL = 'http://localhost:3002/api/sync'`, `SYNC_INTERVAL = 30000` ms. Resources synced: `['bookings','customers','locations','equipment']` (keys `dcms_<resource>`).

| Method | Behaviour |
|---|---|
| constructor | In mock mode: `startSync()` and `init()`. State: `syncInterval`, `isEnabled`, `lastSync{key:ms}`, `lastPushedHash{key:rawString}`, `connectionRetryTimer`, `connectingPromise`, `hasStarted`. |
| `init()` | De-duplicated via `connectingPromise`. `GET http://localhost:3002/health` (`cache: 'no-store'`, 3 s abort). OK → `isEnabled = true`, `syncAll()`. Failure → `isEnabled = false`, DEV-only warn, returns `false`; no reconnect scheduled. |
| `scheduleReconnect()` | No-op. |
| `ensureConnection()` | `true` if enabled, else awaits `init()`. |
| `syncToServer(resource, data)` | `POST ${SYNC_SERVER_URL}/<resource>` JSON body (whole array). Errors warned. |
| `getLastUpdate(resource)` | `GET ${SYNC_SERVER_URL}/<resource>/lastUpdate` → `result.lastUpdate` or `null`. |
| `syncFromServer(resource)` | `GET ${SYNC_SERVER_URL}/<resource>` → JSON or `null`. |
| `startSync()` | Once: interval `syncAll()` every 30 s; first `syncAll()` after 1 s. |
| `syncNow()` | `syncAll(true)`. |
| `syncAll(manual = false)` | (1) **Push**: for each resource, if raw localStorage string differs from `lastPushedHash[key]`, POST it. (2) **Pull**: get `lastUpdate`; skip if not manual and `serverLastUpdate <= lastSync[key]`; fetch server array; if server is empty but local not, push local and skip; for `customers`, merge server items with local ones preserving local `customerType` and `centerSkillLevel` (defaults `'tourist'` / `'beginner'` if both missing); if any new/removed ids, length change, or JSON difference → write localStorage and dispatch `dcms_<resource>_synced` with merged data; update `lastSync[key]`. |
| `destroy()` | Clears interval. |

Conflict policy: server wins (except the two admin-only customer fields); last writer wins at whole-array granularity.

### API endpoints used

All paths are relative to `API_CONFIG.baseURL` (which already ends in `/api`).

| Method | Path | Used for | Adapter function |
|---|---|---|---|
| GET | `/<endpoint>` | List any resource (see mapping) | `getAll` |
| GET | `/<endpoint>/:id` | Fetch one | `getById` |
| POST | `/<endpoint>` | Create | `create` |
| PUT | `/<endpoint>/:id` | Update (full or partial body) | `update` |
| DELETE | `/<endpoint>/:id` | Delete | `delete` |
| GET | `/bookings?date=YYYY-MM-DD` | Bookings on a date / today | `getBookingsByDate`, `getTodaysBookings` |
| GET | `/bookings` | Upcoming bookings (filtered client-side) | `getUpcomingBookings` |
| GET | `/bookings?customerId=:id` | Customer's bookings | `getCustomerBookings` |
| GET | `/customers?search=:q` | Customer search | `searchCustomers` |
| GET | `/equipment?available=true[&category=:c]` | Available equipment | `getAvailableEquipment` |
| GET | `/statistics[?locationId=:id]` | Dashboard stats | `getStatistics` |
| (none) | – | Pricing (hard-coded fallback 46 €/dive) | `calculatePrice`, `getVolumeDiscountPrice` |

Concrete CRUD paths reachable through the generic functions (resources known from adapters/seed data): `/customers`, `/bookings`, `/boats`, `/dive-sites`, `/equipment`, `/locations`, `/settings`, `/users`, `/staff`, `/partners`, `/partner-invoices`, `/customer-bills`, `/boat-preps`, `/government-bonos`, `/tenants`, `/schedule-slot-guides`, plus any other resource name passed by callers (e.g. `/stays`, `/pricingConfig`, `/packPurchases` would be requested verbatim — whether the backend serves them is outside this scope).

Sync server (mock mode only, not the backend): `GET http://localhost:3002/health`, `GET|POST http://localhost:3002/api/sync/<resource>`, `GET http://localhost:3002/api/sync/<resource>/lastUpdate`.

### Entity catalogue

Types: `str`, `num`, `bool`, `date` (`YYYY-MM-DD` string), `ts` (ISO timestamp), `uuid`, `obj`, `arr`. "Seed" = value/example from `mockData.js`; "RA" = realApiAdapter behaviour.

#### customers (`dcms_customers`, `/customers`)

| Field | Type | Example/default | Notes |
|---|---|---|---|
| `id` | uuid/str | `U(020)`, `cust-mock-001` | Mock-created: `<ms>-<rand9>`. |
| `firstName` | str | `John` | Required by backend DTO (comment). RA ← `first_name`. |
| `lastName` | str | `Smith` | RA ← `last_name`. |
| `email` | str | `john.smith@example.com` | |
| `phone` | str | `+44 7700 900123` | |
| `dob` | date | `1985-05-15` | |
| `nationality` | str | `British`, `Spanish`, `Irish`, `French`, `German`, `Italian`, `Slovak`, `Portuguese`, `Indian` | Free text (nationality adjective). |
| `gender` | str | `''` | Stored in `preferences.gender` on backend. |
| `address` | obj/str | – | Not in seed; passed through. |
| `customerType` | enum | `tourist` | Seen: `tourist`, `local`, `recurrent`. Empty/absent = non-diving (bike-rental) customer. Sync default `tourist`. |
| `centerSkillLevel` | enum | `beginner` | Seen: `beginner`, `intermediate`, `advanced`. Backend: inside `preferences`. Default `beginner`. |
| `isApproved` | bool | `false` | Backend: inside `preferences`. |
| `preferences` | obj | see below | Equipment sizes; backend also stores hoisted fields here. |
| `preferences.bcdSize` | enum | `M` | `XS`,`S`,`M`,`L`,`XL` |
| `preferences.finsSize` | enum | `M` | `S`,`M`,`L`,`XL` |
| `preferences.bootsSize` | enum | `M` | `S`,`M`,`L`,`XL` |
| `preferences.wetsuitSize` | str | `M` | `S`,`M`,`L`,`XL`, also `5mm` (cust-mock-016, inconsistent) |
| `preferences.tankSize` | str | `12L` | `10L`,`12L`,`15L`; absent for some |
| `preferences.ownEquipment` | bool | `false` | Removed for non-diving customers (RA). |
| `preferences.equipmentOwnership`, `preferences.suitPreferences` | obj | – | Only referenced in RA cleanup; shape unclear from code. |
| `medicalConditions` | arr | `[]` | Diving customers only (RA). |
| `restrictions` | any | – | Passed through. |
| `certifications` | arr of obj | – | Backend: `preferences.certifications` (or `customer_certifications`). |
| `certifications[].agency` | enum | `PADI` | Seen: `PADI`, `SSI`, `CMAS`. Settings also lists `VDST`. |
| `certifications[].level` | str | `AOW` | Seen: `OW`, `AOW`, `NIGHT`, `RESCUE`, `DM`, `1*`, `2*`. |
| `certifications[].certificationNumber` | str | `PADI-AOW-123456` | |
| `certifications[].issueDate` | date | `2020-06-15` | |
| `certifications[].expiryDate` | date\|null | `null` | |
| `certifications[].verified` | bool | `true` | |
| `certifications[].verifiedDate` | date | `2025-01-10` | Present only when verified (some verified records lack it). |
| `medicalCertificate` | obj | `{hasCertificate:false}` | Fields: `hasCertificate` bool, `certificateNumber`, `issueDate`, `expiryDate`, `verified` bool, `verifiedDate`. Empty strings when absent. |
| `divingInsurance` | obj | `{hasInsurance:false}` | Fields: `hasInsurance` bool, `insuranceProvider` (e.g. `DAN Europe`), `policyNumber`, `issueDate`, `expiryDate`, `verified`, `verifiedDate`. |
| `uploadedDocuments` | arr | `[]` | Backend: `preferences.uploadedDocuments`; element shape unclear from code. |
| `notes` | str | `Prefers morning dives` | |
| `isActive` | bool | `true` | RA ← `is_active`. |
| `createdAt`/`updatedAt` | ts | – | RA only. |

#### bookings (`dcms_bookings`, `/bookings`)

| Field | Type | Example/default | Notes |
|---|---|---|---|
| `id` | uuid | `U(001)` | |
| `customerId` | uuid | `U(020)` | RA ← `customer_id`. |
| `locationId` | uuid | `U(001)` | RA ← `location_id`. |
| `boatId` | uuid | `U(004)` | RA ← `boat_id`. |
| `diveSiteId` | uuid | `U(005)` | RA ← `dive_site_id`. |
| `staffPrimaryId` | uuid | – | RA ← `staff_primary_id`. |
| `bookingDate` | date | today (seed computed at load) | RA ← `booking_date`. |
| `activityType` | str | `diving` | Only `diving` in seed; code elsewhere implies bike rental (unclear from scope). |
| `numberOfDives` | num | – | RA default `1`. Not in seed. |
| `diveSessions` | obj of bool | `{morning:true, afternoon:false}` | Keys seen: `morning`, `afternoon`, `night`; RA also detects `tenFifteen`, `'10:15'`. Backend stores it inside `equipment_needed`. |
| `price` | num | `46.00` | |
| `discount` | num | `0` | |
| `totalPrice` | num | `46.00` | RA `parseFloat(total_price)`. |
| `status` | enum | `confirmed` | Seen: `confirmed`; RA default `pending`. Stats count `pending`/`confirmed`. |
| `paymentMethod` | enum | `card` | Seen: `card`, `cash`, `account` (backend `deferred` ↔ frontend `account`). |
| `paymentStatus` | enum | `paid` | Seen `paid`; RA default `pending`. |
| `equipmentNeeded` | arr\|obj | `['BCD','Regulator','Mask','Fins']` | Array of equipment type names in seed; object of dive sessions for public-site bookings. |
| `ownEquipment` | bool | `false` | Seed only. |
| `notes` | str | `First time diver` | |
| `specialRequirements` | str | – | RA ← `special_requirements`. |
| `bonoId` | uuid | – | RA ← `bono_id` (government bono). |
| `stayId` | uuid | – | RA ← `stay_id`. |
| `moleSlotTime` | str\|null | `null` | RA ← `mole_slot_time` (shore "Mole" time slot). |
| `session` | str\|null | `null` | Boat session. |
| `customer`, `location`, `boat`, `diveSite` | obj | – | Nested relations if backend includes `customers`, `locations`, `boats`, `dive_sites`. |
| `createdAt`/`updatedAt` | ts | – | |

#### equipment (`dcms_equipment`, `/equipment`)

| Field | Type | Example/default | Notes |
|---|---|---|---|
| `id` | uuid | `U(030)` | |
| `locationId` | uuid | `U(001)` | All seed items at Caleta de Fuste. |
| `name` | str | `BCD Mares Avant Quattro` | |
| `category` | str | `diving` | Only `diving` seen. |
| `type` | enum | `BCD` | Seen: `BCD`, `Regulator`, `Mask`, `Fins`, `Wetsuit`, `Semi-Dry`, `Boots`, `Computer`, `Torch`. |
| `size` | enum | `M` | `XS`,`S`,`M`,`L`,`XL`,`XXL`,`Standard`. |
| `condition` | enum | `excellent` | Seen: `excellent`, `good`. |
| `serialNumber` | str | `BCD-XS-001` | RA default `''`. |
| `isAvailable` | bool | `true` | RA default `true`. |
| `isActive` | bool | – | RA default `true`. |
| `brand`, `model` | str | `Mares`, `Avant Quattro` | Backend: `details` JSON. |
| `purchaseDate` | date | `2023-01-15` | `details`. |
| `warranty` | str | `2 years` | `details`. |
| `lastRevisionDate`, `nextRevisionDate` | date | `2024-06-01`, `2025-06-01` | `details`. |
| `thickness` | str | `3mm` | Suits: `3mm`,`5mm`,`7mm`. `details`. |
| `style` | str | `Shorty` | `Shorty`, `Full`, `Semi-Dry`. `details`. |
| `hood` | str | `No` | `Yes`/`No` strings. `details`. |
| `firstStageBrand/Model`, `secondStageBrand/Model`, `octopusBrand/Model` | str | `Aqualung`/`Calypso` | Regulators. `details`. |
| `notes` | str | `New BCD, excellent condition` | `details`. |
| `details` | obj | `{}` | Backend JSON column holding the above. |

#### boats (`dcms_boats`, `/boats`)

| Field | Type | Example/default | Notes |
|---|---|---|---|
| `id` | uuid | `U(004)` | |
| `locationId` | uuid | `U(001)` | RA ← `location_id`. Required by backend. |
| `name` | str | `White Magic` | |
| `capacity` | num | `10` | |
| `equipmentOnboard` | arr of str | see seed | Values: `oxygen`, `first_aid`, `radio`, `mobile_phone`, `gps`, `life_jackets`, `flares`. RA ← `equipment_onboard`. |
| `isActive` | bool | `true` | |
| `createdAt`/`updatedAt` | ts | – | RA. |

#### diveSites (`dcms_diveSites`, `/dive-sites`)

| Field | Type | Example/default | Notes |
|---|---|---|---|
| `id` | uuid | `U(005)` | |
| `locationId` | uuid | `U(001)` | |
| `name` | str | `Anfiteatro` | |
| `type` | enum | `diving` | Seen: `diving`, `beach`, `cave`, `reef`. RA default `diving`. |
| `depthRange` | `{min:num,max:num}` | `{min:12,max:21}` | Caleta sites. RA default `{min:0,max:0}`, ← `depth_range`. |
| `difficultyLevel` | enum | `beginner` | Caleta sites: `beginner`, `advanced`. RA default `beginner`. |
| `difficulty` | enum | `intermediate` | **Las Playitas sites only** (inconsistent name): `beginner`, `intermediate`, `advanced`. Dropped by RA. |
| `depth` | str | `3-8m` | Las Playitas sites only (string instead of `depthRange`). Dropped by RA. |
| `current` | str | `little-medium` | Seen: `little-medium`, `very little`, `moderate`, `moderate-strong`, `moderate-strong (drift)`, `low`, `medium`. Mock only (not in RA). |
| `waves` | str | `unprotected` | Seen: `unprotected`, `protected`, `low`, `medium`. Mock only. |
| `travelTime` | str | `5-10 min` | Mock only. |
| `description` | str | long text | Mock only. |
| `conditions` | obj | `{}` | Backend JSON (RA); presumably where current/waves belong — unclear from code. |
| `isActive` | bool | – | RA default `true`. |

#### locations (`dcms_locations`, `/locations`)

| Field | Type | Example/default | Notes |
|---|---|---|---|
| `id` | uuid | `U(001)` | |
| `name` | str | `Caleta de Fuste` | |
| `type` | enum | `diving` | Seen: `diving`, `bike_rental`. |
| `address` | obj | `{street, city, postalCode, country}` | |
| `isActive` | bool | `true` | |
| `pricing` | obj | see Seed section | Diving: `customerTypes`, `equipment`, `addons`, `diveInsurance`, `beverages`, `other`, `tax`. Bike: `bikeTypes`, `equipment`, `insurance`, `tax`. |
| `pricing.customerTypes.<type>` | obj | – | `{name, description, pricing: 'tiered'\|'fixed', orientationDive?, discoverDive?, diveTiers?[{dives, price, description}], pricePerDive?}` |
| `pricing.bikeTypes.<type>` | obj | – | `{name, description, pricing:'tiered', rentalTiers:[{days, price, description}]}` |
| `pricing.tax` | obj | `{igic_rate: 0.07, igic_label: 'IGIC (7%)'}` | |

No RA transform (sent/received as-is).

#### pricingConfig (`dcms_pricingConfig`, mock only)

| Field | Type | Example | Notes |
|---|---|---|---|
| `customerType` | enum | `tourist` | `tourist`, `local`, `recurrent`. No `id`. |
| `orientationDive` | num | `32.00` | tourist only |
| `tiers` | arr `{dives, price}` | see seed | tourist only; used by `calculatePrice` (only element `[0]`) |
| `pricePerDive` | num | `35.00` | local/recurrent |
| `addons` | `{nightDive, personalInstructor}` | `20.00`, `100.00` | camelCase here vs snake_case in settings/locations |
| `diveInsurance` | `{one_day, one_week, one_month, one_year}` | `7, 18, 25, 45` | |

#### governmentBonos (`dcms_governmentBonos`, `/government-bonos`)

| Field | Type | Example | Notes |
|---|---|---|---|
| `id` | uuid | `U(040)` | Collides with an equipment id. |
| `code` | str | `BONO-2025-001` | |
| `type` | str | `discount_code` | only value seen |
| `discountPercentage` | num | `20` | |
| `maxAmount` | num | `200` | |
| `validFrom` / `validUntil` | date | `2025-01-01` / `2025-12-31` | |
| `isActive` | bool | `true` | |

No RA transform.

#### settings (`dcms_settings`, `/settings`)

Frontend shape (flat): `{ id, key?, description?, certificationUrls, prices, …any other keys, createdAt, updatedAt }`. Backend shape: `{ id, key (default 'default'), value: {…all other fields}, description }` (RA flattens/wraps).

| Field | Type | Example | Notes |
|---|---|---|---|
| `id` | uuid | `U(001)` | Same as Caleta location id. |
| `certificationUrls` | obj agency→URL | see seed | Keys `SSI`, `PADI`, `CMAS`, `VDST`. |
| `prices` | obj | see seed | `customerTypes`, `equipment`, `addons`, `diveInsurance`, `beverages`, `other`, `tax` (equipment keys are snake_case lowercase here). |

#### users (`dcms_users`, `/users`)

| Field | Type | Example | Notes |
|---|---|---|---|
| `id` | uuid | `U(099)` | |
| `username` | str | `superadmin` | |
| `name` | str | `Super Administrator` | |
| `email` | str | `superadmin@deep-blue-diving.com` | |
| `password` | str | `<redacted>` | Plaintext in mock seed (superadmin only); sent to backend on create/update, never returned. |
| `role` | enum | `admin` | Seen: `superadmin`, `admin`, `boat_pilot`, `guide`, `intern`. |
| `permissions` | arr | `[]` | RA only. |
| `locationAccess` | arr of uuid | `[U(001)]` | Absent/empty = global access (seed comment). RA ← `location_access`. |
| `tenantSlug` | str\|null | – | RA ← `tenantSlug`/`tenant_slug`. |
| `tenant_id` | uuid | – | RA passes through (snake_case kept). |
| `isActive` | bool | `true` | |
| `createdAt` | ts | `2025-01-01T00:00:00Z` | |
| `updatedAt` | ts | – | RA. |

#### staff (`/staff`, API only)

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | uuid | | |
| `firstName`, `lastName` | str | | ← `first_name`, `last_name` |
| `name` | str | computed | `"first last".trim()`, read-only |
| `email`, `phone` | str | | |
| `role` | str | | values unclear from code |
| `locationId` | uuid\|null | `locationIds[0]` | ← `location_id` |
| `locationIds` | arr uuid | `[]` | ← `location_ids` |
| `certifications` | arr | `[]` | shape unclear from code |
| `emergencyContact` | obj | `{}` | ← `emergency_contact` |
| `employmentStartDate` | date | | ← `employment_start_date` |
| `isActive` | bool | `true` | |
| `createdAt`/`updatedAt` | ts | | |

#### partners (`/partners`, API only)

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | uuid | | |
| `name` | str | | |
| `companyName` | str | | ← `company_name` |
| `contactEmail`, `contactPhone` | str | | ← `contact_email`, `contact_phone` |
| `webhookUrl` | str | | ← `webhook_url` |
| `commissionRate` | num\|null | `null` | `parseFloat(commission_rate)` |
| `allowedLocations` | arr uuid | `[]` | ← `allowed_locations` |
| `apiKey` | str | | ← `api_key`; read-only |
| `apiSecret` | str | | only in create/regenerate responses |
| `settings` | obj | `{}` | |
| `isActive` | bool | `true` | |
| `createdAt`/`updatedAt` | ts | | |

#### partnerInvoices (`/partner-invoices`, API only)

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | uuid | | |
| `partnerId` | uuid | | ← `partner_id` |
| `customerId` | uuid\|null | `null` | |
| `billId` | uuid\|null | `null` | links to customerBills |
| `locationId` | uuid | | |
| `invoiceNumber` | str | | read-only (server-generated, not sent) |
| `invoiceDate`, `dueDate` | date | | |
| `paymentTermsDays` | num | `30` | |
| `subtotal`, `tax`, `total` | num | `0` | parseFloat |
| `paidAmount` | num | `0` | ← `paid_amount` |
| `status` | str | `pending` | other values unclear from code |
| `bookingIds` | arr uuid | `[]` | |
| `notes` | str\|null | `null` | |
| `paidAt` | ts\|null | `null` | read-only |
| `partner` | obj\|null | | transformed nested `partners` |
| `createdAt`/`updatedAt` | ts | | |

#### customerBills (`/customer-bills`, API only)

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | uuid | | |
| `customerId`, `locationId` | uuid | | |
| `billNumber` | str | | ← `bill_number` |
| `stayStartDate` | date | | ← `stay_start_date` |
| `billDate` | date | | |
| `bookingIds` | arr uuid | `[]` | |
| `billItems` | arr | `[]` | ← `bill_items`; item shape unclear from code |
| `subtotal`, `tax`, `total` | num | `0` | |
| `partnerPaidTotal`, `customerPaidTotal` | num | `0` | split of amount paid by partner vs customer |
| `partnerTax`, `customerTax` | num | `0` | |
| `breakdown` | obj | `{}` | shape unclear from code |
| `notes` | str | | |
| `customer`, `location` | obj | | nested raw relations |
| `createdAt`/`updatedAt` | ts | | |

#### boatPreps (`dcms_boatPreps` seeded `[]`, `/boat-preps`)

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | uuid | | |
| `locationId` | uuid | | |
| `date` | date | | |
| `session` | str | | values unclear from code (booking dive sessions suggest `morning`/`afternoon`/`night`) |
| `boatId` | uuid\|null | `null` | |
| `diverIds` | arr uuid | `[]` | customer ids on the boat |
| `diveSiteId` | uuid\|null | `null` | planned site |
| `actualDiveSiteId` | uuid\|null | `null` | site actually dived |
| `diveSiteStatus` | obj | `{}` | shape unclear from code |
| `postDiveReport` | obj\|null | `null` | shape unclear from code |
| `staff` | obj | `{}` | shape unclear from code |
| `createdAt`/`updatedAt` | ts | | server-managed, never sent |

#### scheduleSlotGuides (`/schedule-slot-guides`, API only)

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | uuid | | |
| `locationId` | uuid | | |
| `date` | date | | |
| `slotType` | str | | Mole time-slot or boat session (comment); exact enum unclear from code |
| `slotKey` | str | | e.g. slot time or session key; unclear from code |
| `boatId` | uuid\|null | `null` | |
| `guideIds` | arr uuid | `[]` | |
| `createdAt`/`updatedAt` | ts | | |

#### tenants (`/tenants`, API only)

Passed through with no transform in either direction; fields unclear from scope.

#### packPurchases (`dcms_packPurchases`, mock only)

Seeded as `[]`; no fields defined in scope.

#### statistics (`/statistics`, read-only)

Mock shape: `{ totalBookings, todaysBookings, totalRevenue, todaysRevenue, pendingBookings, confirmedBookings }`. API shape returned raw (unclear from code).

Entities requested but **not present** in scope files: tanks, stays (only `booking.stayId` exists), breaches, locationTypes, prices as a separate collection (prices live in `settings.prices` and `locations[].pricing`).

### Seed / mock data content

`mockData.js` exports `initialMockData` (default export too) and `initializeMockData()`.

#### Counts

| Collection | Count | Seeded into localStorage? |
|---|---|---|
| bookings | 4 | **No** — key forced to `[]` (see below) |
| customers | 23 (3 detailed + 20 `cust-mock-*`) | **No** — key forced to `[]` |
| equipment | 64 | Yes, if key missing |
| boats | 4 | Yes, if missing |
| diveSites | 18 (15 Caleta + 3 Las Playitas) | Yes, if missing |
| locations | 3 | Yes, if missing |
| pricingConfig | 3 | Yes, if missing |
| governmentBonos | 1 | Yes, if missing |
| settings | 1 | Yes, if missing |
| users | 13 | Yes, if missing; superadmin re-added if absent |
| boatPreps | 0 | `[]` if missing |
| packPurchases | 0 | `[]` if missing |

#### initializeMockData()

1. `maybeResetResource('dcms_customers', isMockCustomer)` — removes the whole key if any record has email `john.smith@example.com`, `maria.garcia@example.com`, `carlos.rodriguez@example.com`, or id starting with `cust-mock`. Parse error → key removed.
2. `maybeResetResource('dcms_bookings', isMockBooking)` — removes key if any booking id starts with `550e8400-e29b-41d4-a716-44665544000` (matches `U(000)`–`U(009)`).
3. `dcms_bookings` and `dcms_customers` set to `[]` if missing (seed bookings/customers are never written).
4. `ensureKey` (write only if missing) for `dcms_equipment`, `dcms_boats`, `dcms_diveSites`, `dcms_locations`, `dcms_pricingConfig`, `dcms_governmentBonos`, `dcms_settings`, `dcms_boatPreps` (`[]`), `dcms_packPurchases` (`[]`).
5. `ensureKey('dcms_users', initialMockData.users)`, then `ensureSuperadmin()`: if no user has role `superadmin` or username `superadmin`, prepend the superadmin record (id `U(099)`, password `<redacted>`). On error → `ensureKey('dcms_users', …)`.

Runs at import of both `dataService.js` and `mockDataService.js`, regardless of mode.

#### Locations

| id | name | type | address |
|---|---|---|---|
| `U(001)` | Caleta de Fuste | `diving` | Muelle Deportivo / Calle Teneriffe, Caleta de Fuste, 35610, Spain |
| `U(002)` | Las Playitas | `diving` | Playa de Las Playitas, Las Playitas, 35610, Spain |
| `U(003)` | Bike Rental | `bike_rental` | Bike Rental Location, Fuerteventura, 35610, Spain |

All `isActive: true`.

##### Diving price lists per location (`locations[].pricing`), EUR

Customer types:

| Item | Caleta de Fuste | Las Playitas |
|---|---|---|
| tourist `pricing` | `tiered` | `tiered` |
| tourist `orientationDive` | 32.00 | 35.00 |
| tourist `discoverDive` | 100.00 | 100.00 |
| tier `dives: 1` "1-2 dives" | 46.00 | 45.00 |
| tier `dives: 3` "3-5 dives" | 44.00 | 43.00 |
| tier `dives: 6` "6-8 dives" | 42.00 | 41.00 |
| tier `dives: 9` "9-12 dives" | 40.00 | 39.00 |
| tier `dives: 13` "13+ dives" | 38.00 | 37.00 |
| local (`fixed`) `pricePerDive` | 35.00 | 33.00 |
| recurrent (`fixed`) `pricePerDive` | 32.00 | 30.00 |

Names/descriptions: tourist "Tourist" / "Visiting divers with volume discounts"; local "Local" / "Local residents with fixed pricing"; recurrent "Recurrent" / "Regular customers with fixed pricing". (Las Playitas comments: tourist tiers are "Caleta Dive from Playitas"; orientation is "Playitas Dive".)

Equipment rental (keys as in data):

| Key | Caleta | Las Playitas |
|---|---|---|
| `completeEquipment` | 13.00 | 12.00 |
| `Suit` | 5.00 | 4.50 |
| `BCD` | 5.00 | 4.50 |
| `Regulator` | 5.00 | 4.50 |
| `Torch` | 5.00 | 4.50 |
| `Computer` | 3.00 | 2.50 |
| `UWCamera` | 20.00 | 18.00 |
| `mask` | 0.00 | 0.00 |
| `fins` | 0.00 | 0.00 |
| `boots` | 0.00 | 0.00 |

Addons:

| Key | Caleta | Las Playitas |
|---|---|---|
| `night_dive` | 20.00 | 18.00 |
| `personal_instructor` | 100.00 | 90.00 |
| `dive_trip_gran_tarajal_lajita` | – | 45.00 |
| `transfer_to_caleta` | – | 15.00 |

Identical for both diving locations:

| Group | Key | Price |
|---|---|---|
| `diveInsurance` | `one_day` / `one_week` / `one_month` / `one_year` | 7.00 / 18.00 / 25.00 / 45.00 |
| `beverages` | `water`, `soft_drinks`, `beer`, `coffee`, `tea` | 1.80 each |
| `other` | `clothes`, `souvenirs`, `photos`, `tips` | 0.00 each ("Variable price") |
| `tax` | `igic_rate` / `igic_label` | `0.07` / `"IGIC (7%)"` (Canary Islands IGIC) |

##### Bike rental pricing (`U(003)`)

`bikeTypes.street_bike` ("Street Bike") and `bikeTypes.gravel_bike` ("Gravel Bike"), both `pricing: 'tiered'`, identical `rentalTiers`:

| `days` | `price` | description |
|---|---|---|
| 2 | 80.00 | "2 days" (total) |
| 3 | 114.00 | "3 days" (total) |
| 4 | 36.00 | "4-6 days (36€/day)" |
| 7 | 34.00 | "7-10 days (34€/day)" |
| 11 | 30.00 | "11-13 days (30€/day)" |
| 14 | 25.00 | "14+ days (25€/day)" |

Equipment: `click_pedals` 10.00, `helmet` 10.00, `gps_computer` 15.00. Insurance: `one_day` 5.00, `one_week` 15.00, `one_month` 25.00. Tax: `igic_rate` 0.07, `igic_label` "IGIC (7%)".

#### Settings (single record, id `U(001)`)

`certificationUrls`:

| Agency | URL |
|---|---|
| SSI | https://www.divessi.com/en/verify-certification |
| PADI | https://www.padi.com/verify |
| CMAS | https://www.cmas.org/certification-verification |
| VDST | https://www.vdst.de/zertifikatspruefung |

`prices`: `customerTypes` identical to Caleta de Fuste (tourist tiered: orientationDive 32.00, tiers 46/44/42/40/38 at 1/3/6/9/13 dives with same descriptions; **no `discoverDive`**; local fixed 35.00; recurrent fixed 32.00). `equipment` (snake_case keys): `complete_equipment` 13.00 (comment: "Full equipment set (first 8 dives only)"), `suit` 5.00, `bcd` 5.00, `regulator` 5.00, `torch` 5.00, `computer` 3.00, `uw_camera` 20.00, `mask`/`fins`/`boots` 0.00. `addons`: `night_dive` 20.00, `personal_instructor` 100.00. `diveInsurance` (comment "mandatory"): 7/18/25/45. `beverages`: all 1.80. `other`: all 0.00. `tax`: `igic_rate` 0.07, `igic_label` "IGIC (7%)".

#### pricingConfig

| customerType | orientationDive | tiers `{dives: price}` | pricePerDive | addons | diveInsurance |
|---|---|---|---|---|---|
| tourist | 32.00 | 1: 46, 3: 44, 6: 42, 9: 40, 13: 38 | – | nightDive 20, personalInstructor 100 | 7 / 18 / 25 / 45 |
| local | – | – | 35.00 | same | same |
| recurrent | – | – | 32.00 | same | same |

#### Government bono

| id | code | type | discount | max | valid |
|---|---|---|---|---|---|
| `U(040)` | BONO-2025-001 | discount_code | 20 % | 200 | 2025-01-01 → 2025-12-31, active |

#### Boats (all at Caleta de Fuste `U(001)`, capacity 10, active, equipmentOnboard = `oxygen, first_aid, radio, mobile_phone, gps, life_jackets, flares`)

| id | name |
|---|---|
| `U(004)` | White Magic |
| `U(005)` | Grey Magic |
| `U(006)` | Black Magic |
| `U(007)` | Blue Magic |

Comment: Las Playitas has no boats (shore dives only).

#### Dive sites

Caleta de Fuste (`locationId U(001)`, all `type: 'diving'`):

| id | name | reef group | depth min–max (m) | difficultyLevel | current | waves | travelTime |
|---|---|---|---|---|---|---|---|
| `U(005)` | Anfiteatro | Castillo | 12–21 | beginner | little-medium | unprotected | 5-10 min |
| `U(006)` | Barranco | Castillo | 12–23 | beginner | little-medium | unprotected | 5-10 min |
| `U(007)` | Fortaleza | Castillo | 3–24 | beginner | little-medium | unprotected | 3-8 min |
| `U(008)` | Mole (cementerio de barco) | Castillo | 7–7 | beginner | very little | protected | 2 min |
| `U(009)` | La Emboscada | Salinas | 7–40 | beginner | moderate-strong (drift) | unprotected | 15-20 min |
| `U(010)` | Camino de altura | Salinas | 7–40 | beginner | moderate | unprotected | 15-20 min |
| `U(011)` | El Muellito | Salinas | 7–40 | beginner | moderate-strong | unprotected | 10-15 min |
| `U(012)` | El Tazar | Salinas | 12–35 | beginner | moderate | unprotected | 10-15 min |
| `U(013)` | Tesoro negro | Salinas | 12–30 | advanced | moderate | unprotected | 10-15 min |
| `U(014)` | El Portal | Salinas | 12–35 | advanced | moderate | unprotected | 10-15 min |
| `U(015)` | El Mirador | Salinas | 12–38 | advanced | moderate | unprotected | 10-15 min |
| `U(016)` | El Laberinto | Salinas | 12–38 | advanced | moderate | unprotected | 10-15 min |
| `U(017)` | La Pirámide | Salinas | 14–39 | advanced | moderate-strong | unprotected | 10-15 min |
| `U(018)` | El Monasterio | Salinas | 14–36 | advanced | moderate | unprotected | 10-15 min |
| `U(019)` | Nuevo Horizonte | Nuevo Horizonte | 24–39 | advanced | moderate-strong (drift) | unprotected | 15-20 min |

Las Playitas (`locationId U(002)`, alternative schema):

| id | name | type | difficulty | depth | current | waves | travelTime |
|---|---|---|---|---|---|---|---|
| `U(020)` | Playa de Las Playitas | beach | beginner | 3-8m | low | low | 0 min |
| `U(021)` | Cueva de Las Playitas | cave | advanced | 12-18m | medium | medium | 5-10 min |
| `U(022)` | Arrecife de Las Playitas | reef | intermediate | 8-15m | low | low | 10-15 min |

Each site also has an English marketing `description` paragraph (marine life, topography; e.g. Mole is "the kindergarten of the Atlantic", angel sharks in winter; Nuevo Horizonte angel-shark mating in February/March; Playa de Las Playitas: beach entry, good for training/night dives/photography; Cueva: cave system, advanced only). The texts are marketing copy and not reproduced verbatim here.

#### Equipment inventory (64 items, all `category: 'diving'`, `locationId U(001)`, `isAvailable: true`)

| id range | type | name / brand / model | sizes | serial pattern | "good" (rest "excellent") |
|---|---|---|---|---|---|
| `U(030)`–`U(035)` | BCD | BCD Mares Avant Quattro | XS, S, M, L, XL, XXL | `BCD-<size>-001` | L |
| `U(040)`–`U(044)` | Regulator | Regulator Aqualung Calypso (1st/2nd stage/octopus Aqualung Calypso on first item) | Standard ×5 | `REG-001`…`REG-005` | REG-003, REG-005 |
| `U(050)`–`U(054)` | Mask | Mask Cressi Big Eyes Evolution | Standard ×5 | `MASK-001`…`005` | MASK-003, MASK-005 |
| `U(060)`–`U(065)` | Fins | Fins Cressi Pro Light | XS–XXL | `FINS-<size>-001` | L |
| `U(070)`–`U(075)` | Wetsuit | Wetsuit Shorty 3mm Cressi (3mm, Shorty, hood No) | XS–XXL | `WS-SHORTY-3MM-<size>-001` | M |
| `U(080)`–`U(085)` | Wetsuit | Wetsuit Full 3mm Cressi (3mm, Full, No) | XS–XXL | `WS-FULL-3MM-<size>-001` | L |
| `U(090)`–`U(094)` | Wetsuit | Wetsuit Full 5mm Cressi (5mm, Full, No) | S–XXL | `WS-FULL-5MM-<size>-001` | L |
| `U(100)`–`U(103)` | Wetsuit | Wetsuit Full 5mm with Hood Cressi (5mm, Full, Yes) | M–XXL | `WS-FULL-5MM-HOOD-<size>-001` | XL |
| `U(110)`–`U(113)` | Semi-Dry | Semi-Dry Suit 7mm Cressi (7mm, Semi-Dry, Yes) | M–XXL | `SDS-7MM-<size>-001` | XL |
| `U(120)`–`U(125)` | Boots | Boots Cressi / Standard Boots | XS–XXL | `BOOTS-<size>-001` | L |
| `U(130)`–`U(134)` | Computer | Dive Computer Suunto Zoop | Standard ×5 | `COMP-001`…`005` | COMP-003 |
| `U(140)`–`U(145)` | Torch | Dive Torch Cressi Focus | Standard ×6 | `TORCH-001`…`006` | TORCH-003 |

Only `U(030)` (purchase 2023-01-15, warranty "2 years", revision 2024-06-01 → 2025-06-01) and `U(040)` (purchase 2023-03-20, warranty "3 years", revision 2024-05-15 → 2025-05-15) carry purchase/warranty/revision data. Each item has a short `notes` string ("New …, excellent condition", "Good condition, minor wear", "needs battery replacement", etc.).

#### Users (13; emails `<username-ish>@deep-blue-diving.com`, all `isActive: true`, `createdAt 2025-01-01T00:00:00Z`)

| id | username | name | role | locationAccess |
|---|---|---|---|---|
| `U(099)` | superadmin | Super Administrator | superadmin | global (none) — password `<redacted>` (default, "should be changed") |
| `U(100)` | admin | Administrator | admin | global |
| `U(200)` | owner | Owner | boat_pilot | U(001), U(002) |
| `U(300)` | caleta_manager | Caleta Manager | admin | U(001) |
| `U(301)` | playitas_manager | Las Playitas Manager | admin | U(002) |
| `U(400)` | captain1 | Boat Captain 1 | boat_pilot | U(001) |
| `U(401)` | captain2 | Boat Captain 2 | boat_pilot | U(001) |
| `U(500)`–`U(503)` | guide1–guide4 | Guide 1–4 | guide | U(001), U(002) |
| `U(600)`–`U(601)` | trainee1–trainee2 | Trainee 1–2 | intern | U(001), U(002) |

Seed comments describe intended rights: superadmin = everything incl. equipment and boat prep; admin = owners' family, full access; owner = equipment & boat maintenance; site managers = all rights on their site except maintenance and account creation (Caleta manager has boat rights, Playitas manager none). Only superadmin has a password; other users have none in the seed.

#### Customers (seed, not loaded — see quirks)

| id | name | nationality | type | skill | cert (agency level, verified) | own equip | sizes BCD/fins/boots/suit/tank |
|---|---|---|---|---|---|---|---|
| `U(020)` | John Smith | British | tourist | beginner | PADI AOW ✓ (+medical ✓, DAN insurance ✓) | no | M/M/M/M/12L |
| `U(021)` | Maria Garcia | Spanish | local | intermediate | SSI OW ✓, SSI NIGHT ✗ (no medical; DAN insurance unverified) | yes | S/S/S/S/12L |
| `U(022)` | Carlos Rodriguez | Spanish | recurrent | advanced | PADI DM ✓ (+medical ✓, DAN ✓) | yes | L/L/L/L/15L |
| cust-mock-001 | Alice Brown | British | tourist | beginner | PADI OW ✓ | no | S/S/S/S/12L |
| cust-mock-002 | Ben Taylor | Irish | tourist | intermediate | SSI AOW ✓ | yes | M/M/M/M/12L |
| cust-mock-003 | Chloe Martin | French | tourist | beginner | PADI OW ✓ | no | XS/S/S/S/10L |
| cust-mock-004 | David Lee | German | tourist | intermediate | PADI AOW ✓ | no | L/L/L/L/15L |
| cust-mock-005 | Emma Wilson | British | tourist | beginner | SSI OW ✓ | no | M/M/M/M/12L |
| cust-mock-006 | Fabio Rossi | Italian | tourist | advanced | PADI RESCUE ✓ | yes | XL/XL/XL/XL/15L |
| cust-mock-007 | Giulia Bianchi | Italian | tourist | beginner | CMAS 1* ✗ | no | S/S/S/S/12L |
| cust-mock-008 | Hugo Leroy | French | tourist | intermediate | SSI AOW ✓ | no | M/L/L/M/12L |
| cust-mock-009 | Isabel Lopez | Spanish | local | intermediate | PADI OW ✓ | yes | M/M/M/M/12L |
| cust-mock-010 | Javier Navarro | Spanish | local | beginner | SSI OW ✓ | no | L/L/L/L/15L |
| cust-mock-011 | Katarina Novak | Slovak | tourist | intermediate | PADI AOW ✓ | no | S/M/M/S/12L |
| cust-mock-012 | Liam Murphy | Irish | tourist | advanced | PADI RESCUE ✓ | yes | XL/XL/XL/XL/15L |
| cust-mock-013 | Marta Silva | Portuguese | tourist | beginner | SSI OW ✓ | no | M/M/M/M/12L |
| cust-mock-014 | Noah Schmidt | German | tourist | intermediate | PADI AOW ✓ | no | L/L/L/L/15L |
| cust-mock-015 | Olivia Hernandez | Spanish | tourist | beginner | SSI OW ✓ | yes | S/S/S/S/– |
| cust-mock-016 | Pedro Gonzalez | Spanish | recurrent | intermediate | PADI AOW ✓ | no | M/M/M/5mm/12L |
| cust-mock-017 | Quentin Dupont | French | tourist | advanced | CMAS 2* ✓ | no | XL/XL/XL/XL/– |
| cust-mock-018 | Rita Costa | Portuguese | tourist | beginner | PADI OW ✓ | no | XS/S/S/S/10L |
| cust-mock-019 | Sam Anderson | British | tourist | advanced | SSI AOW ✓ | yes | M/M/M/M/12L |
| cust-mock-020 | Tara Singh | Indian | tourist | beginner | PADI OW ✓ | no | S/S/S/S/12L |

`cust-mock-*` records were added "to fill two boats (capacity ~10 each)"; they have no medical/insurance objects.

#### Bookings (seed, not loaded)

| id | customer | date | boat / site | sessions | price = total | payment | notes |
|---|---|---|---|---|---|---|---|
| `U(001)` | U(020) John | today | U(004) White Magic / U(005) Anfiteatro | morning | 46.00 | card, paid | "First time diver"; rental BCD/Regulator/Mask/Fins |
| `U(002)` | U(021) Maria | today | U(005) Grey Magic / U(006) Barranco | morning, afternoon, night | 108.00 ("2 dives + night dive surcharge") | cash, paid | own equipment |
| `U(003)` | U(020) John | tomorrow | U(004) / U(005) | morning | 46.00 | card, paid | "Second day of stay" |
| `U(004)` | U(020) John | today+2 | U(004) / U(005) | morning, afternoon | 88.00 | card, paid | "Third day of stay - should get volume discount" |

All `status: 'confirmed'`, `activityType: 'diving'`, `locationId U(001)`, `discount: 0`.

### Quirks/bugs noticed

- **Mode is hard-coded** to `'api'`; all mock/localStorage/sync code paths are inactive in the shipped build but `initializeMockData()` still runs on import and writes seed data (including a plaintext default superadmin password) to localStorage.
- **Seed bookings and customers are never loaded**: `initializeMockData` deletes those keys if they contain seed records and only ever writes `[]`.
- **Sync vs. async API**: `dataService` returns plain values in mock mode and Promises in api mode.
- **Tier lookup off-by-one**: `tiers.find(t => t.dives >= n)` treats `dives` as an upper bound while the descriptions treat it as a lower bound (e.g. 2 dives → 44 € tier instead of 46 €). Seed booking prices 88 and 108 match the buggy lookup. `calculatePrice` always uses `pricingConfig[0]` (tourist), ignoring customer type and location.
- **Real API pricing not implemented**: `calculatePrice`/`getVolumeDiscountPrice` return hard-coded 46 €/dive.
- **Inconsistent price-key naming** across three copies of the price list: `locations[].pricing.equipment` (`completeEquipment`, `Suit`, `BCD`, `UWCamera`), `settings.prices.equipment` (`complete_equipment`, `suit`, `bcd`, `uw_camera`), `pricingConfig.addons` (`nightDive`, `personalInstructor`) vs `night_dive`, `personal_instructor`.
- **Bike tiers mix totals and per-day rates** (2 and 3 days are totals; 4+ are per-day).
- **Two dive-site schemas**: Caleta sites use `depthRange`/`difficultyLevel`; Las Playitas sites use `depth` (string)/`difficulty`. The API transform drops `current`, `waves`, `travelTime`, `description`, `depth`, `difficulty` on save.
- **Seed ID collisions across collections**: dive sites `U(005)`–`U(007)` = boat ids; dive sites `U(020)`–`U(022)` = customer ids; `U(040)` = both a regulator and the government bono; equipment `U(100)` = admin user id; settings id = location `U(001)` = booking `U(001)`; boat `U(004)` = booking `U(004)`.
- **Mock `generateId()`** produces `<ms>-<random>` strings, not UUIDs; `create()` overwrites any supplied `id`.
- **Untransformed specialised endpoints**: `getBookingsByDate`, `getTodaysBookings`, `getCustomerBookings`, `searchCustomers`, `getAvailableEquipment`, `getStatistics`, `delete` return raw backend objects (snake_case), unlike `getAll`/`getById`.
- **Raw-key spread overrides** in `transformBookingFromBackend`/`transformCustomerFromBackend`: unexcluded raw keys (e.g. camelCase `paymentMethod: 'deferred'`, `customerType`) overwrite computed values; `mole_slot_time` remains duplicated.
- **`paymentMethod` asymmetry**: backend `deferred` → frontend `account` on read, no reverse mapping on write in the adapter (bookings have no to-backend transform).
- **`delete('scheduleSlotGuides')`** hits `/scheduleSlotGuides/:id` (missing mapping). `update` has a duplicated `tenants` branch (harmless).
- **`getUpcomingBookings` (API)** compares `new Date('YYYY-MM-DD')` (UTC midnight) with `now`, so today's bookings are excluded; mock version includes them. Both use UTC dates via `toISOString()`, which can shift the "today" date in non-UTC time zones.
- **`transformPartnerToBackend`** uses `||` for `commissionRate`, so `0` is sent as `undefined`.
- **Customer medical data dropped** for customers without `customerType` (`medicalConditions` not sent).
- **`searchCustomers` (mock)** throws if any record lacks `firstName`/`lastName`.
- **`sharedStorage.js` is dead code** (never imported; its `destroy()` would not remove listeners because handlers are re-bound).
- **Sync server URL hard-coded** to `http://localhost:3002`; sync pushes whole arrays with last-writer-wins semantics.
- **Security (factual)**: auth tokens (`auth_token`, `partner_token`) are stored in localStorage (readable by any script on the origin); if both exist the partner token is sent on admin requests. Mock seed stores a default superadmin password in plaintext in the bundle and in localStorage. `getApiBaseURL` rewrites `VITE_API_URL` to the page's protocol, so an HTTP page talks to the API over HTTP. Tenant scoping relies on the client-supplied `X-Tenant-Slug` header (enforcement is a backend concern).
- **No retry / no 401 handling** in `httpClient`; 30 s timeout surfaces as `Error('Request timeout')`.
- `config/README.md` is stale (shows port 3001 and `mode: 'mock'` as current).
