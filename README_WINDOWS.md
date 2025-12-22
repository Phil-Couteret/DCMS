# DCMS - Windows Setup Quick Start

Complete local setup for Windows machines with PostgreSQL database.

## 🚀 Quick Start (5 minutes)

1. **Install Prerequisites:**
   - **Node.js 18+:** https://nodejs.org/
     - Direct LTS Download: https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi
   - **PostgreSQL 14+:** https://www.postgresql.org/download/windows/
     - Direct Download: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
     - Remember the password you set during installation!

2. **Run Setup:**
   ```cmd
   setup-windows.bat
   ```

3. **Edit Configuration:**
   - Open `backend\.env`
   - Replace `YOUR_PASSWORD` with your PostgreSQL password

4. **Start Services:**
   ```cmd
   start-windows.bat
   ```

5. **Access Applications:**
   - Public Website: http://localhost:3000
   - Admin Portal: http://localhost:3001
   - Backend API: http://localhost:3003
   - API Docs: http://localhost:3003/api

## 📚 Full Documentation

See [WINDOWS_LOCAL_SETUP.md](WINDOWS_LOCAL_SETUP.md) for detailed instructions, troubleshooting, and advanced configuration.

## 🔧 Scripts Available

- `setup-windows.bat` - Complete setup (database, dependencies, configuration)
- `start-windows.bat` - Start all services (4 services in separate windows)
- `check-services.bat` - Check which services are running
- `setup-database.bat` - Database setup only

## ⚠️ Important Notes

- Remember your PostgreSQL password - you'll need it for the database connection
- The backend `.env` file must have the correct database password
- All services run in separate windows - close them to stop services

## 🆘 Need Help?

See the **Troubleshooting** section in [WINDOWS_LOCAL_SETUP.md](WINDOWS_LOCAL_SETUP.md)

