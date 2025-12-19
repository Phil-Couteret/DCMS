# DCMS Equipment & Infrastructure Breakdown

**Project:** Multi-Site Dive Center Management System (DCMS)  
**Target:** Fuerteventura Diving Center (Caleta de Fuste, Las Playitas, Hotel Mar)  
**Created:** October 2025

---

## 📊 **Equipment Requirements by Feature Category**

### 🚨 **MUST HAVE Features Equipment Requirements**

#### **On-Site Equipment (Per Location)**

| Equipment | Caleta de Fuste | Las Playitas | Purpose | Quantity |
|-----------|----------------|--------------|---------|----------|
| **Tablet/iPad** | ✅ Required | ✅ Required | Core booking system, customer check-in, equipment tracking | 2 units / 1 unit |
| **WiFi Router** | ✅ Required | ✅ Required | Internet connectivity for cloud-based system | 1 unit / 1 unit |
| **Printer (Receipt)** | ✅ Required | ✅ Required | Booking confirmations, invoices | 1 unit / 1 unit |
| **Desktop/Laptop (Admin)** | ✅ Required | ❌ Optional | Administrative tasks, reporting, bulk operations | 1 unit / 0 units |
| **Power Bank (Portable)** | ✅ Required | ✅ Required | Backup power for tablets during boat operations | 2 units / 1 unit |
| **Phone (Staff)** | ✅ Required | ✅ Required | SMS notifications, emergency contacts | 2 units / 1 unit |

#### **Cloud Infrastructure (Backbone)**

| Service | Specification | Purpose | Monthly Cost |
|---------|---------------|---------|--------------|
| **Main Server** | 8 vCores, 16GB RAM, 300GB SSD | Core application, database, API | €45.00 |
| **Backup Storage** | 500GB automated backups | Data protection, disaster recovery | €10.00 |
| **CDN (Content Delivery)** | Global content delivery | Fast access worldwide | €8.00 |
| **Monitoring & Alerts** | Server monitoring, uptime alerts | System health monitoring | €5.00 |
| **Domain & SSL** | Let's Encrypt SSL certificates | Secure HTTPS connections | €0.00 |
| **Email Service** | SMTP service for notifications | Automated emails, confirmations | €10.00 |
| **Backup Database** | Automated daily backups | Data redundancy | Included |
| **Total Cloud Infrastructure** | | | **€68.00/month** |

---

### ✅ **SHOULD HAVE Features Equipment Requirements**

#### **Additional On-Site Equipment (Per Location)**

| Equipment | Caleta de Fuste | Las Playitas | Purpose | Quantity |
|-----------|----------------|--------------|---------|----------|
| **Barcode Scanner** | ✅ Required | ✅ Required | Equipment barcode scanning system | 1 unit / 1 unit |
| **Camera (Equipment Photos)** | ✅ Required | ❌ Optional | Equipment condition documentation | 1 unit / 0 units |
| **Thermal Printer** | ✅ Required | ❌ Optional | High-speed ticket printing | 1 unit / 0 units |
| **Weather Station** | ✅ Required | ❌ Optional | Live weather data integration | 1 unit / 0 units |
| **NFC Scanner** | ✅ Optional | ❌ Not needed | Contactless equipment check-out | 1 unit / 0 units |

#### **Additional Cloud Infrastructure (Backbone)**

| Service | Specification | Purpose | Monthly Cost |
|---------|---------------|---------|--------------|
| **Payment Gateway (Stripe)** | Payment processing | Secure payment handling | Transaction fees only |
| **Multi-Agency APIs** | SSI, PADI, CMAS, VDST | Certification validation | €100.00/month |
| **SMS Service (Twilio)** | SMS notifications | Customer alerts, confirmations | €10.00/month |
| **Weather API** | Live weather data | Weather restrictions, alerts | €5.00/month |
| **Analytics Platform** | Google Analytics | Traffic monitoring, user behavior | €0.00 (free tier) |
| **Email Marketing** | Automated campaigns | Customer engagement | €10.00/month |
| **Total Additional Cloud** | | | **€135.00/month** |

---

## 🏢 **Complete Site-by-Site Equipment Breakdown**

### **Caleta de Fuste (Primary Location)**

**Operations:** 2 dives per day, 4 boats (White Magic, Grey Magic, Black Magic, Blue Magic), 2.5 boats typically in use, 20 divers per session

**Equipment for MUST + SHOULD Features:**

| Category | Equipment | Quantity | Unit Cost | Total Cost | Purpose |
|----------|-----------|----------|-----------|------------|---------|
| **Must Have Equipment** | | | | | |
| Tablet (iPad/Android) | 2 | €400 | €800 | Boat operations, check-in |
| WiFi Router | 1 | €100 | €100 | Internet connectivity |
| Printer (Receipt) | 1 | €150 | €150 | Confirmations, invoices |
| Desktop (Admin) | 1 | €600 | €600 | Administrative tasks |
| Power Bank | 2 | €30 | €60 | Backup power for boats |
| Phone (Staff) | 2 | €200 | €400 | SMS, emergency contact |
| **Subtotal (Must)** | | | **€2,110** | | |
| **Should Have Equipment** | | | | | |
| Barcode Scanner | 1 | €80 | €80 | Equipment tracking |
| Camera | 1 | €200 | €200 | Equipment photos |
| Thermal Printer | 1 | €200 | €200 | High-speed printing |
| Weather Station | 1 | €300 | €300 | Live weather data |
| **Subtotal (Should)** | | | **€780** | | |
| **TOTAL CALETA** | | | **€2,890** | **Complete operations** |

---

### **Las Playitas (Secondary Location)**

**Operations:** Shore diving, occasional boat dives, smaller scale operations

**Equipment for MUST + SHOULD Features:**

| Category | Equipment | Quantity | Unit Cost | Total Cost | Purpose |
|----------|-----------|----------|-----------|------------|---------|
| **Must Have Equipment** | | | | | |
| Tablet (iPad/Android) | 1 | €400 | €400 | Boat operations, check-in |
| WiFi Router | 1 | €100 | €100 | Internet connectivity |
| Printer (Receipt) | 1 | €150 | €150 | Confirmations, invoices |
| Power Bank | 1 | €30 | €30 | Backup power |
| Phone (Staff) | 1 | €200 | €200 | SMS, emergency contact |
| **Subtotal (Must)** | | | **€880** | | |
| **Should Have Equipment** | | | | | |
| Barcode Scanner | 1 | €80 | €80 | Equipment tracking |
| **Subtotal (Should)** | | | **€80** | | |
| **TOTAL LAS PLAYITAS** | | | **€960** | **Basic operations** |

---

### **Hotel Mar (Future Bike Rental - Optional)**

**Note:** Currently not active, for future expansion

**Equipment for MUST Features (if activated):**

| Equipment | Quantity | Unit Cost | Total Cost | Purpose |
|-----------|----------|-----------|------------|---------|
| Tablet | 1 | €400 | €400 | Bike rental operations |
| WiFi Router | 1 | €100 | €100 | Internet connectivity |
| Printer | 1 | €150 | €150 | Rental confirmations |
| **TOTAL HOTEL MAR** | | | **€650** | **Future expansion** |

---

## ☁️ **Complete Cloud Infrastructure (Backbone)**

### **MUST + SHOULD Features Cloud Requirements**

#### **Primary Infrastructure (OVH)**

| Service | Specification | Annual Cost | Purpose |
|---------|---------------|-------------|---------|
| **Main Server** | 8 vCores, 16GB RAM, 300GB SSD | €540 | Core application, database |
| **Backup Storage** | 500GB automated backups | €120 | Data protection |
| **CDN (Content Delivery)** | Global content delivery | €96 | Fast access worldwide |
| **Monitoring & Alerts** | Server monitoring | €60 | System health |
| **Domain Registration** | .com domain | €15 | Website address |
| **SSL Certificates** | Let's Encrypt | €0 | Secure HTTPS |
| **Email Service** | SMTP service | €120 | Automated notifications |
| **Total Primary Cloud** | | **€816** | **Core infrastructure** |

#### **Additional Services (SHOULD HAVE)**

| Service | Purpose | Annual Cost |
|---------|---------|-------------|
| **Multi-Agency API Licenses** | SSI, PADI, CMAS, VDST certification | €1,200 |
| **Payment Gateway (Stripe)** | Payment processing | Transaction fees |
| **SMS Service (Twilio)** | Customer alerts, confirmations | €120 |
| **Weather API** | Live weather data | €60 |
| **Analytics Platform** | User behavior tracking | €0 (free) |
| **Email Marketing** | Customer engagement | €120 |
| **Total Additional Services** | | **€1,500** |

#### **Total Cloud Infrastructure**

| Category | Annual Cost |
|----------|-------------|
| **Primary Cloud (OVH)** | €816 |
| **Additional Services** | €1,500 |
| **TOTAL CLOUD INFRASTRUCTURE** | **€2,316/year** |

---

## 📊 **Summary: Equipment & Infrastructure**

### **On-Site Equipment Summary**

| Location | Must Have | Should Have | Total Cost | Status |
|----------|-----------|-------------|------------|--------|
| **Caleta de Fuste** | €2,110 | €780 | **€2,890** | Active |
| **Las Playitas** | €880 | €80 | **€960** | Active |
| **Hotel Mar** | €650 | €0 | **€650** | Future |
| **TOTAL SITES** | **€3,640** | **€860** | **€4,500** | |

### **Cloud Infrastructure Summary**

| Category | Annual Cost |
|----------|-------------|
| **Core Infrastructure** | €816 |
| **Additional Services** | €1,500 |
| **TOTAL CLOUD** | **€2,316/year** |

### **Total First Year Investment**

| Item | Cost |
|------|------|
| **On-Site Equipment** | €4,500 |
| **Cloud Infrastructure (Year 1)** | €2,316 |
| **Installation & Setup** | €2,500 |
| **TOTAL FIRST YEAR** | **€9,316** |

### **Ongoing Annual Costs**

| Item | Annual Cost |
|------|-------------|
| **Cloud Infrastructure** | €2,316 |
| **Maintenance & Support** | €3,000 |
| **API Licenses** | €1,200 |
| **TOTAL ANNUAL** | **€6,516** |

---

## 💡 **Equipment Justification**

### **Why These Equipment Choices?**

1. **Tablets (iPad/Android)**
   - Essential for mobile operations on boats
   - Water-resistant cases available
   - Long battery life for full-day operations
   - Touch-screen friendly for customer check-in

2. **WiFi Routers**
   - Cloud-based system requires reliable internet
   - 4G/5G backup connectivity recommended
   - VPN support for secure connections

3. **Barcode Scanners**
   - Efficient equipment tracking (SHOULD feature)
   - Reduces manual entry errors
   - Fast checkout process

4. **Power Banks**
   - Critical for boat operations
   - Ensures system availability during long dives
   - Customer check-in reliability

5. **Cloud Infrastructure**
   - Centralized data management
   - Automatic backups and updates
   - Scalable for future growth
   - Multi-site synchronization

---

## 🎯 **Minimum Viable Equipment (Budget Option)**

For Budget Option, use existing equipment where possible:

### **Caleta de Fuste (Budget)**
- Reuse existing tablets if available
- Purchase only essential items: €1,110 (printer, router, power bank)

### **Las Playitas (Budget)**
- Reuse existing tablets if available
- Purchase only essential items: €880

### **Total Budget Equipment:** €1,990

---

## 📈 **Equipment Scaling for Future Growth**

### **When to Add Additional Equipment:**

**Phase 2 (Expansion):**
- Add more tablets for additional boats
- Upgrade to higher-capacity servers
- Add backup servers for high availability

**Phase 3 (Premium Features):**
- IoT equipment sensors
- GPS tracking for boats
- Advanced analytics hardware
- Premium mobile apps

---

**Last Updated:** October 2025  
**Status:** Complete Equipment Breakdown

