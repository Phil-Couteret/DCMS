# Multi-Agency Certification Implementation

**Challenge:** SSI, PADI, CMAS, VDST don't offer public APIs  
**Solution:** Embedded portals and pop-up windows for agency database access

---

## 🎯 **Proposed Implementation**

### **Embedded Portal Integration**

When a staff member adds a new diver or checks an existing diver's certification, they can:

1. **Select Agency:** Choose SSI, PADI, CMAS, or VDST
2. **Click "Verify Certification" button**
3. **Pop-up opens** with the agency's portal embedded
4. **Staff enters diver's information** (cert number, name, DOB)
5. **System verifies certification** through the agency's website
6. **Data is captured and stored** in the DCMS database

---

## 🔧 **Technical Implementation Options**

### **Option 1: Pop-up Windows (Recommended)**

**How it works:**
- User clicks "Verify SSI Certification"
- New browser window/tab opens
- Agency's verification portal loads
- Staff enters certification number
- Verification results are shown
- Staff copies relevant data back to DCMS form

**Pros:**
- ✅ No iframe restrictions
- ✅ Works with any agency website
- ✅ Clean separation of systems
- ✅ Agencies can't block it
- ✅ Simpler implementation

**Cons:**
- ❌ Manual data copying from agency portal
- ❌ Requires staff interaction
- ❌ Not fully automated

---

### **Option 2: Iframe Embedding (If Agency Allows)**

**How it works:**
- Small window embedded within DCMS
- Agency's verification portal loaded in iframe
- Staff can verify without leaving the page
- Data can be manually transferred

**Pros:**
- ✅ Seamless experience
- ✅ No page navigation
- ✅ Better user experience

**Cons:**
- ❌ Many agencies block iframe embedding for security
- ❌ May violate agency policies
- ❌ Less reliable

---

### **Option 3: Browser Extension/Helper (Advanced)**

**How it works:**
- Custom browser extension captures verification data
- Reads data from agency portal
- Populates DCMS form automatically
- Backs up certification documents

**Pros:**
- ✅ Can automate data transfer
- ✅ Reduces manual entry
- ✅ Captures certification photos

**Cons:**
- ❌ Requires browser extension development
- ❌ More complex implementation
- ❌ May violate agency terms of service
- ❌ Requires ongoing maintenance

---

## 📋 **Recommended Implementation: Pop-up Windows**

### **User Flow:**

```
1. Staff opens "Add Customer" or "Check Customer" in DCMS
2. Enters basic customer info (name, email, phone)
3. Clicks "Certifications" tab
4. Selects agency from dropdown: [SSI] [PADI] [CMAS] [VDST]
5. Clicks "Verify Certification" button
   → Pop-up window opens with agency's verification portal
6. Staff enters certification number, name, DOB in agency portal
7. Agency portal shows certification details:
   - Certification level
   - Issue date
   - Expiry date
   - Instructor name
   - Dive center
8. Staff copies data back to DCMS form
9. DCMS stores certification in local database
10. Staff clicks "Save" → Certification linked to customer profile
```

---

## 🛠️ **Technical Requirements**

### **Database Fields (Already in Schema):**

```sql
customer_certifications (
    customer_id,
    agency_id,           -- SSI, PADI, CMAS, VDST
    certification_number,
    certification_level,
    issue_date,
    expiry_date,
    instructor_name,
    dive_center,
    api_validated,       -- false (manual verification)
    api_data,           -- JSONB with extra data
    last_validated
)
```

### **UI Components Needed:**

1. **Agency Selection Dropdown:**
   ```
   [SSI] [PADI] [CMAS] [VDST]
   ```

2. **"Verify Certification" Button:**
   - Opens pop-up with agency portal
   - Only visible if agency selected

3. **Certification Entry Form:**
   - Certification number input
   - Certification level dropdown
   - Issue date
   - Expiry date
   - Manual entry option if pop-up not used

4. **Certification Display:**
   - List of all customer certifications
   - Status indicator (valid/expired)
   - Quick edit button

---

## 🔗 **Agency Portal Links (Typical URLs)**

### **SSI (Scuba Schools International)**
- **Verification Portal:** [SSI Verification](https://www.divessi.com/verify-certification)
- **Instructor Login:** SSI professionals portal
- **Customer Portal:** SSI customer login

### **PADI (Professional Association of Diving Instructors)**
- **Verification Portal:** [PADI Check](https://www.padi.com/padi-check)
- **Instructor Login:** PADI Pros' Site
- **Certification Search:** Member database search

### **CMAS (Confédération Mondiale des Activités Subaquatiques)**
- **Verification:** CMAS online database (varies by country)
- **Spain CMAS:** Check Spanish CMAS website
- **Certification Lookup:** National federation portals

### **VDST (Verband Deutscher Sporttaucher)**
- **Verification Portal:** [VDST Certification Check](https://www.vdst.de/)
- **Germany:** VDST national database
- **Certification Lookup:** VDST online portal

---

## 💡 **Implementation Strategy**

### **Phase 1: Manual Portal Access (Day 1)**

**Quick Implementation:**
1. Add agency selection dropdown
2. Add "Open [Agency] Portal" button
3. Opens pop-up with correct agency URL
4. Staff manually enters data from pop-up results
5. Data stored in DCMS database

**Development Time:** 2 days  
**Cost:** €1,400 (Senior) / €1,500 (Junior)

---

### **Phase 2: Smart Pop-ups (Week 2)**

**Enhanced Implementation:**
1. Pre-populate pop-up with customer name/DOB (if available)
2. Remember last verification result
3. Auto-fill suggestion from history
4. Quick re-verification button

**Development Time:** 1 day  
**Cost:** €700 (Senior) / €750 (Junior)

---

### **Phase 3: Data Capture Helper (Optional - Week 3)**

**Advanced Implementation:**
1. Browser extension to capture data
2. OCR for certification photos
3. Auto-populate DCMS form from pop-up
4. Document backup storage

**Development Time:** 3-5 days  
**Cost:** €2,100-3,500 (Senior)

---

## 📊 **Recommended Approach**

### **Standard Option (Recommended):**

**Phase 1 + Phase 2 = 3 days development**

**What you get:**
- ✅ Agency selection (SSI, PADI, CMAS, VDST)
- ✅ Pop-up windows to agency portals
- ✅ Pre-populated customer data (name, DOB)
- ✅ Manual data entry from verification results
- ✅ Local database storage
- ✅ Quick verification button for repeat customers

**Cost:** ~€2,100 (Senior developer)

---

## 🎯 **Practical Example**

### **Scenario: New Diver Check-in**

1. **Customer arrives:** John Smith from UK
2. **Staff opens DCMS:** Customer → Add New Customer
3. **Enters basic info:**
   - Name: John Smith
   - DOB: 1985-05-15
   - Email: john@example.com
   
4. **Certifications tab:**
   - Selects "PADI"
   - Clicks "Verify Certification"
   - Pop-up opens: https://www.padi.com/padi-check
   
5. **Staff enters in PADI portal:**
   - Certification number: PADI-123456
   - Name: John Smith
   - DOB: 1985-05-15
   
6. **PADI portal returns:**
   - Certification: Open Water Diver
   - Issue date: 2022-06-10
   - Instructor: Jane Doe
   - Dive center: UK Dive Center
   
7. **Staff copies data to DCMS:**
   - Certification level: Open Water Diver
   - Issue date: 2022-06-10
   - Expiry: n/a (permanent cert)
   
8. **Staff clicks Save:**
   - Certification stored in DCMS
   - Linked to John Smith's profile
   - Can now book appropriate dives

---

## ⚠️ **Important Considerations**

### **Limitations:**
- Manual data entry (can't fully automate)
- Requires staff to access agency portals
- Some agencies may have login requirements
- Verification speeds depend on agency portal

### **Benefits:**
- ✅ Works with all agencies (no API needed)
- ✅ Reliable verification through official portals
- ✅ Local database for quick lookup
- ✅ Supports all 4 agencies from day one
- ✅ Respects agency policies

### **Alternative for Daily Use:**
- Store certification data locally after first verification
- Re-verify only for questionable or old certifications
- Keep certification data in customer profile
- Quick lookup without accessing agency portal every time

---

## 📋 **Updated Feature Description**

### **Multi-Agency Certification (MUST HAVE - Manual Portal Integration)**

**Description:** Support for SSI, PADI, CMAS, VDST certification verification through embedded agency portals.

**Features:**
- Agency selection dropdown (SSI, PADI, CMAS, VDST)
- Pop-up windows to official agency verification portals
- Manual certification data entry from verification results
- Local database storage of certification information
- Quick lookup of stored certifications
- Certification status tracking (valid/expired)
- Support for multiple certifications per customer

**Technical Implementation:**
- 3 days development (pop-up integration)
- No agency API licenses needed (€0 annual cost)
- Manual portal access
- Local database storage

---

**Last Updated:** October 2025  
**Status:** Recommended Implementation Approach

