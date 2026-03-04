# Start Voice Service for local development
# This script starts the Python voice service on port 8000

$ErrorActionPreference = "Stop"

Write-Host "Starting Voice Service..." -ForegroundColor Cyan

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Found $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python is not installed. Please install Python 3.10+ first." -ForegroundColor Red
    exit 1
}

# Navigate to python_service directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$pythonServiceDir = Join-Path $projectRoot "python_service"

Set-Location $pythonServiceDir

# Check if virtual environment exists
$venvPath = Join-Path $pythonServiceDir "venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
$activateScript = Join-Path $venvPath "Scripts\Activate.ps1"
if (Test-Path $activateScript) {
    . $activateScript
} else {
    Write-Host "Failed to find activation script" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt -q

# Check for DASHSCOPE_API_KEY
if (-not $env:DASHSCOPE_API_KEY) {
    # Try to load from .env.local
    $envFile = Join-Path $projectRoot ".env.local"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match "^DASHSCOPE_API_KEY=(.+)$") {
                $env:DASHSCOPE_API_KEY = $matches[1]
            }
        }
    }
}

if (-not $env:DASHSCOPE_API_KEY) {
    Write-Host "Warning: DASHSCOPE_API_KEY not set. Voice service may not work properly." -ForegroundColor Yellow
}

# Start the service
Write-Host "Starting voice service on http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
python main.py
