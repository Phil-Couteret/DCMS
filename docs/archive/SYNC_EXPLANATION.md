# Public Website & Admin Portal Sync - Explanation

## Your Question

**Q: With Quick Demo, are both front (public site) and back (admin portal) working? And if so, in sync? Will a booking created by a customer in public page be visible in admin portal?**

## Answer

### Current Quick Demo Mode (Option 1):
❌ **No, only the Admin Portal runs** - The public website is NOT started.

### New Full POC Mode (Option 2) - Recommended for Saturday:
✅ **Yes, both sites work AND sync!** 

When you choose **Option 2 (Full POC)**, the script will:
1. Start **Sync Server** (port 3002) - handles data synchronization
2. Start **Public Website** (port 3000) - customer-facing booking site
3. Start **Admin Portal** (port 3001) - staff/admin interface

**✅ Bookings created on the public website WILL appear in the admin portal** (syncs every 2 seconds)

---

## How It Works

### Sync Mechanism:
1. **Customer creates booking** on Public Website (localhost:3000)
   - Booking saved to browser's localStorage
   - Sync service pushes data to Sync Server

2. **Sync Server** (localhost:3002) receives the data
   - Stores it in memory as shared storage
   - Acts as a bridge between the two sites

3. **Admin Portal** (localhost:3001) pulls data every 2 seconds
   - Retrieves updated bookings from Sync Server
   - Displays them in the admin interface

**Sync happens automatically every 2 seconds** - no manual refresh needed!

---

## Testing the Sync

1. **Start the application** with Option 2 (Full POC)
2. **Open two browser windows:**
   - Window 1: http://localhost:3000 (Public Website)
   - Window 2: http://localhost:3001 (Admin Portal)

3. **On Public Website:**
   - Create a customer account (if needed)
   - Book a dive
   - Wait 2-3 seconds

4. **Check Admin Portal:**
   - The booking should appear automatically
   - No refresh needed!

---

## Which Mode to Use?

### Option 1: Quick Demo (Admin Portal Only)
**Use when:**
- Testing admin features only
- Don't need customer booking flow
- Faster startup (only one service)

**Limitation:**
- ❌ No public website
- ❌ No customer booking simulation

### Option 2: Full POC (Public + Admin + Sync) ⭐ RECOMMENDED
**Use when:**
- Want to show complete system
- Testing customer booking flow
- Need to see bookings sync between sites

**Benefits:**
- ✅ Full customer experience
- ✅ Complete admin workflow
- ✅ Real-time sync between sites
- ✅ Perfect for demos!

### Option 3: Full Demo (Backend + Database)
**Use when:**
- Testing with real database
- Need persistent data
- Full production-like setup

---

## Updated Script Behavior

When you run `start-standalone.sh` or `start-standalone.bat`, you'll now see:

```
Select mode:
  1) Quick Demo - Admin Portal Only (Mock Mode - No backend/database) ⚡
  2) Full POC - Public Website + Admin Portal + Sync (Mock Mode) 🌐
  3) Full Demo - Backend + Database 🔧
```

**For Saturday testing, I recommend Option 2** - it shows the complete system with both sites syncing!

---

## Ports Used

### Option 1 (Quick Demo):
- Port 3000: Admin Portal

### Option 2 (Full POC):
- Port 3000: **Public Website** (customer booking)
- Port 3001: **Admin Portal** (staff interface)
- Port 3002: **Sync Server** (data synchronization)

### Option 3 (Full Demo):
- Port 3000: Admin Portal
- Port 3001: Backend API

---

## Summary

✅ **Option 2 (Full POC) gives you:**
- Both public website and admin portal
- Automatic synchronization
- Bookings created by customers on public site appear in admin portal
- Perfect for Saturday demo!

❌ **Option 1 (Quick Demo) gives you:**
- Only admin portal
- No public website
- No sync functionality

**Recommendation: Use Option 2 for Saturday!** 🌐

