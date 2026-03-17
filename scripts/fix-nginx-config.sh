#!/bin/bash

# Nginx 配置修复脚本
# 修复缓冲区配置和 HTTP/2 语法问题

echo "🔧 修复 Nginx 配置问题..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 停止当前服务
echo "⏹️  停止当前服务..."
docker-compose down

# 验证 Nginx 配置
echo "✅ 验证 Nginx 配置..."
docker run --rm -v "$(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx 配置验证通过"
    
    # 重新启动服务
    echo "🚀 重新启动服务..."
    docker-compose up -d
    
    # 检查服务状态
    echo "📊 检查服务状态..."
    sleep 5
    docker-compose ps
    
    # 检查 Nginx 日志
    echo "📋 检查 Nginx 日志..."
    docker-compose logs nginx | tail -10
    
    echo "🎉 修复完成！"
else
    echo "❌ Nginx 配置仍有问题，请检查配置文件"
    exit 1
fi