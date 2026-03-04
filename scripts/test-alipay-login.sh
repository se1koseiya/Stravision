#!/bin/bash

# 支付宝登录测试脚本

echo "======================================"
echo "支付宝登录功能测试"
echo "======================================"
echo ""

# 1. 检查配置
echo "1. 检查支付宝配置..."
npx tsx scripts/check-alipay-config.ts

echo ""
echo "======================================"
echo "测试步骤:"
echo "======================================"
echo "1. 确保开发服务器正在运行 (npm run dev)"
echo "2. 访问: http://localhost:3000/login"
echo "3. 点击'支付宝'登录按钮"
echo "4. 完成支付宝授权"
echo "5. 检查是否成功登录"
echo ""
echo "如果遇到问题:"
echo "- 查看服务器控制台的详细日志"
echo "- 运行: node scripts/fix-alipay-env.js 修复配置"
echo "- 查看: docs/alipay-login-fix-guide.md"
echo ""
