#!/bin/bash

# 低内存服务器构建脚本 (适用于4GB内存)
# Low Memory Build Script for 4GB RAM servers

set -e

echo "🔧 低内存构建模式 (Low Memory Build Mode)"
echo "========================================"
echo "服务器内存: 4GB"
echo "Node.js内存限制: 3GB"
echo ""

# 检查可用内存
echo "📊 检查系统内存..."
free -h || echo "内存信息不可用"
echo ""

# 设置环境变量
export NODE_OPTIONS="--max-old-space-size=3072"
export GENERATE_SOURCEMAP=false
export NEXT_TELEMETRY_DISABLED=1

# 清理旧的构建文件
echo "🧹 清理旧构建..."
rm -rf .next
rm -rf node_modules/.cache
echo "✅ 清理完成"
echo ""

# 构建（使用webpack而不是turbopack以节省内存）
echo "📦 开始构建 (使用webpack模式)..."
echo "⏱️  预计时间: 15-30分钟"
echo ""

# 尝试使用webpack构建
if pnpm build --webpack; then
    echo ""
    echo "✅ 构建成功!"
    echo ""
    echo "📊 构建产物大小:"
    du -sh .next
    echo ""
    echo "🚀 可以运行: pnpm start"
else
    echo ""
    echo "❌ 构建失败"
    echo ""
    echo "💡 建议:"
    echo "1. 增加swap空间"
    echo "2. 关闭其他服务释放内存"
    echo "3. 使用更大内存的服务器构建"
    exit 1
fi
