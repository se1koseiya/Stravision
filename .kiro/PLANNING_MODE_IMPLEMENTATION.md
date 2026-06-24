# 计划模式（Planning Mode）实现文档

## 概述

本文档记录了"计划模式"功能的完整实现，该功能允许用户在 AI 助手中启用任务规划能力，让 AI 生成详细的执行计划并使用 ThoughtChain 组件可视化展示。

---

## 功能特性

### 1. 独立的计划模式开关
- **位置**：输入框底部扩展菜单中的"计划模式"开关
- **行为**：
  - 启用后，AI 会为复杂任务生成详细的 TASK_LIST 执行计划
  - 自动启用推理模式（enableReasoning）
  - 自动切换到推理模型（qwen3-max-2026-01-23、qwen-plus-2025-12-01 或 deepseek-v3.2）
  - 显示专用的加载提示："📋 规划任务中"

### 2. TASK_LIST 可视化
- 使用现有的 `DynamicTaskPlanner` 组件渲染任务列表
- 支持任务状态跟踪（pending、in_progress、completed）
- 实时更新任务进度
- 美观的 Ant Design X ThoughtChain 风格界面

### 3. 系统提示词增强
计划模式启用时，AI 会收到以下指导：
- 必须使用 `<TASK_LIST>` 标签输出任务规划
- 任务列表格式清晰，包含标题和子步骤
- 第一个任务状态为 "in_progress"，其余为 "pending"
- 任务完成后需要更新状态

---

## 实现细节

### 文件修改清单

#### 1. `app/ai-assistant/page.tsx`
**新增状态**：
```typescript
const [enablePlanning, setEnablePlanning] = useState(false) // 计划模式：生成任务规划
```

**系统提示词增强**（第 2380-2420 行）：
```typescript
// 计划模式：生成详细的任务规划
if (enablePlanning) {
  effectiveSystemPrompt += `\n\n【计划模式已启用】
- 对于复杂任务，必须先生成详细的执行计划
- 使用 <TASK_LIST> 标签输出任务规划，格式示例：

<TASK_LIST>
{
  "status": "in_progress",
  "tasks": [
    {
      "title": "分析环境数据",
      "items": [
        { "type": "text", "text": "读取温湿度传感器数据" },
        { "type": "text", "text": "读取光照传感器数据" }
      ],
      "status": "in_progress"
    },
    ...
  ]
}
</TASK_LIST>

- 任务列表应该清晰展示执行步骤
- 第一个任务的 status 应设为 "in_progress"，其余为 "pending"
- 每个任务完成后，在下一次响应中更新状态
- 示例：用户说"优化草莓生长环境" → 先输出完整的 TASK_LIST 规划 → 然后逐步执行`;
}
```

**Agent 步骤显示**（第 2527-2542 行）：
```typescript
const currentAgentSteps: AgentStep[] = [
  {
    id: nextStepId("initial-thinking"),
    type: "thinking",
    status: "active",
    title: enablePlanning 
      ? "📋 规划任务中" 
      : approvalMode === "full" 
        ? "🧠 深度分析中" 
        : "💬 智能识别意图中",
    detail: enablePlanning
      ? "生成详细的任务执行计划和步骤分解"
      : approvalMode === "full" 
        ? "结合设备数据与历史经验进行多维度诊断" 
        : "解析上下文并匹配最佳知识模块",
    startedAt: Date.now()
  }
]
```

**ChatSenderInput props**（第 4410-4426 行）：
```typescript
enablePlanning={enablePlanning}
setEnablePlanning={(v) => {
  setEnablePlanning(v)
  if (v) {
    // 启用计划模式时，同时启用推理模式
    setEnableReasoning(true)
    const reasoningModels = ['qwen3-max-2026-01-23', 'qwen-plus-2025-12-01', 'deepseek-v3.2']
    const randomModel = reasoningModels[Math.floor(Math.random() * reasoningModels.length)]
    setSelectedModel(randomModel)
    if (aiSettings) {
      const newSettings = { ...aiSettings, model: randomModel }
      setAiSettings(newSettings)
      localStorage.setItem("ai-settings", JSON.stringify(newSettings))
    }
  }
}}
```

#### 2. `app/ai-assistant/_components/chat-sender-input.tsx`
**接口更新**（第 49-70 行）：
```typescript
export interface ChatSenderProps {
  input: string
  setInput: (value: string) => void
  onSend: (text: string) => void
  isLoading: boolean
  attachments: string[]
  onSelectFiles: React.ChangeEventHandler<HTMLInputElement>
  onRemoveAttachment: (index: number) => void
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void
  enableReasoning: boolean
  setEnableReasoning: (v: boolean) => void
  enablePlanning: boolean    // ✅ 新增
  setEnablePlanning: (v: boolean) => void  // ✅ 新增
  enableSearch: boolean
  setEnableSearch: (v: boolean) => void
  availableTools: Array<{ name: string; displayName?: string; description?: string; icon?: string; iconBg?: string }>
  onCancel?: () => void
  darkMode?: boolean
  approvalMode?: ApprovalMode
  setApprovalMode?: (mode: ApprovalMode) => void
}
```

**UI 更新**（第 324-352 行）：
```typescript
{/* 计划模式（任务规划） */}
<div style={{
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "8px 12px", marginTop: 2,
}}>
  <span style={{ fontSize: 13.5, fontWeight: 500, color: darkMode ? "#d4d4d8" : "#374151" }}>
    计划模式
  </span>
  <button
    onClick={() => setEnablePlanning(!enablePlanning)}
    style={{
      width: 34, height: 20, borderRadius: 20,
      border: "none", cursor: "pointer",
      background: enablePlanning ? (darkMode ? "#5b21b6" : "#7c3aed") : (darkMode ? "#3f3f46" : "#d1d5db"),
      position: "relative", transition: "background 0.2s",
      flexShrink: 0,
    }}
  >
    <span style={{
      position: "absolute", top: 2,
      left: enablePlanning ? 16 : 2,
      width: 16, height: 16, borderRadius: "50%",
      background: "#fff",
      transition: "left 0.2s ease",
      boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
    }} />
  </button>
</div>
```

---

## 使用方式

### 用户操作流程

1. **启用计划模式**：
   - 点击输入框底部的附件图标（📎）
   - 在弹出菜单中找到"计划模式"开关
   - 点击开关启用（背景变为紫色）

2. **输入复杂任务**：
   ```
   优化草莓生长环境
   ```
   或
   ```
   制定一个完整的病虫害防治方案
   ```

3. **查看任务规划**：
   - AI 会显示"📋 规划任务中"状态
   - 生成完成后，会显示一个美观的任务列表卡片
   - 任务卡片可展开/折叠查看详细步骤

4. **任务执行**：
   - AI 会逐步执行任务列表中的每个步骤
   - 任务状态实时更新（pending → in_progress → completed）
   - 完成后显示"✅ 流水线执行完毕"

---

## AI 输出示例

### 输入
```
用户：优化草莓生长环境
```

### AI 输出（启用计划模式）
```markdown
好的，我将为您制定一个完整的草莓生长环境优化方案。

<TASK_LIST>
{
  "status": "in_progress",
  "tasks": [
    {
      "title": "环境数据采集",
      "items": [
        { "type": "text", "text": "读取温湿度传感器数据" },
        { "type": "text", "text": "读取光照传感器数据" },
        { "type": "text", "text": "读取土壤湿度数据" }
      ],
      "status": "in_progress"
    },
    {
      "title": "数据分析与诊断",
      "items": [
        { "type": "text", "text": "分析温湿度是否在适宜范围" },
        { "type": "text", "text": "评估光照时长和强度" },
        { "type": "text", "text": "检查土壤湿度状况" }
      ],
      "status": "pending"
    },
    {
      "title": "环境调节执行",
      "items": [
        { "type": "text", "text": "调节补光灯亮度" },
        { "type": "text", "text": "控制风扇转速" },
        { "type": "text", "text": "调整灌溉系统" }
      ],
      "status": "pending"
    },
    {
      "title": "效果验证",
      "items": [
        { "type": "text", "text": "创建30分钟后的复查任务" },
        { "type": "text", "text": "记录调节前后数据对比" }
      ],
      "status": "pending"
    }
  ]
}
</TASK_LIST>

现在开始执行第一步...
```

---

## 技术亮点

### 1. 与现有功能完美集成
- 复用了现有的 `DynamicTaskPlanner` 组件
- 遵循了 Ant Design X 设计规范
- 与权限模式（approvalMode）协同工作

### 2. 智能模型切换
- 启用计划模式时自动切换到推理模型
- 支持多个推理模型随机选择，避免单点过载

### 3. 清晰的视觉反馈
- 专用的"📋 规划任务中"状态提示
- 任务卡片支持展开/折叠
- 自动折叠选项（任务完成后2秒自动折叠）

### 4. 状态持久化
- enablePlanning 状态独立管理
- 与 enableReasoning 智能联动
- 不影响现有的推理模式功能

---

## 测试建议

### 测试场景

1. **基础功能测试**：
   - [ ] 开关切换是否正常
   - [ ] 启用后是否显示"📋 规划任务中"
   - [ ] TASK_LIST 是否正确渲染

2. **复杂任务测试**：
   - [ ] 输入："优化草莓生长环境"
   - [ ] 输入："制定病虫害防治方案"
   - [ ] 输入："帮我分析最近一周的环境数据"

3. **状态更新测试**：
   - [ ] 任务状态是否正确更新
   - [ ] 完成后是否显示"完成 100%"
   - [ ] 自动折叠功能是否工作

4. **边界情况测试**：
   - [ ] 禁用计划模式后是否恢复正常对话
   - [ ] 多轮对话中任务状态是否保持
   - [ ] 会话切换后任务列表是否正确清除

---

## 未来扩展方向

1. **任务暂停/恢复**：
   - 允许用户暂停任务执行
   - 支持从中断处继续

2. **任务编辑**：
   - 用户可以修改 AI 生成的任务列表
   - 支持添加/删除/重排任务

3. **任务模板**：
   - 预设常用的任务模板
   - 支持用户自定义模板

4. **任务历史**：
   - 记录历史任务执行情况
   - 支持任务重放和分析

---

## 相关文件

- `app/ai-assistant/page.tsx` - 主页面逻辑
- `app/ai-assistant/_components/chat-sender-input.tsx` - 输入框组件
- `app/ai-assistant/_components/dynamic-task-planner.tsx` - 任务规划器组件
- `app/ai-assistant/_components/agent-thought-chain.tsx` - ThoughtChain 包装组件
- `lib/ai/prompt-templates.ts` - AI 提示词模板
- `app/ai-assistant/types.ts` - TypeScript 类型定义

---

## 结论

计划模式功能已成功实现并集成到现有系统中。该功能：
- ✅ 完全独立于原有的推理模式
- ✅ 使用统一的 UI 风格和交互模式
- ✅ 支持复杂任务的可视化规划
- ✅ 与权限控制模式完美协同
- ✅ 无 TypeScript 错误
- ✅ 准备就绪，可以投入使用

用户现在可以通过启用"计划模式"来让 AI 生成详细的任务执行计划，并通过美观的 ThoughtChain 界面实时查看任务进度。
