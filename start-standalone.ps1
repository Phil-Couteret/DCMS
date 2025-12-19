# DCMS Standalone Test Application - PowerShell Script
# This script starts both backend and frontend for customer testing
# Run with: powershell -ExecutionPolicy Bypass -File start-standalone.ps1

$ErrorActionPreference = "Stop"

# Colors for output
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
Write-Output " DCMS Standalone Test Application"
Write-Output "===================================="
Write-Output ""

# Check for Node.js
try {
    $nodeVersion = node -v
    Write-ColorOutput Green "✅ Node.js $nodeVersion detected"
} catch {
    Write-ColorOutput Red "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Node.js version
$nodeMajorVersion = (node -v).Substring(1).Split('.')[0]
if ([int]$nodeMajorVersion -lt 18) {
    Write-ColorOutput Red "❌ Node.js version 18+ required. Current version: $(node -v)"
    Read-Host "Press Enter to exit"
    exit 1
}

# Check for npm
try {
    $npmVersion = npm -v
    Write-ColorOutput Green "✅ npm $npmVersion detected"
} catch {
    Write-ColorOutput Red "❌ npm is not installed"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Output ""

# Ask user which mode to use
Write-Output "Select mode:"
Write-Output "  1) Quick Demo (Mock Mode - No backend/database needed) ⚡"
Write-Output "  2) Full Demo (Backend + Database) 🔧"
$modeChoice = Read-Host "Enter choice [1 or 2] (default: 1)"
if ([string]::IsNullOrWhiteSpace($modeChoice)) { $modeChoice = "1" }

if ($modeChoice -eq "2") {
    # Full backend mode
    Write-Output ""
    Write-ColorOutput Blue "📦 Setting up Full Demo Mode"
    
    # Check for PostgreSQL
    try {
        $null = Get-Command psql -ErrorAction Stop
        Write-ColorOutput Green "✅ PostgreSQL detected"
    } catch {
        Write-ColorOutput Yellow "⚠️  PostgreSQL not found. You'll need to install PostgreSQL 14+"
        Write-Output "   Download from: https://www.postgresql.org/download/windows/"
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne "y") { exit 1 }
    }
    
    # Install backend dependencies if needed
    if (-not (Test-Path "backend\node_modules")) {
        Write-Output ""
        Write-Output "📦 Installing backend dependencies..."
        Set-Location backend
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput Red "❌ Failed to install backend dependencies"
            Set-Location ..
            Read-Host "Press Enter to exit"
            exit 1
        }
        Set-Location ..
    }
    
    # Install frontend dependencies if needed
    if (-not (Test-Path "frontend\node_modules")) {
        Write-Output ""
        Write-Output "📦 Installing frontend dependencies..."
        Set-Location frontend
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput Red "❌ Failed to install frontend dependencies"
            Set-Location ..
            Read-Host "Press Enter to exit"
            exit 1
        }
        Set-Location ..
    }
    
    # Check for .env file in backend
    if (-not (Test-Path "backend\.env")) {
        Write-Output ""
        Write-ColorOutput Yellow "⚠️  Backend .env file not found"
        Write-Output "Creating backend\.env with default settings..."
        @"
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dcms_test?schema=public"

# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000
"@ | Out-File -FilePath "backend\.env" -Encoding UTF8
        Write-ColorOutput Green "✅ Created backend\.env"
        Write-ColorOutput Yellow "⚠️  Please update DATABASE_URL if your PostgreSQL credentials differ"
    }
    
    # Setup database
    Write-Output ""
    Write-Output "🗄️  Setting up database..."
    & ".\setup-database.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput Red "❌ Database setup failed"
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    # Generate Prisma client
    Write-Output ""
    Write-Output "🔧 Generating Prisma client..."
    Set-Location backend
    npm run prisma:generate
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput Red "❌ Failed to generate Prisma client"
        Set-Location ..
        Read-Host "Press Enter to exit"
        exit 1
    }
    Set-Location ..
    
    # Switch frontend to API mode
    Write-Output ""
    Write-Output "🔄 Switching frontend to API mode..."
    $apiConfig = Get-Content "frontend\src\config\apiConfig.js" -Raw
    $apiConfig = $apiConfig -replace "mode: 'mock'", "mode: 'api'"
    $apiConfig | Set-Content "frontend\src\config\apiConfig.js" -NoNewline
    Write-ColorOutput Green "✅ Frontend switched to API mode"
    
    # Start backend
    Write-Output ""
    Write-ColorOutput Blue "🔧 Starting backend server on port 3001..."
    $backendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        Set-Location backend
        npm run start:dev *> ..\backend.log
    }
    
    # Wait for backend to start
    Write-Output "⏳ Waiting for backend to start..."
    Start-Sleep -Seconds 5
    
    # Start frontend
    Write-Output ""
    Write-ColorOutput Blue "🌐 Starting frontend on port 3000..."
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        Set-Location frontend
        $env:PORT = "3000"
        $env:BROWSER = "none"
        npm start *> ..\frontend.log
    }
    
    $backendStarted = $true
    
} else {
    # Quick demo mode (mock)
    Write-Output ""
    Write-ColorOutput Blue "⚡ Setting up Quick Demo Mode (Mock - No backend needed)"
    
    # Install frontend dependencies if needed
    if (-not (Test-Path "frontend\node_modules")) {
        Write-Output ""
        Write-Output "📦 Installing frontend dependencies..."
        Set-Location frontend
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput Red "❌ Failed to install frontend dependencies"
            Set-Location ..
            Read-Host "Press Enter to exit"
            exit 1
        }
        Set-Location ..
    }
    
    # Ensure frontend is in mock mode
    $apiConfig = Get-Content "frontend\src\config\apiConfig.js" -Raw
    $apiConfig = $apiConfig -replace "mode: 'api'", "mode: 'mock'"
    $apiConfig | Set-Content "frontend\src\config\apiConfig.js" -NoNewline
    Write-ColorOutput Green "✅ Frontend set to mock mode"
    
    # Start frontend only
    Write-Output ""
    Write-ColorOutput Blue "🌐 Starting frontend on port 3000..."
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        Set-Location frontend
        $env:PORT = "3000"
        $env:BROWSER = "none"
        npm start *> ..\frontend.log
    }
    
    $backendStarted = $false
}

# Wait for services to start
Start-Sleep -Seconds 3

Write-Output ""
Write-Output "===================================="
Write-ColorOutput Green "✅ DCMS is running!"
Write-Output "===================================="
Write-Output ""

if ($modeChoice -eq "2") {
    Write-ColorOutput Blue "📍 Services:"
    Write-Output "   - Frontend:  http://localhost:3000"
    Write-Output "   - Backend:   http://localhost:3001"
    Write-Output "   - API Docs:  http://localhost:3001/api"
} else {
    Write-ColorOutput Blue "📍 Frontend:"
    Write-Output "   - Application: http://localhost:3000"
    Write-Output "   - Mode: Mock (using localStorage)"
}

Write-Output ""
Write-ColorOutput Yellow "📝 Logs:"
Write-Output "   - Frontend: frontend.log"
if ($backendStarted) {
    Write-Output "   - Backend:  backend.log"
}
Write-Output ""
Write-ColorOutput Yellow "Press Ctrl+C to stop all services"
Write-Output ""

# Cleanup function
function Cleanup {
    Write-Output ""
    Write-ColorOutput Yellow "🛑 Shutting down services..."
    if ($frontendJob) { Stop-Job $frontendJob; Remove-Job $frontendJob }
    if ($backendJob) { Stop-Job $backendJob; Remove-Job $backendJob }
    Write-ColorOutput Green "✅ Services stopped"
}

# Register cleanup on exit
Register-EngineEvent PowerShell.Exiting -Action { Cleanup } | Out-Null

# Wait for user interrupt
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Cleanup
}

