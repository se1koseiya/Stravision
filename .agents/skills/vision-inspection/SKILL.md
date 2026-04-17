---
name: 视觉巡检分析
description: 通过摄像头进行视觉巡检和 VLM 分析
keywords: 看, 监控, 截图, 拍摄, 巡检, 画面, 观察, 分析植株, 视频, 推流, 摄像头
priority: 88
dependencies: motor-control
---

# 视觉巡检能力 (Camera Vision Inspection)

你可以通过 `move_camera_and_look` 指令移动云台并截取画面进行 VLM 分析。

## 使用场景

- 用户说"看一下植株情况"
- 用户说"拍摄一下温室A"
- 用户说"巡检一下大棚"
- 用户说"分析植株健康状况"

## 命令格式

```json
{
  "action": "move_camera_and_look",
  "direction": 1,
  "pulses": 1600,
  "camera": "a",
  "query": "请观察植株生长情况，重点关注叶片颜色和果实成熟度"
}
```

## 参数说明

- **direction**: 
  - 0 = 不移动，直接拍摄当前位置
  - 1 = 先左移再拍摄
  - 2 = 先右移再拍摄

- **pulses**: 移动的脉冲数
  - 160 脉冲 = 1mm
  - 默认 1600 脉冲 = 10mm
  - 建议范围: 800-8000 脉冲

- **camera**: 
  - "a" = 温室摄像头 A
  - "b" = 温室摄像头 B

- **query**: VLM 分析提示词
  - 描述你希望 AI 视觉模型关注的内容
  - 例如: "检查是否有病虫害"、"评估果实成熟度"

## 分析流程

1. **移动云台**: 根据 direction 和 pulses 移动到目标位置
2. **截取画面**: 从指定摄像头获取实时画面
3. **VLM 分析**: 使用视觉模型分析画面内容
4. **返回结果**: 提供详细的观察报告

## 重要准则

### ⚠️ 严禁造假

- 如果无法获取截图，必须如实说明
- **绝对不能编造看到的画面内容**
- 不能假装进行了视觉分析
- 所有描述必须基于真实的 VLM 返回结果

### 安全检查

- 移动前检查剩余行程
- 确保不会超出物理边界
- 如果空间不足，调整移动距离或取消移动

## 典型应用

### 1. 病虫害检测

```json
{
  "action": "move_camera_and_look",
  "direction": 0,
  "camera": "a",
  "query": "仔细检查叶片是否有白粉病、灰霉病或红蜘蛛等病虫害迹象"
}
```

### 2. 生长状态评估

```json
{
  "action": "move_camera_and_look",
  "direction": 1,
  "pulses": 3200,
  "camera": "a",
  "query": "评估植株整体生长状态，包括叶片颜色、茎秆粗壮度、开花结果情况"
}
```

### 3. 果实成熟度判断

```json
{
  "action": "move_camera_and_look",
  "direction": 2,
  "pulses": 1600,
  "camera": "b",
  "query": "观察草莓果实的成熟度，判断是否可以采摘"
}
```
