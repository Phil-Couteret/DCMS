@echo off
REM DCMS Services Status Check Script
REM This script checks if all DCMS services are running

echo.
echo ====================================
echo  DCMS Services Status Check
echo ====================================
echo.

set ALL_RUNNING=1

REM Check Backend API (port 3003)
echo Checking Backend API (port 3003)...
netstat -ano | findstr ":3003" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend API is running on port 3003
    echo        URL: http://localhost:3003
    echo        API Docs: http://localhost:3003/api
) else (
    echo [NOT RUNNING] Backend API (port 3003)
    set ALL_RUNNING=0
)

echo.

REM Check Sync Server (port 3002)
echo Checking Sync Server (port 3002)...
netstat -ano | findstr ":3002" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Sync Server is running on port 3002
    echo        URL: http://localhost:3002
) else (
    echo [NOT RUNNING] Sync Server (port 3002)
    set ALL_RUNNING=0
)

echo.

REM Check Public Website (port 3000)
echo Checking Public Website (port 3000)...
netstat -ano | findstr ":3000" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Public Website is running on port 3000
    echo        URL: http://localhost:3000
) else (
    echo [NOT RUNNING] Public Website (port 3000)
    set ALL_RUNNING=0
)

echo.

REM Check Admin Portal (port 3001)
echo Checking Admin Portal (port 3001)...
netstat -ano | findstr ":3001" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Admin Portal is running on port 3001
    echo        URL: http://localhost:3001
) else (
    echo [NOT RUNNING] Admin Portal (port 3001)
    set ALL_RUNNING=0
)

echo.

REM Check PostgreSQL (port 5432)
echo Checking PostgreSQL Database (port 5432)...
netstat -ano | findstr ":5432" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] PostgreSQL is running on port 5432
) else (
    echo [NOT RUNNING] PostgreSQL (port 5432)
    echo        NOTE: PostgreSQL is required for the backend API
)

echo.
echo ====================================
if %ALL_RUNNING% EQU 1 (
    echo  All DCMS Services Are Running!
    echo ====================================
    echo.
    echo Services available at:
    echo   - Public Website: http://localhost:3000
    echo   - Admin Portal:   http://localhost:3001
    echo   - Backend API:    http://localhost:3003
    echo   - Sync Server:    http://localhost:3002
    echo   - API Docs:       http://localhost:3003/api
) else (
    echo  Some Services Are Not Running
    echo ====================================
    echo.
    echo To start all services, run: start-windows.bat
)
echo.
pause

