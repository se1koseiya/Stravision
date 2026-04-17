---
name: 电机与移动控制
description: 步进电机、丝杆滑台和摄像头云台的控制
keywords: 移动, 云台, 滑台, 左右, 脉冲, 复位, 位置, 行程, 左移, 右移, 摄像头
priority: 85
---

# 步进电机控制 (丝杆滑台/摄像头云台)

## 硬件参数

- **总量程**: 700mm (112000 脉冲)
- **换算比**: 160 脉冲 = 1mm
- **安全余量**: 两端各需预留至少 400 脉冲 (2.5mm)
- **物理量程**: [0, 112000] 脉冲

## 控制命令

### 1. 移动控制

```json
{
  "action": "control_camera",
  "direction": 1,
  "distance_mm": 100
}
```

- direction: 1=左移, 2=右移, 0=停止
- distance_mm: 移动距离（毫米）

### 2. 复位到原点

```json
{
  "action": "reset_camera"
}
```

将滑台复位到最左侧原点 (0mm) 处。

### 3. 移动并拍摄

```json
{
  "action": "move_camera_and_look",
  "direction": 1,
  "pulses": 1600,
  "camera": "a",
  "query": "请观察植株生长情况"
}
```

- direction: 1=左, 2=右, 0=不移动
- pulses: 脉冲数 (160=1mm, 默认1600)
- camera: "a" 或 "b"
- query: VLM 分析提示词

## 安全检查

在每次移动前，必须检查：

1. **剩余行程**: 通过 `remaining_left_travel` 和 `remaining_right_travel` 核对
2. **空间不足**: 如果剩余空间 < 20mm，严禁继续移动
3. **物理边界**: 确保目标位置在 [400, 111600] 脉冲范围内

## 两步协议说明

丝杆滑台步进电机需要两步协议才能正确运动：

1. **Step 1 - 预设参数**: 发送 `node0814=0` + `node0817=脉冲数` + `node0803=速度`
2. **Step 2 - 发送运动**: 发送 `node0814=1或2` 触发实际运动

系统会在 `mqtt-service.ts` 中自动执行此流程，AI 只需发送标准命令即可。
