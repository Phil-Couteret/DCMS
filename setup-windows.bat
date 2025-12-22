@echo off
REM DCMS Windows Setup Script
REM This script sets up the complete DCMS environment on Windows

setlocal enabledelayedexpansion

echo.
echo ====================================
echo  DCMS Windows Setup
echo ====================================
echo.

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed.
    echo.
    echo Please install Node.js 18+ from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js !NODE_VERSION! detected

REM Check Node.js version (should be 18+)
for /f "tokens=1 delims=." %%a in ("!NODE_VERSION:v=!") do set NODE_MAJOR=%%a
if !NODE_MAJOR! LSS 18 (
    echo [WARNING] Node.js version !NODE_VERSION! may not be compatible
    echo Recommended: Node.js 18 or higher
    echo.
    set /p CONTINUE="Continue anyway? (y/n): "
    if /i not "!CONTINUE!"=="y" exit /b 1
)

REM Check for npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] npm !NPM_VERSION! detected
echo.

REM Check for PostgreSQL
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] PostgreSQL (psql) not found
    echo.
    echo PostgreSQL is required for the database setup.
    echo Download from: https://www.postgresql.org/download/windows/
    echo.
    set /p CONTINUE="Continue with setup anyway? (y/n): "
    if /i not "!CONTINUE!"=="y" exit /b 1
    set PG_AVAILABLE=0
) else (
    echo [OK] PostgreSQL detected
    set PG_AVAILABLE=1
)

echo.
echo ====================================
echo  Step 1: Database Setup
echo ====================================
echo.

if !PG_AVAILABLE!==1 (
    echo Running database setup...
    call setup-database.bat
    if !ERRORLEVEL! NEQ 0 (
        echo [WARNING] Database setup had errors, but continuing...
    )
) else (
    echo [SKIP] Database setup skipped (PostgreSQL not found)
)

echo.
echo ====================================
echo  Step 2: Install Dependencies
echo ====================================
echo.

REM Install root dependencies
if not exist "node_modules" (
    echo [INFO] Installing root dependencies...
    call npm install
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Failed to install root dependencies
        pause
        exit /b 1
    )
    echo [OK] Root dependencies installed
) else (
    echo [OK] Root dependencies already installed
)

REM Install backend dependencies
if not exist "backend\node_modules" (
    echo [INFO] Installing backend dependencies...
    echo This may take a few minutes...
    cd backend
    call npm install
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Failed to install backend dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Backend dependencies installed
) else (
    echo [OK] Backend dependencies already installed
)

REM Install frontend (admin portal) dependencies
if not exist "frontend\node_modules" (
    echo [INFO] Installing admin portal dependencies...
    echo This may take a few minutes...
    cd frontend
    call npm install
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Failed to install admin portal dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Admin portal dependencies installed
) else (
    echo [OK] Admin portal dependencies already installed
)

REM Install public website dependencies
if not exist "public-website\node_modules" (
    echo [INFO] Installing public website dependencies...
    echo This may take a few minutes...
    cd public-website
    call npm install
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Failed to install public website dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Public website dependencies installed
) else (
    echo [OK] Public website dependencies already installed
)

REM Install sync server dependencies
if not exist "sync-server\node_modules" (
    echo [INFO] Installing sync server dependencies...
    cd sync-server
    call npm install
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Failed to install sync server dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Sync server dependencies installed
) else (
    echo [OK] Sync server dependencies already installed
)

echo.
echo ====================================
echo  Step 3: Configure Environment
echo ====================================
echo.

REM Check for backend .env file
if not exist "backend\.env" (
    echo [INFO] Creating backend\.env file...
    (
        echo # Database Connection
        echo # IMPORTANT: Replace YOUR_PASSWORD with your PostgreSQL password
        echo DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/dcms_production?schema=public
        echo.
        echo # Server Configuration
        echo PORT=3003
        echo NODE_ENV=development
        echo.
        echo # CORS Configuration
        echo CORS_ORIGIN=http://localhost:3000,http://localhost:3001
        echo.
        echo # JWT Secret ^(change in production^)
        echo JWT_SECRET=your-super-secret-jwt-key-change-in-production
    ) > backend\.env
    echo [OK] Created backend\.env
    echo [WARNING] Please update DATABASE_URL in backend\.env with your PostgreSQL password
) else (
    echo [OK] backend\.env already exists
)

echo.
echo ====================================
echo  Step 4: Generate Prisma Client
echo ====================================
echo.

if exist "backend\prisma\schema.prisma" (
    echo [INFO] Generating Prisma client...
    cd backend
    call npm run prisma:generate
    if !ERRORLEVEL! NEQ 0 (
        echo [WARNING] Prisma generate may have failed
        echo You may need to run this manually: cd backend ^&^& npm run prisma:generate
    ) else (
        echo [OK] Prisma client generated
    )
    cd ..
) else (
    echo [WARNING] Prisma schema not found, skipping Prisma client generation
)

echo.
echo ====================================
echo  Setup Complete!
echo ====================================
echo.
echo Next steps:
echo   1. Edit backend\.env and set your PostgreSQL password in DATABASE_URL
echo   2. Run start-windows.bat to start all services
echo.
echo Services will run on:
echo   - Public Website: http://localhost:3000
echo   - Admin Portal:   http://localhost:3001
echo   - Backend API:    http://localhost:3003
echo   - Sync Server:    http://localhost:3002
echo.
pause

