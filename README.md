# DCMS - Dive Center Management System

**Complete Planning & Development Repository**  
**Target:** Deep Blue Diving, Fuerteventura  
**License:** GPL-3.0

---

## 📋 **Project Overview**

The Dive Center Management System (DCMS) is a comprehensive, cloud-based management system designed for multi-site dive center operations. This system handles bookings, customers, equipment, certifications, compliance, and more.

**Key Features:**
- ✅ **Unified Equipment & Materials Inventory** (global account manages all equipment with site allocation and maintenance tracking)
- ✅ **Flexible Equipment Rental** (individual equipment selection - BCD, Regulator, Mask, Fins, Boots, Wetsuit, Computer, Torch, Tanks including 10 L / 12 L / 15 L plus Nitrox variants)
- ✅ **Dive Preparation Workflows** (Site A boats vs Site B shore dives, session availability enforced per site)
- ✅ **Role-Based Access Control** (Admin, Owners, Site Managers, Boat Captains, Guides, Trainees with location-aware permissions)
- ✅ Built-in account & password management (add / modify / delete from Settings)
- ✅ Volume discount pricing
- ✅ Multilingual support (Spanish, English, German, French, Italian)
- ✅ Multi-currency support (EUR, GBP, USD)
- ✅ Government bono system (Canary Islands resident discounts)
- ✅ **PWA Offline Mode** (operations continue during internet failure)
- ✅ Multi-agency certification (SSI, PADI, CMAS, VDST via portal integration)
- ✅ Regulatory compliance (Spanish maritime, GDPR, insurance)
- ✅ Cross-period stay pricing
- ✅ Advanced customer profiles

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

## 👤 **Role & Access Model**

- **Admin (Owners Family / Customer Service):** Full access to bookings, customers, stays, account management.
- **Owner / Boat Pilot:** Global equipment CRUD, boat & dive preparation, maintenance scheduling (both sites).
- **Site Managers (Caleta, Las Playitas):** Complete control over their site operations; Las Playitas manager limited to shore dives (no boat controls).
- **Boat Captains (Caleta):** Boat preparation with read access to bookings/customers for schedule context.
- **Guides (Both Sites):** Dive preparation, equipment allocation, customer sizing updates.
- **Trainees (Both Sites):** Assist mode—view equipment, update availability, follow guide instructions.

All permissions are centralized via `ROLE_PERMISSIONS` in `frontend/src/utils/authContext.js`, ensuring UI navigation and forms render only what each role is allowed to perform.

---

## 🏊‍♂️ **Equipment & Tank System**

### **Unified Inventory (Global Account)**
- **Single Source of Truth:** Equipment and materials merged into one dataset managed by the global admin/owner account
- **Site Allocation:** Global users allocate gear to Caleta or Las Playitas; site managers have read-only visibility into assigned stock
- **Comprehensive Fields:** Brand, model, serial, purchase date, warranty, last/next revision, notes, plus regulator-specific stages and octopus details
- **Availability Control:** Global/owner/trainer roles perform full CRUD; guides and trainees can view + allocate; interns assist with availability toggles
- **Type Filtering:** Dropdown filter to display specific categories (BCD, Regulator, Tanks, Suits, Accessories, etc.)

### **Tank & Gas Management**
- **Tank Sizes:** 10 L, 12 L, 15 L steel tanks tracked individually
- **Nitrox Variants:** Dedicated Nitrox tanks with allocation and maintenance metadata
- **Customer Preferences:** Tank size and gas preferences stored alongside diver profiles for dive preparation
- **Dive Session Logic:** 10:15 session restricted to Caleta; Las Playitas offers shore-only dive prep

### **Flexible Equipment Rental**
- **Individual Selection:** Choose specific equipment to rent or mark as own gear
- **Mixed Approach:** Combine owned and rented equipment per customer
- **Detailed Specs:** Thickness, style, hood, condition, and maintenance indicators highlighted in UI

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
- **PWA Admin Frontend:** Booking, customer, unified equipment + tank management, role-based access
- **Public Website:** Booking, dive sites, pricing and marketing pages
- **Equipment System:** Global inventory, tank sizes + Nitrox tracking, maintenance metadata, site allocation workflows
- **Account Management:** Admin can add/modify/delete accounts and manage passwords directly in Settings
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
**Last Updated:** November 2025  
**Equipment:** Unified global inventory with tank size + Nitrox tracking
