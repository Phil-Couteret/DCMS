@echo off
REM Database Setup Script for DCMS Standalone Test - Windows
REM This script sets up a PostgreSQL database for testing

echo.
echo ====================================
echo  DCMS Database Setup
echo ====================================
echo.

REM Check for PostgreSQL
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PostgreSQL (psql) not found
    echo.
    echo Please install PostgreSQL 14+ from:
    echo https://www.postgresql.org/download/windows/
    echo.
    pause
    exit /b 1
)

echo [OK] PostgreSQL detected
echo.

REM Database configuration
set DB_NAME=dcms_test
set DB_USER=postgres
set DB_HOST=localhost
set DB_PORT=5432

echo Database configuration:
echo   Name: %DB_NAME%
echo   User: %DB_USER%
echo   Host: %DB_HOST%
echo   Port: %DB_PORT%
echo.

REM Check if database exists (simple check - may prompt for password)
echo [INFO] Checking if database exists...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -lqt 2>nul | findstr /C:"%DB_NAME%" >nul
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Database '%DB_NAME%' already exists
    set /p RECREATE="Do you want to drop and recreate it? (y/n): "
    if /i "%RECREATE%"=="y" (
        echo [INFO] Dropping existing database...
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -c "DROP DATABASE IF EXISTS %DB_NAME%;" 2>nul
        if %ERRORLEVEL% NEQ 0 (
            echo [WARNING] Failed to drop database (may need password or may not exist)
        ) else (
            echo [OK] Database dropped
        )
    ) else (
        echo [INFO] Using existing database...
        goto UPDATE_ENV
    )
)

REM Create database
echo.
echo [INFO] Creating database '%DB_NAME%'...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -c "CREATE DATABASE %DB_NAME%;" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to create database
    echo You may need to enter your PostgreSQL password
    echo Or the database may already exist
    pause
    exit /b 1
)
echo [OK] Database created

REM Set timezone
echo [INFO] Setting timezone...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "ALTER DATABASE %DB_NAME% SET timezone = 'Europe/Madrid';" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Timezone set
)

REM Run schema
echo.
echo [INFO] Running database schema...
if exist "database\schema\001_create_tables.sql" (
    REM Convert Unix line endings to Windows if needed, then run
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f database\schema\001_create_tables.sql 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] Schema may have failed - check for errors above
        echo You may need to enter your PostgreSQL password
    ) else (
        echo [OK] Schema applied
    )
) else (
    echo [ERROR] Schema file not found: database\schema\001_create_tables.sql
    pause
    exit /b 1
)

REM Run seeds (optional)
if exist "database\seeds\002_sample_data.sql" (
    echo.
    set /p LOAD_SEEDS="Do you want to load sample data? (y/n): "
    if /i "%LOAD_SEEDS%"=="y" (
        echo [INFO] Loading sample data...
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f database\seeds\002_sample_data.sql 2>nul
        if %ERRORLEVEL% EQU 0 (
            echo [OK] Sample data loaded
        ) else (
            echo [WARNING] Sample data may have failed - check for errors above
        )
    )
)

:UPDATE_ENV
REM Update backend .env with correct database URL
if exist "backend\.env" (
    set DATABASE_URL=postgresql://%DB_USER%:postgres@%DB_HOST%:%DB_PORT%/%DB_NAME%?schema=public
    echo.
    echo [INFO] Updating backend\.env with database URL...
    echo [WARNING] Please manually verify DATABASE_URL in backend\.env
    echo   Expected: %DATABASE_URL%
)

echo.
echo ====================================
echo  Database setup complete!
echo ====================================
echo.
echo Database is ready to use.
echo You can connect with:
echo   psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME%
echo.
pause

