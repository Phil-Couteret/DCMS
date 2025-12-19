# Deep Blue Diving - Customer Booking Website

**Purpose:** Replace the existing website (deep-blue-diving.com)  
**Target:** Customer-facing booking and information website  
**Features:** Online booking, account creation, dive site info, pricing

---

## 🎯 **Website Features**

### **Public Pages:**
1. **Home** - Welcome page with dive center info
2. **Book a Dive** - Online booking system
3. **Dive Sites** - Caleta de Fuste & Las Playitas dive sites
4. **About Us** - Crew, philosophy, equipment, awards
5. **Pricing** - Dive pricing for both locations
6. **Contact** - Contact information and map
7. **My Account** - Customer account area (bookings, profile)

### **Customer Features:**
- ✅ Create account (register)
- ✅ Login/Logout
- ✅ Book dives online
- ✅ View booking history
- ✅ Manage profile
- ✅ See dive certifications
- ✅ View equipment
- ✅ Multilingual (ES, EN, DE, FR, IT)

---

## 🎨 **Design from Deep Blue Diving**

Based on their current website:
- **Colors:** Blue theme (reflecting diving/Atlantic)
- **Style:** Modern, clean, professional
- **Focus:** Adventure, safety, professionalism
- **Tone:** "The Red Sea is the zoo, the Atlantic the safari!"

---

## 📋 **Site Structure**

```
public-website/
├── src/
│   ├── pages/
│   │   ├── Home.jsx              # Landing page
│   │   ├── BookDive.jsx          # Online booking
│   │   ├── DiveSites.jsx         # Dive sites info
│   │   ├── About.jsx             # About us page
│   │   ├── Pricing.jsx           # Pricing tables
│   │   ├── Contact.jsx           # Contact page
│   │   └── MyAccount.jsx         # Customer area
│   ├── components/
│   │   ├── Navigation.jsx        # Top navigation
│   │   ├── Footer.jsx            # Footer
│   │   ├── BookingForm.jsx       # Booking interface
│   │   ├── PricingCard.jsx       # Pricing display
│   │   └── DiveSiteCard.jsx      # Dive site cards
│   └── assets/
│       └── images/               # Images, logos
```

---

## 🚀 **Quick Start**

```bash
cd public-website
npm install
npm start
```

---

## 📊 **Key Information from Website**

### **Locations:**
- **Caleta de Fuste:** Muelle Deportivo / Calle Teneriffe, 35610
- **Las Playitas:** Hotel Gran Resort Las Playitas

### **Contact:**
- **Caleta:** +34.928 163 712 / +34.606 275 468
- **Las Playitas:** +34.653 512 638
- **Email:** info@deep-blue-diving.com, playitas@deep-blue-diving.com

### **Philosophy:**
> "The Red Sea is the zoo, the Atlantic the safari!"

### **Features:**
- Night dives (on request)
- SSI and PADI courses
- Equipment rental
- Professional crew
- Awards and certifications

---

## 🎯 **Integration with DCMS**

This public website connects to the DCMS backend using localStorage (shared with admin system):
- ✅ **Real-time availability checking** - Basic capacity validation
- ✅ **Process bookings** - Full booking flow with payment (dummy payment system)
- ✅ **Store customer accounts** - Auto-create/update customers on booking
- ✅ **Sync with admin system** - Bookings appear in DCMS admin immediately
- ✅ **Email preparation** - Email service ready for backend integration
- ⏳ **Track certifications** - (Future feature)
- ⏳ **Real email sending** - (Requires backend API integration)

**Current Status:** Fully functional booking system with dummy payment. Bookings are stored in localStorage and sync with DCMS admin system.

## 📝 **Booking Flow**

1. **Step 1: Select Activity** - Choose activity type (Diving, Snorkeling, Discover Scuba, Orientation), location, date, time, and number of dives
2. **Step 2: Enter Details** - Customer information (name, email, phone, special requirements)
3. **Step 3: Review & Confirm** - Review all booking details and pricing
4. **Step 4: Payment** - Dummy payment system (Card, PayPal placeholder, or Pay at Location)
5. **Step 5: Confirmation** - Booking confirmed with booking ID and transaction details

## 💳 **Payment System**

Currently implements a **dummy payment system**:
- **Credit/Debit Card** - Card form with validation (no real processing)
- **PayPal** - Placeholder (coming soon)
- **Pay at Location** - Option to pay at the dive center

All payments are marked as "paid" and bookings are immediately confirmed. Real payment gateway integration can be added later.

## 🔄 **Data Synchronization**

Bookings created on the public website are stored in the same localStorage keys as the DCMS admin system:
- `dcms_bookings` - All bookings
- `dcms_customers` - Customer database
- `dcms_locations` - Location data

This ensures immediate synchronization between the public website and admin system when both are running in the same browser.

