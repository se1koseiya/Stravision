# 莓 Realm (Berry Realm) MQTT 开发手册

> 版本：v4.0  
> 更新日期：2026-08-09  
> 适用模块：IoT 设备通信、实时数据推送、设备控制

---

## 目录

1. [架构概述](#1-架构概述)
2. [环境配置](#2-环境配置)
3. [MQTT 主题映射表](#3-mqtt-主题映射表)
4. [数据格式规范](#4-数据格式规范)
5. [API 接口文档](#5-api-接口文档)
6. [核心服务 API](#6-核心服务-api)
7. [自定义设备接入指南](#7-自定义设备接入指南)
8. [步进电机（丝杆滑台）控制协议](#8-步进电机丝杆滑台控制协议)
9. [SSE 实时数据流](#9-sse-实时数据流)
10. [自动化规则引擎](#10-自动化规则引擎)
11. [告警与通知](#11-告警与通知)
12. [调试与测试](#12-调试与测试)
13. [常见问题](#13-常见问题)

---

## 1. 架构概述

### 1.1 系统架构图

```
┌─────────────────┐     ┌──────────────────────────────────┐     ┌─────────────────┐
│   IoT 设备/传感器  │────▶│         MQTT Broker             │────▶│  MQTT Service   │
│  (ESP32/STM32)   │     │  (阿里云/EMQX/Mosquitto)         │     │  (Singleton)    │
└─────────────────┘     └──────────────────────────────────┘     └────────┬────────┘
                                                                          │
                              ┌───────────────────────────────────────────┼───────────────────────────┐
                              │                                           │                           │
                              ▼                                           ▼                           ▼
                    ┌──────────────────┐                        ┌──────────────────┐      ┌──────────────────┐
                    │  数据持久化       │                        │  SSE 实时推送     │      │  自动化规则引擎    │
                    │  (sensor_readings│                        │  (/api/mqtt/stream)│     │  (AutomationEngine)
                    │   device_sensor_ │                        └────────┬─────────┘      └────────┬─────────┘
                    │   data)          │                                 │                           │
                    └──────────────────┘                                 ▼                           ▼
                                                              ┌──────────────────┐      ┌──────────────────┐
                                                              │   前端 Dashboard  │      │   设备控制        │
                                                              │   Monitor 页面    │      │   (继电器/LED/云台) │
                                                              └──────────────────┘      └──────────────────┘
```

### 1.2 核心文件位置

| 文件 | 用途 |
|------|------|
| [lib/mqtt-config.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/mqtt-config.ts) | MQTT 配置管理（环境变量、校验） |
| [lib/mqtt-service.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/mqtt-service.ts) | MQTT 核心服务（单例模式） |
| [lib/db/device-registry-service.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/db/device-registry-service.ts) | 设备注册表（动态设备管理） |
| [app/api/mqtt/stream/route.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/app/api/mqtt/stream/route.ts) | SSE 实时数据流 API |
| [app/api/mqtt/control/route.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/app/api/mqtt/control/route.ts) | 设备控制 API |
| [app/api/mqtt/simulate/route.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/app/api/mqtt/simulate/route.ts) | 数据模拟 API（测试用） |
| [lib/automation/engine.ts](file:///c:/Users/24121/Documents/stravision/meijie/berry-realm-v4.0/lib/automation/engine.ts) | 自动化规则引擎 |

---

## 2. 环境配置

### 2.1 必需环境变量

在 `.env.local` 或生产环境中配置以下变量：

```env
# MQTT Broker 连接配置
MQTT_HOST=your-mqtt-broker.example.com
MQTT_PORT=8883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
MQTT_USE_SSL=true

# MQTT Topic 配置
MQTT_SUBSCRIBE_TOPIC=meimefarm/basic_env_data
MQTT_PUBLISH_TOPIC=data/set

# MQTT 高级参数（可选，有默认值）
MQTT_KEEPALIVE=60
MQTT_RECONNECT_PERIOD=5000

# SSE 流认证（可选）
MQTT_SSE_REQUIRE_AUTH=false

# 告警时区
ALERT_TIMEZONE=Asia/Shanghai
```

### 2.2 默认配置值

| 参数 | 默认值 | 说明 |
|------|--------|------|
| port | 8883 | MQTT broker 端口 |
| useSSL | true | 是否使用 TLS/SSL |
| keepalive | 60 | 心跳间隔（秒） |
| reconnectPeriod | 5000 | 重连间隔（毫秒） |
| subscribeTopic | meimefarm/basic_env_data | 默认订阅主题 |
| publishTopic | data/set | 默认发布主题 |

---

## 3. MQTT 主题映射表

### 3.1 订阅主题（Subscribe Topics）

服务启动后会自动订阅以下主题：

| 主题 (Topic) | QoS | 数据类型 | 说明 | 对应设备 |
|--------------|-----|----------|------|----------|
| `meimefarm/basic_env_data` | 1 | 环境传感器数据 | 主环境数据（温湿度、光照、CO2、土壤数据、继电器/LED状态） | 温室环境主控板 |
| `meimefarm/Spectrum` | 1 | 光谱传感器数据 | 11通道光谱聚合数据 | 光谱传感器 |
| `meimefarm/sensor/node0701` | 1 | 光谱通道1 | 415nm 紫色光通道（独立节点） | 光谱节点 01 |
| `meimefarm/sensor/node0702` | 1 | 光谱通道2 | 445nm 蓝色光通道（独立节点） | 光谱节点 02 |
| `meimefarm/sensor/node0703` | 1 | 光谱通道3 | 480nm 青色光通道（独立节点） | 光谱节点 03 |
| `meimefarm/sensor/node0704` | 1 | 光谱通道4 | 515nm 绿色光通道（独立节点） | 光谱节点 04 |
| `meimefarm/sensor/node0705` | 1 | 光谱通道5 | 555nm 黄绿色光通道（独立节点） | 光谱节点 05 |
| `meimefarm/sensor/node0706` | 1 | 光谱通道6 | 590nm 黄色光通道（独立节点） | 光谱节点 06 |
| `meimefarm/sensor/node0707` | 1 | 光谱通道7 | 630nm 橙色光通道（独立节点） | 光谱节点 07 |
| `meimefarm/sensor/node0708` | 1 | 光谱通道8 | 680nm 红色光通道（独立节点） | 光谱节点 08 |
| `meimefarm/sensor/node0709` | 1 | 光谱通道9 | NIR 近红外通道（独立节点） | 光谱节点 09 |
| `meimefarm/sensor/node0710` | 1 | 光谱通道10 | Clear 清除通道（独立节点） | 光谱节点 10 |
| `meimefarm/sensor/node0711` | 1 | 光谱通道11 | Flicker 闪烁通道（独立节点） | 光谱节点 11 |
| *(动态)* | 1 | 自定义传感器数据 | 设备注册表中 type='sensor' 的设备的 subscribe_topic | 自定义传感器 |

### 3.2 发布主题（Publish Topics）

| 主题 (Topic) | QoS | 命令类型 | 说明 |
|--------------|-----|----------|------|
| `data/set` | 1 | 继电器控制 | 水泵、风扇、补光灯开关 |
| `data/set` | 1 | LED 调光 | RGB 补光灯亮度调节 |
| `data/set` | 1 | 步进电机控制 | 摄像头云台/丝杆滑台移动 |
| *(动态)* | 1 | 自定义设备控制 | 设备注册表中配置的 publish_topic |

### 3.3 Node ID 映射表（控制协议）

#### 继电器控制（Relay）

| 继电器编号 (relayNum) | Node ID | 设备名称 | 默认设备 | 说明 |
|----------------------|---------|----------|----------|------|
| 5 | `node0601` | 水泵系统 | 是 | 灌溉系统控制 |
| 6 | `node0602` | 通风风扇 | 是 | 通风换气 |
| 7 | `node0603` | 全光谱补光灯 | 是 | 主补光灯开关 |
| 8 | `node0604` | 辅助补光灯 | 是 | 辅助白光补光灯 |
| *(自定义)* | *(设备注册表 node_id)* | *(自定义名称)* | 否 | 通过设备注册表配置 |

#### LED 调光（RGB Light）

| 参数名 | Node ID | 颜色 | 取值范围 | 说明 |
|--------|---------|------|----------|------|
| led1 | `node0501` | Blue（蓝色） | 0-255 | 蓝光通道亮度 |
| led2 | `node0502` | Red（红色） | 0-255 | 红光通道亮度 |
| led3 | `node0503` | Green（绿色） | 0-255 | 绿光通道亮度 |
| led4 | - | White（白色/保留） | 0-255 | 预留通道（未映射到 node） |

> ⚠️ **重要提示**：硬件实际协议为 BRG 顺序（Blue-Red-Green），不是常见的 RGB 顺序。前端参数已调整为硬件顺序。

#### 步进电机/丝杆滑台（Stepper）

| Node ID | 功能 | 取值范围 | 说明 |
|---------|------|----------|------|
| `node0801` | 设备类型标识 | 固定为 `8` | 标识这是步进电机设备 |
| `node0803` | 运行速度 | 1-65535 | 值越小速度越快，默认 10000 |
| `node0805` | 加速系数 | 100-10000 | 启动加速度 |
| `node0806` | 减速系数 | 100-10000 | 停止减速度 |
| `node0807` | 工作模式 | 6 | 通讯控制模式（固定值） |
| `node0808` | 切换等待时间 | - | 方向切换等待时间 |
| `node0809` | 运行时间 | 1-65535 | 100 = 1秒 |
| `node0810` | 循环次数 | 0-65535 | 0 = 无限循环 |
| `node0814` | 运动方向 | 0/1/2 | 0=设置参数/停止，1=正转/左移，2=反转/右移 |
| `node0815` | 远程控制运行方向 | 0/1/2 | 状态回传字段 |
| `node0817` | 运行脉冲数 | 0-112000 | 决定移动距离（160脉冲=10mm） |

---

## 4. 数据格式规范

### 4.1 环境传感器数据格式（meimefarm/basic_env_data）

**消息方向**：设备 → 服务器  
**格式**：JSON  
**示例**：

```json
{
  "temperature": 250,
  "humidity": 550,
  "light": 12000,
  "co2": 450,
  "earth_temp": 200,
  "earth_water": 45,
  "earth_ec": 1200,
  "earth_n": 25,
  "earth_p": 15,
  "earth_k": 30,
  "relay5": 0,
  "relay6": 1,
  "relay7": 0,
  "relay8": 0,
  "led1": 128,
  "led2": 200,
  "led3": 50,
  "led4": 0
}
```

**字段说明**：

| 字段 | 类型 | 单位 | 缩放因子 | 说明 | 正常范围 |
|------|------|------|----------|------|----------|
| temperature | number | °C | ×0.1 | 空气温度（原始值×10存储） | 0-400 (0-40°C) |
| humidity | number | % | ×0.1 | 空气湿度（原始值×10存储） | 0-1000 (0-100%) |
| light | number | lux | ×1 | 光照强度 | 0-100000 |
| co2 | number | ppm | ×1 | CO2 浓度 | 0-5000 |
| earth_temp | number | °C | ×0.1 | 土壤温度（原始值×10存储） | 0-400 (0-40°C) |
| earth_water | number | % | ×0.1 | 土壤湿度（原始值×10存储） | 0-1000 (0-100%) |
| earth_ec | number | μS/cm | ×1 | 土壤 EC 值（电导率） | 0-5000 |
| earth_n | number | mg/kg | ×1 | 土壤氮含量 | 0-500 |
| earth_p | number | mg/kg | ×1 | 土壤磷含量 | 0-500 |
| earth_k | number | mg/kg | ×1 | 土壤钾含量 | 0-500 |
| relay5 | number | - | ×1 | 水泵继电器状态：0=关，1=开 | 0/1 |
| relay6 | number | - | ×1 | 风扇继电器状态：0=关，1=开 | 0/1 |
| relay7 | number | - | ×1 | 补光灯继电器状态：0=关，1=开 | 0/1 |
| relay8 | number | - | ×1 | 白光灯继电器状态：0=关，1=开 | 0/1 |
| led1 | number | - | ×1 | 蓝光 LED 亮度（BRG顺序） | 0-255 |
| led2 | number | - | ×1 | 红光 LED 亮度（BRG顺序） | 0-255 |
| led3 | number | - | ×1 | 绿光 LED 亮度（BRG顺序） | 0-255 |
| led4 | number | - | ×1 | 预留/白光 LED 亮度 | 0-255 |

### 4.2 光谱传感器数据格式（meimefarm/Spectrum 及 node07xx）

**消息方向**：设备 → 服务器  
**格式**：JSON  

支持两种格式：
1. **批量格式**（`meimefarm/Spectrum`）：包含所有 11 个通道
2. **单通道格式**（`meimefarm/sensor/node07xx`）：单个通道数据，优先级高于批量格式

**批量格式示例**：
```json
{
  "channel1": { "value": 1234 },
  "channel2": { "value": 2345 },
  "channel3": { "value": 3456 },
  "channel4": { "value": 4567 },
  "channel5": { "value": 5678 },
  "channel6": { "value": 6789 },
  "channel7": { "value": 7890 },
  "channel8": { "value": 8901 },
  "channel9": { "value": 9012 },
  "channel10": { "value": 10234 },
  "channel11": { "value": 123 }
}
```

**单通道格式示例**（node0701-channel1）：
```json
{ "value": 1234 }
// 或
{ "val": 1234 }
// 或
1234
```

**通道说明**：

| 通道 | 波长 | 颜色 | 说明 |
|------|------|------|------|
| channel1 | 415 nm | Violet（紫色） | 紫光通道 |
| channel2 | 445 nm | Blue（蓝色） | 蓝光通道 |
| channel3 | 480 nm | Cyan（青色） | 青光通道 |
| channel4 | 515 nm | Green（绿色） | 绿光通道 |
| channel5 | 555 nm | Yellow-Green（黄绿） | 黄绿光通道 |
| channel6 | 590 nm | Yellow（黄色） | 黄光通道 |
| channel7 | 630 nm | Orange（橙色） | 橙光通道 |
| channel8 | 680 nm | Red（红色） | 红光通道 |
| channel9 | - | NIR（近红外） | 近红外通道 |
| channel10 | - | Clear（清除） | 全光谱清除通道 |
| channel11 | - | Flicker（闪烁） | 光源闪烁检测 |

> 🔒 **数据防污染机制**：单通道数据更新后 10 分钟内，批量数据不会覆盖该通道，防止数据"跳变"。

### 4.3 控制命令格式（下行：服务器 → 设备）

所有控制命令统一使用 `rw_prot` 协议格式发布到 `data/set` 主题。

#### 4.3.1 继电器控制

```json
{
  "rw_prot": {
    "Ver": "1.0.1",
    "dir": "down",
    "id": "随机生成的请求ID",
    "w_data": [
      { "name": "node0601", "value": "1" }
    ]
  }
}
```

#### 4.3.2 LED 调光

```json
{
  "rw_prot": {
    "Ver": "1.0.1",
    "dir": "down",
    "id": "随机生成的请求ID",
    "w_data": [
      { "name": "node0501", "value": "128" },
      { "name": "node0502", "value": "200" },
      { "name": "node0503", "value": "50" }
    ]
  }
}
```

#### 4.3.3 步进电机控制（两步协议）

**Step 1：预设参数**（node0814=0 设置参数模式）
```json
{
  "rw_prot": {
    "Ver": "1.0.1",
    "dir": "down",
    "id": "preset_xxx",
    "w_data": [
      { "name": "node0801", "value": "8" },
      { "name": "node0814", "value": "0" },
      { "name": "node0817", "value": "1600" },
      { "name": "node0803", "value": "10000" }
    ]
  }
}
```

等待 200ms 后发送 **Step 2：运动指令**（node0814=方向）
```json
{
  "rw_prot": {
    "Ver": "1.0.1",
    "dir": "down",
    "id": "move_xxx",
    "w_data": [
      { "name": "node0801", "value": "8" },
      { "name": "node0814", "value": "2" },
      { "name": "node0817", "value": "1600" },
      { "name": "node0803", "value": "10000" }
    ]
  }
}
```

---

## 5. API 接口文档

### 5.1 SSE 实时数据流

**端点**：`GET /api/mqtt/stream`  
**响应类型**：`text/event-stream`  
**认证**：可选（通过 `MQTT_SSE_REQUIRE_AUTH` 环境变量控制）

**连接示例**（JavaScript）：
```javascript
const eventSource = new EventSource('/api/mqtt/stream');

eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

**消息类型**：

| type | 说明 | 附加字段 |
|------|------|----------|
| `connected` | 连接成功 | `timestamp` |
| `ping` | 心跳包（每15秒） | `timestamp` |
| `data` | 主设备数据更新 | `data: DeviceData`, `timestamp` |
| `custom_device_data` | 自定义设备数据更新 | `device_id: number`, `data: object`, `timestamp` |
| `error` | 错误消息 | `error: string`, `timestamp` |

**data 消息示例**：
```json
{
  "type": "data",
  "timestamp": 1723176000000,
  "data": {
    "temperature": 250,
    "humidity": 550,
    "light": 12000,
    "co2": 450,
    "earth_water": 45,
    "relay5": 0,
    "relay6": 1,
    "stepper_position": 56000,
    "timestamp": 1723176000000
  }
}
```

### 5.2 设备控制 API

**端点**：`POST /api/mqtt/control`  
**认证**：必需（JWT Token）  
**权限**：admin/super_admin 或用户 permissions 包含对应设备

**请求格式**：
```json
{
  "type": "relay",
  "relayNum": 5,
  "newState": 1
}
```

**响应格式**：
```json
{
  "success": true,
  "message": "Control command sent successfully",
  "timestamp": 1723176000000
}
```

#### 5.2.1 继电器控制

```json
{
  "type": "relay",
  "relayNum": 5,
  "newState": 1
}
```

或使用设备注册表 ID（自定义设备）：
```json
{
  "type": "relay",
  "device_id": 1,
  "newState": 1
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 固定为 `"relay"` |
| relayNum | number | 二选一 | 继电器编号 5-8 |
| device_id | number | 二选一 | 设备注册表中的设备 ID |
| newState | number | 是 | 0=关，1=开 |

#### 5.2.2 LED 调光

```json
{
  "type": "led",
  "led1": 128,
  "led2": 200,
  "led3": 50
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 固定为 `"led"` |
| led1 | number | 否 | 蓝光亮度 0-255（node0501） |
| led2 | number | 否 | 红光亮度 0-255（node0502） |
| led3 | number | 否 | 绿光亮度 0-255（node0503） |
| led4 | number | 否 | 预留通道 0-255 |

#### 5.2.3 步进电机控制

```json
{
  "type": "stepper",
  "stepper_direction": 2,
  "stepper_pulses": 1600,
  "stepper_run_time": 10000
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 固定为 `"stepper"` |
| stepper_direction | number | 是 | 0=停止，1=正转/左移，2=反转/右移 |
| stepper_pulses | number | 否 | 脉冲数（默认1600=10mm） |
| stepper_mode | number | 否 | 模式 1-26 |
| stepper_accel | number | 否 | 加速频率 100-10000 |
| stepper_decel | number | 否 | 减速频率 100-10000 |
| stepper_run_time | number | 否 | 运行速度（100=1秒，默认10000） |
| stepper_loop_count | number | 否 | 循环次数，0=无限 |

#### 5.2.4 步进电机复位

```json
{
  "type": "stepper_reset"
}
```

将云台/滑台复位到最左侧原点（0mm 位置）。

#### 5.2.5 步进电机预设位置

```json
{
  "type": "stepper_preset",
  "stepper_pulses": 40000,
  "stepper_run_time": 10000
}
```

直接发送预设参数（跳过两步协议的第一步），用于快速定位。

### 5.3 数据模拟 API（测试用）

**端点**：`POST /api/mqtt/simulate`  
**认证**：必需

用于在没有真实硬件时模拟传感器数据。

```json
{
  "temperature": 280,
  "humidity": 600,
  "light": 15000,
  "co2": 500,
  "relay5": 1
}
```

所有字段都是可选的，未提供的字段使用默认值。

---

## 6. 核心服务 API

### 6.1 获取 MQTTService 单例

```typescript
import { MQTTService } from '@/lib/mqtt-service';

const mqttService = MQTTService.getInstance();
```

### 6.2 连接管理

```typescript
// 连接到 MQTT broker
await mqttService.connect();

// 断开连接
mqttService.disconnect();

// 检查连接状态
const isConnected = mqttService.isConnected();
```

### 6.3 数据订阅

```typescript
// 订阅主设备数据更新
const unsubscribe = mqttService.subscribeToData((data) => {
  console.log('温度:', data.temperature / 10, '°C');
  console.log('湿度:', data.humidity / 10, '%');
});

// 取消订阅
unsubscribe();
```

### 6.4 获取最新数据

```typescript
// 获取主设备最新缓存数据
const latestData = mqttService.getLatestData();
if (latestData) {
  console.log('最新温度:', latestData.temperature / 10);
}

// 获取步进电机当前位置（脉冲数）
const stepperPos = mqttService.getCachedStepperPosition();

// 获取最后一次收到数据的时间戳
const lastReceivedAt = mqttService.getLastDataReceivedAt();
```

### 6.5 发送控制命令

```typescript
// 控制继电器（开泵）
await mqttService.sendControlCommand({
  type: 'relay',
  relayNum: 5,
  newState: 1
});

// LED 调光
await mqttService.sendControlCommand({
  type: 'led',
  led1: 255,
  led2: 128,
  led3: 0
});

// 步进电机移动（右移 10mm）
await mqttService.sendControlCommand({
  type: 'stepper',
  stepper_direction: 2,
  stepper_pulses: 1600
});

// 复位
await mqttService.sendControlCommand({
  type: 'stepper_reset'
});
```

### 6.6 自定义设备

```typescript
// 订阅自定义设备数据
const unsubscribe = mqttService.subscribeToDeviceData(deviceId, (data) => {
  console.log('自定义设备数据:', data);
});

// 获取自定义设备最新数据
const deviceData = mqttService.getCustomDeviceData(deviceId);

// 获取所有自定义设备数据
const allCustomData = mqttService.getAllCustomDeviceData();

// 订阅所有自定义设备更新（SSE 用）
const unsubAll = mqttService.subscribeToAllCustomDevices((deviceId, data) => {
  console.log(`设备 ${deviceId} 更新:`, data);
});

// 刷新动态订阅（添加新设备后调用）
await mqttService.refreshDynamicSubscriptions();
```

---

## 7. 自定义设备接入指南

### 7.1 设备类型说明

设备注册表支持四种设备类型：

| 类型 | 说明 | 必需字段 |
|------|------|----------|
| `relay` | 开关型设备（水泵、风扇等） | `node_id` 或 `config.relay_num` |
| `sensor` | 数据采集传感器 | `subscribe_topic`, `config.metrics` |
| `camera` | 视频流设备 | `config.stream_url`, `config.camera_id` |
| `stepper` | 位控设备（云台、滑台） | `config.pulses_per_mm`, `config.max_travel_mm` |

### 7.2 添加自定义传感器设备

#### 步骤 1：在设备注册表中创建设备

通过 API 或直接数据库操作：

```typescript
import { createDevice } from '@/lib/db/device-registry-service';

const device = await createDevice({
  name: '土壤温湿度传感器',
  type: 'sensor',
  category: '土壤监测',
  subscribe_topic: 'mygreenhouse/sensor/soil_01',
  icon: 'Thermometer',
  color: '#52c41a',
  config: {
    metrics: [
      { key: 'soil_temp', label: '土壤温度', unit: '°C', mqtt_field: 'temp', scale: 0.1 },
      { key: 'soil_moisture', label: '土壤湿度', unit: '%', mqtt_field: 'moisture' }
    ]
  },
  sort_order: 100
});
```

#### 步骤 2：刷新 MQTT 订阅

```typescript
await mqttService.refreshDynamicSubscriptions();
```

#### 步骤 3：设备按格式发布数据

设备向 `mygreenhouse/sensor/soil_01` 发布 JSON：
```json
{
  "temp": 225,
  "moisture": 58
}
```

### 7.3 添加自定义继电器设备

```typescript
const device = await createDevice({
  name: '电磁阀 A',
  type: 'relay',
  category: '灌溉',
  publish_topic: 'data/set',
  node_id: 'node0605',  // 硬件上的 node ID
  icon: 'Droplets',
  color: '#13c2c2',
  config: {
    relay_num: 9
  }
});
```

控制时使用 `device_id`：
```json
{
  "type": "relay",
  "device_id": device.id,
  "newState": 1
}
```

---

## 8. 步进电机（丝杆滑台）控制协议

### 8.1 物理参数

| 参数 | 值 | 说明 |
|------|-----|------|
| 总行程 | 700 mm | 0mm（左原点）到 700mm（右终点） |
| 脉冲/毫米 | 160 pulses/mm | 每毫米需要 160 个脉冲 |
| 每步默认 | 1600 pulses | 默认移动 10mm |
| 最大脉冲数 | 112000 | 700mm × 160 |
| 软限位安全间隙 | 400 pulses | 约 2.5mm（防止卡壳） |
| 自动复位延时 | 5 分钟 | 无操作后自动复位到左原点 |

### 8.2 脉冲数 ↔ 毫米转换

```typescript
// 脉冲 → 毫米
const mm = pulses / 160;

// 毫米 → 脉冲
const pulses = mm * 160;
```

### 8.3 两步协议详解

步进电机控制必须使用两步协议确保可靠执行：

1. **Step 1（预设参数）**：设置 `node0814=0`（参数设置模式），同时写入 `node0817`（脉冲数）和 `node0803`（速度）
2. **等待 200ms**：让控制器有时间处理预设参数
3. **Step 2（运动指令）**：设置 `node0814=1` 或 `2`（方向），触发运动

### 8.4 安全保护机制

1. **软限位保护**：
   - 最小位置：400 脉冲（约 2.5mm），防止撞到左原点
   - 最大位置：111600 脉冲（700mm - 2.5mm），防止撞到右终点
   - 超出限位的命令会被拒绝，并抛出错误

2. **位置同步**：
   - 内存缓存（`cachedStepperPosition`）作为位置真值源，与 UI 保持同步
   - 每次移动后先更新内存缓存，再异步写入数据库
   - 服务启动时从数据库加载初始位置

3. **自动复位**：
   - 5 分钟无操作自动复位到左原点（0mm）
   - 可通过 `STEPPER_AUTO_RESET_DELAY_MS` 调整

---

## 9. SSE 实时数据流

### 9.1 前端集成（React Hook 示例）

```typescript
// hooks/use-mqtt-data.ts
import { useState, useEffect } from 'react';

export function useMqttData() {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [customDevices, setCustomDevices] = useState({});

  useEffect(() => {
    const eventSource = new EventSource('/api/mqtt/stream');

    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);

    eventSource.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      switch (msg.type) {
        case 'connected':
          setConnected(true);
          break;
        case 'data':
          setData(msg.data);
          break;
        case 'custom_device_data':
          setCustomDevices(prev => ({
            ...prev,
            [msg.device_id]: msg.data
          }));
          break;
      }
    };

    return () => eventSource.close();
  }, []);

  return { data, connected, customDevices };
}
```

### 9.2 防抖机制

- SSE 推送有 500ms 防抖，避免 UI 快速闪烁
- 心跳包每 15 秒发送一次，保持连接活跃

---

## 10. 自动化规则引擎

### 10.1 触发条件

传感器数据更新时会自动评估所有启用的 `sensor` 类型规则。

```typescript
// MQTT 消息处理中自动执行
const activeRules = await getActiveRules();
const sensorRules = activeRules.filter(r => r.trigger_type === 'sensor');

const context: AutomationContext = {
  sensorData: {
    temperature: data.temperature / 10,
    humidity: data.humidity / 10,
    light: data.light,
    co2: data.co2,
    soil_moisture: data.earth_water / 10,
  },
  timestamp: Date.now()
};

sensorRules.forEach(rule => {
  const actions = AutomationEngine.evaluate(rule, context);
  actions.forEach(action => {
    mqttService.executeAction(action);
  });
});
```

### 10.2 动作类型

| action.type | 说明 | 参数示例 |
|-------------|------|----------|
| `device` | 设备控制 | `{ device: 'fan', action: true }` |
| `notification` | 发送通知 | `{ label: '温度过高报警' }` |

**设备映射**：
- `fan` → relay6（风扇）
- `pump` → relay5（水泵）
- `light` → relay7（补光灯）

---

## 11. 告警与通知

### 11.1 阈值告警（硬编码）

| 指标 | 告警条件 | 告警级别 | 建议措施 |
|------|----------|----------|----------|
| 温度 | > 40°C | 🔴 严重 | 检查通风，开启降温 |
| 温度 | < 0°C | 🔴 严重 | 检查加热设备，防** |
| 湿度 | < 20% | 🟡 警告 | 开启加湿/喷灌 |
| CO2 | > 3000 ppm | 🟡 警告 | 加强通风换气 |
| 光照（日间 8-17点） | < 1200 lux | 🟡 警告 | 检查补光灯 |
| 土壤湿度 | < 10% | 🔴 严重 | 立即启动灌溉 |
| 传感器故障 | 指标持续为 0 | 🟡 警告 | 检查传感器接线/电源 |

### 11.2 告警限流

- 全局告警冷却时间：**30 分钟**
- 同类型告警 30 分钟内不重复发送
- 所有当前告警合并为一条消息推送（企业微信）

### 11.3 AI 主动守护

- 触发条件：传感器数据更新后（限流 60 秒）
- 流程：数据异常检测 → AI 分析 → 生成建议 → 推送通知
- 去重：1 小时内相同标题不重复创建

---

## 12. 调试与测试

### 12.1 日志查看

MQTT 服务输出结构化 JSON 日志，可通过 `component: 'MQTTService'` 过滤：

```bash
# 查看所有 MQTT 日志
pm2 logs your-app --grep MQTTService

# 只看错误
pm2 logs your-app --grep '"level":"ERROR"'
```

日志格式示例：
```json
{
  "timestamp": "2026-08-09T12:00:00.000Z",
  "level": "INFO",
  "component": "MQTTService",
  "message": "Control command published successfully"
}
```

### 12.2 使用模拟 API 测试

```bash
# 模拟高温告警
curl -X POST http://localhost:3000/api/mqtt/simulate \
  -H "Content-Type: application/json" \
  -H "Cookie: your_auth_cookie" \
  -d '{"temperature": 450}'

# 模拟打开水泵
curl -X POST http://localhost:3000/api/mqtt/control \
  -H "Content-Type: application/json" \
  -H "Cookie: your_auth_cookie" \
  -d '{"type":"relay","relayNum":5,"newState":1}'
```

### 12.3 MQTT 客户端工具推荐

- **MQTTX**：跨平台 GUI 客户端，适合调试
- **mosquitto_sub/mosquitto_pub**：命令行工具
- **MQTT Explorer**：可视化工具，支持主题树查看

```bash
# 使用 mosquitto_sub 订阅所有主题
mosquitto_sub -h your-broker.com -p 8883 -u username -P password \
  --cafile ca.crt -t 'meimefarm/#' -v

# 使用 mosquitto_pub 发送测试数据
mosquitto_pub -h your-broker.com -p 8883 -u username -P password \
  --cafile ca.crt -t 'meimefarm/basic_env_data' \
  -m '{"temperature":250,"humidity":550,"light":12000,"co2":450,"earth_water":45}'
```

---

## 13. 常见问题

### Q1: MQTT 连接失败怎么办？

**排查步骤**：
1. 检查 `MQTT_HOST`、`MQTT_PORT`、`MQTT_USERNAME`、`MQTT_PASSWORD` 是否正确
2. 确认服务器网络能访问 MQTT broker（防火墙/安全组）
3. 如果使用自签名证书，可能需要配置 `MQTT_USE_SSL=false` 或添加 CA 证书
4. 查看服务启动日志中的错误信息

### Q2: SSE 连接上但收不到数据？

**排查步骤**：
1. 检查 MQTT 是否真的连接成功（`/api/mqtt/stream` 先返回 `connected` 消息）
2. 确认设备正在向订阅的主题发布数据
3. 检查主题名是否完全匹配（注意大小写、前缀）
4. 查看服务端日志是否有消息处理错误

### Q3: 步进电机不移动？

**排查步骤**：
1. 确认两步协议正确执行（先 preset 再 move，间隔 200ms）
2. 检查是否触发软限位保护（日志会有 WARN）
3. 确认 `node0814` 值正确：0=设置，1=左移，2=右移
4. 检查 `node0817` 脉冲数是否合理
5. 确认 `node0803` 速度值不是太大（值越小越快，默认 10000）

### Q4: 光谱数据跳变或显示 10270？

**原因**：这是已知问题，批量 `meimefarm/Spectrum` 主题可能包含旧数据。  
**解决方案**：系统已实现防污染机制，单通道（node07xx）数据优先级更高。确保硬件同时发布单通道主题即可。

### Q5: 自定义设备数据不显示？

**排查步骤**：
1. 确认设备已添加到 `devices` 表，`type='sensor'` 且 `is_enabled=true`
2. 确认 `subscribe_topic` 配置正确
3. MQTT 连接后调用过 `refreshDynamicSubscriptions()` 或重启服务
4. 检查发布的消息是有效的 JSON 格式

### Q6: 控制命令发送了但设备没反应？

**排查步骤**：
1. 确认发布主题正确（默认 `data/set`）
2. 检查 `node_id` 是否与硬件匹配
3. 确认 `rw_prot` 协议格式正确（`Ver`、`dir`、`id`、`w_data` 缺一不可）
4. 检查 MQTT broker 中是否真的收到了消息（用 MQTTX 订阅 `data/set` 查看）

---

## 附录：默认设备种子数据

系统首次启动时会自动创建以下 9 个默认设备：

| ID | 名称 | 类型 | Node ID/Topic | 图标 |
|----|------|------|---------------|------|
| 1 | 水泵系统 | relay | node0601 | Droplets |
| 2 | 通风风扇 | relay | node0602 | Fan |
| 3 | 全光谱补光灯 | relay | node0603 | Lightbulb |
| 4 | 辅助补光灯 | relay | node0604 | Sun |
| 5 | 温室环境传感器 | sensor | meimefarm/basic_env_data | Thermometer |
| 6 | 光谱传感器 | sensor | meimefarm/Spectrum | Activity |
| 7 | 温室监控摄像头 A | camera | - | Video |
| 8 | 温室监控摄像头 B | camera | - | Video |
| 9 | 摄像头云台 | stepper | - | Compass |

---

**文档维护说明**：本文档随代码同步更新。修改 MQTT 相关代码后请更新对应章节。
