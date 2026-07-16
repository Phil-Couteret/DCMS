# POC Setup Guide - Shared Storage for Demo

## Overview

For the POC demonstration, a simple sync server has been created to share data between the public website (port 3000) and admin portal (port 3001). Since they run on different ports (different origins), they can't share localStorage directly.

## Quick Start

### 1. Install Sync Server Dependencies

```bash
cd sync-server
npm install
```

### 2. Start All Services

**Terminal 1 - Sync Server:**
```bash
cd sync-server
npm start
```
Server runs on: http://localhost:3002

**Terminal 2 - Public Website:**
```bash
cd public-website
npm start
```
Runs on: http://localhost:3000

**Terminal 3 - Admin Portal:**
```bash
cd frontend
PORT=3001 BROWSER=none npm start
```
Runs on: http://localhost:3001

## How It Works

1. **Sync Server** (port 3002) acts as shared storage
2. **Public Website** pushes data to server when customers/bookings are created
3. **Admin Portal** pulls data from server every 2 seconds
4. **Data is merged** - new items are added, existing items preserved

## Testing the Sync

1. **Register a user** in public website (localhost:3000)
2. **Wait 2-3 seconds** for sync
3. **Check admin portal** (localhost:3001) - customer should appear automatically
4. **Create a booking** from My Account
5. **Wait 2-3 seconds** for sync
6. **Check admin portal** - booking should appear automatically

## Troubleshooting

### Customer/Bookings not appearing?

1. **Check sync server is running:**
   - Visit http://localhost:3002/health
   - Should return `{"status":"ok"}`

2. **Check browser console:**
   - Look for `[Sync]` messages
   - Should see "Connected to sync server"

3. **Manual refresh:**
   - Click "Refresh" button in admin portal
   - Wait a few seconds for auto-sync

4. **Check CORS:**
   - Sync server has CORS enabled
   - If issues, check browser console for CORS errors

### Sync server not starting?

```bash
cd sync-server
npm install express cors
npm start
```

## For Production

In production, this sync server will be replaced by your actual backend API. The sync service code is designed to be easily replaced with real API calls.

## Ports Summary

- **Public Website:** http://localhost:3000
- **Admin Portal:** http://localhost:3001  
- **Sync Server:** http://localhost:3002

All three must be running for the POC to work properly.

