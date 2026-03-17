# 植物巡检无人机控制系统

基于Jetson Nano的Tello无人机植物巡检控制系统，集成Stravision AI智能体通信。

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Stravision AI 智能体                      │
│                  (任务规划与决策中心)                         │
└────────────────────┬────────────────────────────────────────┘
                     │ JSON指令 (HTTP/HTTPS)
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              Jetson Nano 地面基站控制系统                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  指令接收与解析模块 (command_receiver.py)             │   │
│  │  - UDP/TCP通信 - JSON解析 - 指令队列                 │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  无人机控制模块 (drone_controller.py)                 │   │
│  │  - Tello SDK集成 - 飞行控制 - PID稳定                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  图像处理模块 (image_processor.py)                    │   │
│  │  - QR码识别 - 挑战卡识别 - 图像采集                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  数据管理模块 (data_manager.py)                       │   │
│  │  - SQLite存储 - 数据压缩 - 文件管理                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  数据回传模块 (data_uploader.py)                      │   │
│  │  - 数据融合 - Base64编码 - HTTP上传                  │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ WiFi连接
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                      Tello 无人机                            │
│              (图像采集与飞行执行单元)                         │
└─────────────────────────────────────────────────────────────┘
```

## 目录结构

```
drone-control-system/
├── main.py                      # 主程序入口
├── config.py                    # 系统配置
├── requirements.txt             # Python依赖
├── modules/                     # 核心功能模块
│   ├── __init__.py
│   ├── command_receiver.py      # 指令接收与解析
│   ├── drone_controller.py      # 无人机控制
│   ├── image_processor.py       # 图像处理
│   ├── data_manager.py          # 数据管理
│   ├── data_uploader.py         # 数据回传
│   ├── challenge_card.py        # 挑战卡识别飞行
│   └── pid_controller.py        # PID控制器
├── tests/                       # 测试模块
│   ├── __init__.py
│   ├── test_command_receiver.py
│   ├── test_drone_controller.py
│   ├── test_image_processor.py
│   ├── test_data_manager.py
│   └── integration_test.py
├── data/                        # 数据存储
│   ├── images/                  # 采集图像
│   ├── database/                # SQLite数据库
│   └── logs/                    # 系统日志
└── docs/                        # 文档
    ├── API.md                   # API文档
    ├── DEPLOYMENT.md            # 部署指南
    └── TEST_REPORT.md           # 测试报告
```

## 快速开始

### 1. 环境准备

```bash
# 在Jetson Nano上安装依赖
pip3 install -r requirements.txt

# 创建必要的目录
mkdir -p data/images data/database data/logs
```

### 2. 配置系统

编辑 `config.py` 文件，设置：
- Stravision AI智能体通信地址
- Tello无人机WiFi连接参数
- 数据库路径和存储配置

### 3. 运行系统

```bash
# 启动主控程序
python3 main.py

# 或使用后台运行
nohup python3 main.py > data/logs/system.log 2>&1 &
```

## 性能指标

- 指令响应时间: <500ms
- 图像识别准确率: >95%
- 飞行控制精度: ±50cm
- 数据传输成功率: >98%

## 测试

```bash
# 运行单元测试
python3 -m pytest tests/

# 运行集成测试
python3 tests/integration_test.py
```

## 许可证

MIT License
