---
name: 定时任务管理
description: 创建和管理定时任务、延时任务
keywords: 定时, 每天, 几点, 安排任务, 延时, 执行, 计划任务, cron, 几分钟后, 定时器
priority: 82
---

# 定时任务管理

使用 `schedule_task` 创建未来执行的任务。

## 命令格式

```json
{
  "action": "schedule_task",
  "title": "任务名称",
  "cron": "0 8 * * *",
  "delay_seconds": 300,
  "task_action": "toggle_relay",
  "device": 5,
  "value": 1
}
```

## 参数说明

### 时间设置（二选一）

1. **cron**: 周期性任务（Cron 表达式）
   - 格式: `分 时 日 月 周`
   - 示例: `0 8 * * *` = 每天 8:00
   - 示例: `0 */2 * * *` = 每 2 小时
   - 示例: `30 18 * * 1-5` = 工作日 18:30

2. **delay_seconds**: 相对时间任务（秒）
   - 从当前时间延迟指定秒数后执行
   - 示例: `300` = 5 分钟后
   - 示例: `3600` = 1 小时后
   - **优先使用此方式处理"几分钟后"的需求**

### 任务动作

- **task_action**: 要执行的动作类型
  - `toggle_relay`: 控制继电器
  - `set_led`: 设置 RGB 灯光
  - `agent_analysis`: 定时执行 AI 智能分析任务
  - `user_reminder`: 设置简单的定时文字提醒
  - `control_camera`: 控制摄像头移动

- **device**: 设备编号（仅 toggle_relay 需要）
  - 5 = 水泵
  - 6 = 风扇
  - 7 = 补光灯
  - 8 = 白光灯

- **value**: 设备状态（仅 toggle_relay 需要）
  - 1 = 开启
  - 0 = 关闭

## 使用场景

### 1. 定时浇水

```json
{
  "action": "schedule_task",
  "title": "每天早上8点浇水",
  "cron": "0 8 * * *",
  "task_action": "toggle_relay",
  "device": 5,
  "value": 1
}
```

### 2. 延时关闭

```json
{
  "action": "schedule_task",
  "title": "5分钟后关闭风扇",
  "delay_seconds": 300,
  "task_action": "toggle_relay",
  "device": 6,
  "value": 0
}
```

### 3. 定时补光

```json
{
  "action": "schedule_task",
  "title": "每天18点开启补光灯",
  "cron": "0 18 * * *",
  "task_action": "toggle_relay",
  "device": 7,
  "value": 1
}
```

## Cron 表达式快速参考

```
分钟  小时  日期  月份  星期
0-59  0-23  1-31  1-12  0-6

特殊字符:
*     任意值
*/n   每 n 个单位
n-m   范围
n,m   列表
```

### 常用示例

- `0 8 * * *` - 每天 8:00
- `0 */2 * * *` - 每 2 小时
- `0 8-18 * * *` - 每天 8:00-18:00 每小时
- `0 8 * * 1-5` - 工作日 8:00
- `0 0 1 * *` - 每月 1 号 0:00

## 重要提示

1. **相对时间优先**: 对于"几分钟后"的需求，优先使用 `delay_seconds`
2. **任务命名**: 使用清晰的任务标题，便于管理
3. **避免冲突**: 注意不要创建相互冲突的定时任务
4. **验证时间**: 创建后向用户确认执行时间是否正确
