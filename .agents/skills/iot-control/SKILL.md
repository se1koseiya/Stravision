---
name: iot-control
description: Technical instructions for controlling hardware via JSON and MCP.
keywords: 控制, 指令, 开关, 关, 开, 关闭, 全部, 所有, 设备, 继电器, 云台, 电机, 定时任务, JSON, 参数, 水泵, 风扇, 补光灯, 白灯, 摄像头, 5, 6, 7, 8
priority: 90
dependencies: hardware-control, motor-control
---
# 莓小智 物联网控制指令手册

为确保指令能被前端正确解析，必须严格使用代码块包裹且符合以下 JSON 格式。

## 🚨 极其重要：核心设备编号绝对对照表 (Device ID Mapping)
在执行 `toggle_relay` 动作时，你**必须**且**只能**使用以下指定的 `device` 序号。**严禁**使用 1, 2, 3, 4 或任何自创序号！

- **Device 5**: **水泵 (Water Pump)** - 负责灌溉、加湿。
- **Device 6**: **风扇 (Fan)** - 负责通风、降温。
- **Device 7**: **植物全光谱补光灯 (Grow Light)** - 负责作物光照。
- **Device 8**: **光照植物补光灯 (White Light)** - 负责环境辅助照明。

**如果你因为使用了错误的序号（如 1, 2, 3, 4）导致硬件故障，将造成严重后果！**

## 1. 继电器控制 (Relay Control)
用于开关指定设备。
```json
{
  "action": "toggle_relay",
  "device": 5, // 只能填 5, 6, 7 或 8
  "value": 1   // 1=开启, 0=关闭
}
```

## 2. 植物全光谱补光灯调色 (LED RGB Control)
用于调节 7 号继电器所在植物全光谱补光灯的色彩。如果 Relay 7 此时关闭，发送此指令将自动开启 Relay 7。
```json
{
  "action": "set_led",
  "r": 255, // 0-255
  "g": 100, // 0-255
  "b": 50   // 0-255
}
```

## 3. 云台/步进电机控制 (Motor Control)
用于控制摄像头左右移动。
```json
{
  "action": "control_camera",
  "direction": 1 // 0=停止, 1=左移, 2=右移
}
```
**复位到正中间**:
```json
{
  "action": "reset_camera"
}
```

### ⚠️ 硬件两步协议说明（系统内部自动处理）
丝杆滑台步进电机需要**两步协议**才能正确运动：
1. **Step 1 - 预设参数**: 先发送 `node0814=0`（设置参数模式）+ `node0817=脉冲数` + `node0803=速度`
2. **Step 2 - 发送运动**: 再发送 `node0814=1或2`（方向）触发实际运动

**`node0814=0` 是预设指令的必要条件**，只有先设置参数模式，脉冲数才能被控制器正确接收。
系统会在 `mqtt-service.ts` 中自动执行此两步流程，AI 和前端只需发送标准 `control_camera` 指令即可。

## 4. 视觉巡检 (Vision Inspection)
移动摄像头并拍摄快照进行 VLM 分析。
```json
{
  "action": "move_camera_and_look",
  "direction": 1, // 1=左, 2=右, 0=不移动
  "pulses": 1600, // 脉冲数 (160=1mm, 默认1600)
  "camera": "a", // "a" 或 "b"
  "query": "请观察具体情况"
}
```

## 5. 定时任务 (Scheduler)
创建未来执行的任务。
```json
{
  "action": "schedule_task",
  "title": "任务名称",
  "cron": "0 8 * * *", // 周期任务
  "delay_seconds": 300, // 5分钟后 (相对时间优先)
  "task_action": "toggle_relay",
  "device": 5, // 对应上述映射关系
  "value": 1
}
```

## 物理边界常数 (Physics Reference)
- **丝杆滑台总量程**: 700mm (对应 112000 脉冲)。
- **每毫米脉冲**: 160 脉冲/mm。
- **中间位置脉冲**: 56000。
- **安全余量**: 两端各需预留至少 400 脉冲 (2.5mm)。
