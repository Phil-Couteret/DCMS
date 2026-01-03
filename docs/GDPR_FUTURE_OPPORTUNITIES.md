# GDPR: Keeping Data for "Future Opportunities"

**Question:** Recruiters ask if they can keep candidate data after 180 days for future opportunities. Does this apply to DCMS?

**Answer:** Yes, similar principles apply, but the context matters.

---

## 🎯 The Recruiter Scenario (180 Days)

**GDPR Requirements for Recruiters:**
- ✅ **Explicit Consent Required:** Cannot assume consent - must be explicitly given
- ✅ **Clear Purpose:** Must specify "keeping your data for future job opportunities"
- ✅ **Timeframe:** Must specify how long (e.g., "6-12 months")
- ✅ **Withdrawal Right:** Must be easy to withdraw consent
- ✅ **Purpose Limitation:** Cannot use data for other purposes

**Common Practice:** 6-12 months retention with explicit, opt-in consent checkbox.

---

## 🔍 Does This Apply to DCMS?

### ✅ **Already Handled: Marketing Consent**

**Current Implementation:**
- ✅ Marketing consent is optional (explicit opt-in)
- ✅ Users can withdraw consent anytime via My Account
- ✅ Consent expires after 3 years of inactivity
- ✅ Clear purpose: "promotional offers and newsletters"

**GDPR Status:** ✅ **COMPLIANT** - This is exactly what recruiters need to do!

---

### ⚠️ **Potential Gap: Staff Recruitment Data**

**Question:** Do you keep CVs/applications for future staff positions?

**If YES, you should:**
1. **Get Explicit Consent:**
   ```
   ☐ I consent to Deep Blue Diving keeping my application data 
     for up to 12 months for consideration for future positions
   ```

2. **Specify Timeframe:**
   - "We will keep your data for 12 months"
   - "You can request deletion at any time"

3. **Document Purpose:**
   - "For consideration in future employment opportunities"
   - Not for marketing or other purposes

4. **Allow Withdrawal:**
   - "You can withdraw consent and request deletion anytime"

**Current Status:** ❌ **NOT APPLICABLE** - Staff recruitment is not part of DCMS

---

### ✅ **Different Context: Customer Data for Bookings**

**This is Different:**
- **Legal Basis:** Contract performance (Article 6(1)(b))
- **Purpose:** Fulfilling dive bookings (not "future opportunities")
- **Retention:** Based on legal requirements (7 years for financial records)

**Not Required:**
- ❌ Separate consent for keeping customer data for future bookings
- ❌ 180-day limitation
- Why? It's necessary for contract performance

**However, if you want to:**
- Send marketing emails → Requires consent ✅ (already handled)
- Keep data beyond legal requirements → Requires consent or legitimate interest

---

## 📋 GDPR Best Practices for "Future Opportunities"

### **Scenario 1: Marketing/Future Promotions**
✅ **Your Current Implementation:**
- Explicit opt-in consent
- Clear purpose: "promotional offers"
- Easy withdrawal
- Timeframe: Until withdrawn or 3 years inactive

**Status:** ✅ **COMPLIANT**

---

### **Scenario 2: Staff Recruitment**
⚠️ **If You Keep CVs/Applications:**

**Required Elements:**
```javascript
// In staff recruitment form:
{
  consentType: 'future_recruitment',
  purpose: 'Keeping application data for consideration for future positions',
  timeframe: '12 months',
  explicit: true, // Must be opt-in, not pre-checked
  withdrawable: true
}
```

**Privacy Policy Should State:**
```
If you apply for a position with us and are not successful, we may keep 
your application data for up to 12 months to consider you for future 
positions, but only if you have given explicit consent for this purpose.
```

**Current Status:** ⚠️ **CHECK IF APPLICABLE**

---

### **Scenario 3: Partner Referrals**
⚠️ **If You Keep Partner Contact Info for Future Partnerships:**

**Required:**
- Explicit consent for future opportunities
- Clear timeframe
- Clear purpose
- Easy withdrawal

**Current Status:** ⚠️ **CHECK IF APPLICABLE**

---

## ✅ **What You Should Do**

### **Immediate Actions:**

1. **Review Marketing Consent:**
   - ✅ Already compliant - no action needed

2. **Check Staff Recruitment:**
   - ✅ Not applicable - Staff recruitment is not part of DCMS
   - No action needed

3. **Review Other "Future Opportunities":**
   - Partner data for future partnerships?
   - Supplier data for future collaborations?
   - Any other "keep data for later" scenarios?

---

## 📝 **Recommended Implementation for Staff Recruitment**

### **If You Keep Staff Applications:**

**1. Add to Privacy Policy:**
```markdown
### Staff Recruitment Data
If you apply for a position with Deep Blue Diving and are not successful, 
we may keep your application data (CV, cover letter, qualifications) for 
up to 12 months for consideration for future positions, but only with your 
explicit consent. You can withdraw this consent and request deletion of 
your data at any time.
```

**2. Add Consent Checkbox in Application Form:**
```html
☐ I consent to Deep Blue Diving keeping my application data for up to 
  12 months for consideration for future positions. I understand I can 
  withdraw this consent at any time.
```

**3. Retention Policy:**
- Default: Delete after 6 months if no consent
- With consent: Keep for 12 months, then auto-delete
- Allow immediate deletion on request

**4. Track Consent:**
- Store consent in `staff_applications` table or similar
- Track consent date
- Allow withdrawal via email request

---

## 🎯 **Comparison: Recruiters vs. Your DCMS**

| Element | Recruiters | Your DCMS (Marketing) | Your DCMS (Staff?) |
|---------|------------|----------------------|-------------------|
| **Explicit Consent** | ✅ Required | ✅ Implemented | ❌ N/A |
| **Clear Purpose** | ✅ Required | ✅ Clear | ❌ N/A |
| **Timeframe** | ✅ Required | ✅ 3 years | ❌ N/A |
| **Withdrawal** | ✅ Required | ✅ Easy | ❌ N/A |
| **Opt-in** | ✅ Required | ✅ Implemented | ❌ N/A |

---

## 💡 **Key Takeaways**

1. ✅ **Marketing Consent:** Already compliant - matches recruiter requirements

2. ✅ **Staff Recruitment:** Not applicable - Staff recruitment is not part of DCMS

3. ✅ **Customer Bookings:** Different legal basis (contract) - no consent needed for fulfilling bookings

4. 🎯 **General Rule:** If you're keeping data for "future opportunities" (beyond contract performance), you need explicit consent with clear purpose and timeframe.

---

## 📋 **Action Items**

- [x] Marketing consent - ✅ Already compliant
- [x] Staff recruitment - ✅ Not applicable (not part of DCMS)
- [ ] Review other "future opportunities" scenarios (if any)
- [x] Privacy Policy updated - ✅ Complete

---

**Last Updated:** January 2026  
**Status:** Marketing compliant ✅ | Staff recruitment: N/A ✅

