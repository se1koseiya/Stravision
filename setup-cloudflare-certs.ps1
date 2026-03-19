# setup-cloudflare-certs.ps1

$certPath = "nginx/certs/stravision.cheesestrawberry.top_bundle.crt"
$keyPath = "nginx/certs/stravision.cheesestrawberry.top.key"
$certDir = "nginx/certs"

if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Force -Path $certDir | Out-Null
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "      Cloudflare 生产环境证书配置脚本" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "说明：此脚本将帮助您快速配置 Cloudflare 的 Origin 证书和私钥。" -ForegroundColor Gray
Write-Host "这些文件将被保存到 nginx/certs/ 目录下，供 Nginx 容器使用。" -ForegroundColor Gray
Write-Host ""

# 输入证书
Write-Host "第一步: 请粘贴您的 Cloudflare 源服务器证书 (Origin Certificate)" -ForegroundColor Yellow
Write-Host "   (内容应该包含 -----BEGIN CERTIFICATE----- 及 -----END CERTIFICATE-----)" -ForegroundColor Gray
Write-Host "   粘贴完成后，请按下回车，在此新行输入 EOF 并按回车结束输入：" -ForegroundColor Red

$certLines = @()
while ($true) {
    $line = Read-Host
    if ($line.Trim().ToUpper() -eq 'EOF') { break }
    if ($line.Trim() -ne '') {
        $certLines += $line
    }
}

if ($certLines.Count -eq 0) {
    Write-Host "错误: 未读取到任何证书内容。脚本已退出。" -ForegroundColor Red
    exit
}

$certLines -join "`n" | Out-File -FilePath "$PSScriptRoot/$certPath" -Encoding utf8NoBOM
Write-Host "证书已成功保存至 $certPath" -ForegroundColor Green
Write-Host ""

# 输入私钥
Write-Host "第二步: 请粘贴您的 Cloudflare 私钥 (Private Key)" -ForegroundColor Yellow
Write-Host "   (内容应该包含 -----BEGIN PRIVATE KEY----- 及 -----END PRIVATE KEY-----)" -ForegroundColor Gray
Write-Host "   粘贴完成后，请按下回车，在此新行输入 EOF 并按回车结束输入：" -ForegroundColor Red

$keyLines = @()
while ($true) {
    $line = Read-Host
    if ($line.Trim().ToUpper() -eq 'EOF') { break }
    if ($line.Trim() -ne '') {
        $keyLines += $line
    }
}

if ($keyLines.Count -eq 0) {
    Write-Host "错误: 未读取到任何私钥内容。脚本已退出。" -ForegroundColor Red
    exit
}

$keyLines -join "`n" | Out-File -FilePath "$PSScriptRoot/$keyPath" -Encoding utf8NoBOM
Write-Host "私钥已成功保存至 $keyPath" -ForegroundColor Green
Write-Host ""

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "配置完成！您的 Cloudflare 证书已准备就绪。" -ForegroundColor Green
Write-Host "请确保您在 Cloudflare 仪表板中将 SSL/TLS 加密模式设置为 '完全(严格) / Full (strict)'。" -ForegroundColor Yellow
Write-Host "最后，您可能需要重启 Nginx 容器以加载新证书：" -ForegroundColor Gray
Write-Host "  docker-compose restart nginx" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
