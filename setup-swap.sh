#!/bin/bash

# 为4GB内存服务器添加Swap空间
# Add Swap Space for 4GB RAM Server

set -e

SWAP_SIZE="4G"
SWAP_FILE="/swapfile"

echo "🔧 设置Swap空间"
echo "==============="
echo "Swap大小: $SWAP_SIZE"
echo ""

# 检查是否已有swap
if swapon --show | grep -q "$SWAP_FILE"; then
    echo "⚠️  Swap文件已存在"
    swapon --show
    echo ""
    read -p "是否要重新创建? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
    sudo swapoff $SWAP_FILE
    sudo rm $SWAP_FILE
fi

# 检查是否有root权限
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 需要root权限"
    echo "请使用: sudo $0"
    exit 1
fi

echo "📝 创建swap文件..."
fallocate -l $SWAP_SIZE $SWAP_FILE || dd if=/dev/zero of=$SWAP_FILE bs=1M count=4096

echo "🔒 设置权限..."
chmod 600 $SWAP_FILE

echo "🔧 设置swap..."
mkswap $SWAP_FILE

echo "✅ 启用swap..."
swapon $SWAP_FILE

echo "📊 当前swap状态:"
swapon --show
echo ""
free -h

echo ""
echo "✅ Swap设置完成!"
echo ""
echo "💡 使swap永久生效，添加到/etc/fstab:"
echo "   echo '$SWAP_FILE none swap sw 0 0' | sudo tee -a /etc/fstab"
echo ""
echo "🔧 调整swappiness (可选):"
echo "   sudo sysctl vm.swappiness=10"
echo "   echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf"
