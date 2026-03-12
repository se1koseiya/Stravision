#!/bin/bash
# 启动脚本

echo "=========================================="
echo "  Drone Inspection Control System"
echo "=========================================="

# 检查Python版本
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python version: $python_version"

# 检查依赖
echo "Checking dependencies..."
pip3 show djitellopy > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Error: djitellopy not installed"
    echo "Run: pip3 install -r requirements.txt"
    exit 1
fi

# 检查数据目录
if [ ! -d "data" ]; then
    echo "Creating data directories..."
    mkdir -p data/images data/database data/logs
fi

# 检查Tello连接
echo "Checking Tello connection..."
ping -c 1 -W 2 192.168.10.1 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Tello connected"
else
    echo "⚠ Warning: Cannot reach Tello (192.168.10.1)"
    echo "  Make sure you are connected to Tello WiFi"
fi

# 启动系统
echo ""
echo "Starting system..."
python3 main.py

exit $?
