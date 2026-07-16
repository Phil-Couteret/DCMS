@echo off
REM DCMS Standalone Test Application - Windows Batch Script
REM This script starts both backend and frontend for customer testing

echo.
echo ====================================
echo  DCMS Standalone Test Application
echo ====================================
echo.

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed.
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% detected

REM Check for npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION% detected
echo.

REM Ask user which mode to use
echo Select mode:
echo   1) Quick Demo - Admin Portal Only (Mock Mode - No backend/database) [FASTEST]
echo   2) Full Demo - Backend + Database
echo.
set /p MODE_CHOICE="Enter choice [1 or 2] (default: 1): "
if "%MODE_CHOICE%"=="" set MODE_CHOICE=1

if "%MODE_CHOICE%"=="2" goto FULL_DEMO
goto QUICK_DEMO

:QUICK_DEMO
echo.
echo [INFO] Setting up Quick Demo Mode (Admin Portal Only - Mock - No backend needed)
echo.

REM Install frontend dependencies if needed
if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    echo This may take a few minutes on first run...
    cd frontend
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install frontend dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
)

REM Ensure frontend is in mock mode (using PowerShell for regex replace)
powershell -Command "(Get-Content frontend\src\config\apiConfig.js) -replace \"mode: 'api'\", \"mode: 'mock'\" | Set-Content frontend\src\config\apiConfig.js"

REM Start frontend
echo.
echo [INFO] Starting frontend on port 3000...
cd frontend
start /B cmd /c "set PORT=3000 && set BROWSER=none && npm start > ..\frontend.log 2>&1"
cd ..
set FRONTEND_STARTED=1

goto WAIT_FOR_USER

:FULL_DEMO
echo.
echo [INFO] Setting up Full Demo Mode
echo.

REM Check for PostgreSQL
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] PostgreSQL not found. You'll need PostgreSQL 14+
    echo Download from: https://www.postgresql.org/download/windows/
    set /p CONTINUE="Continue anyway? (y/n): "
    if /i not "%CONTINUE%"=="y" exit /b 1
) else (
    echo [OK] PostgreSQL detected
)

REM Install backend dependencies if needed
if not exist "backend\node_modules" (
    echo.
    echo [INFO] Installing backend dependencies...
    echo This may take a few minutes on first run...
    cd backend
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install backend dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
)

REM Install frontend dependencies if needed
if not exist "frontend\node_modules" (
    echo.
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install frontend dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
)

REM Check for .env file in backend
if not exist "backend\.env" (
    echo.
    echo [INFO] Creating backend\.env file with a freshly generated JWT secret...
    for /f "delims=" %%s in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set GENERATED_JWT_SECRET=%%s
    (
        echo # Database
        echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dcms_test?schema=public
        echo.
        echo # Server
        echo PORT=3001
        echo NODE_ENV=development
        echo.
        echo # CORS
        echo CORS_ORIGIN=http://localhost:3000
        echo.
        echo # Required - app refuses to start without this
        echo JWT_SECRET=%GENERATED_JWT_SECRET%
    ) > backend\.env
    echo [OK] Created backend\.env
    echo [WARNING] Please update DATABASE_URL if your PostgreSQL credentials differ
)

REM Setup database
echo.
echo [INFO] Setting up database...
call setup-database.bat
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Database setup failed
    pause
    exit /b 1
)

REM Generate Prisma client
echo.
echo [INFO] Generating Prisma client...
cd backend
call npm run prisma:generate
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to generate Prisma client
    cd ..
    pause
    exit /b 1
)
cd ..

REM Switch frontend to API mode
echo.
echo [INFO] Switching frontend to API mode...
powershell -Command "(Get-Content frontend\src\config\apiConfig.js) -replace \"mode: 'mock'\", \"mode: 'api'\" | Set-Content frontend\src\config\apiConfig.js"

REM Start backend
echo.
echo [INFO] Starting backend server on port 3001...
cd backend
start /B cmd /c "npm run start:dev > ..\backend.log 2>&1"
cd ..
set BACKEND_STARTED=1

REM Wait for backend to start
echo [INFO] Waiting for backend to start...
timeout /t 5 /nobreak >nul

REM Start frontend
echo.
echo [INFO] Starting frontend on port 3000...
cd frontend
start /B cmd /c "set PORT=3000 && set BROWSER=none && npm start > ..\frontend.log 2>&1"
cd ..
set FRONTEND_STARTED=1

:WAIT_FOR_USER
REM Wait a moment for services to start
timeout /t 3 /nobreak >nul

echo.
echo ====================================
echo  DCMS is running!
echo ====================================
echo.
if "%MODE_CHOICE%"=="2" (
    echo Services:
    echo   - Admin Portal: http://localhost:3000
    echo   - Backend API:  http://localhost:3001
    echo   - API Docs:     http://localhost:3001/api
) else (
    echo Admin Portal:
    echo   - Application: http://localhost:3000
    echo   - Mode: Mock (using localStorage)
)
echo.
echo Logs:
if "%MODE_CHOICE%"=="2" (
    echo   - Admin Portal: frontend.log
    echo   - Backend:      backend.log
) else (
    echo   - Admin Portal: frontend.log
)
echo.
echo Press Ctrl+C to stop all services, or close this window
echo.
echo Waiting for services to start...
timeout /t 5 /nobreak >nul

REM Keep window open and wait for user to close
pause
