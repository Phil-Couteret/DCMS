@echo off
REM DCMS Windows Start Script
REM This script starts all DCMS services on Windows

echo.
echo ====================================
echo  Starting DCMS Services
echo ====================================
echo.

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed.
    echo Please run setup-windows.bat first
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "backend\node_modules" (
    echo [ERROR] Backend dependencies not installed
    echo Please run setup-windows.bat first
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo [ERROR] Frontend dependencies not installed
    echo Please run setup-windows.bat first
    pause
    exit /b 1
)

if not exist "public-website\node_modules" (
    echo [ERROR] Public website dependencies not installed
    echo Please run setup-windows.bat first
    pause
    exit /b 1
)

if not exist "sync-server\node_modules" (
    echo [ERROR] Sync server dependencies not installed
    echo Please run setup-windows.bat first
    pause
    exit /b 1
)

REM Check for backend .env file
if not exist "backend\.env" (
    echo [WARNING] backend\.env not found
    echo Creating default .env file...
    (
        echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dcms_production?schema=public
        echo PORT=3003
        echo NODE_ENV=development
        echo CORS_ORIGIN=http://localhost:3000,http://localhost:3001
        echo JWT_SECRET=your-super-secret-jwt-key-change-in-production
    ) > backend\.env
    echo [WARNING] Using default database password. Please update backend\.env if needed.
)

echo [INFO] Starting services...
echo.

REM Start backend API (port 3003)
echo [INFO] Starting backend API on port 3003...
cd backend
start "DCMS Backend" cmd /k "npm run start:dev"
cd ..
timeout /t 3 /nobreak >nul

REM Start sync server (port 3002)
echo [INFO] Starting sync server on port 3002...
cd sync-server
start "DCMS Sync Server" cmd /k "npm start"
cd ..
timeout /t 2 /nobreak >nul

REM Start public website (port 3000)
echo [INFO] Starting public website on port 3000...
cd public-website
start "DCMS Public Website" cmd /k "set PORT=3000 && set BROWSER=none && npm start"
cd ..
timeout /t 2 /nobreak >nul

REM Start admin portal (port 3001)
echo [INFO] Starting admin portal on port 3001...
cd frontend
start "DCMS Admin Portal" cmd /k "set PORT=3001 && set BROWSER=none && npm start"
cd ..

echo.
echo ====================================
echo  Local Servers Starting
echo ====================================
echo.
echo All local servers will run on this machine:
echo.
echo   [1] PostgreSQL Database     - Port 5432 (Windows Service - should already be running)
echo   [2] Backend API             - Port 3003 (http://localhost:3003)
echo   [3] Sync Server             - Port 3002 (http://localhost:3002)
echo   [4] Public Website          - Port 3000 (http://localhost:3000)
echo   [5] Admin Portal            - Port 3001 (http://localhost:3001)
echo.
echo   API Documentation:          http://localhost:3003/api
echo.
echo Each Node.js service is running in its own window.
echo Close the windows to stop the services.
echo.
echo NOTE: PostgreSQL must be running before starting these services.
echo.
echo Waiting for services to initialize...
timeout /t 5 /nobreak >nul

echo.
echo [OK] All services started!
echo.
echo TIP: Check the individual windows for service status.
echo      If you see errors, check the troubleshooting guide in WINDOWS_LOCAL_SETUP.md
echo.
pause

