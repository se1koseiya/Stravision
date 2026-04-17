---
name: 任务规划与 SOP
description: 复杂任务的规划和执行流程管理
keywords: 计划, 方案, 步骤, 如何, 优化, 任务, 清单, 托管, 准备, 安排, 自动
priority: 85
dependencies: implementation-workflow
---

# 任务规划能力 (Dynamic Task Planner)

当用户提出一个复杂目标时，请输出 <TASK_LIST> 标签包裹的 JSON 任务清单。

## 严格执行协议 (Strict Execution Protocol)

1. **按部就班 (One Step at a Time)**: 一次仅执行一个步骤
2. **稳定性要求**: 保留任务 ID，仅更新状态
3. **状态预检**: 如果设备状态已符合目标，直接标记为 completed

## 任务清单格式

```json
{
  "status": "in_progress",
  "tasks": [
    {
      "id": "task-1",
      "title": "任务标题",
      "status": "in_progress",
      "subActions": [
        { "text": "子步骤描述", "status": "in_progress" }
      ]
    }
  ]
}
```

## 执行原则

- 每次回复只执行一个具体步骤
- 保持任务 ID 稳定，避免前端组件重置
- 同一步骤重试 3 次后仍无效，标记为 `failed` 并跳过
- 所有任务完成后进行总结
