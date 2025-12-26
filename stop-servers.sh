#!/bin/bash

# DCMS Server Stop Script
# Stops all DCMS servers by finding and killing processes on their ports

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any servers were found
SERVERS_FOUND=false

echo "🛑 Stopping DCMS Servers..."
echo ""

# Function to stop a service by port
stop_service() {
    local name=$1
    local port=$2
    
    # Find PIDs using the port (works on macOS and Linux)
    if command -v lsof >/dev/null 2>&1; then
        PIDS=$(lsof -ti:$port 2>/dev/null)
    elif command -v netstat >/dev/null 2>&1; then
        # Alternative for systems without lsof (Linux)
        PIDS=$(netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | grep -v "^$" | sort -u)
    else
        echo -e "${YELLOW}⚠️${NC}  Cannot find lsof or netstat. Please install one of them to use this script."
        return 1
    fi
    
    if [ -z "$PIDS" ]; then
        echo -e "${YELLOW}⏭️${NC}  $name (port $port): Not running"
        return 0
    fi
    
    SERVERS_FOUND=true
    
    # Kill each PID gracefully (SIGTERM)
    KILLED_COUNT=0
    for PID in $PIDS; do
        if kill -TERM $PID 2>/dev/null; then
            KILLED_COUNT=$((KILLED_COUNT + 1))
        fi
    done
    
    # Wait a moment for graceful shutdown
    sleep 1
    
    # Force kill if still running (SIGKILL)
    REMAINING_PIDS=$(lsof -ti:$port 2>/dev/null || echo "")
    if [ ! -z "$REMAINING_PIDS" ]; then
        for PID in $REMAINING_PIDS; do
            kill -KILL $PID 2>/dev/null
        done
        echo -e "${RED}🔪${NC} $name (port $port): Force killed $KILLED_COUNT process(es)"
    else
        echo -e "${GREEN}✅${NC} $name (port $port): Stopped $KILLED_COUNT process(es)"
    fi
}

# Stop each service
stop_service "Backend API" "3003"
stop_service "Sync Server" "3002"
stop_service "Public Website" "3000"
stop_service "Admin Portal" "3001"

echo ""

if [ "$SERVERS_FOUND" = true ]; then
    echo -e "${GREEN}✅ All DCMS servers have been stopped${NC}"
else
    echo -e "${YELLOW}ℹ️  No DCMS servers were running${NC}"
fi

