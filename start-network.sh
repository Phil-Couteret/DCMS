#!/bin/bash

# Network Start Script for DCMS
# Starts all servers accessible from the local network

# Get local IP
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$LOCAL_IP" ]; then
  echo "Error: Could not determine local IP address"
  exit 1
fi

echo "=========================================="
echo "DCMS Network Server Startup"
echo "=========================================="
echo "Local IP: $LOCAL_IP"
echo ""
echo "Access URLs:"
echo "  Admin Portal:  http://$LOCAL_IP:3001"
echo "  Public Website: http://$LOCAL_IP:3000"
echo "  Backend API:   http://$LOCAL_IP:3003/api"
echo "  Sync Server:   http://$LOCAL_IP:3002"
echo ""
echo "Starting servers..."
echo "Press Ctrl+C to stop all servers"
echo "=========================================="
echo ""

# Change to project directory
cd "$(dirname "$0")"

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "Stopping all servers..."
  kill $BACKEND_PID $SYNC_PID $FRONTEND_PID 2>/dev/null
  exit
}

trap cleanup INT TERM

# Create logs directory if it doesn't exist
mkdir -p logs

# Start Backend API Server
echo "[1/3] Starting Backend API (port 3003)..."
cd backend
npm run start:dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..
sleep 2

# Start Sync Server
echo "[2/3] Starting Sync Server (port 3002)..."
cd sync-server
npm start > ../logs/sync.log 2>&1 &
SYNC_PID=$!
cd ..
sleep 2

# Start Frontend Admin Portal
echo "[3/3] Starting Admin Portal (port 3001)..."
cd frontend
HOST=0.0.0.0 PORT=3001 REACT_APP_API_URL=http://$LOCAL_IP:3003/api npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
sleep 3

echo ""
echo "✅ All servers started!"
echo "Check logs in the 'logs' directory for any errors"
echo ""
echo "To view logs:"
echo "  Backend:  tail -f logs/backend.log"
echo "  Sync:     tail -f logs/sync.log"
echo "  Frontend: tail -f logs/frontend.log"
echo ""

# Wait for all background processes
wait

