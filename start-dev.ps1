# Development Environment Startup Script
# This script starts both the Next.js dev server and Python voice service

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Stravision Development Environment   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env.local
$envFile = Join-Path $PSScriptRoot ".env.local"
if (Test-Path $envFile) {
    Write-Host "Loading environment variables from .env.local..." -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Function to start a process in a new window
function Start-ServiceInNewWindow {
    param(
        [string]$Title,
        [string]$Command,
        [string]$WorkingDirectory = $PSScriptRoot
    )
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$WorkingDirectory'; `$Host.UI.RawUI.WindowTitle = '$Title'; $Command" -WorkingDirectory $WorkingDirectory
}

Write-Host "Starting services..." -ForegroundColor Green
Write-Host ""

# Start Python Voice Service
Write-Host "[1/2] Starting Python Voice Service on port 8000..." -ForegroundColor Cyan
$pythonServiceDir = Join-Path $PSScriptRoot "python_service"

# Check if venv exists
$venvPath = Join-Path $pythonServiceDir "venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    Push-Location $pythonServiceDir
    python -m venv venv
    Pop-Location
}

$voiceCommand = @"
Set-Location '$pythonServiceDir'
& '$venvPath\Scripts\Activate.ps1'
pip install -r requirements.txt -q
Write-Host 'Voice Service starting on http://localhost:8000' -ForegroundColor Green
python main.py
"@

Start-ServiceInNewWindow -Title "Voice Service (Port 8000)" -Command $voiceCommand -WorkingDirectory $pythonServiceDir

Start-Sleep -Seconds 3

# Start Next.js Dev Server
Write-Host "[2/2] Starting Next.js Dev Server on port 3000..." -ForegroundColor Cyan
$nextCommand = "npm run dev"
Start-ServiceInNewWindow -Title "Next.js Dev (Port 3000)" -Command $nextCommand -WorkingDirectory $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Services Started Successfully!       " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Next.js:       http://localhost:3000" -ForegroundColor White
Write-Host "  Voice Service: http://localhost:8000" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit this window (services will continue running)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
