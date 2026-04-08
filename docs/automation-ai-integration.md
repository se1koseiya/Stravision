# AI助手与自动化策略集成文档

## 功能概述

AI助手（莓小智）现在可以根据用户的自然语言描述，自动生成可视化的自动化控制策略，并提供保存、编辑、测试运行等功能。

## 使用方式

### 1. 在AI助手中请求生成自动化策略

用户可以使用以下方式触发自动化策略生成：

**示例对话：**
- "帮我设置温度过高时自动开风扇"
- "创建一个自动浇水的规则"
- "设置智能联动控制：当湿度低于40%时开启水泵"
- "温度超过30度自动开风扇，低于15度关闭风扇"

### 2. AI生成策略卡片

AI会分析用户需求，生成包含以下内容的策略卡片：
- 节点总数、触发器数量、动作数量
- 策略流程预览（显示前5个节点）
- 操作按钮：保存策略、编辑、测试运行

### 3. 用户操作选项

#### 保存策略
- 点击"保存策略"按钮
- 策略会被保存到数据库并自动激活
- 系统将按照策略规则自动执行

#### 编辑策略
- 点击"编辑"按钮
- 跳转到可视化编辑器
- 可以拖拽节点、调整参数、添加新节点

#### 测试运行
- 点击"测试运行"按钮
- 立即执行策略（强制模式）
- 查看执行结果和反馈

## 技术实现

### 1. AI输出格式

AI使用特殊标签输出自动化策略：

```
<AUTOMATION_STRATEGY description="温度过高自动开风扇">
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
```

### 2. 节点类型

#### 触发器节点 (triggerNode)
- **sensor**: 传感器触发
  - config.sensor: "temp", "hum", "co2", "soil"
  - config.frequency: "1m", "5m", "30m"
- **vlm**: 视觉识别触发
- **schedule**: 定时触发

#### 逻辑节点 (logicNode)
- **compare**: 数值比较
  - config.operator: "gt", "lt", "gte", "lte", "eq"
  - config.value: 阈值
- **range**: 范围判断
  - config.min: 最小值
  - config.max: 最大值
- **condition**: 条件组合 (AND/OR)

#### 动作节点 (actionNode)
- **device**: 设备控制
  - config.device: "fan", "pump", "light"
  - config.action: true/false
- **notification**: 发送通知

### 3. 组件架构

```
components/automation-strategy-card.tsx
├── 策略概览展示
├── 节点统计
├── 流程预览
└── 操作按钮
    ├── 保存策略 → /api/automation/rules (POST)
    ├── 编辑 → /automation/editor?from=ai-assistant
    └── 测试运行 → /api/automation/execute (POST)
```

### 4. 数据流

```
用户输入
  ↓
AI识别关键词（自动化、策略、规则等）
  ↓
加载 automation-strategy skill
  ↓
生成 <AUTOMATION_STRATEGY> 标签
  ↓
前端解析并渲染 AutomationStrategyCard
  ↓
用户操作
  ├── 保存 → 数据库 → 自动执行
  ├── 编辑 → 可视化编辑器
  └── 测试 → 立即执行
```

## 关键词触发

以下关键词会自动加载自动化策略生成技能：
- 自动化
- 策略
- 规则
- 联动
- 自动控制
- 自动调节
- 智能控制
- 条件触发
- 自动执行
- 流程
- 工作流

## 示例场景

### 场景1：温度控制
**用户**: "温度超过30度自动开风扇"

**AI生成**:
- 触发器：温度传感器（每5分钟检查）
- 逻辑：温度 > 30
- 动作：开启风扇

### 场景2：湿度管理
**用户**: "湿度低于40%时自动浇水"

**AI生成**:
- 触发器：湿度传感器
- 逻辑：湿度 < 40
- 动作：开启水泵

### 场景3：复杂联动
**用户**: "温度25-30度且湿度60-80%时开启补光灯"

**AI生成**:
- 触发器：传感器组合
- 逻辑1：温度范围 25-30
- 逻辑2：湿度范围 60-80
- 动作：开启补光灯

## 注意事项

1. **配置完整性**: 所有节点必须包含 config 对象
2. **传感器映射**: 前端使用简写（temp, hum），后端自动映射到完整名称
3. **布局规则**: x轴间隔400px，保持流程清晰
4. **临时存储**: 编辑前未保存的策略存储在 sessionStorage
5. **错误处理**: 生成失败时提供友好的错误提示

## API端点

- `POST /api/automation/rules` - 保存策略
- `POST /api/automation/execute` - 执行策略
- `GET /api/automation/rules/:id` - 获取策略详情
- `PUT /api/automation/rules/:id` - 更新策略
- `DELETE /api/automation/rules/:id` - 删除策略
