#!/bin/bash

# 运行时文件检查脚本
# Runtime Files Check Script

echo "🔍 检查运行时必需文件..."
echo ""

MISSING_FILES=0

# 检查必需的配置文件
check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1"
    else
        echo "❌ $1 (缺失)"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
}

echo "📁 检查 data 目录配置文件:"
check_file "data/ai-models-config.json"
check_file "data/ai-features-config.json"
check_file "data/announcements.json"
check_file "data/sessions.json"

echo ""
echo "📁 检查其他必需文件:"
check_file ".next/BUILD_ID"
check_file "server/ws-server.js"
check_file ".agents/skills/agri-knowledge/SKILL.md"

echo ""
if [ $MISSING_FILES -eq 0 ]; then
    echo "✅ 所有必需文件都存在"
    exit 0
else
    echo "❌ 缺少 $MISSING_FILES 个文件"
    echo ""
    echo "💡 解决方案:"
    echo "1. 确保在构建前所有文件都存在"
    echo "2. 检查 .dockerignore 是否排除了这些文件"
    echo "3. 确保 Dockerfile 正确复制了这些文件"
    exit 1
fi
