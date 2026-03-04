#!/bin/bash

echo "开始清理 Docker 空间..."

# 1. 停止并移除所有容器 (可选，如果想彻底重置)
# docker-compose down

# 2. 清理未使用的镜像
echo "清理 dangling 镜像..."
docker image prune -f

# 3. 清理停止的容器
echo "清理停止的容器..."
docker container prune -f

# 4. 清理未使用的网络
echo "清理未使用的网络..."
docker network prune -f

# 5. 清理构建缓存 (这通常占用大量空间)
echo "清理构建缓存..."
docker builder prune -f

# 6. 检查磁盘使用情况
echo "当前 Docker 磁盘使用情况:"
docker system df

echo "清理完成！"
