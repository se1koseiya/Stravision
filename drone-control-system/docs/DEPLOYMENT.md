# 部署指南

## 硬件要求

### Jetson Nano 配置
- NVIDIA Jetson Nano 开发板 (4GB RAM推荐)
- microSD卡 (64GB以上，Class 10)
- 5V 4A 电源适配器
- WiFi模块 (用于连接Tello无人机)
- 散热风扇 (推荐)

### Tello 无人机
- DJI Tello 或 Tello EDU
- 充满电的电池
- 备用电池 (推荐)

### 网络环境
- 稳定的WiFi网络
- 与Stravision AI智能体的网络连接

## 软件环境

### 操作系统
- Ubuntu 18.04 LTS (Jetson Nano官方支持)
- Python 3.6+

### 依赖安装

#### 1. 更新系统
```bash
sudo apt-get update
sudo apt-get upgrade -y
```

#### 2. 安装Python依赖
```bash
# 安装pip
sudo apt-get install python3-pip -y

# 安装系统依赖
sudo apt-get install -y \
    libopencv-dev \
    python3-opencv \
    libzbar0 \
    libzbar-dev

# 安装Python包
cd drone-control-system
pip3 install -r requirements.txt
```

#### 3. 安装OpenCV (如果需要)
```bash
# Jetson Nano通常预装OpenCV
# 如果需要重新安装
pip3 install opencv-python==4.8.1.78
pip3 install opencv-contrib-python==4.8.1.78
```

## 配置步骤

### 1. 克隆项目
```bash
git clone <repository_url>
cd drone-control-system
```

### 2. 配置环境变量
```bash
# 创建.env文件
cat > .env << EOF
STRAVISION_API_URL=http://your-stravision-server:3000/api
TELLO_HOST=192.168.10.1
TELLO_PORT=8889
COMMAND_PORT=8888
LOG_LEVEL=INFO
EOF
```

### 3. 修改配置文件
编辑 `config.py`，根据实际情况调整：

```python
# Stravision AI 智能体配置
STRAVISION_CONFIG = {
    "api_url": "http://your-server:3000/api",  # 修改为实际地址
    # ...
}

# 指令接收配置
COMMAND_RECEIVER_CONFIG = {
    "host": "0.0.0.0",  # 监听所有接口
    "port": 8888,       # 根据需要修改端口
    # ...
}
```

### 4. 创建数据目录
```bash
mkdir -p data/images data/database data/logs
chmod 755 data
```

### 5. 测试连接

#### 测试Tello连接
```bash
# 连接Tello WiFi
# SSID: TELLO-XXXXXX
# 密码: (无密码)

# 测试连接
python3 -c "from djitellopy import Tello; t = Tello(); t.connect(); print(f'Battery: {t.get_battery()}%')"
```

#### 测试Stravision连接
```bash
curl -X GET http://your-stravision-server:3000/api/health
```

## 运行系统

### 1. 前台运行 (测试)
```bash
python3 main.py
```

### 2. 后台运行 (生产)
```bash
# 使用nohup
nohup python3 main.py > data/logs/system.log 2>&1 &

# 或使用screen
screen -S drone-system
python3 main.py
# Ctrl+A, D 分离会话

# 重新连接
screen -r drone-system
```

### 3. 使用systemd服务 (推荐)

创建服务文件:
```bash
sudo nano /etc/systemd/system/drone-control.service
```

内容:
```ini
[Unit]
Description=Drone Inspection Control System
After=network.target

[Service]
Type=simple
User=jetson
WorkingDirectory=/home/jetson/drone-control-system
ExecStart=/usr/bin/python3 /home/jetson/drone-control-system/main.py
Restart=on-failure
RestartSec=10
StandardOutput=append:/home/jetson/drone-control-system/data/logs/system.log
StandardError=append:/home/jetson/drone-control-system/data/logs/error.log

[Install]
WantedBy=multi-user.target
```

启用服务:
```bash
sudo systemctl daemon-reload
sudo systemctl enable drone-control.service
sudo systemctl start drone-control.service

# 查看状态
sudo systemctl status drone-control.service

# 查看日志
sudo journalctl -u drone-control.service -f
```

## 性能优化

### 1. Jetson Nano性能模式
```bash
# 设置为最大性能模式
sudo nvpmodel -m 0
sudo jetson_clocks
```

### 2. 内存优化
```bash
# 增加swap空间
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 3. 网络优化
```bash
# 增加网络缓冲区
sudo sysctl -w net.core.rmem_max=26214400
sudo sysctl -w net.core.wmem_max=26214400
```

## 故障排查

### 无法连接Tello
1. 确认已连接到Tello WiFi
2. 检查IP地址: `ping 192.168.10.1`
3. 检查防火墙设置
4. 重启Tello无人机

### 指令接收失败
1. 检查端口是否被占用: `netstat -tuln | grep 8888`
2. 检查防火墙: `sudo ufw status`
3. 查看日志: `tail -f data/logs/system.log`

### 图像识别失败
1. 检查OpenCV安装: `python3 -c "import cv2; print(cv2.__version__)"`
2. 检查摄像头权限
3. 调整光照条件
4. 降低识别阈值

### 数据上传失败
1. 检查网络连接
2. 验证API地址配置
3. 检查Stravision服务状态
4. 查看上传日志

## 监控和维护

### 1. 系统监控
```bash
# 查看系统资源
htop

# 查看GPU使用
tegrastats

# 查看磁盘空间
df -h

# 查看日志大小
du -sh data/logs/
```

### 2. 日志管理
```bash
# 清理旧日志 (保留最近7天)
find data/logs/ -name "*.log" -mtime +7 -delete

# 压缩日志
gzip data/logs/*.log.1
```

### 3. 数据库维护
```bash
# 备份数据库
cp data/database/inspection.db data/database/inspection_backup_$(date +%Y%m%d).db

# 清理旧数据 (30天前)
sqlite3 data/database/inspection.db "DELETE FROM inspection_records WHERE created_at < datetime('now', '-30 days')"
```

### 4. 定期检查
- 每日检查系统日志
- 每周检查磁盘空间
- 每月更新系统和依赖
- 定期测试无人机连接

## 安全建议

1. 修改默认端口
2. 启用防火墙
3. 使用HTTPS进行数据传输
4. 定期更新系统和依赖
5. 限制网络访问权限
6. 加密敏感数据
7. 定期备份数据库

## 更新系统

```bash
# 停止服务
sudo systemctl stop drone-control.service

# 拉取最新代码
git pull origin main

# 更新依赖
pip3 install -r requirements.txt --upgrade

# 重启服务
sudo systemctl start drone-control.service
```

## 卸载

```bash
# 停止并禁用服务
sudo systemctl stop drone-control.service
sudo systemctl disable drone-control.service
sudo rm /etc/systemd/system/drone-control.service

# 删除文件
rm -rf ~/drone-control-system

# 卸载Python包
pip3 uninstall -r requirements.txt -y
```
