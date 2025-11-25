# DCMS Sync Server for POC

This simple sync server allows the public website (port 3000) and admin portal (port 3001) to share data during the POC demonstration.

## Setup

1. **Install dependencies:**
   ```bash
   cd sync-server
   npm install
   ```

2. **Start the sync server:**
   ```bash
   npm start
   ```

   The server will run on `http://localhost:3002`

## How It Works

- The sync server acts as a shared storage between the two applications
- Both apps push their localStorage data to the server every 2 seconds
- Both apps pull data from the server every 2 seconds
- Data is merged intelligently (new items are added, existing items are preserved)

## For Production

In production, this sync server will be replaced by your actual backend API. The sync service is designed to be easily replaced with real API calls.

## Ports

- **Public Website:** http://localhost:3000
- **Admin Portal:** http://localhost:3001
- **Sync Server:** http://localhost:3002

