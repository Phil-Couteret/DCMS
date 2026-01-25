# Market Check: Dive Center Management Software

**Purpose:** Compare DCMS to leading solutions, see what’s on the market, and define **what to offer at what price** (Basic / Pro / Business) and **how to configure it**.

**Date:** January 2026

---

## 1. Main competitors (pricing & positioning)

### **Bloowatch** (EU – Spain, 30+ countries)

| Plan | Monthly (annual) | Monthly (monthly) | Limits / focus |
|------|-------------------|--------------------|----------------|
| **START** | €49 | €59 | Activities, shop. Max **3 staff**. Basic accounting. |
| **PRO** | €79 | €99 | + Rentals, accommodation, add-ons. **12 staff**. Boat/trip, manifest, SMS. **2 partners**. |
| **GOLD** | €119 | €149 | **Unlimited** staff, boats, partners. **Partner invoices**. **Public API**. Promo codes. |

- **0%** booking commission; payment gateway fees only.
- Boat/trip management, manifest, staff scheduler, POS, online widget, click-to-pay links.
- **12‑month** minimum. Extra: setup €400, widget integration €100.
- **HQ:** Getxo, Spain. Strong in EU / watersports + dive.

---

### **Dive Admin** (UK-focused, dive-specific)

| Plan | Monthly | Annual (2 months free) | Limits |
|------|---------|------------------------|--------|
| **Starter** | £29 | ~£290 | **10 staff**. Basic features. |
| **Professional** | £59 | ~£590 | **25 staff**. Expanded trip management. |
| **Premium** | £119 | ~£1,190 | Advanced features, reporting. |

- Dive-specific: digital forms/waivers, trip scheduling, manifest, PADI/SSI courses, POS, certifications, equipment.
- **14‑day** free trial. Unlimited customers.
- Claims: ~40% more bookings, ~60% less admin.

---

### **Dive Shop 360** (US, POS-led)

| Plan | Pricing | Focus |
|------|---------|--------|
| **Startup** | Custom | POS, rentals, repairs, travel/trips, basic reports. |
| **Core** | Custom | + E‑commerce, PADI/SSI/SDI, Smart Waiver, loyalty, QuickBooks. |
| **Plus** | Custom | + **Multi-location**, Avalara. |

- Build-and-price tool; cost depends on POS stations and features.
- POS, certification tracking, rentals, repairs, inventory. Strong **retail** side.

---

### **WeTravel** (travel / multi-day trips)

| Plan | Pricing | Focus |
|------|---------|--------|
| **Basic** | Free | Payments, bookings, transfers. |
| **Pro** | Contact | Branding, payment plans, marketing. |
| **Enterprise** | Custom | Tailored. |

- **Scuba** product: waivers, bookings, payments, 30+ currencies.
- **4.8** Capterra (500+ reviews). Less dive-specific than Bloowatch / Dive Admin.

---

### **Others (short)**

- **DiverDash 2.0:** Launching; scheduling, equipment, financials, mobile, QuickBooks. **No public pricing**; contact for quote.
- **Divery:** From **€169/month** (Basic); separate product.
- **EVE, Scubacore, DiveShop Manager, ZenDive, Diving Log:** Varied focus (enterprise, desktop, technical diving); often **contact for pricing**.

---

## 2. Pricing snapshot (like‑for‑like)

| Product | Entry | Mid | Top | Notes |
|--------|--------|-----|-----|-------|
| **Bloowatch** | €49–59 | €79–99 | €119–149 | EU, transparent, 0% fee. |
| **Dive Admin** | £29 (~€34) | £59 (~€69) | £119 (~€139) | UK, dive-specific, staff limits. |
| **Dive Shop 360** | Custom | Custom | Custom | US, POS-heavy. |
| **WeTravel** | Free | Contact | Custom | Travel-focused. |
| **DCMS (proposed)** | **€49–59** | **€79–99** | **€119–149** | Bloowatch price + Dive Admin features + **GDPR**. |

---

## 3. What’s “best” by situation?

| If you need… | Strong options |
|--------------|----------------|
| **Cheapest entry, EU** | Dive Admin Starter (£29) or Bloowatch START (€49 annual). |
| **EU + boats, partners, accounting** | **Bloowatch** PRO/GOLD. |
| **UK dive-centric, simple pricing** | **Dive Admin**. |
| **US, POS + retail + courses** | **Dive Shop 360**. |
| **Multi-day trips, payments, waivers** | **WeTravel**. |
| **Multi-location, partners, IGIC, stays, configurable types** | **DCMS** (once productised). |

---

## 4. DCMS vs market

**DCMS strengths (vs typical alternatives):**

- **Multi-location** with configurable **activity types** (diving, bike, etc.).
- **Partner ecosystem**: partner API, partner invoices, commission logic.
- **Financials**: current day, closed days, historical bills, **quarterly tax (IGIC)** configurable.
- **Stays**, volume discounts, **government bonos**.
- **Boat prep**, schedule, equipment, dive sites.
- **GDPR-style** retention, DSAR, consents, breaches.
- **No per-booking %** (you host; you set payment fees).

**Typical gaps vs. market:**

- **No built-in POS** (Bloowatch, Dive Shop 360, etc. have it).
- **No certification agency APIs** (PADI/SSI) out of the box.
- **No public booking widget** yet (distinct from partner API).
- **No mobile app** (web/PWA only).

---

## 5. “In-between” positioning: Bloowatch price + Dive Admin features + GDPR

**Goal:** Price like **Bloowatch** (€49–149), deliver **Dive Admin–level** dive features, and differentiate on **verifiable GDPR compliance** (Dive Admin has no visible GDPR mention; even if they claim it, you can’t verify it).

### 5.1 Why this works

| | **Bloowatch** | **Dive Admin** | **DCMS (proposed)** |
|--|----------------|----------------|---------------------|
| **Price** | €49–149, 0% fee | £29–119 | **€49–149** (match Bloowatch band) |
| **Dive-specific** | Generic watersports + dive | Strong (forms, trips, courses) | **Strong** (trips, boats, certs, equipment, etc.) |
| **GDPR** | Not a stated focus | **No visible GDPR** on site | **Built-in**: retention, DSAR, consents, breaches |

- **Bloowatch** is cheap and EU-friendly but less dive-centric than Dive Admin.
- **Dive Admin** is dive-centric but **not demonstrably GDPR-compliant** (no retention policy, DSAR, breach handling, or clear consent framework visible).
- **DCMS** can offer: **Bloowatch-style pricing** + **Dive Admin-style features** + **auditable GDPR** (retention, DSAR, consents, breaches) in-product.

### 5.2 GDPR differentiator (DCMS vs Dive Admin)

**DCMS has (in-product):**

- **Data retention policy** – Configurable periods, automated anonymization, documented in UI + policy.
- **DSAR (Subject Access Requests)** – Dedicated workflow, deadlines, status tracking.
- **Consent management** – Per-customer consent types, dates, withdrawal; audit trail.
- **Data breach register** – Log breaches, severity, notification deadlines, authority reporting.
- **Privacy / retention / cookie policies** – GDPR-style articles (legal basis, rights, AEPD complaint).

**Dive Admin (publicly):**

- **No mention of GDPR** on diveadmin.com.
- No visible retention policy, DSAR process, consent framework, or breach handling.
- UK-based; post-Brexit UK GDPR applies. If they process EU residents’ data, EU GDPR also applies – but there’s nothing to verify.

**Sales angle:** *“Dive Admin doesn’t show how they handle GDPR. We do: retention, DSAR, consents, and breach tracking are built in. If you care about compliance – especially with EU customers – we’re the auditable choice.”*

### 5.3 Revised tier design: Bloowatch price + Dive Admin features

| Tier | Price (€/mo) | Target | Limits | Main differentiators |
|------|---------------|--------|--------|-----------------------|
| **Basic** | **€49** (annual) / **€59** (monthly) | 1 location, small team | 1 loc, 5 users, 2 boats, 20 sites | Core dive ops, financials, **GDPR** (retention, DSAR, consents, breaches). |
| **Pro** | **€79** (annual) / **€99** (monthly) | Multi-site, Deep Blue–style | 5 loc, 15 users, 10 boats, 100 sites | Multi-location, partners, partner invoices, IGIC, stays, bonos, **full GDPR**. |
| **Business** | **€119** (annual) / **€149** (monthly) | Groups, API, priority | 15 loc, unlimited users/boats/sites | Partner API, priority support, onboarding. |

- **Pricing:** Matches **Bloowatch** (START/PRO/GOLD €49–149). Cheaper than **Dive Admin** Premium (£119) in same ballpark.
- **Features:** **Dive Admin–level** (trips, boats, equipment, certifications, scheduling, forms-style flows) **plus** DCMS extras (IGIC, stays, bonos, configurable location types).
- **GDPR:** Same **retention, DSAR, consents, breaches** across all tiers; Business adds priority support, not compliance.

### 5.4 Optional “Legacy” high tier

If you want a clear step above Bloowatch GOLD:

| Tier | Price (€/mo) | Notes |
|------|---------------|--------|
| **Business+** | **€199** (annual) / **€249** (monthly) | Same as Business + dedicated onboarding, SLA, or custom integrations. |

Otherwise, **€49 / €79 / €119** (annual) keeps you squarely “Bloowatch price + Dive Admin features + GDPR.”

---

## 6. How to configure it

**Today (no app changes):**

- **External config:** Spreadsheet or doc with columns: **Plan** | **Price (annual / monthly)** | **Max locations** | **Max users** | **Max boats** | **Max dive sites** | **Features** (Basic / Pro / Business).
- Use it for **sales**, **onboarding**, and **manual** adherence to limits.

**Later (in-app):**

- **Settings → Plans:** Add `plans` (e.g. in `settings.plans` or a `plans` table).
- For each plan, store: **id**, **name**, **priceMonthly**, **priceYearly**, **limits** (locations, users, boats, dive sites), **features** (multi-location, partners, partner API, GDPR, etc.).
- **“Current plan”** in Settings (or per tenant when multi-tenant) to drive **display** and, later, **enforcement** (limits, feature gating).
- **Billing:** Stripe (or similar) for subscriptions; map plan ↔ product/price.

---

## 7. Summary

| Question | Answer |
|----------|--------|
| **What’s on the market?** | Bloowatch (EU), Dive Admin (UK), Dive Shop 360 (US), WeTravel (travel), plus DiverDash, Divery, EVE, Scubacore, etc. |
| **Best for lowest cost / EU?** | Dive Admin Starter or Bloowatch START. |
| **Best for EU + boats + partners + accounting?** | Bloowatch PRO/GOLD. |
| **Best for US POS + retail?** | Dive Shop 360. |
| **Where does DCMS fit?** | **Bloowatch-level price + Dive Admin-level features + verifiable GDPR.** Multi-location, partners, IGIC, stays, configurable types, EU/Canarias. |
| **What to offer at what price?** | **Basic €49/59** | **Pro €79/99** | **Business €119/149** (annual/monthly). Optional Business+ €199/249. |
| **How to configure?** | External doc now; **Settings → Plans** later, then billing + enforcement. |

---

**Next steps:**

1. **Validate** "Bloowatch price + Dive Admin features + GDPR" positioning with 2–3 dive centers (e.g. Canarias, EU).
2. **Add** **Settings → Plans** and `plans` config when you’re ready to productise.
3. **Use GDPR** in messaging: retention, DSAR, consents, breaches vs. Dive Admin's lack of visible compliance.
4. **Consider** POS, certification APIs, and booking widget as roadmap items to narrow gaps vs. Bloowatch / Dive Admin.
