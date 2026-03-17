"""
系统配置文件
包含所有系统参数和配置项
"""

import os
from pathlib import Path

# 基础路径配置
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
IMAGE_DIR = DATA_DIR / "images"
DATABASE_DIR = DATA_DIR / "database"
LOG_DIR = DATA_DIR / "logs"

# 创建必要的目录
for directory in [DATA_DIR, IMAGE_DIR, DATABASE_DIR, LOG_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Stravision AI 智能体配置
STRAVISION_CONFIG = {
    "api_url": os.getenv("STRAVISION_API_URL", "http://localhost:3000/api"),
    "upload_endpoint": "/drone/upload",
    "status_endpoint": "/drone/status",
    "timeout": 30,  # 秒
    "retry_times": 3,
    "retry_delay": 2,  # 秒
}

# 指令接收配置
COMMAND_RECEIVER_CONFIG = {
    "protocol": "TCP",  # TCP 或 UDP
    "host": "0.0.0.0",
    "port": 8888,
    "buffer_size": 4096,
    "queue_size": 100,
    "response_timeout": 0.5,  # 500ms
}

# Tello 无人机配置
TELLO_CONFIG = {
    "host": "192.168.10.1",
    "port": 8889,
    "command_timeout": 7,
    "video_port": 11111,
    "state_port": 8890,
    "max_retry": 3,
    "connection_timeout": 10,
}

# 飞行控制参数
FLIGHT_CONFIG = {
    "takeoff_height": 100,  # cm
    "cruise_speed": 50,  # cm/s
    "rotation_speed": 30,  # 度/s
    "hover_time": 2,  # 秒
    "photo_delay": 1,  # 拍照前等待时间(秒)
    "position_tolerance": 50,  # 位置误差容限(cm)
    "battery_warning": 20,  # 电量警告阈值(%)
    "battery_critical": 10,  # 电量危险阈值(%)
}

# PID 控制器参数
PID_CONFIG = {
    "x": {"kp": 0.5, "ki": 0.01, "kd": 0.1},
    "y": {"kp": 0.5, "ki": 0.01, "kd": 0.1},
    "z": {"kp": 0.6, "ki": 0.02, "kd": 0.15},
    "yaw": {"kp": 0.7, "ki": 0.01, "kd": 0.2},
    "max_output": 100,
    "min_output": -100,
}

# 挑战卡配置
CHALLENGE_CARD_CONFIG = {
    "card_count": 6,
    "detection_distance": 100,  # cm
    "approach_speed": 30,  # cm/s
    "card_size": (20, 20),  # cm (宽, 高)
    "recognition_threshold": 0.8,
    "flight_pattern": "zigzag",  # zigzag 或 linear
}

# 图像处理配置
IMAGE_CONFIG = {
    "resolution": (1280, 720),  # 720p
    "format": "jpg",
    "quality": 90,
    "qr_detection_method": "opencv",  # opencv 或 pyzbar
    "min_qr_size": 50,  # 像素
    "max_qr_size": 500,  # 像素
    "recognition_accuracy": 0.95,
}

# 数据库配置
DATABASE_CONFIG = {
    "db_path": DATABASE_DIR / "inspection.db",
    "backup_enabled": True,
    "backup_interval": 3600,  # 秒
    "max_backup_count": 10,
}

# 数据存储配置
STORAGE_CONFIG = {
    "image_naming": "{qr_code}_{timestamp}_{sequence}.jpg",
    "compression_enabled": True,
    "compression_quality": 85,
    "max_image_size": 5 * 1024 * 1024,  # 5MB
    "cleanup_days": 30,  # 保留天数
}

# 数据回传配置
UPLOAD_CONFIG = {
    "batch_size": 10,  # 批量上传数量
    "max_retry": 3,
    "retry_delay": 5,  # 秒
    "timeout": 60,  # 秒
    "compression": True,
    "base64_encoding": True,
    "success_rate_threshold": 0.98,
}

# 日志配置
LOG_CONFIG = {
    "level": "INFO",  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    "file": LOG_DIR / "system.log",
    "max_bytes": 10 * 1024 * 1024,  # 10MB
    "backup_count": 5,
    "console_output": True,
}

# 性能监控配置
PERFORMANCE_CONFIG = {
    "enable_monitoring": True,
    "metrics_interval": 60,  # 秒
    "alert_thresholds": {
        "response_time": 0.5,  # 秒
        "recognition_accuracy": 0.95,
        "position_error": 50,  # cm
        "upload_success_rate": 0.98,
    },
}

# 安全配置
SAFETY_CONFIG = {
    "max_flight_time": 1200,  # 秒 (20分钟)
    "emergency_landing_battery": 5,  # %
    "geofence_enabled": True,
    "max_altitude": 300,  # cm
    "max_distance": 1000,  # cm
    "wind_speed_limit": 10,  # m/s
}

# 测试配置
TEST_CONFIG = {
    "mock_mode": False,
    "simulation_enabled": False,
    "test_data_path": BASE_DIR / "tests" / "test_data",
    "test_iterations": 3,
}
