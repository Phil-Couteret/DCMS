# DCMS - Dive Center Management System

**Complete Planning & Development Repository**  
**Target:** Deep Blue Diving, Fuerteventura  
**License:** GPL-3.0

---

## 📋 **Project Overview**

The Dive Center Management System (DCMS) is a comprehensive, cloud-based management system designed for multi-site dive center operations. This system handles bookings, customers, equipment, certifications, compliance, and more.

**Key Features:**
- ✅ **Flexible Equipment Rental** (individual equipment selection - BCD, Regulator, Mask, Fins, Boots, Wetsuit, Computer, Torch)
- ✅ Volume discount pricing (1 dive: €46, 2-3 dives: €44, 4-6 dives: €42, 7-8 dives: €40, 9+ dives: €38)
- ✅ Multilingual support (Spanish, English, German, French, Italian)
- ✅ Multi-currency support (EUR, GBP, USD)
- ✅ Government bono system (Canary Islands resident discounts)
- ✅ **PWA Offline Mode** (operations continue during internet failure)
- ✅ Multi-agency certification (SSI, PADI, CMAS, VDST via portal integration)
- ✅ Regulatory compliance (Spanish maritime, GDPR, insurance)
- ✅ Cross-period stay pricing
- ✅ Advanced customer profiles
- ✅ **Equipment Management** (60 pieces with detailed specifications)

---

## 🚀 **Quick Start**

### **Prerequisites:**
- Node.js 18+ and npm
- PostgreSQL 13+
- Git

### **Installation:**
```bash
# Clone the repository
git clone https://github.com/Phil-Couteret/DCMS.git
cd DCMS

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

### **Frontend Development:**
```bash
# Start frontend (PWA Admin)
cd frontend
npm install
npm start

# Start public website
cd public-website
npm install
npm start
```

---

## 📁 **Project Structure**

```
DCMS/
├── docs/                    # Documentation
│   ├── planning/            # Project planning documents
│   ├── schema/              # Database schema
│   └── api/                 # API documentation
├── frontend/                # PWA Admin Frontend (React + Material-UI)
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Booking/     # Booking management
│   │   │   ├── Customer/    # Customer management
│   │   │   └── Common/      # Shared components
│   │   ├── pages/           # Page components
│   │   ├── services/        # Data services
│   │   └── utils/           # Utility functions
│   └── public/              # Static files
├── public-website/          # Customer-facing website (React)
│   ├── src/
│   │   ├── components/      # Website components
│   │   ├── pages/           # Website pages
│   │   └── services/        # API services
│   └── public/              # Static files
├── database/                # Database scripts
│   ├── schema/              # SQL schema files
│   └── seeds/               # Sample data
└── tests/                   # Test files
    ├── backend/             # Backend tests
    └── frontend/            # Frontend tests
```

---

## 🛠️ **Tech Stack**

**Frontend (PWA Admin):**
- React 18
- Material-UI (MUI)
- PWA (Progressive Web App)
- Service Worker (offline mode)
- LocalStorage (mock data)

**Public Website:**
- React 18
- Material-UI (MUI)
- React Router DOM
- Responsive design

**Backend (Planned):**
- Node.js + Express.js
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Swagger API Documentation

**DevOps:**
- Docker
- GitHub Actions (CI/CD)
- OVH Cloud hosting

---

## 🏊‍♂️ **Equipment System**

### **Flexible Equipment Rental (60 pieces)**
- **Individual Selection:** Choose specific equipment to rent
- **Equipment Types:** BCD, Regulator, Mask, Fins, Boots, Wetsuit, Computer, Torch
- **Own Equipment:** Customer preference option
- **Mixed Approach:** Combine own and rented equipment
- **Detailed Specifications:** Brand, model, thickness, style, hood

### **Equipment Inventory:**
- **BCDs:** 6 pieces (XS to XXL)
- **Regulators:** 5 pieces
- **Masks:** 5 pieces
- **Fins:** 6 pieces (XS to XXL)
- **Boots:** 6 pieces (XS to XXL)
- **Wetsuits:** 20 pieces (various types/thicknesses)
- **Semi-Dry Suits:** 4 pieces
- **Dive Computers:** 5 pieces
- **Dive Torches:** 6 pieces

---

## 📚 **Documentation**

All planning and documentation is in the `/docs` folder:

- `docs/planning/` - Business plan, features, costs
- `docs/schema/` - Database schema and migrations
- `docs/api/` - API documentation

**Key Documents:**
- [Features Breakdown](./docs/planning/dcms-features-breakdown.md)
- [Database Schema](./docs/planning/dcms-database-schema.md)
- [Flexible Equipment System](./FLEXIBLE-EQUIPMENT-RENTAL-SYSTEM.md)
- [Equipment Management](./EQUIPMENT-MANAGEMENT-COMPLETE.md)

---

## 🚀 **Current Status**

### **✅ COMPLETED**
- **PWA Admin Frontend:** Complete with booking, customer, equipment management
- **Public Website:** Complete with booking, dive sites, pricing
- **Equipment System:** 60 pieces with flexible rental options
- **Database Schema:** Complete PostgreSQL schema
- **Documentation:** Comprehensive planning and technical docs

### **🔄 IN DEVELOPMENT**
- **Backend API:** Express.js server with PostgreSQL
- **Authentication:** JWT-based user authentication
- **Payment Integration:** Stripe/PayPal integration
- **Email System:** Automated notifications

### **📋 PLANNED**
- **Mobile App:** React Native mobile application
- **Advanced Analytics:** Business intelligence dashboard
- **Third-party Integrations:** Weather, certification APIs

---

## 🧪 **Testing**

```bash
# Run all tests
npm test

# Frontend tests only
cd frontend && npm test

# Public website tests
cd public-website && npm test

# E2E tests
npm run test:e2e
```

---

## 📝 **Contributing**

This is a private repository. For issues and feature requests, please contact the project owner.

---

## 📄 **License**

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

---

## 👥 **Authors**

- **Phil Couteret** - Project Owner & Planning

---

**Status:** Frontend Complete, Backend In Development  
**Last Updated:** October 2025  
**Equipment:** 60 pieces with flexible rental system