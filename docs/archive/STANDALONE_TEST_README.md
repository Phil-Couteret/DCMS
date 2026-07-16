# DCMS Standalone Test Application

This guide will help you set up and run the DCMS application on a local computer for testing.

---

## 🚀 Quick Start (Easiest - Mock Mode)

**Perfect for quick demos - No database or backend setup needed!**

1. **Install Node.js** (if not already installed)
   - Download from: https://nodejs.org (version 18 or higher)
   - Verify installation: Open Terminal and run `node -v`

2. **Start the application**
   ```bash
   chmod +x start-standalone.sh
   ./start-standalone.sh
   ```
   When prompted, choose **Option 1** (Quick Demo)

3. **Access the application**
   - Open your browser to: http://localhost:3000
   - The app will use mock data (localStorage) - no backend needed!

4. **Stop the application**
   - Press `Ctrl+C` in the terminal

**That's it!** The app will run with sample data stored in the browser.

---

## 🔧 Full Demo (Backend + Database)

**Shows the complete system with real backend API and database**

### Prerequisites

1. **Node.js 18+** - https://nodejs.org
2. **PostgreSQL 14+** - https://www.postgresql.org/download/
   - macOS: `brew install postgresql@14`
   - Or download installer from PostgreSQL website

3. **PostgreSQL should be running**
   - macOS: `brew services start postgresql@14`
   - Or start it through the PostgreSQL app

### Setup Steps

1. **Make scripts executable**
   ```bash
   chmod +x start-standalone.sh setup-database.sh
   ```

2. **Start the application**
   ```bash
   ./start-standalone.sh
   ```
   When prompted, choose **Option 2** (Full Demo)

3. **The script will:**
   - Check for required software
   - Install dependencies (if needed)
   - Set up the database automatically
   - Start backend and frontend servers

4. **Access the application**
   - **Frontend:** http://localhost:3000
   - **Backend API:** http://localhost:3001
   - **API Documentation:** http://localhost:3001/api

5. **Stop the application**
   - Press `Ctrl+C` in the terminal

---

## 📋 What Gets Installed

### Dependencies (automatically installed)
- Frontend dependencies (~200MB)
- Backend dependencies (~150MB)
- Total download time: ~5-10 minutes (first time only)

### Database (Full Demo only)
- Database name: `dcms_test`
- Default user: `postgres`
- Sample data: Optional (prompted during setup)

---

## 🔍 Troubleshooting

### "Node.js is not installed"
- Install Node.js from https://nodejs.org
- Restart terminal after installation

### "PostgreSQL not found" (Full Demo only)
- Install PostgreSQL: `brew install postgresql@14` (macOS)
- Or download from: https://www.postgresql.org/download/
- Make sure PostgreSQL is running

### "Port 3000 already in use"
- Another application is using port 3000
- Close the other application or change the port in `start-standalone.sh`

### "Port 3001 already in use" (Full Demo)
- Backend port conflict
- Stop any other services on port 3001

### "Database connection failed"
- Make sure PostgreSQL is running
- Check credentials in `backend/.env`
- Default: `postgres/postgres@localhost:5432`

### Backend won't start
- Check `backend.log` for error messages
- Ensure database is set up: `./setup-database.sh`
- Verify `backend/.env` has correct DATABASE_URL

### Frontend won't start
- Check `frontend.log` for error messages
- Try: `cd frontend && npm install` (reinstall dependencies)

---

## 📁 File Structure

After running, you'll see:
- `frontend.log` - Frontend server logs
- `backend.log` - Backend server logs (Full Demo only)
- `backend/.env` - Backend configuration (auto-created)
- `frontend/src/config/apiConfig.js.bak` - Backup of original config

---

## 🎯 Testing the Application

### Quick Demo Mode (Mock)
- All data is stored in browser localStorage
- Data persists between sessions (in same browser)
- No backend - faster startup
- Good for: UI testing, demos, offline testing

### Full Demo Mode (Backend)
- Real database persistence
- Multi-user support (if multiple browsers)
- Complete API functionality
- Good for: Full system testing, data persistence testing

---

## 🔄 Switching Between Modes

The script automatically switches the frontend between mock and API mode. 

If you want to manually switch:
- Edit `frontend/src/config/apiConfig.js`
- Change `mode: 'mock'` to `mode: 'api'` (or vice versa)
- Restart the frontend

---

## 📝 Notes for Testing

1. **First Run:** The script will install dependencies (takes a few minutes)
2. **Subsequent Runs:** Starts immediately
3. **Database:** Full demo creates a fresh test database each time (if you choose to recreate)
4. **Data:** Mock mode data is stored in browser - clearing browser data resets it
5. **Logs:** Check `frontend.log` and `backend.log` if something goes wrong

---

## 🆘 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review the log files (`frontend.log`, `backend.log`)
3. Make sure all prerequisites are installed
4. Try running the database setup separately: `./setup-database.sh`

---

## ✅ What's Working

The application includes:
- ✅ Customer management
- ✅ Booking system
- ✅ Equipment tracking
- ✅ Dashboard with statistics
- ✅ Multi-language support (English/Spanish/German/French/Italian)
- ✅ Responsive design (works on mobile/tablet/desktop)

---

**Happy Testing! 🎉**

For questions or issues, refer to the main README.md in the project root.

