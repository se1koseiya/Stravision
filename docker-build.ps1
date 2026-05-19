# Docker Build Script with Memory Optimization (PowerShell)
# Usage: .\docker-build.ps1 [-ImageName "berry-realm"] [-BuildType "normal"]
# Build types: normal (default), prebuilt, low-memory

param(
    [string]$ImageName = "berry-realm",
    [string]$BuildType = "normal"
)

$ErrorActionPreference = "Stop"

Write-Host "🐳 Docker Build Script" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host "Image name: $ImageName"
Write-Host "Build type: $BuildType"
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Error: Docker is not running" -ForegroundColor Red
    exit 1
}

# Enable BuildKit for better caching
$env:DOCKER_BUILDKIT = "1"

switch ($BuildType) {
    "normal" {
        Write-Host "📦 Building with normal Dockerfile..." -ForegroundColor Green
        Write-Host "Memory limit: 10g"
        Write-Host "Memory swap: 12g"
        Write-Host "CPUs: 4"
        Write-Host ""
        
        docker build `
            --memory=10g `
            --memory-swap=12g `
            --cpus=4 `
            --build-arg BUILDKIT_INLINE_CACHE=1 `
            --progress=plain `
            -t "${ImageName}:latest" `
            -f Dockerfile `
            .
    }
    
    "prebuilt" {
        Write-Host "📦 Building with pre-built artifacts..." -ForegroundColor Green
        Write-Host ""
        
        # Check if .next directory exists
        if (-not (Test-Path ".next")) {
            Write-Host "⚠️  .next directory not found. Building locally first..." -ForegroundColor Yellow
            pnpm build
        }
        
        docker build `
            --progress=plain `
            -t "${ImageName}:latest" `
            -f Dockerfile.prebuilt `
            .
    }
    
    "low-memory" {
        Write-Host "📦 Building with low memory settings (slower but safer)..." -ForegroundColor Green
        Write-Host "Memory limit: 6g"
        Write-Host "Memory swap: 8g"
        Write-Host "CPUs: 2"
        Write-Host ""
        
        docker build `
            --memory=6g `
            --memory-swap=8g `
            --cpus=2 `
            --progress=plain `
            -t "${ImageName}:latest" `
            -f Dockerfile `
            .
    }
    
    default {
        Write-Host "❌ Unknown build type: $BuildType" -ForegroundColor Red
        Write-Host "Valid types: normal, prebuilt, low-memory"
        exit 1
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Image info:" -ForegroundColor Cyan
    docker images "${ImageName}:latest"
    Write-Host ""
    Write-Host "🚀 To run the container:" -ForegroundColor Cyan
    Write-Host "   docker run -p 3000:3000 -p 3002:3002 ${ImageName}:latest"
    Write-Host ""
    Write-Host "🔍 To inspect the image:" -ForegroundColor Cyan
    Write-Host "   docker run --rm -it ${ImageName}:latest sh"
} else {
    Write-Host ""
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
