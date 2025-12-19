# Database Setup Script for DCMS Standalone Test - PowerShell
# This script sets up a PostgreSQL database for testing

$ErrorActionPreference = "Stop"

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-Output ""
Write-Output "===================================="
Write-Output " DCMS Database Setup"
Write-Output "===================================="
Write-Output ""

# Check for PostgreSQL
try {
    $null = Get-Command psql -ErrorAction Stop
    Write-ColorOutput Green "✅ PostgreSQL detected"
} catch {
    Write-ColorOutput Red "❌ PostgreSQL (psql) not found"
    Write-Output ""
    Write-Output "Please install PostgreSQL 14+ from:"
    Write-Output "https://www.postgresql.org/download/windows/"
    Write-Output ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Output ""

# Database configuration
$DB_NAME = "dcms_test"
$DB_USER = "postgres"
$DB_HOST = "localhost"
$DB_PORT = "5432"

Write-Output "Database configuration:"
Write-Output "  Name: $DB_NAME"
Write-Output "  User: $DB_USER"
Write-Output "  Host: $DB_HOST"
Write-Output "  Port: $DB_PORT"
Write-Output ""

# Check if database exists
Write-Output "[INFO] Checking if database exists..."
$dbExists = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt 2>$null | Select-String -Pattern $DB_NAME

if ($dbExists) {
    Write-ColorOutput Yellow "⚠️  Database '$DB_NAME' already exists"
    $recreate = Read-Host "Do you want to drop and recreate it? (y/n)"
    if ($recreate -eq "y") {
        Write-Output "[INFO] Dropping existing database..."
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput Green "✅ Database dropped"
        } else {
            Write-ColorOutput Yellow "⚠️  Failed to drop database (may need password or may not exist)"
        }
    } else {
        Write-Output "[INFO] Using existing database..."
        $skipCreation = $true
    }
}

# Create database (if not skipping)
if (-not $skipCreation) {
    Write-Output ""
    Write-Output "[INFO] Creating database '$DB_NAME'..."
    $createResult = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput Red "❌ Failed to create database"
        Write-Output "You may need to enter your PostgreSQL password"
        Write-Output "Or the database may already exist"
        Write-Output ""
        Write-Output "Error: $createResult"
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-ColorOutput Green "✅ Database created"

    # Set timezone
    Write-Output "[INFO] Setting timezone..."
    $tzResult = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "ALTER DATABASE $DB_NAME SET timezone = 'Europe/Madrid';" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✅ Timezone set"
    }

    # Run schema
    Write-Output ""
    Write-Output "[INFO] Running database schema..."
    $schemaPath = "database\schema\001_create_tables.sql"
    if (Test-Path $schemaPath) {
        $schemaResult = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $schemaPath 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput Yellow "⚠️  Schema may have failed - check for errors above"
            Write-Output "You may need to enter your PostgreSQL password"
            Write-Output ""
            Write-Output "Error output: $schemaResult"
        } else {
            Write-ColorOutput Green "✅ Schema applied"
        }
    } else {
        Write-ColorOutput Red "❌ Schema file not found: $schemaPath"
        Read-Host "Press Enter to exit"
        exit 1
    }

    # Run seeds (optional)
    $seedsPath = "database\seeds\002_sample_data.sql"
    if (Test-Path $seedsPath) {
        Write-Output ""
        $loadSeeds = Read-Host "Do you want to load sample data? (y/n)"
        if ($loadSeeds -eq "y") {
            Write-Output "[INFO] Loading sample data..."
            $seedsResult = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $seedsPath 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput Green "✅ Sample data loaded"
            } else {
                Write-ColorOutput Yellow "⚠️  Sample data may have failed - check for errors above"
                Write-Output ""
                Write-Output "Error output: $seedsResult"
            }
        }
    }
}

# Update backend .env
# Update backend .env with correct database URL
if (Test-Path "backend\.env") {
    $DATABASE_URL = "postgresql://${DB_USER}:postgres@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
    Write-Output ""
    Write-Output "[INFO] Updating backend\.env with database URL..."
    
    $envContent = Get-Content "backend\.env"
    $updated = $false
    
    for ($i = 0; $i -lt $envContent.Length; $i++) {
        if ($envContent[$i] -match "^DATABASE_URL=") {
            $envContent[$i] = "DATABASE_URL=`"$DATABASE_URL`""
            $updated = $true
            break
        }
    }
    
    if (-not $updated) {
        $envContent += "DATABASE_URL=`"$DATABASE_URL`""
    }
    
    $envContent | Set-Content "backend\.env"
    Write-ColorOutput Green "✅ Backend .env updated with database URL"
    Write-ColorOutput Yellow "⚠️  Please verify DATABASE_URL password matches your PostgreSQL password"
}

Write-Output ""
Write-Output "===================================="
Write-ColorOutput Green "✅ Database setup complete!"
Write-Output "===================================="
Write-Output ""
Write-Output "Database is ready to use."
Write-Output "You can connect with:"
Write-Output "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
Write-Output ""
Read-Host "Press Enter to continue"

