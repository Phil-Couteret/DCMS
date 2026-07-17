# DCMS Backend API

**Dive Center Management System - Backend**

Node.js + NestJS REST API for the Dive Center Management System.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run start:dev
```

The API will be available at `http://localhost:3001`

### Admin login (API mode)

Default users are created by `npm run seed:users` (superadmin / superadmin123, admin / admin123). If you **can't connect** to the admin with the password, see [ADMIN_LOGIN.md](./ADMIN_LOGIN.md) and use `npm run reset-password` to reset passwords.

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── app.module.ts           # Root module
│   ├── modules/                # Feature modules
│   │   ├── bookings/           # Booking management
│   │   ├── customers/          # Customer management
│   │   ├── equipment/          # Equipment management
│   │   ├── locations/          # Location management
│   │   ├── dive-sites/         # Dive site management
│   │   ├── boats/              # Boat management
│   │   ├── certifications/     # Certification management
│   │   └── pricing/            # Pricing management
│   ├── common/                 # Shared modules
│   │   ├── filters/            # Exception filters
│   │   ├── guards/             # Auth guards
│   │   ├── interceptors/       # Interceptors
│   │   └── pipes/              # Validation pipes
│   └── config/                 # Configuration
├── prisma/
│   ├── schema.prisma           # Prisma schema
│   └── migrations/             # Database migrations
├── test/                       # E2E tests
└── uploads/                    # File uploads
```

---

## 🛠️ Tech Stack

- **Framework:** NestJS v10
- **Language:** TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Validation:** class-validator
- **Documentation:** Swagger/OpenAPI

---

## 📚 API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:3001/api`

---

## 🔧 Available Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

---

## 📝 Environment Variables

See `.env.example` for all required environment variables.

---

## 🔒 Security

- JWT authentication
- Password hashing with bcrypt
- Input validation
- CORS configuration
- Rate limiting (to be implemented)

---

## 📄 License

GPL-3.0

