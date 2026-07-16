#!/bin/bash

# DCMS Standalone Test Application
# This script starts both backend and frontend for customer testing

set -e

echo "🚀 DCMS Standalone Test Application"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18+ required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm $(npm -v) detected${NC}"
echo ""

# Ask user which mode to use
echo "Select mode:"
echo "  1) Quick Demo - Admin Portal Only (Mock Mode - No backend/database) ⚡"
echo "  2) Full Demo - Backend + Database 🔧"
read -p "Enter choice [1 or 2] (default: 1): " MODE_CHOICE
MODE_CHOICE=${MODE_CHOICE:-1}

if [ "$MODE_CHOICE" = "2" ]; then
    # Full backend mode
    echo ""
    echo -e "${BLUE}📦 Setting up Full Demo Mode${NC}"

    # Check for PostgreSQL
    if ! command -v psql &> /dev/null; then
        echo -e "${YELLOW}⚠️  PostgreSQL not found. You'll need to install PostgreSQL 14+${NC}"
        echo "   macOS: brew install postgresql@14"
        echo "   Or download from: https://www.postgresql.org/download/"
        read -p "Continue anyway? (y/n): " CONTINUE
        if [ "$CONTINUE" != "y" ]; then
            exit 1
        fi
    else
        echo -e "${GREEN}✅ PostgreSQL detected${NC}"
    fi

    # Install backend dependencies if needed
    if [ ! -d "backend/node_modules" ]; then
        echo ""
        echo "📦 Installing backend dependencies..."
        cd backend
        npm install
        cd ..
    fi

    # Install frontend dependencies if needed
    if [ ! -d "frontend/node_modules" ]; then
        echo ""
        echo "📦 Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
    fi

    # Check for .env file in backend
    if [ ! -f "backend/.env" ]; then
        echo ""
        echo -e "${YELLOW}⚠️  Backend .env file not found${NC}"
        echo "Creating backend/.env with default settings..."
        JWT_SECRET_GENERATED=$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        cat > backend/.env << EOF
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dcms_test?schema=public"

# Server (frontend expects API at :3003)
PORT=3003
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000

# Required - app refuses to start without this
JWT_SECRET=${JWT_SECRET_GENERATED}
EOF
        echo -e "${GREEN}✅ Created backend/.env${NC}"
        echo -e "${YELLOW}⚠️  Please update DATABASE_URL if your PostgreSQL credentials differ${NC}"
    fi

    # Setup database
    echo ""
    echo "🗄️  Setting up database..."
    ./setup-database.sh

    # Generate Prisma client
    echo ""
    echo "🔧 Generating Prisma client..."
    cd backend
    npm run prisma:generate
    cd ..

    # Switch frontend to API mode
    echo ""
    echo "🔄 Switching frontend to API mode..."
    if grep -q "mode: 'mock'" frontend/src/config/apiConfig.js; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/mode: 'mock'/mode: 'api'/" frontend/src/config/apiConfig.js
        else
            # Linux
            sed -i.bak "s/mode: 'mock'/mode: 'api'/" frontend/src/config/apiConfig.js
        fi
        echo -e "${GREEN}✅ Frontend switched to API mode${NC}"
    fi

    # Start backend
    echo ""
    echo -e "${BLUE}🔧 Starting backend server on port 3003...${NC}"
    cd backend
    npm run start:dev > ../backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..

    # Wait for backend to start
    echo "⏳ Waiting for backend to start..."
    sleep 5

    # Check if backend started successfully
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}❌ Backend failed to start. Check backend.log for details${NC}"
        exit 1
    fi

    # Start frontend
    echo ""
    echo -e "${BLUE}🌐 Starting frontend on port 3000...${NC}"
    cd frontend
    PORT=3000 BROWSER=none npm start > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..

else
    # Quick demo mode (admin portal only, mock)
    echo ""
    echo -e "${BLUE}⚡ Setting up Quick Demo Mode (Admin Portal Only - Mock - No backend needed)${NC}"

    # Install frontend dependencies if needed
    if [ ! -d "frontend/node_modules" ]; then
        echo ""
        echo "📦 Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
    fi

    # Ensure frontend is in mock mode
    if grep -q "mode: 'api'" frontend/src/config/apiConfig.js; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/mode: 'api'/mode: 'mock'/" frontend/src/config/apiConfig.js
        else
            # Linux
            sed -i.bak "s/mode: 'api'/mode: 'mock'/" frontend/src/config/apiConfig.js
        fi
        echo -e "${GREEN}✅ Frontend set to mock mode${NC}"
    fi

    # Start frontend only
    echo ""
    echo -e "${BLUE}⚙️  Starting admin portal on port 3000...${NC}"
    cd frontend
    PORT=3000 BROWSER=none npm start > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
    BACKEND_PID=""
fi

# Cleanup function
cleanup() {
    echo ""
    echo ""
    echo -e "${YELLOW}🛑 Shutting down services...${NC}"
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}✅ Services stopped${NC}"
    exit 0
}

trap cleanup INT TERM

# Wait a moment for services to start
sleep 3

echo ""
echo "===================================="
echo -e "${GREEN}✅ DCMS is running!${NC}"
echo "===================================="
echo ""
if [ "$MODE_CHOICE" = "2" ]; then
    echo -e "${BLUE}📍 Services:${NC}"
    echo "   - Admin Portal: http://localhost:3000"
    echo "   - Backend API:  http://localhost:3003"
    echo "   - API Docs:     http://localhost:3003/api"
else
    echo -e "${BLUE}📍 Admin Portal:${NC}"
    echo "   - Application: http://localhost:3000"
    echo "   - Mode: Mock (using localStorage)"
fi
echo ""
echo -e "${YELLOW}📝 Logs:${NC}"
if [ "$MODE_CHOICE" = "2" ]; then
    echo "   - Admin Portal: frontend.log"
    echo "   - Backend:      backend.log"
else
    echo "   - Admin Portal: frontend.log"
fi
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for user interrupt
wait
