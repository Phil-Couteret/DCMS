# Windows 11 Setup Guide

This guide explains how to access DCMS from a Windows 11 machine when the servers are running on a Mac on the same network.

## Prerequisites

1. Both machines must be on the same local network (same WiFi/router)
2. Mac server must be running (see NETWORK_SETUP.md)
3. Windows machine should be able to ping the Mac

## Step 1: Find the Mac's IP Address

Ask the Mac user for their IP address, or find it yourself:

**On Mac:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

The IP will be something like `192.168.18.254` or `192.168.1.x`.

## Step 2: Test Network Connectivity

On Windows, open Command Prompt (cmd) or PowerShell and test connectivity:

```cmd
ping 192.168.18.254
```

You should see replies. If not, check:
- Both machines are on the same network
- Firewall settings on Mac
- Network configuration

## Step 3: Access the Application

### Option A: Access via Browser (Recommended)

Simply open a web browser on Windows and navigate to:

- **Admin Portal**: `http://192.168.18.254:3001`
- **Public Website**: `http://192.168.18.254:3000` (if running)

Replace `192.168.18.254` with the actual Mac IP address.

### Option B: Run Frontend on Windows (Advanced)

If you want to run the frontend on Windows but connect to the Mac's backend:

1. **Install Node.js** on Windows:
   - Download from https://nodejs.org/
   - Install the LTS version

2. **Clone or copy the repository** to Windows

3. **Install dependencies**:
   ```cmd
   cd frontend
   npm install
   ```

4. **Update API configuration**:
   Edit `frontend/src/config/apiConfig.js`:
   ```javascript
   baseURL: 'http://192.168.18.254:3003/api',  // Replace with Mac's IP
   ```

5. **Start the frontend**:
   ```cmd
   npm start
   ```

6. **Access at**: `http://localhost:3001`

## Step 4: Troubleshooting

### Can't connect to Mac?

1. **Check Mac IP**: Verify the IP address is correct
2. **Ping test**: Run `ping 192.168.18.254` (replace with Mac IP)
3. **Check firewall**: Mac firewall might be blocking connections
4. **Verify servers**: Ensure servers are running on Mac
5. **Check ports**: Ensure ports 3000-3003 are accessible

### CORS Errors?

If you see CORS errors in the browser console, the backend needs to be updated to allow your Windows machine's IP. Contact the Mac user to update `backend/src/main.ts` CORS configuration.

### Connection Refused?

- Verify the Mac servers are running
- Check if ports are correct (3001 for admin, 3003 for backend)
- Ensure Mac firewall allows Node.js connections

## Quick Access

Once you know the Mac's IP address, bookmark these URLs:

- Admin Portal: `http://[MAC_IP]:3001`
- Backend API: `http://[MAC_IP]:3003/api`
- Public Website: `http://[MAC_IP]:3000`

Replace `[MAC_IP]` with the actual IP address (e.g., `192.168.18.254`).

## Testing Checklist

- [ ] Can ping Mac from Windows
- [ ] Can access admin portal in browser
- [ ] Can login/create bookings
- [ ] Can see bike rental bookings (if testing bike rental)
- [ ] Can see diving bookings (if testing diving)
- [ ] No CORS errors in browser console
- [ ] Data persists (saves correctly)
