---
name: 自动化策略生成
description: 创建可视化的自动化控制策略和规则
keywords: 自动化, 策略, 规则, 联动, 自动控制, 自动调节, 智能控制, 条件触发, 自动执行, 流程, 工作流
priority: 88
dependencies: iot-control
---

# 自动化策略生成能力

当用户需要创建自动化控制策略时，你可以生成可视化的自动化流程。

## 使用场景

- 用户说"帮我设置温度过高时自动开风扇"
- 用户说"创建一个自动浇水的规则"
- 用户说"设置智能联动控制"

## 输出格式

使用 <AUTOMATION_STRATEGY> 标签包裹策略内容：

<AUTOMATION_STRATEGY description="策略描述">
```json
{
  "nodes": [
    {
      "id": "trigger-1",
      "type": "triggerNode",
      "position": { "x": 0, "y": 100 },
      "data": {
        "label": "温度传感器",
        "type": "sensor",
        "config": {
          "sensor": "temp",
          "frequency": "5m"
        }
      }
    },
    {
      "id": "logic-1",
      "type": "logicNode",
      "position": { "x": 400, "y": 100 },
      "data": {
        "label": "温度判断",
        "type": "compare",
        "config": {
          "sensor": "temp",
          "operator": "gt",
          "value": "30"
        }
      }
    },
    {
      "id": "action-1",
      "type": "actionNode",
      "position": { "x": 800, "y": 100 },
      "data": {
        "label": "开启风扇",
        "type": "device",
        "config": {
          "device": "fan",
          "action": true
        }
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "trigger-1", "target": "logic-1", "animated": true },
    { "id": "e2", "source": "logic-1", "target": "action-1", "animated": true }
  ]
}
```
</AUTOMATION_STRATEGY>

## 节点类型说明

### 1. 触发器节点 (triggerNode)
- type: "sensor" (传感器), "vlm" (视觉识别), "schedule" (定时)
- config.sensor: "temp"(温度), "hum"(湿度), "co2"(CO2), "soil"(土壤湿度)

### 2. 逻辑节点 (logicNode)
- type: "compare" (比较), "range" (范围), "condition" (条件)
- config.operator: "gt"(>), "lt"(<), "gte"(≥), "lte"(≤), "eq"(=)

### 3. 动作节点 (actionNode)
- type: "device" (设备控制), "notification" (通知)
- config.device: "fan"(风扇), "pump"(水泵), "light"(补光灯)
- config.action: true(开启), false(关闭)

## 布局规则

- x轴间隔400像素
- 从左到右：触发器 -> 逻辑 -> 动作
- 所有节点必须包含 config 对象

## 重要提示

- 生成策略后，用户可以选择保存、编辑或测试运行
- 策略会以可视化卡片形式展示
- 用户可以在编辑器中进一步调整
