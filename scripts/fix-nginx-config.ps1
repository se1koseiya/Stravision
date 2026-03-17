# Nginx 配置修复脚本 (PowerShell 版本)
# 修复缓冲区配置和 HTTP/2 语法问题

Write-Host "🔧 修复 Nginx 配置问题..." -ForegroundColor Blue

# 检查 Docker 是否运行
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker 未运行，请先启动 Docker" -ForegroundColor Red
    exit 1
}

# 停止当前服务
Write-Host "⏹️  停止当前服务..." -ForegroundColor Yellow
docker-compose down

# 验证 Nginx 配置
Write-Host "✅ 验证 Nginx 配置..." -ForegroundColor Green
$configPath = (Get-Location).Path + "/nginx/nginx.conf"
$testResult = docker run --rm -v "${configPath}:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Nginx 配置验证通过" -ForegroundColor Green
    
    # 重新启动服务
    Write-Host "🚀 重新启动服务..." -ForegroundColor Blue
    docker-compose up -d
    
    # 检查服务状态
    Write-Host "📊 检查服务状态..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5
    docker-compose ps
    
    # 检查 Nginx 日志
    Write-Host "📋 检查 Nginx 日志..." -ForegroundColor Cyan
    docker-compose logs nginx | Select-Object -Last 10
    
    Write-Host "🎉 修复完成！" -ForegroundColor Green
} else {
    Write-Host "❌ Nginx 配置仍有问题：" -ForegroundColor Red
    Write-Host $testResult -ForegroundColor Red
    exit 1
}