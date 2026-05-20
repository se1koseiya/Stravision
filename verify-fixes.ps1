#!/usr/bin/env pwsh
# Berry Realm v4.0 - 修复验证脚本
# 用于验证所有 Alpine Linux 和 Docker 构建修复是否正确应用

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Berry Realm v4.0 修复验证" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# 1. 检查 package.json
Write-Host "[1/8] 检查 package.json..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json

if ($packageJson.dependencies.jspdf -match "2\.5\.2") {
    Write-Host "  ✓ jspdf 版本正确: $($packageJson.dependencies.jspdf)" -ForegroundColor Green
} else {
    Write-Host "  ✗ jspdf 版本错误: $($packageJson.dependencies.jspdf) (应该是 ^2.5.2)" -ForegroundColor Red
    $allPassed = $false
}

if ($packageJson.dependencies.canvg) {
    Write-Host "  ✓ canvg 已添加: $($packageJson.dependencies.canvg)" -ForegroundColor Green
} else {
    Write-Host "  ✗ canvg 缺失 (应该添加 ^4.0.2)" -ForegroundColor Red
    $allPassed = $false
}

if ($packageJson.packageManager -match "pnpm@10\.30\.1") {
    Write-Host "  ✓ packageManager 正确: $($packageJson.packageManager)" -ForegroundColor Green
} else {
    Write-Host "  ✗ packageManager 错误: $($packageJson.packageManager) (应该是 pnpm@10.30.1)" -ForegroundColor Red
    $allPassed = $false
}

# 2. 检查 pnpm-lock.yaml
Write-Host "`n[2/8] 检查 pnpm-lock.yaml..." -ForegroundColor Yellow
if (Test-Path "pnpm-lock.yaml") {
    $lockContent = Get-Content "pnpm-lock.yaml" -Raw
    
    if ($lockContent -match "jspdf@2\.5\.2") {
        Write-Host "  ✓ lockfile 包含 jspdf 2.5.2" -ForegroundColor Green
    } else {
        Write-Host "  ✗ lockfile 不包含 jspdf 2.5.2 (需要运行 pnpm install)" -ForegroundColor Red
        $allPassed = $false
    }
    
    if ($lockContent -match "canvg") {
        Write-Host "  ✓ lockfile 包含 canvg" -ForegroundColor Green
    } else {
        Write-Host "  ✗ lockfile 不包含 canvg (需要运行 pnpm install)" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "  ✗ pnpm-lock.yaml 不存在 (需要运行 pnpm install)" -ForegroundColor Red
    $allPassed = $false
}

# 3. 检查 next.config.ts
Write-Host "`n[3/8] 检查 next.config.ts..." -ForegroundColor Yellow
$nextConfig = Get-Content "next.config.ts" -Raw

if ($nextConfig -match "serverComponentsExternalPackages") {
    Write-Host "  ✓ serverComponentsExternalPackages 已配置" -ForegroundColor Green
} else {
    Write-Host "  ✗ serverComponentsExternalPackages 缺失" -ForegroundColor Red
    $allPassed = $false
}

if ($nextConfig -match "serverExternalPackages.*lightningcss") {
    Write-Host "  ✓ lightningcss 已标记为外部包" -ForegroundColor Green
} else {
    Write-Host "  ✗ lightningcss 未标记为外部包" -ForegroundColor Red
    $allPassed = $false
}

if ($nextConfig -match "resolve\.fallback") {
    Write-Host "  ✓ webpack fallback 已配置" -ForegroundColor Green
} else {
    Write-Host "  ✗ webpack fallback 缺失" -ForegroundColor Red
    $allPassed = $false
}

# 4. 检查 Dockerfile
Write-Host "`n[4/8] 检查 Dockerfile..." -ForegroundColor Yellow
$dockerfile = Get-Content "Dockerfile" -Raw

if ($dockerfile -match "node:22-alpine") {
    Write-Host "  ✓ 使用 Node.js 22" -ForegroundColor Green
} else {
    Write-Host "  ✗ 未使用 Node.js 22" -ForegroundColor Red
    $allPassed = $false
}

if ($dockerfile -match "pnpm@10\.30\.1") {
    Write-Host "  ✓ pnpm 版本固定为 10.30.1" -ForegroundColor Green
} else {
    Write-Host "  ✗ pnpm 版本未固定" -ForegroundColor Red
    $allPassed = $false
}

if ($dockerfile -match "apk add.*git") {
    Write-Host "  ✓ Git 已安装" -ForegroundColor Green
} else {
    Write-Host "  ✗ Git 未安装" -ForegroundColor Red
    $allPassed = $false
}

if ($dockerfile -match "--no-optional") {
    Write-Host "  ✓ 跳过可选依赖" -ForegroundColor Green
} else {
    Write-Host "  ✗ 未跳过可选依赖" -ForegroundColor Red
    $allPassed = $false
}

if ($dockerfile -match "COPY.*data.*data") {
    Write-Host "  ✓ data 目录已复制" -ForegroundColor Green
} else {
    Write-Host "  ✗ data 目录未复制" -ForegroundColor Red
    $allPassed = $false
}

if ($dockerfile -match "ws-server\.js") {
    Write-Host "  ✓ WebSocket 服务已配置" -ForegroundColor Green
} else {
    Write-Host "  ✗ WebSocket 服务未配置" -ForegroundColor Red
    $allPassed = $false
}

# 5. 检查 Dockerfile.low-memory
Write-Host "`n[5/8] 检查 Dockerfile.low-memory..." -ForegroundColor Yellow
if (Test-Path "Dockerfile.low-memory") {
    $dockerfileLow = Get-Content "Dockerfile.low-memory" -Raw
    
    if ($dockerfileLow -match "max-old-space-size=3072") {
        Write-Host "  ✓ 内存限制设置为 3GB" -ForegroundColor Green
    } else {
        Write-Host "  ✗ 内存限制未正确设置" -ForegroundColor Red
        $allPassed = $false
    }
    
    if ($dockerfileLow -match "--no-optional") {
        Write-Host "  ✓ 跳过可选依赖" -ForegroundColor Green
    } else {
        Write-Host "  ✗ 未跳过可选依赖" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "  ✗ Dockerfile.low-memory 不存在" -ForegroundColor Red
    $allPassed = $false
}

# 6. 检查 .dockerignore
Write-Host "`n[6/8] 检查 .dockerignore..." -ForegroundColor Yellow
if (Test-Path ".dockerignore") {
    $dockerignore = Get-Content ".dockerignore" -Raw
    
    if ($dockerignore -match "node_modules") {
        Write-Host "  ✓ .dockerignore 已配置" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ .dockerignore 可能需要优化" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ .dockerignore 不存在" -ForegroundColor Red
    $allPassed = $false
}

# 7. 检查 instrumentation.ts
Write-Host "`n[7/8] 检查 instrumentation.ts..." -ForegroundColor Yellow
if (Test-Path "instrumentation.ts") {
    $instrumentation = Get-Content "instrumentation.ts" -Raw
    
    if ($instrumentation -match "runtime.*nodejs") {
        Write-Host "  ✓ runtime 设置为 nodejs" -ForegroundColor Green
    } else {
        Write-Host "  ✗ runtime 未设置" -ForegroundColor Red
        $allPassed = $false
    }
    
    if ($instrumentation -match "NEXT_RUNTIME.*nodejs") {
        Write-Host "  ✓ 运行时检查已添加" -ForegroundColor Green
    } else {
        Write-Host "  ✗ 运行时检查缺失" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "  ⚠ instrumentation.ts 不存在 (可选)" -ForegroundColor Yellow
}

# 8. 检查 WebSocket 服务
Write-Host "`n[8/8] 检查 WebSocket 服务..." -ForegroundColor Yellow
if (Test-Path "server/ws-server.js") {
    Write-Host "  ✓ ws-server.js 存在" -ForegroundColor Green
    
    $wsServer = Get-Content "server/ws-server.js" -Raw
    if ($wsServer -match "WS_SERVER_PORT") {
        Write-Host "  ✓ 端口配置正确" -ForegroundColor Green
    } else {
        Write-Host "  ✗ 端口配置缺失" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "  ✗ server/ws-server.js 不存在" -ForegroundColor Red
    $allPassed = $false
}

# 总结
Write-Host "`n========================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "  ✓ 所有检查通过!" -ForegroundColor Green
    Write-Host "  可以开始构建 Docker 镜像" -ForegroundColor Green
    Write-Host "`n  运行以下命令构建:" -ForegroundColor Cyan
    Write-Host "    docker build -t berry-realm:latest ." -ForegroundColor White
    Write-Host "  或 (4GB 服务器):" -ForegroundColor Cyan
    Write-Host "    .\build-low-memory.ps1" -ForegroundColor White
} else {
    Write-Host "  ✗ 部分检查失败" -ForegroundColor Red
    Write-Host "  请查看上述错误并修复" -ForegroundColor Red
    Write-Host "`n  参考文档:" -ForegroundColor Cyan
    Write-Host "    - ALPINE-LINUX-FIX.md" -ForegroundColor White
    Write-Host "    - ALL-FIXES-SUMMARY.md" -ForegroundColor White
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

exit $(if ($allPassed) { 0 } else { 1 })
