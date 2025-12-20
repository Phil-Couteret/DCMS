#!/bin/bash

# Start all services for DCMS POC
# This script starts the backend API, sync server, public website, and admin portal

echo "🚀 Starting DCMS POC Services..."
echo ""

# Start backend API
echo "🔧 Starting backend API on port 3003..."
cd backend
npm run start:dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start sync server
echo "📡 Starting sync server on port 3002..."
cd sync-server
npm start &
SYNC_PID=$!
cd ..

# Wait a moment for sync server to start
sleep 2

# Start public website
echo "🌐 Starting public website on port 3000..."
cd public-website
PORT=3000 BROWSER=none npm start &
PUBLIC_PID=$!
cd ..

# Wait a moment
sleep 2

# Start admin portal
echo "⚙️  Starting admin portal on port 3001..."
cd frontend
PORT=3001 BROWSER=none npm start &
ADMIN_PID=$!
cd ..

echo ""
echo "✅ All services starting..."
echo ""
echo "📍 Services:"
echo "   - Backend API:    http://localhost:3003"
echo "   - Sync Server:   http://localhost:3002"
echo "   - Public Website: http://localhost:3000"
echo "   - Admin Portal:   http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
trap "kill $BACKEND_PID $SYNC_PID $PUBLIC_PID $ADMIN_PID 2>/dev/null; exit" INT TERM
wait

