#!/bin/bash
# 停止脚本

echo "Stopping Drone Inspection Control System..."

# 查找进程
pid=$(ps aux | grep "python3 main.py" | grep -v grep | awk '{print $2}')

if [ -z "$pid" ]; then
    echo "System is not running"
    exit 0
fi

# 发送SIGTERM信号
echo "Sending SIGTERM to process $pid..."
kill -TERM $pid

# 等待进程结束
sleep 2

# 检查是否还在运行
if ps -p $pid > /dev/null 2>&1; then
    echo "Process still running, sending SIGKILL..."
    kill -KILL $pid
    sleep 1
fi

echo "System stopped"
exit 0
