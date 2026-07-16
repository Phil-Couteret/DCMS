# Windows Prerequisites - Quick Reference

**What needs to be installed on the Windows computer before testing**

---

## ✅ For Quick Demo Mode (Recommended for Saturday)

### Required:
1. **Node.js 18 or higher**
   - Download: https://nodejs.org
   - Choose the **LTS version** (Long Term Support)
   - Download the Windows Installer (.msi file)
   - Run the installer
   - **Keep all default options** (check "Add to PATH")
   - Restart the computer after installation

### That's it! 🎉

**No other software needed** - The app will work with just Node.js installed.

---

## 🔧 For Full Demo Mode (Backend + Database)

### Required:
1. **Node.js 18 or higher** (same as above)

2. **PostgreSQL 14 or higher**
   - Download: https://www.postgresql.org/download/windows/
   - Run the installer
   - **Remember the password** you set for the `postgres` user
   - Keep default port (5432)
   - Make sure PostgreSQL service is set to start automatically
   - After installation, verify PostgreSQL is running:
     - Open Windows Services (Win+R, type `services.msc`)
     - Look for "postgresql" service
     - It should be "Running"

---

## 🔍 How to Verify Prerequisites

### Check Node.js Installation:

1. Open **Command Prompt** or **PowerShell**
   - Press `Win + R`
   - Type `cmd` and press Enter (or `powershell`)

2. Type:
   ```cmd
   node -v
   ```
   Should show: `v18.x.x` or higher

3. Type:
   ```cmd
   npm -v
   ```
   Should show a version number (like `9.x.x` or `10.x.x`)

**If you see "not recognized" or errors:**
- Node.js is not installed, or
- Need to restart computer after installation, or
- Installation didn't add to PATH correctly

### Check PostgreSQL Installation (Full Demo only):

1. Open Command Prompt or PowerShell

2. Type:
   ```cmd
   psql --version
   ```
   Should show: `psql (PostgreSQL) 14.x` or higher

**If you see "not recognized":**
- PostgreSQL is not installed, or
- PostgreSQL bin folder not in PATH

---

## 📋 Installation Checklist

### Quick Demo Mode:
- [ ] Node.js installed
- [ ] Computer restarted after Node.js installation
- [ ] Verified `node -v` works in Command Prompt
- [ ] Verified `npm -v` works in Command Prompt

### Full Demo Mode:
- [ ] Node.js installed
- [ ] PostgreSQL installed
- [ ] PostgreSQL password remembered/written down
- [ ] PostgreSQL service is running
- [ ] Verified `node -v` works
- [ ] Verified `npm -v` works
- [ ] Verified `psql --version` works (optional)

---

## ⚠️ Common Issues

### Node.js Not Found After Installation
**Solution:**
1. Restart your computer
2. Open a NEW Command Prompt/PowerShell window
3. Try `node -v` again

### Installation Fails
**For Node.js:**
- Make sure you downloaded the correct version (Windows 64-bit)
- Try running installer as Administrator (right-click → Run as Administrator)
- Check Windows version compatibility (Windows 10/11 recommended)

**For PostgreSQL:**
- Make sure no antivirus is blocking the installation
- Try running installer as Administrator
- Check if port 5432 is already in use

### "Add to PATH" Option Missing
**Solution:**
- Most installers add to PATH automatically
- If Node.js doesn't work, you may need to manually add it:
  1. Find Node.js installation (usually `C:\Program Files\nodejs\`)
  2. Add that path to Windows PATH environment variable

---

## 💡 Recommended Setup for Saturday

**I recommend Quick Demo mode because:**
- ✅ Only one prerequisite (Node.js)
- ✅ Faster to set up (5 minutes)
- ✅ No database configuration needed
- ✅ Easier for non-technical users
- ✅ All features work (uses browser storage)

**Steps:**
1. Install Node.js on Windows
2. Restart computer
3. Extract DCMS zip file
4. Double-click `start-standalone.bat`
5. Choose Option 1
6. Open browser to http://localhost:3000

---

## 📞 Need Help?

If installation issues occur:
1. Check Windows version (Windows 10/11 recommended)
2. Make sure you have administrator rights
3. Try downloading fresh installers from official sites
4. Disable antivirus temporarily during installation
5. Check `WINDOWS_SETUP.md` for detailed troubleshooting

---

## ✅ Summary

**Minimum for Saturday (Quick Demo):**
- Just Node.js ✅

**For Full System Test (Full Demo):**
- Node.js ✅
- PostgreSQL ✅

**That's it!** No other dependencies required.

