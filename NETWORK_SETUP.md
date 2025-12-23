# Network Setup Guide for Multi-Machine Testing

This guide explains how to run DCMS on one machine (Mac) and access it from another machine (Windows 11) on the same network.

## Prerequisites

1. Both machines must be on the same local network
2. Mac machine IP: `192.168.18.254` (check with `ifconfig` if different)
3. Windows machine should be able to ping the Mac

## Step 1: Configure the Mac (Server Machine)

### 1.1 Update Backend CORS Configuration

The backend CORS is already configured to accept connections from any origin on the local network. The backend will run on port 3003.

### 1.2 Start the Servers on Mac

Open a terminal on the Mac and run these commands:

```bash
cd /Users/phil/Documents/Work\ Dev/GitHub/DCMS

# Terminal 1: Start Backend API Server
cd backend
npm run start:dev
# Backend will run on http://0.0.0.0:3003 (accessible from network)

# Terminal 2: Start Sync Server (optional)
cd sync-server
npm start
# Sync server will run on http://0.0.0.0:3002

# Terminal 3: Start Frontend Admin Portal
cd frontend
HOST=0.0.0.0 npm start
# Admin portal will run on http://0.0.0.0:3001 (accessible from network)

# Terminal 4: Start Public Website (if needed)
cd public-website
HOST=0.0.0.0 npm start
# Public website will run on http://0.0.0.0:3000 (accessible from network)
```

**Important**: Use `HOST=0.0.0.0` to make the React dev server accessible from the network.

### 1.3 Check Firewall Settings

On Mac, ensure the firewall allows incoming connections on ports 3000, 3001, 3002, and 3003:

```bash
# Check firewall status
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# If firewall is enabled, you may need to allow Node.js
# Go to System Preferences > Security & Privacy > Firewall > Firewall Options
# Add Node.js and allow incoming connections
```

## Step 2: Configure Windows Machine

### 2.1 Find the Mac's IP Address

On the Mac, run:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Or check in System Preferences > Network. The IP should be something like `192.168.x.x`.

### 2.2 Access from Windows Browser

Open a web browser on the Windows machine and navigate to:

- **Admin Portal**: `http://192.168.18.254:3001`
- **Public Website**: `http://192.168.18.254:3000` (if running)

### 2.3 Update API Configuration (if needed)

If the frontend on Windows needs to connect to the Mac's backend, the API config should already be set to use the Mac's IP. However, if you're running the frontend on Windows too, you'll need to:

1. Clone the repository on Windows
2. Update `frontend/src/config/apiConfig.js`:
   ```javascript
   baseURL: 'http://192.168.18.254:3003/api',
   ```
3. Start the frontend on Windows:
   ```bash
   cd frontend
   npm start
   ```

## Step 3: Troubleshooting

### Can't connect from Windows?

1. **Check Mac's IP address**: Run `ifconfig` on Mac to verify the IP
2. **Ping test**: From Windows, run `ping 192.168.18.254` to verify connectivity
3. **Check ports**: Ensure ports 3000-3003 are not blocked by firewall
4. **Verify servers are running**: Check Mac terminal for any errors
5. **Check CORS**: Backend CORS should allow connections from the Windows machine's IP

### Backend CORS Issues?

If you get CORS errors, update `backend/src/main.ts` to include the Windows machine's IP:

```typescript
app.enableCors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://192.168.18.254:3000',  // Mac IP
    'http://192.168.18.254:3001',  // Mac IP
    'http://192.168.x.x:3000',      // Windows IP (replace x.x)
    'http://192.168.x.x:3001',      // Windows IP (replace x.x)
  ],
  credentials: true,
});
```

### React Dev Server Not Accessible?

Make sure you're using:
```bash
HOST=0.0.0.0 npm start
```

Not just:
```bash
npm start
```

## Quick Start Script

Create a file `start-network.sh` on Mac:

```bash
#!/bin/bash

# Get local IP
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
echo "Starting servers on IP: $LOCAL_IP"
echo "Access admin portal at: http://$LOCAL_IP:3001"

# Start backend
cd backend && npm run start:dev &
BACKEND_PID=$!

# Start sync server
cd ../sync-server && npm start &
SYNC_PID=$!

# Start frontend
cd ../frontend && HOST=0.0.0.0 npm start &
FRONTEND_PID=$!

echo "Servers started. PIDs: Backend=$BACKEND_PID, Sync=$SYNC_PID, Frontend=$FRONTEND_PID"
echo "Press Ctrl+C to stop all servers"

# Wait for interrupt
trap "kill $BACKEND_PID $SYNC_PID $FRONTEND_PID; exit" INT
wait
```

Make it executable:
```bash
chmod +x start-network.sh
./start-network.sh
```

## Notes

- The backend runs on port 3003 and is accessible from the network
- The frontend dev server needs `HOST=0.0.0.0` to be accessible from other machines
- All servers bind to `0.0.0.0` which means they listen on all network interfaces
- The Windows machine should use the Mac's IP address to access the services

