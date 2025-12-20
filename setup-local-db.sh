#!/bin/bash

# DCMS Local Database Setup Script
# This script sets up a local PostgreSQL database for development

set -e  # Exit on error

echo "🚀 DCMS Local Database Setup"
echo "=============================="
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed."
    echo ""
    echo "Please install PostgreSQL first:"
    echo "  Option 1 (Homebrew): brew install postgresql@14"
    echo "  Option 2 (GUI): Download from https://postgresapp.com/"
    echo ""
    echo "After installing, run this script again."
    exit 1
fi

echo "✅ PostgreSQL is installed"
echo ""

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "⚠️  PostgreSQL service is not running."
    echo ""
    echo "Starting PostgreSQL service..."
    
    # Try to start with Homebrew
    if command -v brew &> /dev/null; then
        brew services start postgresql@14 || brew services start postgresql@15 || {
            echo "❌ Could not start PostgreSQL automatically."
            echo "Please start PostgreSQL manually and run this script again."
            exit 1
        }
        sleep 2  # Wait for service to start
    else
        echo "❌ Could not start PostgreSQL automatically."
        echo "Please start PostgreSQL manually and run this script again."
        exit 1
    fi
fi

echo "✅ PostgreSQL is running"
echo ""

# Get current user (for database connection)
DB_USER="${USER:-phil}"
DB_NAME="dcms"

echo "Creating database: $DB_NAME"
echo "Using user: $DB_USER"
echo ""

# Create database (ignore error if it already exists)
psql -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || {
    echo "⚠️  Database '$DB_NAME' may already exist (this is OK)"
}

echo "✅ Database '$DB_NAME' created"
echo ""

# Check if schema file exists
SCHEMA_FILE="database/schema/001_create_tables.sql"
if [ ! -f "$SCHEMA_FILE" ]; then
    echo "❌ Schema file not found: $SCHEMA_FILE"
    exit 1
fi

echo "Creating database schema..."
psql -d "$DB_NAME" -f "$SCHEMA_FILE"

echo "✅ Database schema created"
echo ""

# Check if seed file exists
SEED_FILE="database/seeds/002_sample_data.sql"
if [ -f "$SEED_FILE" ]; then
    read -p "Load sample data? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Loading sample data..."
        psql -d "$DB_NAME" -f "$SEED_FILE"
        echo "✅ Sample data loaded"
    fi
else
    echo "⚠️  Sample data file not found: $SEED_FILE (skipping)"
fi

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "  1. Create backend/.env file (see backend/.env.example)"
echo "  2. Update DATABASE_URL in backend/.env to: postgresql://$DB_USER@localhost:5432/$DB_NAME?schema=public"
echo "  3. cd backend && npm install"
echo "  4. cd backend && npm run prisma:generate"
echo "  5. cd backend && npm run start:dev"
echo ""
echo "To view your database:"
echo "  cd backend && npm run prisma:studio"
echo ""



