# DCMS - Dive Center Management System

**Complete Planning & Development Repository**  
**Target:** Deep Blue Diving, Fuerteventura  
**License:** GPL-3.0

---

## 📋 **Project Overview**

The Dive Center Management System (DCMS) is a comprehensive, cloud-based management system designed for multi-site dive center operations. This system handles bookings, customers, equipment, certifications, compliance, and more.

**Key Features:**
- ✅ Volume discount pricing (1-2, 3-5, 6-8, 9+ dives)
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

---

## 📁 **Project Structure**

```
DCMS/
├── docs/                    # Documentation
│   ├── planning/            # Project planning documents
│   ├── schema/              # Database schema
│   └── api/                 # API documentation
├── backend/                 # Backend (Express.js + PostgreSQL)
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── models/          # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/    # Custom middleware
│   │   └── utils/         # Utility functions
│   └── migrations/         # Database migrations
├── frontend/                # Frontend (React + PWA)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API services
│   │   └── utils/         # Utility functions
│   └── public/            # Static files
├── database/                # Database scripts
│   ├── schema/             # SQL schema files
│   └── seeds/              # Sample data
└── tests/                  # Test files
    ├── backend/            # Backend tests
    └── frontend/           # Frontend tests
```

---

## 🎯 **Package Options**

### **Budget Option (€25,000)**
- **Timeline:** 11 weeks (81 days with senior developer)
- **Features:** 23 MUST HAVE features
- **Includes:** All essential features + offline mode
- **Annual Cost:** €1,200

### **Standard Option (€41,430)**
- **Timeline:** 14-15 weeks
- **Features:** 34 features (23 must + 11 should)
- **Annual Cost:** €6,048

### **Premium Option (€50,000+)**
- **Timeline:** 24 weeks
- **Features:** 51 features (all)
- **Annual Cost:** €7,200

---

## 📊 **Key Metrics**

- **Annual Revenue:** €708,100 (Caleta de Fuste operations)
- **Annual Benefits:** €182,620-218,025
- **Break-even:** 2-3 months
- **5-Year ROI:** 1030-1250% (Budget) / 840-1060% (Standard)

---

## 🛠️ **Tech Stack**

**Backend:**
- Node.js + Express.js
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Swagger API Documentation

**Frontend:**
- React 18
- Material-UI
- PWA (Progressive Web App)
- Service Worker (offline mode)
- React Query (data fetching)

**DevOps:**
- Docker
- GitHub Actions (CI/CD)
- OVH Cloud hosting

---

## 📚 **Documentation**

All planning and documentation is in the `/docs` folder:

- `docs/planning/` - Business plan, features, costs
- `docs/schema/` - Database schema and migrations
- `docs/api/` - API documentation

**Key Documents:**
- [Features Breakdown](./docs/planning/dcms-features-breakdown.md)
- [Cost Breakdown](./docs/planning/dcms-cost-breakdown.md)
- [Database Schema](./docs/schema/dcms-database-schema.md)
- [Options Comparison](./docs/planning/dcms-options-comparison.md)

---

## 🚀 **Development Roadmap**

### **Phase 1: Setup (Week 1)**
- ✅ Project structure
- ✅ Database schema
- ✅ Basic server setup
- ✅ Authentication system

### **Phase 2: Core Features (Weeks 2-8)**
- Booking system
- Customer management
- Equipment tracking
- Pricing system
- Regulatory compliance

### **Phase 3: Advanced Features (Weeks 9-11)**
- Offline mode (PWA)
- Multilingual support
- Multi-currency
- Integration & testing
- Deployment

---

## 🧪 **Testing**

```bash
# Run all tests
npm test

# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:frontend

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

- **Philippe Couteret** - Project Owner & Planning

---

## 🙏 **Acknowledgments**

- Deep Blue Diving, Fuerteventura
- All dive center staff and management

---

**Status:** In Development  
**Last Updated:** October 2025

