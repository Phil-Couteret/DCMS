# SaaS Financial Balance: 12 Dive Centers

**Scenario:** 12 dive centers as DCMS customers  
**Pricing:** Pro €79/mo (annual) / €99/mo (monthly); Business €119/mo (annual) / €149/mo (monthly)  
**Date:** January 2026

---

## 1. Customer mix

| Segment | Count | Billing | Period |
|--------|-------|---------|--------|
| Business yearly | 2 | €119/mo (annual) | 12 months |
| Business monthly | 3 | €149/mo | **May–October only** (6 months) |
| Pro annual | 4 | €79/mo (annual) | 12 months |
| Pro monthly | 3 | €99/mo | 12 months (year-round) |

---

## 2. Revenue

### 2.1 By segment (annual)

| Segment | Calculation | **Annual revenue (€)** |
|---------|-------------|-------------------------|
| Business yearly | 2 × (€119 × 12) | **2,856** |
| Business monthly (seasonal) | 3 × €149 × 6 months | **2,682** |
| Pro annual | 4 × (€79 × 12) | **3,792** |
| Pro monthly | 3 × (€99 × 12) | **3,564** |
| **Total** | | **12,894** |

### 2.2 Monthly cash flow (seasonality)

**Annual subscribers:** Cash upfront when they renew; for the model we spread it evenly as **€554/month** (€6,648 ÷ 12).

**Monthly subscribers:**
- **Pro monthly** (year-round): 3 × €99 = **€297** every month.
- **Business monthly** (May–Oct only): 3 × €149 = **€447** in May–Oct; **€0** Nov–Apr.

| Month | Annual (amortised) | Pro monthly | Business monthly | **Total €/mo** |
|-------|--------------------|-------------|------------------|----------------|
| Jan | 554 | 297 | 0 | **851** |
| Feb | 554 | 297 | 0 | **851** |
| Mar | 554 | 297 | 0 | **851** |
| Apr | 554 | 297 | 0 | **851** |
| May | 554 | 297 | 447 | **1,298** |
| Jun | 554 | 297 | 447 | **1,298** |
| Jul | 554 | 297 | 447 | **1,298** |
| Aug | 554 | 297 | 447 | **1,298** |
| Sep | 554 | 297 | 447 | **1,298** |
| Oct | 554 | 297 | 447 | **1,298** |
| Nov | 554 | 297 | 0 | **851** |
| Dec | 554 | 297 | 0 | **851** |
| **Year total** | **6,648** | **3,564** | **2,682** | **12,894** |

Peak months (May–Oct): **€1,298/mo**. Off-peak (Nov–Apr): **€851/mo**.

---

## 3. Costs (annual)

Assumptions: single VPS (or equivalent), Stripe, email, domains, no dedicated support team.

| Item | €/year | Notes |
|------|--------|-------|
| **Hosting (VPS-2 type)** | 816 | e.g. OVH ~€68/mo; 12 tenants is fine |
| **Stripe (payments)** | ~320 | ~2.5% of €12,894 |
| **Email (e.g. SendGrid)** | 120–180 | Transactional only |
| **Domain + SSL** | 50 | Shared domain(s) |
| **Monitoring / backup** | 60–120 | Basic |
| **Buffer (incidents, tools)** | 200–500 | |
| **Total costs** | **~1,566 – 1,986** | round to **~1,800** |

---

## 4. P&L summary (annual)

| | **€** |
|--|--------|
| **Revenue** | **12,894** |
| **Costs** | **(1,800)** |
| **Gross profit** | **11,094** |
| **Margin** | **~86%** |

---

## 5. Cash flow nuance (annual upfront)

If **annual** customers pay **full year upfront**:

- **Business yearly:** 2 × €1,428 = **€2,856** (e.g. at signup/renewal).
- **Pro annual:** 4 × €948 = **€3,792**.

So **€6,648** arrives in lump sums (spread through the year depending on renewal dates), not evenly. The **monthly** table above spreads that for simplicity; in reality, those months will be lumpy. **Total yearly revenue is unchanged** at €12,894.

---

## 6. Sensibility checks

| Metric | Value |
|--------|--------|
| **Revenue per customer (avg)** | €12,894 ÷ 12 = **€1,075/year** |
| **Monthly recurring (MRR) – annualised** | €12,894 ÷ 12 = **€1,075** (≈ **€90/customer/month** avg) |
| **Break-even vs costs** | €1,800 ÷ 12 ≈ **€150/mo** → covered many times over |
| **Seasonality** | Peak €1,298 vs off-peak €851 → **~53% higher** in May–Oct |

---

## 7. Summary

| | **€** |
|--|--------|
| **Annual revenue** | **12,894** |
| **Annual costs** | **~1,800** |
| **Annual profit** | **~11,100** |
| **Margin** | **~86%** |

With **2 Business yearly**, **3 Business monthly (May–Oct)**, **4 Pro annual**, and **3 Pro monthly**, the financial balance is **strongly positive**: about **€11k profit** per year after basic SaaS ops costs. Seasonality is manageable: **€851/mo** off-peak and **€1,298/mo** peak.

---

**Optional next steps:**  
- Model churn (e.g. lose 1–2 seasonal monthly per year).  
- Add your own time (support, sales) as a cost.  
- Stress-test: e.g. all 3 Business monthly churn → revenue −€2,682, profit still ~€8.4k.
