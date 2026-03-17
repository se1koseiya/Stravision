# 域名访问诊断脚本 (PowerShell 版本)
# 用于快速诊断域名访问问题

$Domain = "stravision.cheesestrawberry.top"

Write-Host "========================================" -ForegroundColor Blue
Write-Host "  域名访问诊断工具" -ForegroundColor Blue
Write-Host "  Domain: $Domain" -ForegroundColor Blue
Write-Host "========================================`n" -ForegroundColor Blue

# 1. DNS 解析检查
Write-Host "[1/8] 检查 DNS 解析..." -ForegroundColor Yellow
try {
    $DnsResult = Resolve-DnsName -Name $Domain -ErrorAction Stop
    $IP = $DnsResult | Where-Object { $_.Type -eq 'A' } | Select-Object -First 1 -ExpandProperty IPAddress
    Write-Host "✓ DNS 解析成功: $IP" -ForegroundColor Green
} catch {
    Write-Host "✗ DNS 解析失败" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
Write-Host ""

# 2. HTTPS 连接检查
Write-Host "[2/8] 检查 HTTPS 连接..." -ForegroundColor Yellow
try {
    $Response = Invoke-WebRequest -Uri "https://$Domain" -Method Head -TimeoutSec 10 -ErrorAction Stop
    $StatusCode = $Response.StatusCode
    if ($StatusCode -in @(200, 301, 302)) {
        Write-Host "✓ HTTPS 连接成功 (HTTP $StatusCode)" -ForegroundColor Green
    } else {
        Write-Host "⚠ HTTPS 连接返回 HTTP $StatusCode" -ForegroundColor Yellow
    }
} catch {
    $StatusCode = $_.Exception.Response.StatusCode.value__
    if ($StatusCode -eq 418) {
        Write-Host "✗ 收到 HTTP 418 错误 (I'm a teapot)" -ForegroundColor Red
        Write-Host "  可能原因: Cloudflare Bot 检测或 CDN 配置问题" -ForegroundColor Yellow
    } else {
        Write-Host "✗ HTTPS 连接失败 (HTTP $StatusCode)" -ForegroundColor Red
    }
}
Write-Host ""

# 3. SSL 证书检查
Write-Host "[3/8] 检查 SSL 证书..." -ForegroundColor Yellow
try {
    $Request = [System.Net.WebRequest]::Create("https://$Domain")
    $Request.Timeout = 10000
    $Response = $Request.GetResponse()
    $Cert = $Request.ServicePoint.Certificate
    if ($Cert) {
        Write-Host "✓ SSL 证书有效" -ForegroundColor Green
        Write-Host "  颁发给: $($Cert.Subject)"
        Write-Host "  有效期至: $($Cert.GetExpirationDateString())"
    }
    $Response.Close()
} catch {
    Write-Host "✗ SSL 证书检查失败" -ForegroundColor Red
}
Write-Host ""

# 4. 响应头检查
Write-Host "[4/8] 检查响应头..." -ForegroundColor Yellow
try {
    $Response = Invoke-WebRequest -Uri "https://$Domain" -Method Head -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✓ 响应头正常" -ForegroundColor Green
    
    # 显示关键响应头
    $KeyHeaders = @('Server', 'CF-Ray', 'X-Powered-By', 'Content-Type')
    foreach ($Header in $KeyHeaders) {
        if ($Response.Headers[$Header]) {
            Write-Host "  $Header`: $($Response.Headers[$Header])"
        }
    }
    
    # 检查是否使用 Cloudflare
    if ($Response.Headers['CF-Ray']) {
        Write-Host "  检测到 Cloudflare CDN" -ForegroundColor Blue
    }
} catch {
    Write-Host "✗ 无法获取响应头" -ForegroundColor Red
}
Write-Host ""

# 5. 3D 模型资源检查
Write-Host "[5/8] 检查 3D 模型资源..." -ForegroundColor Yellow
$ModelUrl = "https://$Domain/3d_model/scene.gltf"
try {
    $Response = Invoke-WebRequest -Uri $ModelUrl -Method Head -TimeoutSec 30 -ErrorAction Stop
    $StatusCode = $Response.StatusCode
    Write-Host "✓ 3D 模型可访问 (HTTP $StatusCode)" -ForegroundColor Green
    
    if ($Response.Headers['Content-Length']) {
        $SizeMB = [math]::Round($Response.Headers['Content-Length'] / 1MB, 2)
        Write-Host "  文件大小: $SizeMB MB"
    }
} catch {
    $StatusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "✗ 3D 模型无法访问 (HTTP $StatusCode)" -ForegroundColor Red
}
Write-Host ""

# 6. CORS 检查
Write-Host "[6/8] 检查 CORS 配置..." -ForegroundColor Yellow
try {
    $Headers = @{
        'Origin' = "https://$Domain"
    }
    $Response = Invoke-WebRequest -Uri $ModelUrl -Method Head -Headers $Headers -TimeoutSec 10 -ErrorAction Stop
    
    $CorsHeaders = @('Access-Control-Allow-Origin', 'Access-Control-Allow-Methods')
    $HasCors = $false
    foreach ($Header in $CorsHeaders) {
        if ($Response.Headers[$Header]) {
            $HasCors = $true
            Write-Host "  $Header`: $($Response.Headers[$Header])"
        }
    }
    
    if ($HasCors) {
        Write-Host "✓ CORS 配置正常" -ForegroundColor Green
    } else {
        Write-Host "⚠ 未检测到 CORS 头（可能不需要）" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ CORS 检查失败" -ForegroundColor Yellow
}
Write-Host ""

# 7. WebSocket 检查
Write-Host "[7/8] 检查 WebSocket 支持..." -ForegroundColor Yellow
try {
    $Headers = @{
        'Upgrade' = 'websocket'
        'Connection' = 'Upgrade'
    }
    $Response = Invoke-WebRequest -Uri "https://$Domain/ws/voice" -Method Get -Headers $Headers -TimeoutSec 10 -ErrorAction Stop
    
    if ($Response.Headers['Upgrade'] -match 'websocket') {
        Write-Host "✓ WebSocket 支持正常" -ForegroundColor Green
    } else {
        Write-Host "⚠ WebSocket 支持未确认" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ WebSocket 检查失败（可能需要实际连接测试）" -ForegroundColor Yellow
}
Write-Host ""

# 8. 响应时间检查
Write-Host "[8/8] 检查响应时间..." -ForegroundColor Yellow
$Stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
try {
    $Response = Invoke-WebRequest -Uri "https://$Domain" -Method Head -TimeoutSec 10 -ErrorAction Stop
    $Stopwatch.Stop()
    $TotalTime = $Stopwatch.Elapsed.TotalSeconds
    
    Write-Host "  总响应时间: $([math]::Round($TotalTime, 3))s"
    
    if ($TotalTime -lt 2) {
        Write-Host "✓ 响应速度良好" -ForegroundColor Green
    } elseif ($TotalTime -lt 5) {
        Write-Host "⚠ 响应速度一般" -ForegroundColor Yellow
    } else {
        Write-Host "✗ 响应速度较慢" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ 响应时间检查失败" -ForegroundColor Red
}
Write-Host ""

# 总结
Write-Host "========================================" -ForegroundColor Blue
Write-Host "  诊断完成" -ForegroundColor Blue
Write-Host "========================================`n" -ForegroundColor Blue

# 建议
Write-Host "建议操作:" -ForegroundColor Yellow
Write-Host "  1. 查看详细修复指南: docs/domain-access-fix.md"
Write-Host "  2. 如果出现 418 错误，检查 Cloudflare 设置"
Write-Host "  3. 如果 3D 模型加载失败，检查 Nginx 配置"
Write-Host "  4. 如果响应慢，考虑启用 CDN 加速"
Write-Host ""

# Docker 服务状态检查（如果在服务器上运行）
Write-Host "检查 Docker 服务状态..." -ForegroundColor Yellow
try {
    $DockerPS = docker-compose ps 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host $DockerPS
    }
} catch {
    Write-Host "  (未检测到 Docker 环境)" -ForegroundColor Gray
}
