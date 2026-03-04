# Design Document

## Overview

本设计文档描述了将老版本物联网设备监控系统的MQTT功能迁移到新版本Next.js应用的技术方案。核心思路是在Next.js后端建立MQTT客户端服务，通过WebSocket和HTTP API向前端提供实时数据流和控制接口，替代原有的浏览器端直接MQTT连接方案。

### 设计目标

1. **安全性提升**：MQTT凭证存储在服务器端，不暴露给浏览器
2. **可靠性增强**：服务器端维护持久MQTT连接，自动重连机制
3. **架构统一**：与现有Next.js API Routes集成，统一认证和日志
4. **实时性保证**：通过WebSocket推送设备数据，延迟<100ms
5. **向后兼容**：保留Python监听器工具用于开发调试

## Architecture

### 系统架构图

```
┌─────────────────┐         WebSocket          ┌──────────────────┐
│                 │◄──────────────────────────►│                  │
│  Browser Client │                            │   Next.js App    │
│   (React UI)    │         HTTP POST          │   (API Routes)   │
│                 │◄──────────────────────────►│                  │
└─────────────────┘                            └────────┬─────────┘
                                                        │
                                                        │ MQTT
                                                        │ (TLS/SSL)
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   HiveMQ Cloud  │
                                               │  MQTT Broker    │
                                               └────────┬────────┘
                                                        │
                                                        │ MQTT
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  IoT Devices    │
                                               │  (Sensors/      │
                                               │   Actuators)    │
                                               └─────────────────┘
```

### 技术栈

- **MQTT客户端库**: `mqtt` (npm包，支持Node.js和浏览器)
- **WebSocket**: Next.js原生支持（通过自定义服务器或API Routes）
- **数据格式**: JSON
- **认证**: 复用现有JWT认证机制（lib/auth.ts）
- **日志**: Console + 可选的文件日志

## Components and Interfaces

### 1. MQTT Service (lib/mqtt-service.ts)

单例服务，负责MQTT连接管理和消息处理。

#### 接口定义

```typescript
interface MQTTConfig {
  host: string
  port: number
  username: string
  password: string
  subscribeTopic: string
  publishTopic: string
  useSSL: boolean
  keepalive: number
  reconnectPeriod: number
}

interface DeviceData {
  temperature: number      // 温度 (°C * 10)
  humidity: number         // 湿度 (% * 10)
  light: number           // 光照 (lux)
  co2: number             // CO2 (ppm)
  earth_temp: number      // 土壤温度 (°C * 10)
  earth_water: number     // 土壤水分 (%)
  earth_ec: number        // EC值 (μS/cm)
  earth_n: number         // 氮 (mg/kg)
  earth_p: number         // 磷 (mg/kg)
  earth_k: number         // 钾 (mg/kg)
  relay5: number          // 继电器5状态 (0/1)
  relay6: number          // 继电器6状态 (0/1)
  relay7: number          // 继电器7状态 (0/1)
  relay8: number          // 继电器8状态 (0/1)
  led1: number            // LED1亮度 (0-255)
  led2: number            // LED2亮度 (0-255)
  led3: number            // LED3亮度 (0-255)
  led4: number            // LED4亮度 (0-255)
  timestamp?: number      // 接收时间戳
}

interface ControlCommand {
  type: 'relay' | 'led'
  relayNum?: number       // 继电器编号 (5-8)
  newState?: number       // 继电器新状态 (0/1)
  led1?: number           // LED1亮度
  led2?: number           // LED2亮度
  led3?: number           // LED3亮度
  led4?: number           // LED4亮度
}

class MQTTService {
  private static instance: MQTTService
  private client: mqtt.MqttClient | null
  private config: MQTTConfig
  private latestData: DeviceData | null
  private dataListeners: Set<(data: DeviceData) => void>
  
  private constructor()
  static getInstance(): MQTTService
  
  connect(): Promise<void>
  disconnect(): void
  isConnected(): boolean
  
  getLatestData(): DeviceData | null
  subscribeToData(callback: (data: DeviceData) => void): () => void
  
  sendControlCommand(command: ControlCommand): Promise<void>
  
  private handleMessage(topic: string, payload: Buffer): void
  private buildControlPayload(command: ControlCommand): object
}
```

#### 实现要点

1. **单例模式**：确保全局只有一个MQTT连接
2. **自动重连**：使用mqtt库的reconnectPeriod选项
3. **数据缓存**：保存最新的设备数据，供新连接的WebSocket客户端获取
4. **观察者模式**：维护数据监听器列表，新数据到达时通知所有监听器
5. **错误处理**：捕获连接错误、消息解析错误，记录日志

### 2. WebSocket API (app/api/mqtt/stream/route.ts)

提供WebSocket端点，实时推送设备数据。

#### 接口定义

```typescript
// WebSocket消息格式
interface WSMessage {
  type: 'data' | 'error' | 'connected'
  data?: DeviceData
  error?: string
  timestamp: number
}

// GET /api/mqtt/stream
// 升级HTTP连接为WebSocket
export async function GET(req: Request): Promise<Response>
```

#### 实现要点

1. **连接升级**：使用Next.js的WebSocket支持或自定义服务器
2. **认证**：从请求头或查询参数获取JWT token，验证用户身份
3. **初始数据**：连接建立后立即发送最新的设备数据
4. **实时推送**：订阅MQTTService的数据更新，转发给WebSocket客户端
5. **连接管理**：维护活跃连接列表，客户端断开时清理资源
6. **心跳机制**：定期发送ping消息，检测连接状态

**注意**：Next.js App Router默认不支持WebSocket，需要以下方案之一：
- 方案A：使用自定义服务器（server.js + ws库）
- 方案B：使用第三方服务（如Pusher、Ably）
- 方案C：使用Server-Sent Events (SSE) 作为替代（单向推送）

**推荐方案C（SSE）**：简单、兼容性好，满足实时数据推送需求。

### 3. Control API (app/api/mqtt/control/route.ts)

接收前端的控制命令，通过MQTT发送给设备。

#### 接口定义

```typescript
// POST /api/mqtt/control
interface ControlRequest {
  type: 'relay' | 'led'
  relayNum?: number       // 继电器编号 (5-8)
  newState?: number       // 继电器新状态 (0/1)
  led1?: number           // LED1亮度 (0-255)
  led2?: number           // LED2亮度 (0-255)
  led3?: number           // LED3亮度 (0-255)
  led4?: number           // LED4亮度 (0-255)
}

interface ControlResponse {
  success: boolean
  message: string
  timestamp: number
}

export async function POST(req: Request): Promise<Response>
```

#### 实现要点

1. **请求验证**：检查必填字段、数据范围（如LED亮度0-255）
2. **认证授权**：验证JWT token，确保用户有控制权限
3. **命令构建**：根据设备协议构建JSON数据包
4. **MQTT发布**：调用MQTTService.sendControlCommand()
5. **响应返回**：返回成功/失败状态和消息
6. **错误处理**：捕获MQTT发送失败、超时等错误

### 4. Configuration (lib/mqtt-config.ts)

MQTT配置管理，从环境变量读取。

#### 接口定义

```typescript
interface MQTTConfig {
  host: string
  port: number
  username: string
  password: string
  subscribeTopic: string
  publishTopic: string
  useSSL: boolean
  keepalive: number
  reconnectPeriod: number
}

export function getMQTTConfig(): MQTTConfig
export function validateMQTTConfig(config: MQTTConfig): boolean
```

#### 环境变量

```bash
MQTT_HOST=be18721454da4600b14a92424bb1181c.s1.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USERNAME=meimeifarm
MQTT_PASSWORD=Meimei83036666
MQTT_SUBSCRIBE_TOPIC=meimefarm/basic_env_data
MQTT_PUBLISH_TOPIC=data/set
MQTT_USE_SSL=true
MQTT_KEEPALIVE=60
MQTT_RECONNECT_PERIOD=5000
```

### 5. Frontend Integration

前端需要修改以适配新的后端API。

#### 数据获取（SSE方式）

```typescript
// 替代原有的Paho MQTT WebSocket连接
const eventSource = new EventSource('/api/mqtt/stream')

eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data)
  if (message.type === 'data') {
    updateDisplay(message.data)
  }
}

eventSource.onerror = (error) => {
  console.error('SSE connection error:', error)
  // 重连逻辑
}
```

#### 控制命令发送

```typescript
// 替代原有的MQTT publish
async function toggleRelay(relayNum: number) {
  const currentState = deviceData[`relay${relayNum}`] || 0
  const newState = currentState === 1 ? 0 : 1
  
  const response = await fetch('/api/mqtt/control', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      type: 'relay',
      relayNum,
      newState
    })
  })
  
  const result = await response.json()
  if (result.success) {
    showToast('命令已发送', 'success')
  } else {
    showToast('发送失败: ' + result.message, 'error')
  }
}
```

## Data Models

### Device Protocol

设备使用的MQTT消息格式（基于老版本app.js）：

#### 上行数据（设备 -> 服务器）

```json
{
  "temperature": 234,
  "humidity": 505,
  "light": 1227,
  "co2": 1456,
  "earth_temp": 229,
  "earth_water": 45,
  "earth_ec": 850,
  "earth_n": 120,
  "earth_p": 80,
  "earth_k": 150,
  "relay5": 0,
  "relay6": 1,
  "relay7": 0,
  "relay8": 1,
  "led1": 102,
  "led2": 51,
  "led3": 102,
  "led4": 0
}
```

#### 下行控制（服务器 -> 设备）

继电器控制：

```json
{
  "rw_prot": {
    "Ver": "1.0.1",
    "dir": "down",
    "id": "12345",
    "w_data": [
      { "name": "node0601", "value": "1" },
      { "name": "node0602", "value": "0" },
      { "name": "node0603", "value": "0" },
      { "name": "node0604", "value": "1" }
    ]
  }
}
```

LED控制：

```json
{
  "rw_prot": {
    "Ver": "1.0.1",
    "dir": "down",
    "id": "12346",
    "w_data": [
      { "name": "node0501", "value": "102" },
      { "name": "node0502", "value": "51" },
      { "name": "node0503", "value": "102" },
      { "name": "node0504", "value": "0" }
    ]
  }
}
```

### 数据转换规则

1. **温度/湿度**：原始值除以10得到实际值（234 -> 23.4°C）
2. **继电器状态**：0=关闭，1=开启
3. **LED亮度**：0-255范围
4. **节点映射**：
   - node0501-node0504: LED1-LED4
   - node0601-node0604: Relay5-Relay8

## Error Handling

### MQTT连接错误

1. **连接失败**：记录错误日志，30秒后重试，最多重试10次
2. **认证失败**：记录错误，不重试，通知管理员
3. **网络断开**：自动重连（mqtt库内置）
4. **订阅失败**：记录错误，重新订阅

### API错误

1. **请求验证失败**：返回400 Bad Request，包含错误详情
2. **认证失败**：返回401 Unauthorized
3. **MQTT未连接**：返回503 Service Unavailable
4. **命令发送失败**：返回500 Internal Server Error

### 数据解析错误

1. **JSON解析失败**：记录原始数据，跳过该消息
2. **字段缺失**：使用默认值或null
3. **数据超出范围**：记录警告，使用边界值

## Testing Strategy

### 单元测试

1. **MQTTService**
   - 测试连接/断开
   - 测试消息解析
   - 测试控制命令构建
   - 测试观察者模式

2. **API Routes**
   - 测试请求验证
   - 测试认证授权
   - 测试错误处理

3. **Configuration**
   - 测试环境变量读取
   - 测试配置验证

### 集成测试

1. **MQTT通信**
   - 使用HiveMQ Cloud测试环境
   - 测试订阅/发布
   - 测试重连机制

2. **端到端测试**
   - 模拟设备发送数据
   - 验证前端接收数据
   - 测试控制命令流程

### 手动测试

1. **Python监听器**：验证MQTT消息格式
2. **浏览器开发工具**：检查SSE连接和数据流
3. **设备实测**：连接真实IoT设备验证功能

## Migration Plan

### 阶段1：后端开发

1. 安装依赖：`npm install mqtt`
2. 创建lib/mqtt-config.ts
3. 创建lib/mqtt-service.ts
4. 创建app/api/mqtt/stream/route.ts (SSE)
5. 创建app/api/mqtt/control/route.ts
6. 配置环境变量

### 阶段2：前端适配

1. 移除Paho MQTT库引用
2. 实现SSE数据接收
3. 修改控制命令发送逻辑
4. 更新UI状态管理

### 阶段3：测试验证

1. 单元测试
2. 集成测试
3. 设备联调

### 阶段4：部署上线

1. 生产环境配置
2. 监控和日志
3. 文档更新

## Security Considerations

1. **凭证保护**：MQTT密码存储在服务器端环境变量，不暴露给前端
2. **API认证**：所有API端点需要JWT认证
3. **输入验证**：严格验证控制命令参数，防止注入攻击
4. **TLS加密**：MQTT连接使用TLS/SSL（端口8883）
5. **速率限制**：考虑对控制API添加速率限制，防止滥用

## Performance Considerations

1. **连接复用**：单例MQTT客户端，避免重复连接
2. **数据缓存**：缓存最新设备数据，减少重复查询
3. **消息队列**：如果设备数据频率过高，考虑使用队列缓冲
4. **WebSocket连接数**：监控并发连接数，必要时限制
5. **日志优化**：生产环境减少日志输出，避免性能影响

## Monitoring and Logging

### 日志内容

1. **MQTT事件**：连接、断开、订阅、发布
2. **数据接收**：设备数据摘要（不记录完整数据）
3. **控制命令**：命令类型、参数、发送结果
4. **错误异常**：所有错误和异常堆栈

### 日志格式

```typescript
interface LogEntry {
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR'
  component: string
  message: string
  data?: any
}
```

### 监控指标

1. **MQTT连接状态**：在线/离线
2. **消息接收速率**：消息/秒
3. **API响应时间**：平均/P95/P99
4. **错误率**：错误数/总请求数
5. **WebSocket连接数**：当前活跃连接
