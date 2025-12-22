# Local Servers Required for DCMS Testing

To test the DCMS solution locally on Windows, you need the following services running:

## Required Local Services

### 1. **PostgreSQL Database Server** (Required for Backend)
- **Port:** 5432 (default)
- **Status:** Runs as a Windows Service (automatic startup)
- **How to Check:** 
  ```cmd
  netstat -ano | findstr ":5432"
  ```
- **How to Start:**
  - Check Windows Services: `services.msc` → Find "postgresql-x64-14" (or your version)
  - Or Command Prompt (as Admin): `net start postgresql-x64-14`
- **Configuration:** Managed via `backend\.env` (DATABASE_URL)

### 2. **Backend API Server** (Required for Database Access)
- **Port:** 3003
- **URL:** http://localhost:3003
- **API Docs:** http://localhost:3003/api
- **Status:** Started by `start-windows.bat` in a separate window
- **How to Check:**
  ```cmd
  netstat -ano | findstr ":3003"
  ```
- **Purpose:** Provides REST API access to the PostgreSQL database

### 3. **Sync Server** (Required for Public Website ↔ Admin Portal Sync)
- **Port:** 3002
- **URL:** http://localhost:3002
- **Status:** Started by `start-windows.bat` in a separate window
- **How to Check:**
  ```cmd
  netstat -ano | findstr ":3002"
  ```
- **Purpose:** Syncs data between public website and admin portal (in-memory storage)

### 4. **Public Website** (Customer-Facing)
- **Port:** 3000
- **URL:** http://localhost:3000
- **Status:** Started by `start-windows.bat` in a separate window
- **How to Check:**
  ```cmd
  netstat -ano | findstr ":3000"
  ```
- **Purpose:** Customer booking website

### 5. **Admin Portal** (Staff/Admin Interface)
- **Port:** 3001
- **URL:** http://localhost:3001
- **Status:** Started by `start-windows.bat` in a separate window
- **How to Check:**
  ```cmd
  netstat -ano | findstr ":3001"
  ```
- **Purpose:** Admin dashboard for managing bookings, customers, equipment, etc.

---

## Quick Status Check

Run this command to check all ports at once:
```cmd
netstat -ano | findstr ":5432 :3000 :3001 :3002 :3003"
```

Or use the provided script:
```cmd
check-services.bat
```

---

## What Gets Started Automatically

When you run `start-windows.bat`, it automatically starts:
- ✅ Backend API (port 3003)
- ✅ Sync Server (port 3002)
- ✅ Public Website (port 3000)
- ✅ Admin Portal (port 3001)

**Note:** PostgreSQL must be running **before** starting these services (it's a Windows Service, so it should start automatically on boot).

---

## Service Dependencies

```
PostgreSQL (5432)
    ↓
Backend API (3003) ─→ Uses PostgreSQL database
    ↓
Public Website (3000) ─→ Uses Backend API + Sync Server
Admin Portal (3001) ─→ Uses Backend API + Sync Server
Sync Server (3002) ─→ Shared between Public Website and Admin Portal
```

---

## Testing Checklist

Before testing, verify all services are running:

- [ ] PostgreSQL is running (port 5432)
- [ ] Backend API is running (port 3003) - http://localhost:3003/api
- [ ] Sync Server is running (port 3002)
- [ ] Public Website is running (port 3000) - http://localhost:3000
- [ ] Admin Portal is running (port 3001) - http://localhost:3001

---

## Troubleshooting

If a service is not running:

1. **PostgreSQL not running:**
   - Check Windows Services
   - Start PostgreSQL service manually
   - Verify in `backend\.env` that DATABASE_URL is correct

2. **Node.js services not running:**
   - Run `start-windows.bat` again
   - Check the individual service windows for error messages
   - Verify dependencies are installed: `npm install` in each directory

3. **Port already in use:**
   - Find the process using the port: `netstat -ano | findstr ":PORT"`
   - Kill the process: `taskkill /PID <PID_NUMBER> /F`
   - Or change the port in the service configuration

