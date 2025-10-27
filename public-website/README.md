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

This public website will connect to the DCMS backend API to:
- Get real-time availability
- Process bookings
- Store customer accounts
- Track certifications
- Generate confirmations

**Current Status:** Mock data integration (ready for backend connection)

