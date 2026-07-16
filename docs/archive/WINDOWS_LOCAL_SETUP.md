# DCMS Windows Local Setup Guide

Complete guide to set up and run DCMS locally on a Windows machine with PostgreSQL database.

## 📋 Prerequisites

### Required Software

1. **Node.js 18+** (required)
   - **Download:** https://nodejs.org/
   - **Direct LTS Download (Windows 64-bit):** https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi
   - **Alternative (Current version):** https://nodejs.org/dist/v21.6.1/node-v21.6.1-x64.msi
   - Choose the **LTS (Long Term Support)** version for stability
   - Verify installation: Open Command Prompt and run `node -v`
   - Should display: `v20.x.x` or higher

2. **PostgreSQL 14+** (required for database)
   - **Download:** https://www.postgresql.org/download/windows/
   - **Direct Download (Windows x86-64):** https://www.postgresql.org/download/windows/
     - Click "Download the installer"
     - Select "PostgreSQL 16" (or latest version)
     - Choose "Windows x86-64" (64-bit)
     - Direct link: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
   - **Installation Instructions:**
     - Run the installer
     - Set port to `5432` (default)
     - Set password for `postgres` user (**remember this password!**)
     - Complete the installation
     - PostgreSQL service will start automatically

3. **Git** (optional, for cloning the repository)
   - Download from: https://git-scm.com/download/win

---

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

1. **Open Command Prompt or PowerShell** in the project root directory

2. **Run the setup script:**
   ```cmd
   setup-windows.bat
   ```
   
   Or with PowerShell:
   ```powershell
   .\setup-windows.ps1
   ```

3. **Follow the prompts** - the script will:
   - Check prerequisites
   - Set up the database
   - Install dependencies
   - Configure environment files
   - Start all services

### Option 2: Manual Setup

Follow the step-by-step instructions below.

---

## 📝 Manual Setup Steps

### Step 1: Install Prerequisites

#### Node.js
1. **Download:** https://nodejs.org/
   - **Direct LTS Download:** https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi
   - Choose the **LTS (Long Term Support)** version for best stability
2. Run the installer (`.msi` file)
3. Follow the installation wizard (accept defaults)
4. Verify: Open Command Prompt and run `node -v`
   - Should display: `v20.x.x` or higher

#### PostgreSQL
1. **Download:** https://www.postgresql.org/download/windows/
   - **Direct Download Page:** https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
   - Select "PostgreSQL 16" (or latest version)
   - Choose "Windows x86-64" (64-bit)
2. Run the installer (`.exe` file)
3. **Important:** During installation:
   - Set port to `5432` (default - keep this)
   - **Set password for `postgres` user** - **REMEMBER THIS PASSWORD!**
   - Complete the installation
4. Verify: Open Command Prompt and run `psql --version`
   - Should display: `psql (PostgreSQL) 14.x` or higher

### Step 2: Start PostgreSQL Service

PostgreSQL should start automatically after installation. If not:

1. Open **Services** (Win+R → `services.msc`)
2. Find **postgresql-x64-14** (or your version)
3. Right-click → **Start**

Or use Command Prompt (as Administrator):
```cmd
net start postgresql-x64-14
```

### Step 3: Set Up Database

Run the database setup script:
```cmd
setup-database.bat
```

This will:
- Create the database `dcms_production`
- Run the schema SQL files
- Optionally load sample data

**Note:** You'll be prompted for the PostgreSQL password (the one you set during installation).

### Step 4: Install Dependencies

Install dependencies for all services:

```cmd
REM Install root dependencies
npm install

REM Install backend dependencies
cd backend
npm install
cd ..

REM Install frontend (admin portal) dependencies
cd frontend
npm install
cd ..

REM Install public website dependencies
cd public-website
npm install
cd ..

REM Install sync server dependencies
cd sync-server
npm install
cd ..
```

### Step 5: Configure Environment Variables

#### Backend Configuration

Create or edit `backend\.env`:

```env
# Database Connection
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/dcms_production?schema=public"

# Server Configuration
PORT=3003
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# JWT Secret (change in production)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

**Important:** Replace `YOUR_PASSWORD` with your PostgreSQL password.

### Step 6: Generate Prisma Client

```cmd
cd backend
npm run prisma:generate
cd ..
```

### Step 7: Start All Services

Use the provided start script:
```cmd
start-windows.bat
```

This will start all services:
- **Backend API:** http://localhost:3003
- **Sync Server:** http://localhost:3002
- **Public Website:** http://localhost:3000
- **Admin Portal:** http://localhost:3001

---

## 🎯 Services Overview

After starting, you'll have these services running:

| Service | URL | Description |
|---------|-----|-------------|
| **Public Website** | http://localhost:3000 | Customer-facing booking website |
| **Admin Portal** | http://localhost:3001 | Admin dashboard for managing bookings |
| **Backend API** | http://localhost:3003 | REST API and database layer |
| **Sync Server** | http://localhost:3002 | Sync service (legacy, for localStorage sync) |
| **API Docs** | http://localhost:3003/api | Swagger API documentation |

---

## 🛠️ Troubleshooting

### PostgreSQL Not Starting

**Problem:** PostgreSQL service won't start

**Solution:**
1. Check if port 5432 is in use:
   ```cmd
   netstat -ano | findstr :5432
   ```
2. If another process is using it, stop that process or change PostgreSQL port
3. Restart PostgreSQL service:
   ```cmd
   net stop postgresql-x64-14
   net start postgresql-x64-14
   ```

### Connection Refused / Authentication Failed

**Problem:** Cannot connect to database

**Solutions:**

1. **Check PostgreSQL is running:**
   ```cmd
   sc query postgresql-x64-14
   ```

2. **Test connection:**
   ```cmd
   psql -U postgres -d postgres
   ```
   (Enter your password when prompted)

3. **Verify password in `backend\.env`:**
   - Make sure `DATABASE_URL` has the correct password
   - Format: `postgresql://postgres:PASSWORD@localhost:5432/dcms_production`

4. **Reset PostgreSQL password** (if forgotten):
   - Edit `C:\Program Files\PostgreSQL\14\data\pg_hba.conf`
   - Change `md5` to `trust` for local connections
   - Restart PostgreSQL service
   - Connect and set new password:
     ```sql
     ALTER USER postgres WITH PASSWORD 'newpassword';
     ```
   - Change `trust` back to `md5` in pg_hba.conf
   - Restart PostgreSQL service

### Port Already in Use

**Problem:** Port 3000, 3001, 3002, or 3003 is already in use

**Solution:**

1. Find the process using the port:
   ```cmd
   netstat -ano | findstr :3000
   ```
   (Replace 3000 with the port number)

2. Kill the process:
   ```cmd
   taskkill /PID <PID_NUMBER> /F
   ```

3. Or change the port in the respective `.env` or `package.json` files

### Node Modules Not Installing

**Problem:** `npm install` fails

**Solutions:**

1. **Clear npm cache:**
   ```cmd
   npm cache clean --force
   ```

2. **Delete node_modules and package-lock.json:**
   ```cmd
   rmdir /s /q node_modules
   del package-lock.json
   npm install
   ```

3. **Use npm with verbose logging:**
   ```cmd
   npm install --verbose
   ```

### Prisma Generate Fails

**Problem:** `npm run prisma:generate` fails

**Solutions:**

1. **Make sure database is running and accessible**

2. **Pull schema from database:**
   ```cmd
   cd backend
   npx prisma db pull
   npx prisma generate
   ```

3. **Check Prisma schema file:**
   - Verify `backend\prisma\schema.prisma` exists
   - Check that it has valid syntax

---

## 📊 Database Management

### View Database in Browser

Use Prisma Studio:
```cmd
cd backend
npm run prisma:studio
```

This opens a web interface at http://localhost:5555

### Connect to Database via Command Line

```cmd
psql -U postgres -d dcms_production
```

### Common Database Commands

```sql
-- List all tables
\dt

-- View table structure
\d table_name

-- View all data in a table
SELECT * FROM table_name LIMIT 10;

-- Exit
\q
```

### Backup Database

```cmd
pg_dump -U postgres dcms_production > backup.sql
```

### Restore Database

```cmd
psql -U postgres dcms_production < backup.sql
```

---

## 🔄 Daily Usage

### Starting Services

```cmd
start-windows.bat
```

This starts **4 services** in separate windows:
- **Backend API** (port 3003) - Database API server
- **Sync Server** (port 3002) - Data synchronization service
- **Public Website** (port 3000) - Customer-facing booking site
- **Admin Portal** (port 3001) - Admin dashboard

### Checking Service Status

Run the status check script:
```cmd
check-services.bat
```

This will show which services are running and which ports they're using.

### Stopping Services

1. Press `Ctrl+C` in each service window
2. Or close the terminal windows (services will stop automatically)

### Restarting Services

1. Stop all services (close the windows or press Ctrl+C)
2. Run `start-windows.bat` again

---

## 📁 Project Structure

```
DCMS/
├── backend/           # NestJS backend API
│   ├── src/
│   ├── prisma/
│   └── .env          # Backend configuration
├── frontend/          # Admin portal (React)
├── public-website/    # Customer website (React)
├── sync-server/       # Sync service (legacy)
├── database/          # Database schema and seeds
│   ├── schema/
│   └── seeds/
└── start-windows.bat  # Start all services
```

---

## 🔐 Security Notes

1. **Never commit `.env` files** - they contain sensitive credentials
2. **Change default passwords** in production
3. **Use strong JWT_SECRET** in production
4. **Enable SSL** for database connections in production

---

## 📚 Additional Resources

- **Database Schema:** See `database/README.md`
- **API Documentation:** http://localhost:3003/api (Swagger UI)
- **Backend README:** See `backend/README.md`
- **Frontend README:** See `frontend/README.md`

---

## ❓ Getting Help

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Review the log files:
   - `backend.log`
   - `frontend.log`
   - `public-website.log`
   - `sync-server.log`
3. Verify all prerequisites are installed correctly
4. Check that all services are running on the correct ports

---

**Last Updated:** December 2025

