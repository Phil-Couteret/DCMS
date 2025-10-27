# DCMS PWA - Testing Guide

**Status:** Ready for Testing  
**Framework:** React PWA with LocalStorage  
**Backend Required:** No (fully functional with mock data)

---

## 🚀 **How to Test the App**

### **1. Install Dependencies**

```bash
cd frontend
npm install
```

**Required packages:**
- react
- react-dom
- react-router-dom
- @mui/material (Material-UI)
- @mui/icons-material

### **2. Start Development Server**

```bash
npm start
```

App will open at: `http://localhost:3000`

---

## ✅ **Features to Test**

### **1. Dashboard (Home Page)**
- ✅ **Test:** Navigate to `/`
- ✅ **Expected:** See dashboard with statistics
- ✅ **Check:**
  - Today's bookings count (sample data shows 2)
  - Today's revenue (€134.00)
  - Total bookings
  - Total revenue
  - List of today's bookings

### **2. Bookings Management**
- ✅ **Test:** Navigate to `/bookings`
- ✅ **Expected:** See bookings list or empty state
- ✅ **Create New Booking:**
  - Click "New Booking"
  - Select a customer
  - Enter booking date
  - Select boat and dive site
  - Choose number of dives (1-10)
  - Add night dive addon (+€20)
  - Add personal instructor (+€100)
  - Apply government bono discount
  - See volume discount calculation
  - See price breakdown
  - Click "Create Booking"
- ✅ **Expected:** Booking saved to localStorage

### **3. Volume Discount System**
- ✅ **Test:** In booking form, change number of dives
- ✅ **Expected:** 
  - 1 dive = €46
  - 2-3 dives = €44 per dive
  - 4-6 dives = €42 per dive
  - 7-8 dives = €40 per dive
  - 9+ dives = €38 per dive
- ✅ **Visual:** Volume Discount Calculator shows pricing tiers
- ✅ **Check:** Table highlights current tier

### **4. Customer Management**
- ✅ **Test:** Navigate to `/customers`
- ✅ **Expected:** See customers list (2 sample customers)
- ✅ **Search:**
  - Type "John" → Shows John Smith
  - Type "Maria" → Shows Maria Garcia
- ✅ **Create New Customer:**
  - Click "New Customer"
  - Fill in form:
    - First Name, Last Name
    - Email, Phone
    - Date of Birth
    - Nationality
    - Customer Type (Tourist/Local/Recurrent)
    - Equipment Size preference
    - Wetsuit Size preference
  - Click "Create Customer"
- ✅ **Edit Customer:**
  - Click edit icon on customer card
  - Modify information
  - Click "Update Customer"

### **5. Equipment Tracking**
- ✅ **Test:** Navigate to `/equipment`
- ✅ **Expected:** See equipment statistics
- ✅ **Check:**
  - Total Equipment count
  - Available equipment
  - In Use equipment
- ✅ **Expected:** See equipment cards showing:
  - Equipment name
  - Category
  - Size
  - Serial number
  - Condition (Excellent/Good/Fair)
  - Availability status
- ✅ **Search:**
  - Type equipment name (e.g., "BCD")
  - Type size (e.g., "M")
  - Type serial number

### **6. PWA Features**
- ✅ **Test:** Check if app is installable
- ✅ **Expected:**
  - Browser shows "Install" option
  - Can be added to home screen on mobile
  - Works like native app
- ✅ **Test:** Disconnect internet
- ✅ **Expected:** App continues to work (localStorage data)

### **7. Offline Mode**
- ✅ **Test:** 
  - Disconnect from internet
  - Navigate through app
  - Create new bookings
- ✅ **Expected:** 
  - App works without internet
  - Data stored locally
  - No errors

### **8. Data Persistence**
- ✅ **Test:**
  - Create a booking
  - Refresh the page
  - Check if booking still exists
- ✅ **Expected:** 
  - All data persists in localStorage
  - No data loss on refresh

### **9. Language Switcher**
- ✅ **Test:** Click language dropdown in top bar
- ✅ **Expected:** 
  - See 5 languages: Español, English, Deutsch, Français, Italiano
  - Can switch between languages
  - Preference saved to localStorage

### **10. Government Bono System**
- ✅ **Test:** In booking form, apply bono code
- ✅ **Expected:**
  - Discount applied automatically
  - Government payment shown
  - Customer payment shown
  - Total adjusted
- ✅ **Check:** BONO-2025-001 gives 20% discount up to €200

### **11. Navigation**
- ✅ **Test:** Click through navigation
- ✅ **Expected:**
  - Dashboard loads
  - Bookings loads
  - Customers loads
  - Equipment loads
  - Settings loads (placeholder)
- ✅ **Check:** Sidebar highlights current page

---

## 📊 **Test Scenarios**

### **Scenario 1: Complete Booking Flow**
1. Go to `/bookings`
2. Click "New Booking"
3. Select customer: John Smith
4. Select booking date: today
5. Select boat: White Magic
6. Select dive site: Castillo Reef
7. Enter number of dives: 3
8. Add night dive addon
9. See price: €132 (3×€44)
10. Click "Create Booking"
11. ✅ Verify booking appears in dashboard
12. ✅ Verify booking appears in bookings list

### **Scenario 2: Volume Discount Calculation**
1. Go to `/bookings` → New Booking
2. Enter 1 dive → See €46
3. Enter 2 dives → See €88 (2×€44)
4. Enter 5 dives → See €210 (5×€42)
5. Enter 9 dives → See €342 (9×€38)
6. ✅ Verify discount percentage increases

### **Scenario 3: Customer Search**
1. Go to `/customers`
2. Type "John" in search
3. ✅ See John Smith
4. Type "Maria"
5. ✅ See Maria Garcia
6. Type "xyz"
7. ✅ See "No results found"

### **Scenario 4: Equipment Tracking**
1. Go to `/equipment`
2. ✅ See equipment statistics
3. ✅ See all equipment cards
4. Search for "BCD"
5. ✅ See filtered results
6. ✅ Note availability statuses

---

## 🔍 **Checklist**

### **Functional Testing**
- [ ] Dashboard loads with statistics
- [ ] Can create new booking
- [ ] Volume discount calculator works
- [ ] Addons apply correctly (+€20, +€100)
- [ ] Government bono discount applies
- [ ] Booking saves to localStorage
- [ ] Can view booking in list
- [ ] Can edit booking
- [ ] Customer search works
- [ ] Can create new customer
- [ ] Can edit customer
- [ ] Equipment list displays
- [ ] Equipment statistics show correct numbers
- [ ] Navigation works between pages
- [ ] Language switcher works (UI - translations partial)

### **PWA Testing**
- [ ] App is installable
- [ ] Service worker registered
- [ ] Works offline
- [ ] Data persists on refresh
- [ ] No console errors
- [ ] Fast loading time

### **Browser Testing**
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works on mobile/tablet browser
- [ ] Responsive design works

### **Data Testing**
- [ ] Sample bookings load
- [ ] Sample customers load
- [ ] Sample equipment loads
- [ ] New data saves correctly
- [ ] Data persists across sessions

---

## 🐛 **Known Limitations**

1. **Multilingual:** Infrastructure ready, translations partial (UI texts not fully translated yet)
2. **No backend:** All data in localStorage (will migrate to API later)
3. **No authentication:** Direct access (will add login later)
4. **Basic equipment:** No barcode scanning yet
5. **No calendar view:** List view only
6. **No reports:** Basic dashboard only

---

## 🎯 **Success Criteria**

✅ **App is fully functional without backend**  
✅ **All MUST HAVE features work**  
✅ **Volume discount calculator accurate**  
✅ **PWA offline mode works**  
✅ **Data persists correctly**  
✅ **No errors in console**  
✅ **Ready for staff testing**

---

## 📝 **Next Steps After Testing**

1. **Fix any bugs found**
2. **Complete multilingual translations**
3. **Add backend API integration**
4. **Add authentication**
5. **Add calendar view**
6. **Add advanced reports**
7. **Add barcode scanning**
8. **Deploy to production**

---

## 🚀 **To Run Tests**

```bash
cd frontend
npm install
npm start
```

Then open browser: `http://localhost:3000`

**Happy Testing! 🎉**

