Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Host "$name 未安装，请先安装" -ForegroundColor Red
    exit 1
  }
}

Require-Command docker

$composeCmd = $null
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
  $composeCmd = "docker-compose"
} elseif ((docker compose version) -ne $null) {
  $composeCmd = "docker compose"
} else {
  Write-Host "Docker Compose 未安装，请先安装" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path ".env")) {
  if (Test-Path ".env.local") {
    Copy-Item ".env.local" ".env"
  } else {
    Write-Host "缺少 .env 或 .env.local，请先准备环境变量文件" -ForegroundColor Red
    exit 1
  }
}

Get-Content ".env" | ForEach-Object {
  if ($_ -match '^\s*#') { return }
  if ($_ -match '^\s*$') { return }
  $pair = $_ -split '=', 2
  if ($pair.Count -eq 2) {
    [System.Environment]::SetEnvironmentVariable($pair[0], $pair[1])
  }
}

if (-not $env:DATABASE_URL) {
  if ($env:POSTGRES_USER -and $env:POSTGRES_PASSWORD -and $env:POSTGRES_DB) {
    $env:DATABASE_URL = "postgresql://$($env:POSTGRES_USER):$($env:POSTGRES_PASSWORD)@db:5432/$($env:POSTGRES_DB)"
  } else {
    Write-Host "缺少 DATABASE_URL 或 POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB" -ForegroundColor Red
    exit 1
  }
}

$required = @(
  "JWT_SECRET",
  "DASHSCOPE_API_KEY",
  "MQTT_HOST",
  "MQTT_PORT",
  "MQTT_USERNAME",
  "MQTT_PASSWORD",
  "MQTT_SUBSCRIBE_TOPIC",
  "MQTT_PUBLISH_TOPIC",
  "WEATHER_API_KEY",
  "SYSTEM_OPENAI_API_KEY",
  "SYSTEM_OPENAI_BASE_URL"
)

$missing = @()
foreach ($var in $required) {
  if (-not [string]::IsNullOrEmpty([System.Environment]::GetEnvironmentVariable($var))) { continue }
  $missing += $var
}

if ($missing.Count -gt 0) {
  Write-Host ("缺少必要环境变量: " + ($missing -join ", ")) -ForegroundColor Red
  exit 1
}

if (-not (Test-Path "nginx/certs/stravision.cheesestrawberry.top_bundle.crt") -or -not (Test-Path "nginx/certs/stravision.cheesestrawberry.top.key")) {
  if (Get-Command openssl -ErrorAction SilentlyContinue) {
    New-Item -ItemType Directory -Force -Path "nginx/certs" | Out-Null
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
      -keyout nginx/certs/stravision.cheesestrawberry.top.key `
      -out nginx/certs/stravision.cheesestrawberry.top_bundle.crt `
      -subj "/C=CN/ST=Shanghai/L=Shanghai/O=Stravision/OU=IT/CN=stravision.cheesestrawberry.top"
  } else {
    Write-Host "缺少 Nginx 证书且未安装 openssl" -ForegroundColor Red
    exit 1
  }
}

Write-Host "🧹 清理 Docker 缓存..." -ForegroundColor Cyan

& $composeCmd down --remove-orphans 2>$null

docker rmi stravision-iot-platform_web 2>$null
docker rmi stravision-iot-platform-web 2>$null

docker builder prune -f
docker system prune -f
docker image prune -f

Write-Host "✅ 缓存清理完成" -ForegroundColor Green
Write-Host ""
Write-Host "🔨 开始构建..." -ForegroundColor Cyan

& $composeCmd build --no-cache

Write-Host ""
Write-Host "🚀 启动服务..." -ForegroundColor Cyan

& $composeCmd up -d

Write-Host ""
Write-Host "✅ 部署完成！" -ForegroundColor Green
Write-Host ""
Write-Host ("📊 查看日志: {0} logs -f" -f $composeCmd) -ForegroundColor Yellow
