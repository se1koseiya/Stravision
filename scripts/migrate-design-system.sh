#!/bin/bash

# 设计系统迁移脚本
# 批量替换硬编码颜色为设计系统变量

echo "🎨 开始迁移到新设计系统..."

# 备份当前代码
echo "📦 创建备份..."
git add -A
git commit -m "backup: before design system migration" || true

# 1. 替换 emerald 颜色为 primary
echo "🔄 替换 emerald 颜色..."
find app components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/bg-emerald-500/bg-primary/g' {} +
find app components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/text-emerald-500/text-primary/g' {} +
find app components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/border-emerald-500/border-primary/g' {} +
find app components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/emerald-600/primary/g' {} +

# 2. 替换硬编码的深色背景
echo "🌑 替换深色背景..."
find app components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/bg-\[#050505\]/bg-background/g' {} +
find app components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/bg-\[#0A0A0A\]/bg-card/g' {} +
find app components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/bg-\[#111827\]/bg-background/g' {} +
find app components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/bg-\[#1F2937\]/bg-card/g' {} +

# 3. 替换 gray 颜色为语义化颜色
echo "🎨 替换 gray 颜色..."
find app components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/text-gray-400/text-muted-foreground/g' {} +
find app components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/text-gray-500/text-muted-foreground/g' {} +
find app components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/border-gray-200/border-border/g' {} +
find app components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/border-gray-300/border-border/g' {} +

echo "✅ 迁移完成！"
echo "📝 请检查以下文件并手动调整："
echo "   - app/page.tsx"
echo "   - app/dashboard/dashboard-client.tsx"
echo "   - app/device-control/device-control-client.tsx"
echo "   - components/ui/*.tsx"
echo ""
echo "🧪 运行测试："
echo "   npm run build"
echo "   npm run dev"
