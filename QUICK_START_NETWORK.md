# Quick Start: Network Testing Setup

## Mac (Server Machine) - Quick Start

### Option 1: Use the startup script (Recommended)

```bash
cd /Users/phil/Documents/Work\ Dev/GitHub/DCMS
./start-network.sh
```

This will:
- Start backend on port 3003 (accessible from network)
- Start sync server on port 3002
- Start frontend on port 3001 (accessible from network)
- Show you the network IP and access URLs

### Option 2: Manual startup (4 terminals)

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```

**Terminal 2 - Sync Server:**
```bash
cd sync-server
npm start
```

**Terminal 3 - Frontend Admin:**
```bash
cd frontend
HOST=0.0.0.0 npm start
```

**Terminal 4 - Public Website (optional):**
```bash
cd public-website
HOST=0.0.0.0 npm start
```

## Windows 11 (Client Machine)

### Step 1: Get Mac's IP Address

Ask the Mac user, or they can run:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Step 2: Test Connection

Open Command Prompt on Windows:
```cmd
ping 192.168.18.254
```
(Replace with actual Mac IP)

### Step 3: Access in Browser

Open your browser and go to:
- **Admin Portal**: `http://192.168.18.254:3001`
- **Public Website**: `http://192.168.18.254:3000`

Replace `192.168.18.254` with the actual Mac IP address.

## Current Mac IP

Based on the current network configuration, your Mac IP is: **192.168.18.254**

## Troubleshooting

### Can't connect?
1. Verify Mac IP: `ifconfig` on Mac
2. Ping test: `ping 192.168.18.254` from Windows
3. Check firewall on Mac (System Preferences > Security & Privacy)
4. Verify servers are running (check Mac terminals)

### CORS errors?
The backend CORS is configured to accept connections from local network IPs automatically.

### Port already in use?
Stop existing servers:
```bash
pkill -f "nest start"
pkill -f "node.*sync-server"
pkill -f "react-scripts"
```

## Network Ports

- **3000**: Public Website (optional)
- **3001**: Admin Portal (frontend)
- **3002**: Sync Server
- **3003**: Backend API

All servers bind to `0.0.0.0` which means they're accessible from the network.

