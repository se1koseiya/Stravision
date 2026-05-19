# 低内存服务器构建脚本 (适用于4GB内存)
# Low Memory Build Script for 4GB RAM servers

$ErrorActionPreference = "Stop"

Write-Host "🔧 低内存构建模式 (Low Memory Build Mode)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "服务器内存: 4GB"
Write-Host "Node.js内存限制: 3GB"
Write-Host ""

# 设置环境变量
$env:NODE_OPTIONS = "--max-old-space-size=3072"
$env:GENERATE_SOURCEMAP = "false"
$env:NEXT_TELEMETRY_DISABLED = "1"

# 清理旧的构建文件
Write-Host "🧹 清理旧构建..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules/.cache -ErrorAction SilentlyContinue
Write-Host "✅ 清理完成" -ForegroundColor Green
Write-Host ""

# 构建（使用webpack而不是turbopack以节省内存）
Write-Host "📦 开始构建 (使用webpack模式)..." -ForegroundColor Green
Write-Host "⏱️  预计时间: 15-30分钟"
Write-Host ""

try {
    pnpm build --webpack
    
    Write-Host ""
    Write-Host "✅ 构建成功!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 构建产物:"
    Get-ChildItem .next -Recurse | Measure-Object -Property Length -Sum | Select-Object @{Name="Size(MB)";Expression={[math]::Round($_.Sum / 1MB, 2)}}
    Write-Host ""
    Write-Host "🚀 可以运行: pnpm start" -ForegroundColor Cyan
} catch {
    Write-Host ""
    Write-Host "❌ 构建失败" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 建议:" -ForegroundColor Yellow
    Write-Host "1. 增加虚拟内存/页面文件"
    Write-Host "2. 关闭其他程序释放内存"
    Write-Host "3. 使用更大内存的服务器构建"
    exit 1
}
