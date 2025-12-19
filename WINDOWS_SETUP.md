# Windows Setup Guide - DCMS Test Application

**For testing on a Windows computer** 🪟

---

## 🚀 Quick Start (Recommended)

### Step 1: Install Node.js
1. Go to: https://nodejs.org
2. Download the **LTS version** (Windows Installer .msi)
3. Run the installer
4. Keep all default options
5. Restart your computer after installation

### Step 2: Verify Installation
1. Open **Command Prompt** or **PowerShell**
2. Type: `node -v` (should show v18.x.x or higher)
3. Type: `npm -v` (should show version number)

### Step 3: Transfer Project Files
Copy the entire DCMS folder to the Windows computer (via USB, network share, etc.)

### Step 4: Run the Application

**Option A: Using Batch File (Easiest)**
1. Navigate to the DCMS folder
2. Double-click `start-standalone.bat`
3. When prompted, choose **Option 1** (Quick Demo)

**Option B: Using PowerShell (More features)**
1. Right-click on `start-standalone.ps1`
2. Select "Run with PowerShell"
3. If you get a security warning, type `Y` to continue
4. When prompted, choose **Option 1** (Quick Demo)

**Option C: Using Command Prompt**
1. Open Command Prompt
2. Navigate to the DCMS folder: `cd C:\path\to\DCMS`
3. Type: `start-standalone.bat`
4. When prompted, choose **Option 1** (Quick Demo)

### Step 5: Open in Browser
- Open your web browser
- Go to: **http://localhost:3000**
- Start testing!

---

## 🔧 Full Demo (Backend + Database)

If you want to test with a real backend and database:

### Additional Requirements

1. **PostgreSQL 14+**
   - Download: https://www.postgresql.org/download/windows/
   - Run the installer
   - Remember the password you set for the `postgres` user
   - Make sure PostgreSQL service is running (check Windows Services)

2. **Run Setup**
   - Use `start-standalone.bat` or `start-standalone.ps1`
   - Choose **Option 2** (Full Demo)
   - The script will guide you through database setup

---

## 📋 What Gets Installed

### Dependencies (automatically installed on first run)
- Frontend dependencies (~200MB)
- Backend dependencies (~150MB) - Full Demo only
- Total download time: ~5-10 minutes (first time only)
- Installed in: `frontend\node_modules` and `backend\node_modules`

---

## 🔍 Troubleshooting

### "Node.js is not installed"
- Install Node.js from https://nodejs.org
- Restart your computer after installation
- Open a new Command Prompt/PowerShell window

### "npm is not recognized"
- Node.js installation may have failed
- Reinstall Node.js and make sure to check "Add to PATH" during installation

### "Script execution is disabled" (PowerShell)
- Right-click PowerShell icon
- Select "Run as Administrator"
- Run: `Set-ExecutionPolicy RemoteSigned`
- Or use the `.bat` file instead

### "Port 3000 already in use"
- Another application is using port 3000
- Close other applications or restart your computer

### "Cannot find module" errors
- Dependencies not installed
- Run: `cd frontend && npm install` (and `cd backend && npm install` for full demo)

### Database connection failed (Full Demo)
- Make sure PostgreSQL is installed and running
- Check Windows Services: Look for "postgresql" service
- Default credentials: username `postgres`, password (what you set during install)
- Update `backend\.env` file with correct password if needed

### Script closes immediately
- Open Command Prompt first
- Navigate to DCMS folder: `cd C:\path\to\DCMS`
- Run the script from there
- Add `pause` at the end of script if needed

---

## 📁 Files You Need

When transferring to Windows, make sure these folders/files are included:

**Required:**
- `frontend/` - Frontend application
- `backend/` - Backend application (Full Demo only)
- `database/` - Database schema (Full Demo only)
- `start-standalone.bat` - Windows startup script
- `start-standalone.ps1` - PowerShell alternative
- `setup-database.bat` - Database setup (Full Demo only)
- `QUICK_START.md` - Quick reference guide

**Not needed (will be created automatically):**
- `node_modules/` - Dependencies (will be installed)
- `.env` files - Configuration (will be created)
- `*.log` files - Log files

---

## 🎯 Recommended Setup for Saturday Testing

**For easiest setup:**
1. Install Node.js on Windows computer
2. Copy entire DCMS folder to Windows
3. Use **Option 1 (Quick Demo)** - No database needed!
4. Just double-click `start-standalone.bat`

**Benefits of Quick Demo:**
- ✅ No database installation needed
- ✅ Faster startup
- ✅ Easier to set up
- ✅ All features work (using browser storage)
- ✅ Perfect for showing UI and functionality

---

## 💡 Tips

1. **First Run:** The script will download dependencies (5-10 minutes)
2. **Subsequent Runs:** Starts much faster
3. **Browser:** Use Chrome, Edge, or Firefox (all work fine)
4. **Data:** Quick Demo stores data in browser - clearing browser data resets it
5. **Multiple Tabs:** You can open multiple browser tabs to test different views

---

## 🆘 Still Having Issues?

1. Check that Node.js is installed: `node -v` in Command Prompt
2. Check that you're in the correct folder (should see `frontend` and `backend` folders)
3. Try running from Command Prompt instead of double-clicking
4. Check `frontend.log` for error messages
5. Make sure no antivirus is blocking Node.js

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

**Happy Testing on Windows! 🎉**

For more details, see `STANDALONE_TEST_README.md` or `QUICK_START.md`

