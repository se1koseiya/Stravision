# 重启 Next.js 开发服务器并清除缓存

Write-Host "正在停止开发服务器..." -ForegroundColor Yellow

# 找到监听3000端口的进程
$port = 3000
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Write-Host "找到进程 ID: $process" -ForegroundColor Cyan
    Stop-Process -Id $process -Force
    Write-Host "已停止进程" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "没有找到运行在端口 $port 的进程" -ForegroundColor Yellow
}

# 删除 .next 缓存目录
if (Test-Path ".next") {
    Write-Host "正在删除 .next 缓存目录..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force .next
    Write-Host "缓存已清除" -ForegroundColor Green
} else {
    Write-Host ".next 目录不存在" -ForegroundColor Yellow
}

Start-Sleep -Seconds 1

Write-Host "`n准备启动开发服务器..." -ForegroundColor Cyan
Write-Host "请运行: npm run dev" -ForegroundColor Green
Write-Host "`n或者直接在此窗口运行:" -ForegroundColor Yellow
Write-Host "npm run dev" -ForegroundColor White
