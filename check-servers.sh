#!/bin/bash

# DCMS Server Health Check Script
# Checks if all DCMS servers are running and healthy

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
ALL_OK=true

echo "🔍 Checking DCMS Servers..."
echo ""

# Function to check a service
check_service() {
    local name=$1
    local url=$2
    local expected_status=$3
    
    if [ -z "$expected_status" ]; then
        expected_status=200
    fi
    
    # Try to fetch the URL with a 5 second timeout
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null)
    
    if [ "$response" == "$expected_status" ] || [ "$response" == "200" ]; then
        echo -e "${GREEN}✅${NC} $name: Running (HTTP $response)"
        return 0
    elif [ "$response" == "000" ]; then
        echo -e "${RED}❌${NC} $name: Not running (connection refused)"
        ALL_OK=false
        return 1
    else
        echo -e "${YELLOW}⚠️${NC}  $name: Responding but unexpected status (HTTP $response)"
        ALL_OK=false
        return 1
    fi
}

# Check Backend API (port 3003)
check_service "Backend API" "http://localhost:3003/api/health"

# Check Sync Server (port 3002)
check_service "Sync Server" "http://localhost:3002/health"

# Check Public Website (port 3000) - React app, any response is good
check_service "Public Website" "http://localhost:3000"

# Check Admin Portal (port 3001) - React app, any response is good
check_service "Admin Portal" "http://localhost:3001"

echo ""
if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}✅ All servers are running!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some servers are not running properly${NC}"
    echo ""
    echo "To start all servers, run:"
    echo "  ./start-poc.sh"
    exit 1
fi

