# DCMS Anonymization Tasks for Open Source Release

**Goal:** Create a generic, anonymous version of DCMS suitable for open source release  
**Status:** Planning  
**Priority:** High

---

## 📋 Overview

This document outlines all tasks required to anonymize the DCMS codebase and remove all references to Deep Blue Diving, Fuerteventura, and business-specific information to make it suitable for open source release.

---

## 🔍 Categories of Tasks

### 1. **Code Changes** (Frontend & Backend)

#### Frontend (`/frontend`)
- [ ] **Navigation Component** (`src/components/Common/Navigation.jsx`)
  - Change "DCMS - Deep Blue Diving" → "DCMS - Dive Center Management System"
  
- [ ] **Mock Data** (`src/data/mockData.js`)
  - Replace location IDs and names:
    - `'550e8400-e29b-41d4-a716-446655440001'` (Caleta de Fuste) → Generic location
    - `'Caleta de Fuste'` → `'Main Location'`
    - `'Las Playitas'` → `'Secondary Location'`
  - Anonymize addresses:
    - Remove specific streets, postal codes
    - Use generic placeholders: `"123 Ocean Drive"`, `"Coastal City"`, `"12345"`
  - Replace contact info:
    - `info@deep-blue-diving.com` → `info@divecenter.com`
    - `+34 928 163 712` → `+1 555 123 4567`
  - Anonymize dive site descriptions (remove "deep blue depths" references)
  - Replace customer sample data with fictional names/emails

- [ ] **Booking Form** (`src/components/Booking/BookingForm.jsx`)
  - Update default location ID comments
  - Remove hardcoded location references

- [ ] **Equipment Page** (`src/pages/Equipment.jsx`)
  - Update default location ID comments

#### Public Website (`/public-website`)
- [ ] **Home Page** (`src/pages/Home.jsx`)
  - Replace "Deep Blue Fuerteventura" → Generic branding
  - Replace "Years of diving experience in the Atlantic" → Generic description
  - Remove "Caleta de Fuste and Las Playitas" → Generic locations
  - Replace specific addresses with placeholders

- [ ] **About Page** (`src/pages/About.jsx`)
  - Remove "Deep Blue" branding
  - Replace business-specific history with generic template

- [ ] **Dive Sites Page** (`src/pages/DiveSites.jsx`)
  - Anonymize dive site descriptions
  - Remove "Caleta de Fuste" and "Las Playitas" tabs → Generic location tabs
  - Replace specific dive site names with examples

- [ ] **Book Dive Page** (`src/pages/BookDive.jsx`)
  - Replace location dropdowns:
    - `'caleta'` → `'main'`
    - `'playitas'` → `'secondary'`
    - `"Caleta de Fuste"` → `"Main Location"`
    - `"Las Playitas"` → `"Secondary Location"`

- [ ] **Pricing Page** (`src/pages/Pricing.jsx`)
  - Remove location-specific pricing sections
  - Make pricing fully configurable

- [ ] **Footer Component** (`src/components/Footer.jsx`)
  - Remove "Deep Blue Fuerteventura" branding
  - Replace addresses with placeholders
  - Genericize contact information

- [ ] **Manifest** (`public/manifest.json`)
  - Change `"short_name": "Deep Blue"` → `"DCMS"`
  - Change `"name": "Deep Blue Fuerteventura"` → `"DCMS - Dive Center Management"`

- [ ] **HTML Meta** (`public/index.html`)
  - Update title: `"Deep Blue Fuerteventura"` → Generic title
  - Update meta description to generic description

- [ ] **Package.json** (`package.json`)
  - Update description to generic

#### Backend (`/backend`)
- [ ] **Package.json** (`package.json`)
  - Change `"author": "Deep Blue Diving"` → `"DCMS Contributors"` or remove

- [ ] **Prisma Schema** (`prisma/schema.prisma`)
  - Ensure sample data doesn't contain business names

---

### 2. **Database & Schema**

- [ ] **Database Schema** (`database/schema/001_create_tables.sql`)
  - Replace sample location data:
    ```sql
    -- Change FROM:
    ('550e8400-e29b-41d4-a716-446655440001', 'Caleta de Fuste', ...)
    
    -- TO:
    ('550e8400-e29b-41d4-a716-446655440001', 'Main Location', ...)
    ('550e8400-e29b-41d4-a716-446655440002', 'Secondary Location', ...)
    ```
  - Anonymize addresses in JSONB fields
  - Replace contact info with placeholders
  - Anonymize dive site data:
    - Remove "Castillo Reef", "Salinas Reef", "Nuevo Horizonte" → Generic names
    - Anonymize dive site descriptions
  - Replace emergency contacts with generic examples
  - Anonymize staff sample data (names, emails)
  - Remove Fuerteventura-specific references

- [ ] **Sample Data Seeds** (`database/seeds/002_sample_data.sql`)
  - Replace all customer sample data with fictional data
  - Anonymize booking data
  - Remove business-specific references

---

### 3. **Documentation**

- [ ] **Main README.md**
  - Change `**Target:** Deep Blue Diving, Fuerteventura` → Generic
  - Update project description to be generic
  - Remove business-specific examples

- [ ] **All Documentation in `/docs`**
  - Review every `.md` file for business references
  - Update planning documents (`multi-site-dcms-plan.md`, etc.)
  - Create generic versions or mark as "example"

- [ ] **Frontend README** (`frontend/README.md`)
  - Genericize examples

- [ ] **Public Website README** (`public-website/README.md`)
  - Genericize descriptions

- [ ] **Backend README** (`backend/README.md`)
  - Already generic, verify

---

### 4. **Configuration & Environment**

- [ ] **Environment Variables** (`.env.example`)
  - Ensure no business-specific defaults
  - Add comments explaining configuration

- [ ] **Settings/Configuration**
  - Make all business names configurable
  - Add setup wizard or initial configuration screen

---

### 5. **Branding & Assets**

- [ ] **Icons/Logos**
  - Remove any Deep Blue Diving logos
  - Use generic DCMS logo or placeholder
  - Update favicon if custom

- [ ] **Images**
  - Remove photos of Fuerteventura/Deep Blue Diving locations
  - Use generic stock photos or placeholders
  - Ensure no business branding in images

- [ ] **Colors/Themes**
  - Keep color scheme generic (no Deep Blue-specific colors)
  - Already using Material-UI default blue (#1976d2) - OK

---

### 6. **Open Source Compliance**

- [ ] **LICENSE File**
  - Verify GPL-3.0 license is appropriate
  - Consider MIT if more permissive license desired
  - Add copyright notice

- [ ] **CONTRIBUTING.md**
  - Create contribution guidelines
  - Add code of conduct
  - Setup instructions

- [ ] **CHANGELOG.md**
  - Create changelog
  - Document anonymization changes

- [ ] **AUTHORS.md**
  - Credit contributors (anonymous)

---

### 7. **Code Comments & Inline Documentation**

- [ ] **Search All Files**
  - Find comments mentioning:
    - "Deep Blue"
    - "Fuerteventura"
    - "Caleta de Fuste"
    - "Las Playitas"
  - Replace with generic equivalents or remove

---

### 8. **Configuration Wizard (Optional Enhancement)**

- [ ] **Initial Setup Screen**
  - Business name configuration
  - Location setup
  - Contact information
  - Basic settings

- [ ] **Migration Script**
  - Help existing users (if any) migrate to anonymous version

---

## 🔍 Automated Search & Replace Checklist

### Files to Review:

1. **Frontend Source:**
   - `frontend/src/**/*.jsx`
   - `frontend/src/**/*.js`
   - `frontend/package.json`
   - `frontend/public/index.html`
   - `frontend/public/manifest.json`

2. **Public Website Source:**
   - `public-website/src/**/*.jsx`
   - `public-website/src/**/*.js`
   - `public-website/package.json`
   - `public-website/public/**/*`

3. **Backend:**
   - `backend/package.json`
   - `backend/src/**/*.ts`
   - `backend/prisma/schema.prisma`

4. **Database:**
   - `database/schema/001_create_tables.sql`
   - `database/seeds/002_sample_data.sql`

5. **Documentation:**
   - `*.md` files in root
   - `docs/**/*.md`

6. **Configuration:**
   - `.env.example` files
   - Configuration files

---

## 📝 Generic Replacement Dictionary

| Current Value | Generic Replacement |
|--------------|-------------------|
| "Deep Blue Diving" | "Dive Center" or "Your Dive Center" |
| "Deep Blue Fuerteventura" | "DCMS" or "Dive Center Management System" |
| "Caleta de Fuste" | "Main Location" |
| "Las Playitas" | "Secondary Location" |
| "Fuerteventura" | "Your Location" or remove reference |
| "Canary Islands" | "Your Region" or remove |
| `info@deep-blue-diving.com` | `info@divecenter.com` |
| `+34 928 163 712` | `+1 555 123 4567` |
| "Muelle Deportivo / Calle Teneriffe" | "123 Ocean Drive" |
| Postal codes `35610` | `12345` |
| Specific dive site names | Generic names (e.g., "Reef Site 1", "Wall Dive 1") |

---

## ✅ Verification Steps

Before open source release:

1. [ ] Search entire codebase for "Deep Blue" (case-insensitive)
2. [ ] Search for "Fuerteventura" (case-insensitive)
3. [ ] Search for "Caleta de Fuste" (case-insensitive)
4. [ ] Search for "Las Playitas" (case-insensitive)
5. [ ] Search for business email domains
6. [ ] Search for business phone numbers
7. [ ] Review all sample data for identifiable information
8. [ ] Test installation with generic data
9. [ ] Verify all configuration is externalized
10. [ ] Review documentation for any remaining business references

---

## 🚀 Implementation Order

**Phase 1: Core Anonymization (Priority 1)**
1. Code files (frontend, public-website, backend)
2. Database schema and seeds
3. Package.json and manifest files

**Phase 2: Documentation (Priority 2)**
4. README files
5. Documentation in `/docs`
6. Comments and inline docs

**Phase 3: Assets & Branding (Priority 3)**
7. Images and logos
8. Favicon and icons
9. Color schemes (verify)

**Phase 4: Open Source Setup (Priority 4)**
10. LICENSE file
11. CONTRIBUTING.md
12. Setup wizard (optional)

**Phase 5: Verification (Priority 5)**
13. Final search and verification
14. Testing with generic data
15. Documentation review

---

## 📅 Estimated Effort

- **Phase 1:** 4-6 hours
- **Phase 2:** 2-3 hours
- **Phase 3:** 1-2 hours
- **Phase 4:** 2-3 hours
- **Phase 5:** 2-3 hours

**Total: 11-17 hours** for complete anonymization

---

## 🎯 Success Criteria

✅ No references to "Deep Blue Diving" in codebase  
✅ No references to "Fuerteventura" in codebase  
✅ No specific location names (Caleta de Fuste, Las Playitas)  
✅ All sample data is fictional/generic  
✅ All contact information is placeholder  
✅ Documentation is generic and applicable to any dive center  
✅ LICENSE and contribution files present  
✅ System works with generic configuration  

---

## 📌 Notes

- Consider creating a separate branch for anonymization work
- Keep original version in private repository if needed
- May want to create an anonymization script for automated replacements
- Some files like `Lucide-SITES-UPDATED.md` may need to be removed or heavily modified
- Configuration wizard would make initial setup easier for new users

---

**Last Updated:** October 2025  
**Status:** Ready for Implementation

