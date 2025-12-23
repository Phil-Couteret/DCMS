@echo off
REM Network Start Script for DCMS (Windows)
REM Starts all servers accessible from the local network

echo ==========================================
echo DCMS Network Server Startup (Windows)
echo ==========================================
echo.
echo Please enter the Mac server IP address:
set /p MAC_IP="Mac IP (e.g., 192.168.18.254): "

if "%MAC_IP%"=="" (
    echo Error: Mac IP address is required
    pause
    exit /b 1
)

echo.
echo Access URLs:
echo   Admin Portal:  http://%MAC_IP%:3001
echo   Public Website: http://%MAC_IP%:3000
echo   Backend API:   http://%MAC_IP%:3003/api
echo.
echo Note: This script assumes servers are running on Mac.
echo       If you want to run servers on Windows, use separate terminals.
echo.
pause

