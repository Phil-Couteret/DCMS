# Quick Start Guide - DCMS Test Application

**For testing on Saturday with your friends** 🎉

---

## 🚀 Super Quick Start (Recommended)

### Step 1: Install Node.js
- Download: https://nodejs.org
- Install it (choose LTS version)
- **Windows:** Run the installer, keep defaults, restart computer
- **Mac/Linux:** Use package manager or download installer

### Step 2: Run the app

**On Windows:**
- Double-click `start-standalone.bat`
- When asked, choose **Option 1** (Quick Demo)

**On Mac/Linux:**
```bash
./start-standalone.sh
```
When asked, choose **Option 1** (Quick Demo)

### Step 3: Open browser
- Go to: http://localhost:3000
- Start testing!

**That's it!** No database setup needed.

---

## 📋 What to Test

The application includes:
- ✅ **Dashboard** - Overview and statistics
- ✅ **Customers** - Add/view customer information
- ✅ **Bookings** - Create and manage dive bookings
- ✅ **Equipment** - Track equipment inventory
- ✅ **Stays** - Customer stay management
- ✅ **Settings** - Configuration options

**All data is stored in your browser** - it will persist until you clear browser data.

---

## 🔧 Full Demo (Optional)

If you want to test with a real backend and database:

### Requirements
1. Node.js 18+ (from above)
2. PostgreSQL 14+
   - macOS: `brew install postgresql@14`
   - Then: `brew services start postgresql@14`

### Run
```bash
./start-standalone.sh
```
Choose **Option 2** (Full Demo)

The script will:
- Set up the database automatically
- Start backend (port 3001)
- Start frontend (port 3000)

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api

---

## ⚠️ Troubleshooting

**Windows - Script won't run?**
- Make sure Node.js is installed: Open Command Prompt, type `node -v`
- Try right-clicking `.bat` file and "Run as Administrator"
- Or use PowerShell: Right-click `start-standalone.ps1` → "Run with PowerShell"

**Mac/Linux - Script won't run?**
```bash
chmod +x start-standalone.sh setup-database.sh
```

**Port already in use?**
- Close other applications using port 3000 or 3001

**Need help?**
- **Windows:** Check `WINDOWS_SETUP.md` for Windows-specific instructions
- **Mac/Linux:** Check `STANDALONE_TEST_README.md` for detailed instructions

---

## 🎯 For Saturday Testing

**Recommendation:** Use **Option 1 (Quick Demo)** - it's the fastest and easiest!

The app will work perfectly for showing:
- User interface
- Features and functionality
- Workflow and user experience

All changes are saved in the browser automatically.

---

**Have fun testing! 🎉**

