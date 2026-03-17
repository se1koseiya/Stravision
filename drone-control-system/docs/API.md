# API 文档

## 指令接收接口

### 接收指令

**协议**: TCP/UDP  
**端口**: 8888 (可配置)  
**格式**: JSON

#### 请求格式

```json
{
  "task_id": "string (必需) - 任务唯一标识",
  "task_type": "string (必需) - 任务类型: challenge_card, qr_scan, patrol, emergency_land",
  "priority": "integer (可选, 1-10) - 优先级，默认5",
  "flight_path": {
    "waypoints": [
      {
        "x": "integer - X坐标 (cm)",
        "y": "integer - Y坐标 (cm)",
        "z": "integer - Z坐标/高度 (cm)",
        "lat": "float (可选) - GPS纬度",
        "lon": "float (可选) - GPS经度"
      }
    ]
  },
  "capture_requirements": {
    "resolution": "string - 分辨率，如 '720p'",
    "quality": "integer - 图像质量 (1-100)",
    "format": "string - 图像格式，如 'jpg'"
  },
  "data_format": {
    "format": "string - 数据格式，如 'json'",
    "compression": "boolean - 是否压缩"
  },
  "timeout": "integer (可选) - 任务超时时间(秒)，默认300"
}
```

#### 响应格式

```json
{
  "status": "string - success 或 error",
  "task_id": "string - 任务ID",
  "response_time": "float - 响应时间(秒)",
  "message": "string (可选) - 错误信息"
}
```

#### 示例

**挑战卡任务**:
```json
{
  "task_id": "mission_001",
  "task_type": "challenge_card",
  "priority": 8,
  "flight_path": {},
  "capture_requirements": {
    "resolution": "720p",
    "quality": 90
  },
  "data_format": {
    "format": "json",
    "compression": true
  }
}
```

**QR码扫描任务**:
```json
{
  "task_id": "scan_002",
  "task_type": "qr_scan",
  "priority": 7,
  "flight_path": {
    "waypoints": [
      {"x": 100, "y": 0, "z": 100, "lat": 31.23, "lon": 121.47},
      {"x": 200, "y": 50, "z": 100, "lat": 31.24, "lon": 121.48}
    ]
  },
  "capture_requirements": {
    "resolution": "720p"
  },
  "data_format": {
    "format": "json"
  }
}
```

## 数据回传接口

### 上传巡检数据

**方法**: POST  
**URL**: `{STRAVISION_API_URL}/drone/upload`  
**格式**: JSON

#### 请求格式

```json
{
  "timestamp": "float - Unix时间戳",
  "records": [
    {
      "id": "integer - 记录ID",
      "task_id": "string - 任务ID",
      "qr_code": "string - QR码内容",
      "timestamp": "string - 检测时间",
      "gps": {
        "latitude": "float - 纬度",
        "longitude": "float - 经度",
        "altitude": "float - 高度"
      },
      "detection_confidence": "float - 检测置信度",
      "image": "string - Base64编码的图像数据",
      "metadata": "object - 元数据"
    }
  ],
  "challenge_cards": [
    {
      "id": "integer - 卡片记录ID",
      "task_id": "string - 任务ID",
      "card_number": "integer - 卡片编号 (1-6)",
      "position": {
        "x": "float - X坐标",
        "y": "float - Y坐标",
        "z": "float - Z坐标"
      },
      "confidence": "float - 检测置信度",
      "detection_time": "string - 检测时间",
      "image": "string - Base64编码的图像数据",
      "metadata": "object - 元数据"
    }
  ],
  "metadata": {
    "total_records": "integer - 总记录数",
    "total_cards": "integer - 总卡片数"
  }
}
```

#### 响应格式

```json
{
  "status": "string - success 或 error",
  "message": "string - 消息",
  "received_records": "integer - 接收的记录数",
  "received_cards": "integer - 接收的卡片数"
}
```

### 上传状态信息

**方法**: POST  
**URL**: `{STRAVISION_API_URL}/drone/status`  
**格式**: JSON

#### 请求格式

```json
{
  "timestamp": "float - Unix时间戳",
  "drone_status": {
    "connected": "boolean - 是否连接",
    "in_flight": "boolean - 是否飞行中",
    "battery": "integer - 电池电量 (%)",
    "position": {
      "x": "float - X坐标",
      "y": "float - Y坐标",
      "z": "float - Z坐标",
      "yaw": "float - 偏航角"
    },
    "flight_time": "float - 飞行时间(秒)"
  },
  "system_status": {
    "commands_received": "integer - 接收的指令数",
    "images_captured": "integer - 捕获的图像数",
    "qr_codes_detected": "integer - 检测的QR码数",
    "cards_detected": "integer - 检测的卡片数"
  }
}
```

## 错误码

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求格式错误 |
| 500 | 服务器内部错误 |
| 503 | 服务不可用 |
| 504 | 请求超时 |

## 性能指标

- 指令响应时间: < 500ms
- 图像识别准确率: > 95%
- 飞行控制精度: ± 50cm
- 数据传输成功率: > 98%

## 使用示例

### Python 客户端示例

```python
import socket
import json

# 发送指令
def send_command(command_data):
    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client.connect(('192.168.1.100', 8888))
    client.send(json.dumps(command_data).encode('utf-8'))
    response = client.recv(4096).decode('utf-8')
    client.close()
    return json.loads(response)

# 示例指令
command = {
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
}

response = send_command(command)
print(f"Status: {response['status']}")
print(f"Response time: {response['response_time']:.3f}s")
```

### JavaScript 客户端示例

```javascript
const net = require('net');

function sendCommand(commandData) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    
    client.connect(8888, '192.168.1.100', () => {
      client.write(JSON.stringify(commandData));
    });
    
    client.on('data', (data) => {
      resolve(JSON.parse(data.toString()));
      client.destroy();
    });
    
    client.on('error', reject);
  });
}

// 使用示例
const command = {
  task_id: 'test_001',
  task_type: 'challenge_card',
  priority: 8,
  flight_path: {},
  capture_requirements: { resolution: '720p' },
  data_format: { format: 'json' }
};

sendCommand(command)
  .then(response => console.log('Response:', response))
  .catch(error => console.error('Error:', error));
```
