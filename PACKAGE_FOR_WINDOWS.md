# Packaging DCMS for Windows Testing

**Guide for transferring DCMS to a Windows computer for testing**

---

## 📦 What to Include

When copying to the Windows computer, include these files/folders:

### ✅ Required Files/Folders

```
DCMS/
├── frontend/              ✅ Required
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/               ✅ Required (for Full Demo)
│   ├── src/
│   ├── prisma/
│   └── package.json
├── database/              ✅ Required (for Full Demo)
│   ├── schema/
│   └── seeds/
├── start-standalone.bat   ✅ Required
├── start-standalone.ps1   ✅ Optional (PowerShell alternative)
├── setup-database.bat     ✅ Required (for Full Demo)
├── WINDOWS_SETUP.md       ✅ Recommended
├── QUICK_START.md         ✅ Recommended
└── STANDALONE_TEST_README.md ✅ Optional (detailed guide)
```

### ❌ Don't Include (will be created automatically)

```
DCMS/
├── node_modules/          ❌ Don't copy (too large, will be installed)
├── frontend/node_modules/ ❌ Don't copy
├── backend/node_modules/  ❌ Don't copy
├── *.log                  ❌ Don't copy (log files)
├── .env                   ❌ Don't copy (will be created)
├── backend/.env           ❌ Don't copy (will be created)
├── .git/                  ❌ Don't copy (git repository)
└── *.bak                  ❌ Don't copy (backup files)
```

---

## 🗜️ Packaging Options

### Option 1: Zip File (Recommended)

1. **On Mac (source computer):**
   ```bash
   # Create a clean copy without node_modules
   cd /Users/phil/Documents/Work\ Dev/GitHub/
   cp -r DCMS DCMS-for-windows
   cd DCMS-for-windows
   
   # Remove unnecessary files
   rm -rf frontend/node_modules
   rm -rf backend/node_modules
   rm -rf node_modules
   rm -rf .git
   rm -f *.log frontend/*.log backend/*.log
   rm -f frontend/src/config/apiConfig.js.bak
   find . -name "*.bak" -delete
   find . -name ".DS_Store" -delete
   
   # Create zip file
   cd ..
   zip -r DCMS-for-windows.zip DCMS-for-windows -x "*.git*" "*/node_modules/*" "*.log"
   ```

2. **Transfer the zip file** to Windows (USB, email, cloud storage, etc.)

3. **On Windows:**
   - Extract the zip file
   - Follow `WINDOWS_SETUP.md` instructions

### Option 2: USB Drive Direct Copy

1. Connect USB drive
2. Copy the DCMS folder (excluding node_modules)
3. Manually exclude:
   - Any `node_modules` folders
   - `.git` folder
   - `*.log` files
4. Copy to Windows computer

### Option 3: Network Share

1. Share the DCMS folder on network
2. Copy to Windows (excluding node_modules as above)

---

## 📋 Pre-Flight Checklist

Before transferring, verify:

- [ ] Node.js installation instructions included (link to nodejs.org)
- [ ] `start-standalone.bat` is present
- [ ] `WINDOWS_SETUP.md` is included
- [ ] `QUICK_START.md` is included
- [ ] No `node_modules` folders included (check)
- [ ] No `.git` folder included
- [ ] All source code files present
- [ ] Database schema files present (for Full Demo option)

---

## 🚀 Quick Transfer Script (Mac)

Save this as `package-for-windows.sh` in the DCMS root:

```bash
#!/bin/bash
# Package DCMS for Windows transfer

echo "📦 Packaging DCMS for Windows..."

# Create temporary directory
TEMP_DIR="DCMS-for-windows-$(date +%Y%m%d)"
mkdir -p "../$TEMP_DIR"

# Copy everything except node_modules and git
rsync -av --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '*.log' \
  --exclude '*.bak' \
  --exclude '.DS_Store' \
  --exclude 'backend/.env' \
  --exclude '.env' \
  ./ "../$TEMP_DIR/"

# Create zip
cd ..
zip -r "${TEMP_DIR}.zip" "$TEMP_DIR"

echo ""
echo "✅ Package created: ${TEMP_DIR}.zip"
echo "📁 Location: $(pwd)/${TEMP_DIR}.zip"
echo ""
echo "Transfer this zip file to the Windows computer"
```

Run it with:
```bash
chmod +x package-for-windows.sh
./package-for-windows.sh
```

---

## 📏 File Size Estimates

### Without node_modules (what you'll transfer):
- Source code: ~5-10 MB
- Zipped: ~2-5 MB

### With node_modules (DON'T transfer):
- Total: ~500 MB - 1 GB
- Too large, will be installed on Windows

---

## ✅ Post-Transfer Verification

After transferring to Windows, verify:

1. **Folder structure:**
   ```
   DCMS/
   ├── frontend/
   ├── backend/
   ├── database/
   ├── start-standalone.bat
   └── WINDOWS_SETUP.md
   ```

2. **Key files exist:**
   - `frontend/package.json` ✅
   - `backend/package.json` ✅ (for Full Demo)
   - `start-standalone.bat` ✅
   - `database/schema/001_create_tables.sql` ✅ (for Full Demo)

3. **No node_modules** (should not exist yet)

---

## 🎯 Recommended Approach

**For Saturday testing, I recommend:**

1. **Quick Demo Mode** (no database needed)
   - Smaller transfer size
   - Faster setup
   - Easier for non-technical users
   - Includes all UI/UX features

2. **Package only:**
   - `frontend/` folder
   - `start-standalone.bat`
   - `WINDOWS_SETUP.md`
   - `QUICK_START.md`

3. **Total size:** ~2-3 MB zipped

---

## 📝 Instructions for Windows User

Include these instructions with the package:

1. Extract the zip file
2. Install Node.js from https://nodejs.org (if not already installed)
3. Double-click `start-standalone.bat`
4. Choose Option 1 (Quick Demo)
5. Open browser to http://localhost:3000
6. Start testing!

See `WINDOWS_SETUP.md` for detailed instructions.

---

**Ready to package and test! 🎉**

