# 快速开始指南

## 5分钟快速部署

### 前置条件
- Jetson Nano 开发板 (已安装Ubuntu 18.04)
- DJI Tello 无人机
- 已连接到Tello WiFi网络

### 步骤1: 安装依赖 (2分钟)

```bash
# 克隆项目
git clone <repository_url>
cd drone-control-system

# 安装Python依赖
pip3 install -r requirements.txt

# 创建数据目录
mkdir -p data/images data/database data/logs
```

### 步骤2: 配置系统 (1分钟)

编辑 `config.py`，修改Stravision AI地址：

```python
STRAVISION_CONFIG = {
    "api_url": "http://your-server:3000/api",  # 修改这里
    # ...
}
```

### 步骤3: 测试连接 (1分钟)

```bash
# 测试Tello连接
python3 -c "from djitellopy import Tello; t = Tello(); t.connect(); print(f'Battery: {t.get_battery()}%')"
```

### 步骤4: 启动系统 (1分钟)

```bash
# 使用启动脚本
chmod +x start.sh
./start.sh

# 或直接运行
python3 main.py
```

## 发送测试指令

### 使用Python

```python
import socket
import json

# 连接到系统
client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
client.connect(('localhost', 8888))

# 发送挑战卡任务
command = {
    "task_id": "test_001",
    "task_type": "challenge_card",
    "priority": 8,
    "flight_path": {},
    "capture_requirements": {"resolution": "720p"},
    "data_format": {"format": "json"}
}

client.send(json.dumps(command).encode('utf-8'))
response = client.recv(4096).decode('utf-8')
print(response)
client.close()
```

### 使用curl (需要HTTP接口)

```bash
curl -X POST http://localhost:8888/command \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "test_001",
    "task_type": "qr_scan",
    "priority": 7,
    "flight_path": {
      "waypoints": [
        {"x": 100, "y": 0, "z": 100}
      ]
    },
    "capture_requirements": {"resolution": "720p"},
    "data_format": {"format": "json"}
  }'
```

## 常见任务

### 挑战卡识别任务

```python
command = {
    "task_id": "challenge_001",
    "task_type": "challenge_card",
    "priority": 8,
    "flight_path": {},
    "capture_requirements": {
        "resolution": "720p",
        "quality": 90
    },
    "data_format": {"format": "json"}
}
```

### QR码扫描任务

```python
command = {
    "task_id": "scan_001",
    "task_type": "qr_scan",
    "priority": 7,
    "flight_path": {
        "waypoints": [
            {"x": 100, "y": 0, "z": 100, "lat": 31.23, "lon": 121.47},
            {"x": 200, "y": 50, "z": 100, "lat": 31.24, "lon": 121.48},
            {"x": 300, "y": 0, "z": 100, "lat": 31.25, "lon": 121.49}
        ]
    },
    "capture_requirements": {"resolution": "720p"},
    "data_format": {"format": "json"}
}
```

### 紧急降落

```python
command = {
    "task_id": "emergency_001",
    "task_type": "emergency_land",
    "priority": 10,
    "flight_path": {},
    "capture_requirements": {},
    "data_format": {}
}
```

## 查看系统状态

### 查看日志

```bash
# 实时查看日志
tail -f data/logs/system.log

# 查看最近100行
tail -n 100 data/logs/system.log

# 搜索错误
grep ERROR data/logs/system.log
```

### 查看数据库

```bash
# 进入SQLite
sqlite3 data/database/inspection.db

# 查看记录数
SELECT COUNT(*) FROM inspection_records;

# 查看最近的记录
SELECT * FROM inspection_records ORDER BY timestamp DESC LIMIT 10;

# 退出
.quit
```

### 查看图像

```bash
# 列出所有图像
ls -lh data/images/

# 查看最新的图像
ls -lt data/images/ | head -n 10
```

## 停止系统

```bash
# 使用停止脚本
chmod +x stop.sh
./stop.sh

# 或发送Ctrl+C (如果在前台运行)
```

## 运行测试

```bash
# 运行所有测试
chmod +x test.sh
./test.sh

# 运行单个测试
pytest tests/test_command_receiver.py -v

# 运行集成测试
python3 tests/integration_test.py
```

## 故障排查

### 无法连接Tello

```bash
# 检查WiFi连接
iwconfig

# 检查IP连接
ping 192.168.10.1

# 重启Tello
# 按住电源键5秒
```

### 端口被占用

```bash
# 查看端口占用
netstat -tuln | grep 8888

# 杀死占用进程
sudo kill -9 $(lsof -t -i:8888)
```

### 依赖问题

```bash
# 重新安装依赖
pip3 install -r requirements.txt --force-reinstall

# 检查OpenCV
python3 -c "import cv2; print(cv2.__version__)"
```

## 性能优化

### Jetson Nano最大性能模式

```bash
# 设置最大性能
sudo nvpmodel -m 0
sudo jetson_clocks

# 查看当前模式
sudo nvpmodel -q
```

### 监控资源使用

```bash
# 安装htop
sudo apt-get install htop

# 查看资源
htop

# 查看GPU
tegrastats
```

## 下一步

- 阅读完整文档: [README.md](README.md)
- 查看API文档: [docs/API.md](docs/API.md)
- 部署指南: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- 测试报告: [docs/TEST_REPORT.md](docs/TEST_REPORT.md)

## 获取帮助

- 查看日志: `data/logs/system.log`
- 运行测试: `./test.sh`
- 检查配置: `config.py`

## 常用命令速查

```bash
# 启动系统
./start.sh

# 停止系统
./stop.sh

# 运行测试
./test.sh

# 查看日志
tail -f data/logs/system.log

# 查看进程
ps aux | grep main.py

# 查看数据库
sqlite3 data/database/inspection.db

# 清理日志
find data/logs/ -name "*.log" -mtime +7 -delete
```
