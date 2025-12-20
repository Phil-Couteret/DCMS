# Local Database Setup Guide

This guide will help you set up a local PostgreSQL database to use the proper database structure instead of localStorage, avoiding bugs that won't exist in production.

## Prerequisites

- macOS (you're on macOS based on your system)
- Homebrew (package manager for macOS)
- Node.js 18+ (already installed)

## Step 1: Install PostgreSQL

### Option A: Using Homebrew (Recommended)

```bash
# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Verify installation
psql --version
```

### Option B: Using Postgres.app (GUI Option)

1. Download from: https://postgresapp.com/
2. Install and launch Postgres.app
3. Click "Initialize" to create a new server
4. The default port is 5432

## Step 2: Create Database and User

```bash
# Connect to PostgreSQL (default user is your macOS username)
psql postgres

# Or if that doesn't work, try:
# psql -d postgres
```

In the PostgreSQL prompt, run:

```sql
-- Create database
CREATE DATABASE dcms;

-- Create user (optional, you can use your macOS user)
CREATE USER dcms_user WITH PASSWORD 'dcms_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE dcms TO dcms_user;

-- If you want to use your macOS user instead:
-- GRANT ALL PRIVILEGES ON DATABASE dcms TO your_macos_username;

-- Exit
\q
```

## Step 3: Configure Backend Environment

```bash
cd backend

# Create .env file
cat > .env << 'EOF'
# Database Connection (using macOS user - no password needed)
DATABASE_URL="postgresql://phil@localhost:5432/dcms?schema=public"

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# JWT Secret (change in production)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
EOF
```

**Note:** The DATABASE_URL uses your macOS username (`phil`). If your username is different, update it in the `.env` file.

## Step 4: Create Database Schema

You have two options:

### Option A: Use SQL Schema Directly (Recommended for now)

```bash
# Connect to your database
psql -d dcms -U dcms_user

# Or if using macOS user:
# psql -d dcms
```

Then run the SQL schema:

```sql
-- Copy and paste the contents of database/schema/001_create_tables.sql
\i ../database/schema/001_create_tables.sql
```

**Or from command line:**

```bash
# From project root
psql -d dcms -f database/schema/001_create_tables.sql
```

### Option B: Use Prisma Migrations (Future)

Once Prisma schema is fully populated, you can use:

```bash
cd backend
npm run prisma:migrate
```

## Step 5: Load Sample Data (Optional)

```bash
# Load sample data
psql -d dcms -f database/seeds/002_sample_data.sql
```

## Step 6: Update Prisma Schema

The Prisma schema needs to match your SQL schema. For now, you can use Prisma's `db pull` to generate the schema from the database:

```bash
cd backend

# Install dependencies if not already done
npm install

# Pull schema from database (generates Prisma schema from existing DB)
npx prisma db pull

# Generate Prisma Client
npm run prisma:generate
```

## Step 7: Test Database Connection

```bash
cd backend

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

This will open a web interface at `http://localhost:5555` where you can view and edit your database.

## Step 8: Start Backend Server

```bash
cd backend

# Start development server
npm run start:dev
```

The API will be available at `http://localhost:3001`

## Step 9: Update Frontend to Use API

Currently, the frontend uses localStorage. To use the database:

1. **Update API configuration** in `frontend/src/config/apiConfig.js`
2. **Switch from mock data to real API** in services
3. **Update dataService** to use HTTP calls instead of localStorage

This will be done in a separate step - for now, you can test the backend API directly.

## Troubleshooting

### PostgreSQL Service Not Running

```bash
# Check if PostgreSQL is running
brew services list

# Start if not running
brew services start postgresql@14

# Or restart
brew services restart postgresql@14
```

### Connection Refused

```bash
# Check if PostgreSQL is listening
lsof -i :5432

# If empty, PostgreSQL is not running
brew services start postgresql@14
```

### Permission Denied

If you get permission errors:

```bash
# Grant permissions to your user
psql postgres
GRANT ALL PRIVILEGES ON DATABASE dcms TO your_macos_username;
\q
```

### Database Already Exists

```bash
# Drop and recreate (WARNING: deletes all data)
psql postgres
DROP DATABASE IF EXISTS dcms;
CREATE DATABASE dcms;
\q
```

## Quick Commands Reference

```bash
# Connect to database
psql -d dcms

# List all databases
psql -l

# List all tables in current database
psql -d dcms -c "\dt"

# View table structure
psql -d dcms -c "\d table_name"

# Run SQL file
psql -d dcms -f path/to/file.sql

# Backup database
pg_dump dcms > dcms_backup.sql

# Restore database
psql -d dcms < dcms_backup.sql
```

## Next Steps

Once the database is set up:

1. ✅ Test database connection with Prisma Studio
2. ✅ Verify tables are created correctly
3. ✅ Test backend API endpoints
4. 🔄 Update frontend to use API instead of localStorage
5. 🔄 Implement authentication
6. 🔄 Add API endpoints for all entities

## Production Considerations

When deploying to production:

1. Use environment variables for database credentials
2. Use connection pooling
3. Enable SSL for database connections
4. Set up database backups
5. Use a managed PostgreSQL service (e.g., AWS RDS, Heroku Postgres, DigitalOcean)

