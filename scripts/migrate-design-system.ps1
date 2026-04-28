# 设计系统迁移脚本 (PowerShell)
# 批量替换硬编码颜色为设计系统变量

Write-Host "🎨 开始迁移到新设计系统..." -ForegroundColor Cyan

# 备份当前代码
Write-Host "📦 创建备份..." -ForegroundColor Yellow
git add -A
git commit -m "backup: before design system migration" 2>$null

# 定义替换规则
$replacements = @(
    # Emerald 颜色 -> Primary
    @{ Pattern = 'bg-emerald-500'; Replacement = 'bg-primary' },
    @{ Pattern = 'text-emerald-500'; Replacement = 'text-primary' },
    @{ Pattern = 'border-emerald-500'; Replacement = 'border-primary' },
    @{ Pattern = 'bg-emerald-600'; Replacement = 'bg-primary' },
    @{ Pattern = 'text-emerald-600'; Replacement = 'text-primary' },
    @{ Pattern = 'hover:bg-emerald-600'; Replacement = 'hover:bg-primary/90' },
    @{ Pattern = 'from-emerald-500'; Replacement = 'from-primary' },
    @{ Pattern = 'to-emerald-600'; Replacement = 'to-primary' },
    
    # 深色背景
    @{ Pattern = 'bg-\[#050505\]'; Replacement = 'bg-background' },
    @{ Pattern = 'bg-\[#0A0A0A\]'; Replacement = 'bg-card' },
    @{ Pattern = 'bg-\[#111827\]'; Replacement = 'bg-background' },
    @{ Pattern = 'bg-\[#1F2937\]'; Replacement = 'bg-card' },
    @{ Pattern = 'bg-\[#0B1220\]'; Replacement = 'bg-background' },
    @{ Pattern = 'bg-\[#0B1121\]'; Replacement = 'bg-background' },
    
    # Gray 颜色 -> 语义化颜色
    @{ Pattern = 'text-gray-400'; Replacement = 'text-muted-foreground' },
    @{ Pattern = 'text-gray-500'; Replacement = 'text-muted-foreground' },
    @{ Pattern = 'text-gray-600'; Replacement = 'text-muted-foreground' },
    @{ Pattern = 'border-gray-200'; Replacement = 'border-border' },
    @{ Pattern = 'border-gray-300'; Replacement = 'border-border' },
    @{ Pattern = 'bg-gray-100'; Replacement = 'bg-muted' },
    @{ Pattern = 'bg-gray-800'; Replacement = 'bg-card' },
    @{ Pattern = 'bg-gray-900'; Replacement = 'bg-background' }
)

# 获取所有需要处理的文件
$files = Get-ChildItem -Path "app","components" -Include "*.tsx","*.ts" -Recurse -File

$totalFiles = $files.Count
$processedFiles = 0

Write-Host "📝 找到 $totalFiles 个文件需要处理..." -ForegroundColor Green

foreach ($file in $files) {
    $processedFiles++
    $percentComplete = [math]::Round(($processedFiles / $totalFiles) * 100)
    Write-Progress -Activity "迁移设计系统" -Status "处理 $($file.Name)" -PercentComplete $percentComplete
    
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    $changesMade = $false
    
    foreach ($replacement in $replacements) {
        if ($content -match [regex]::Escape($replacement.Pattern)) {
            $content = $content -replace [regex]::Escape($replacement.Pattern), $replacement.Replacement
            $changesMade = $true
        }
    }
    
    if ($changesMade) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "  ✓ 更新: $($file.FullName)" -ForegroundColor Gray
    }
}

Write-Progress -Activity "迁移设计系统" -Completed

Write-Host ""
Write-Host "✅ 迁移完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📝 已处理 $processedFiles 个文件" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  请手动检查以下关键文件：" -ForegroundColor Yellow
Write-Host "   - app/page.tsx" -ForegroundColor Gray
Write-Host "   - app/dashboard/dashboard-client.tsx" -ForegroundColor Gray
Write-Host "   - app/device-control/device-control-client.tsx" -ForegroundColor Gray
Write-Host "   - app/monitor/page.tsx" -ForegroundColor Gray
Write-Host "   - components/ui/*.tsx" -ForegroundColor Gray
Write-Host ""
Write-Host "🧪 运行测试：" -ForegroundColor Cyan
Write-Host "   npm run build" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 查看文档：" -ForegroundColor Cyan
Write-Host "   DESIGN_SYSTEM_QUICK_START.md" -ForegroundColor Gray
Write-Host "   DESIGN_SYSTEM_GUIDE.md" -ForegroundColor Gray
Write-Host ""
