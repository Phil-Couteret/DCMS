#!/bin/bash

# Database Setup Script for DCMS Standalone Test
# This script sets up a PostgreSQL database for testing

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🗄️  DCMS Database Setup"
echo "======================"
echo ""

# Check for PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL (psql) not found${NC}"
    echo ""
    echo "Please install PostgreSQL 14+:"
    echo "   macOS: brew install postgresql@14"
    echo "   Or download from: https://www.postgresql.org/download/"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL detected${NC}"
echo ""

# Database configuration
DB_NAME="dcms_test"
DB_USER="${PGUSER:-postgres}"
DB_PASSWORD="${PGPASSWORD:-postgres}"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"

echo "Database configuration:"
echo "  Name: $DB_NAME"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo ""

# Check if database exists
DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -w "$DB_NAME" | wc -l)

if [ "$DB_EXISTS" -eq 1 ]; then
    echo -e "${YELLOW}⚠️  Database '$DB_NAME' already exists${NC}"
    read -p "Do you want to drop and recreate it? (y/n): " RECREATE
    if [ "$RECREATE" = "y" ]; then
        echo "Dropping existing database..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;"
        echo -e "${GREEN}✅ Database dropped${NC}"
    else
        echo "Using existing database..."
        exit 0
    fi
fi

# Create database
echo ""
echo "Creating database '$DB_NAME'..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"
echo -e "${GREEN}✅ Database created${NC}"

# Set timezone
echo "Setting timezone..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ALTER DATABASE $DB_NAME SET timezone = 'Europe/Madrid';"
echo -e "${GREEN}✅ Timezone set${NC}"

# Run schema
echo ""
echo "Running database schema..."
if [ -f "database/schema/001_create_tables.sql" ]; then
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database/schema/001_create_tables.sql
    echo -e "${GREEN}✅ Schema applied${NC}"
else
    echo -e "${RED}❌ Schema file not found: database/schema/001_create_tables.sql${NC}"
    exit 1
fi

# Run seeds (optional)
if [ -f "database/seeds/002_sample_data.sql" ]; then
    echo ""
    read -p "Do you want to load sample data? (y/n): " LOAD_SEEDS
    if [ "$LOAD_SEEDS" = "y" ]; then
        echo "Loading sample data..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database/seeds/002_sample_data.sql
        echo -e "${GREEN}✅ Sample data loaded${NC}"
    fi
fi

# Update backend .env with correct database URL
if [ -f "backend/.env" ]; then
    DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public"
    if grep -q "DATABASE_URL=" backend/.env; then
        # Update existing DATABASE_URL
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" backend/.env
        else
            # Linux
            sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" backend/.env
        fi
    else
        # Add DATABASE_URL
        echo "DATABASE_URL=\"$DATABASE_URL\"" >> backend/.env
    fi
    echo ""
    echo -e "${GREEN}✅ Backend .env updated with database URL${NC}"
fi

echo ""
echo "===================================="
echo -e "${GREEN}✅ Database setup complete!${NC}"
echo "===================================="
echo ""
echo "Database is ready to use."
echo "You can connect with:"
echo "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"

