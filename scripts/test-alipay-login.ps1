# 支付宝登录测试脚本 (PowerShell)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "支付宝登录功能测试" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查配置
Write-Host "1. 检查支付宝配置..." -ForegroundColor Yellow
npx tsx scripts/check-alipay-config.ts

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "测试步骤:" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "1. 确保开发服务器正在运行 (npm run dev)" -ForegroundColor White
Write-Host "2. 访问: http://localhost:3000/login" -ForegroundColor White
Write-Host "3. 点击'支付宝'登录按钮" -ForegroundColor White
Write-Host "4. 完成支付宝授权" -ForegroundColor White
Write-Host "5. 检查是否成功登录" -ForegroundColor White
Write-Host ""
Write-Host "如果遇到问题:" -ForegroundColor Yellow
Write-Host "- 查看服务器控制台的详细日志" -ForegroundColor White
Write-Host "- 运行: node scripts/fix-alipay-env.js 修复配置" -ForegroundColor White
Write-Host "- 查看: docs/alipay-login-fix-guide.md" -ForegroundColor White
Write-Host ""
