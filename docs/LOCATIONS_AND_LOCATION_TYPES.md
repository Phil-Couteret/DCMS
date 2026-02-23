# Locations and Location Types

This document explains how to configure **locations** and **location types** in DCMS, and what each setting does.

---

## Overview

- **Locations** are your physical sites (e.g. “Caleta de Fuste”, “Las Playitas”, “Bike Rental Shop”). Each has a name, address, contact info, and an **activity type**.
- **Location types** define the kind of activity at a location (e.g. Diving, Bike Rental, Snorkeling). They control which parts of the app are shown (boats, dive sites, certifications, etc.).

**Order of setup:** Define **location types** first (Settings → Location Types), then create **locations** (Settings → Locations) and assign each location a type.

---

## Add Location Type (Settings → Location Types)

Use **Add type** to create a new activity type. Each field:

| Field | Description |
|-------|-------------|
| **Type ID** *(required)* | Internal slug. Lowercase letters, numbers, underscores only (e.g. `diving`, `snorkeling`, `kayak_rental`). Cannot be changed after create. |
| **Display name** *(required)* | Label shown in the UI (e.g. “Diving”, “Bike Rental”). |
| **Color** | Used for chips/badges (Primary, Secondary, Default, Success, Warning, Error). |
| **Order** | Sort order when listing types. Lower = first. |
| **Active** | If off, the type is hidden from dropdowns when creating/editing locations. |
| **Features** | Checkboxes that control app behaviour (see below). |

### Features

Each feature is a flag that affects what the app shows for **locations** of this type:

| Feature | Effect when enabled |
|--------|----------------------|
| **Boats** | Location uses boats (boat prep, boat-based dives, etc.). |
| **Dive Sites** | Location uses dive sites. **This is the main “diving” switch.** When enabled, diving-only UI is shown: schedule, boat prep, dive sites, stays, certifications, medical clearance, etc. When disabled (e.g. Bike Rental), those sections are hidden or simplified. |
| **Certifications** | Location uses customer certifications (e.g. SSI, PADI). |
| **Medical Clearance** | Location uses medical clearance for customers. |

**Example:**  
- **Diving:** Boats ✓, Dive Sites ✓, Certifications ✓, Medical Clearance ✓.  
- **Bike Rental, Surf, Kite Surf, Wing Foil, Windsurf, Stand Up Paddle:** all unchecked (equipment/activity rentals).  
- **Snorkeling:** Dive Sites ✓, others as needed.

---

## Add Location (Settings → Locations)

Use **Add Location** to create a new site. You must have at least one **location type** configured first.

| Field | Description |
|-------|-------------|
| **Location name** *(required)* | Name of the site (e.g. “Caleta de Fuste”, “Las Playitas”). |
| **Activity type** *(required)* | One of your configured location types. Determines which features (boats, dive sites, etc.) apply to this location. |
| **Address** | Street, city, postal code, country. |
| **Contact info** | Phone, mobile, email, website. |
| **Active** | If off, the location is hidden from selection lists elsewhere in the app. |

---

## Where Features Are Used

- **Navigation:** Links like Schedule, Boat Preparation, Dive Sites, Stays are shown only for locations whose type has **Dive Sites** (and related features) enabled.
- **Customers:** Diving-specific fields (certifications, medical clearance, approval for booking) are shown only when the current location has those features.
- **Equipment:** Tank vs bike/accessory filtering depends on location type features.
- **Financial:** Tabs such as “Previous Closed Days” are hidden for non-diving types (e.g. bike rental).
- **Prices (Settings):** Diving-related pricing sections are shown only for locations with diving features.

**Summary:** The **Dive Sites** feature is the main toggle for “diving” behaviour; the others fine-tune what the app exposes per location type.

---

## Related Code

- **Location types config & helpers:** `frontend/src/utils/locationTypes.js`  
- **Settings UI:** `frontend/src/pages/Settings.jsx` (Locations tab, Location Types tab)  
- **Database:** `locations.type` is `VARCHAR(50)`; values match the **Type ID** of your configured location types.
