# AI 功能开关集成示例

## 在 AI 助手页面中集成

### 1. 导入 Hook

```typescript
import { useAIFeatures } from "@/lib/hooks/use-ai-features"
```

### 2. 使用 Hook

```typescript
function AIAssistantContent() {
  const { config: aiFeatures, loading: featuresLoading } = useAIFeatures()
  
  // ... 其他代码
}
```

### 3. 过滤 AI 输出的标签

在处理 AI 回复内容时，根据配置过滤标签：

```typescript
// 在流式输出或最终内容处理时
let processedContent = assistantMsg.content as string

// 过滤 TASK_LIST
if (!aiFeatures.enableTaskList) {
  processedContent = processedContent.replace(/<TASK_LIST>[\s\S]*?<\/TASK_LIST>/g, '')
}

// 过滤 DEVICE_BENTO
if (!aiFeatures.enableDeviceBento) {
  processedContent = processedContent.replace(/<DEVICE_BENTO\s*\/?>/g, '')
}

// 过滤 CONTROL_BENTO
if (!aiFeatures.enableControlBento) {
  processedContent = processedContent.replace(/<CONTROL_BENTO\s*\/?>/g, '')
}

// 过滤 MONITOR
if (!aiFeatures.enableMonitor) {
  processedContent = processedContent.replace(/<MONITOR\s*\/?>/g, '')
}

// 过滤 SCHEDULED_TASKS
if (!aiFeatures.enableScheduledTasks) {
  processedContent = processedContent.replace(/<SCHEDULED_TASKS\s*\/?>/g, '')
}

// 过滤 CHART
if (!aiFeatures.enableChart) {
  processedContent = processedContent.replace(/<CHART\s+type="[^"]*">[\s\S]*?<\/CHART>/g, '')
}

// 过滤 SPECTRAL
if (!aiFeatures.enableSpectral) {
  processedContent = processedContent.replace(/<SPECTRAL\s*>[\s\S]*?<\/SPECTRAL>/g, '')
}

// 过滤 REASONING
if (!aiFeatures.enableReasoning) {
  processedContent = processedContent.replace(/<REASONING>[\s\S]*?<\/REASONING>/g, '')
}

// 过滤 SOURCES
if (!aiFeatures.enableSources) {
  processedContent = processedContent.replace(/<SOURCES>[\s\S]*?<\/SOURCES>/g, '')
}

// 过滤 TOOL_USED
if (!aiFeatures.enableToolUsed) {
  processedContent = processedContent.replace(/<TOOL_USED>[\s\S]*?<\/TOOL_USED>/g, '')
}

// 过滤 SCHEDULE_TASK
if (!aiFeatures.enableScheduleTask) {
  processedContent = processedContent.replace(/<SCHEDULE_TASK>[\s\S]*?<\/SCHEDULE_TASK>/g, '')
}

// 过滤 WEB_PREVIEW
if (!aiFeatures.enableWebPreview) {
  processedContent = processedContent.replace(/<WEB_PREVIEW>[\s\S]*?<\/WEB_PREVIEW>/g, '')
}

// 过滤设备控制 JSON
if (!aiFeatures.enableDeviceControl) {
  // 过滤设备控制相关的 JSON 代码块
  processedContent = processedContent.replace(/```json\s*\{\s*"action":\s*"(?:toggle_relay|control_camera|reset_camera)"[\s\S]*?\}\s*```/g, '')
}
```

### 4. 条件渲染组件

在渲染特定组件时检查配置：

```typescript
// 渲染任务规划器
{aiFeatures.enableTaskList && dynamicTaskContent && (
  <DynamicTaskPlanner 
    content={dynamicTaskContent}
    onOpenStudio={handleOpenStudio}
  />
)}

// 渲染设备状态卡片
{aiFeatures.enableDeviceBento && content.includes('<DEVICE_BENTO>') && (
  <DeviceBentoGrid />
)}

// 渲染控制面板
{aiFeatures.enableControlBento && content.includes('<CONTROL_BENTO>') && (
  <ControlBentoGrid />
)}

// 渲染监控画面
{aiFeatures.enableMonitor && content.includes('<MONITOR>') && (
  <MonitorCard />
)}

// 渲染定时任务列表
{aiFeatures.enableScheduledTasks && content.includes('<SCHEDULED_TASKS>') && (
  <ScheduledTasksList />
)}

// 渲染思考过程
{aiFeatures.enableReasoning && msg.reasoning?.text && (
  <Reasoning isStreaming={false} className="mb-4">
    <ReasoningTrigger />
    <ReasoningContent>
      {msg.reasoning.text}
    </ReasoningContent>
  </Reasoning>
)}
```

### 5. 完整示例

```typescript
function AIAssistantContent() {
  const { config: aiFeatures, loading: featuresLoading } = useAIFeatures()
  const [messages, setMessages] = useState<Message[]>([])
  
  // 处理 AI 回复
  const processAIResponse = (content: string) => {
    let processed = content
    
    // 根据配置过滤标签
    if (!aiFeatures.enableTaskList) {
      processed = processed.replace(/<TASK_LIST>[\s\S]*?<\/TASK_LIST>/g, '')
    }
    if (!aiFeatures.enableDeviceBento) {
      processed = processed.replace(/<DEVICE_BENTO\s*\/?>/g, '')
    }
    if (!aiFeatures.enableControlBento) {
      processed = processed.replace(/<CONTROL_BENTO\s*\/?>/g, '')
    }
    if (!aiFeatures.enableMonitor) {
      processed = processed.replace(/<MONITOR\s*\/?>/g, '')
    }
    if (!aiFeatures.enableScheduledTasks) {
      processed = processed.replace(/<SCHEDULED_TASKS\s*\/?>/g, '')
    }
    if (!aiFeatures.enableChart) {
      processed = processed.replace(/<CHART\s+type="[^"]*">[\s\S]*?<\/CHART>/g, '')
    }
    if (!aiFeatures.enableSpectral) {
      processed = processed.replace(/<SPECTRAL\s*>[\s\S]*?<\/SPECTRAL>/g, '')
    }
    if (!aiFeatures.enableReasoning) {
      processed = processed.replace(/<REASONING>[\s\S]*?<\/REASONING>/g, '')
    }
    if (!aiFeatures.enableSources) {
      processed = processed.replace(/<SOURCES>[\s\S]*?<\/SOURCES>/g, '')
    }
    if (!aiFeatures.enableToolUsed) {
      processed = processed.replace(/<TOOL_USED>[\s\S]*?<\/TOOL_USED>/g, '')
    }
    if (!aiFeatures.enableScheduleTask) {
      processed = processed.replace(/<SCHEDULE_TASK>[\s\S]*?<\/SCHEDULE_TASK>/g, '')
    }
    if (!aiFeatures.enableWebPreview) {
      processed = processed.replace(/<WEB_PREVIEW>[\s\S]*?<\/WEB_PREVIEW>/g, '')
    }
    if (!aiFeatures.enableDeviceControl) {
      processed = processed.replace(/```json\s*\{\s*"action":\s*"(?:toggle_relay|control_camera|reset_camera)"[\s\S]*?\}\s*```/g, '')
    }
    
    return processed
  }
  
  // 渲染消息
  const renderMessage = (msg: Message) => {
    const content = processAIResponse(msg.content as string)
    
    return (
      <div>
        {/* 思考过程 */}
        {aiFeatures.enableReasoning && msg.reasoning?.text && (
          <Reasoning>
            <ReasoningTrigger />
            <ReasoningContent>{msg.reasoning.text}</ReasoningContent>
          </Reasoning>
        )}
        
        {/* 主要内容 */}
        <div>{content}</div>
        
        {/* 条件渲染组件 */}
        {aiFeatures.enableTaskList && content.includes('<TASK_LIST>') && (
          <DynamicTaskPlanner content={content} />
        )}
        {aiFeatures.enableDeviceBento && content.includes('<DEVICE_BENTO>') && (
          <DeviceBentoGrid />
        )}
        {aiFeatures.enableControlBento && content.includes('<CONTROL_BENTO>') && (
          <ControlBentoGrid />
        )}
      </div>
    )
  }
  
  return (
    <div>
      {messages.map((msg, idx) => (
        <div key={idx}>{renderMessage(msg)}</div>
      ))}
    </div>
  )
}
```

## 在系统提示词中集成

可以在生成系统提示词时，根据配置动态调整指令：

```typescript
// lib/ai/prompt-templates.ts

export function generateCompactSystemPrompt(options: {
  basePrompt: string;
  enableDeviceControl: boolean;
  enableReasoning: boolean;
  mcpToolNames: string[];
  contextCompressed: boolean;
  aiFeatures?: AIFeatureConfig; // 新增
}): string {
  const parts = [options.basePrompt];

  // 根据配置决定是否添加设备控制指令
  if (options.enableDeviceControl && options.aiFeatures?.enableDeviceControl !== false) {
    parts.push(DEVICE_CONTROL_INSTRUCTION_COMPACT);
  }

  // 根据配置决定是否添加思维链指令
  if (options.enableReasoning && options.aiFeatures?.enableReasoning !== false) {
    parts.push(REASONING_INSTRUCTION_COMPACT);
  } else {
    parts.push(NO_REASONING_INSTRUCTION_COMPACT);
  }

  // 根据配置添加 UI 标签指令
  const enabledTags: string[] = []
  if (options.aiFeatures?.enableTaskList !== false) enabledTags.push('<TASK_LIST>')
  if (options.aiFeatures?.enableDeviceBento !== false) enabledTags.push('<DEVICE_BENTO>')
  if (options.aiFeatures?.enableControlBento !== false) enabledTags.push('<CONTROL_BENTO>')
  if (options.aiFeatures?.enableMonitor !== false) enabledTags.push('<MONITOR>')
  if (options.aiFeatures?.enableScheduledTasks !== false) enabledTags.push('<SCHEDULED_TASKS>')
  if (options.aiFeatures?.enableChart !== false) enabledTags.push('<CHART>')
  
  if (enabledTags.length > 0) {
    parts.push(`## 可用的 UI 标签\n你可以使用以下标签：\n${enabledTags.join(', ')}`)
  }

  // ... 其他指令

  return parts.join('\n\n');
}
```

## 测试建议

### 1. 功能测试

```bash
# 测试关闭任务规划器
1. 在管理后台关闭 "任务规划器"
2. 保存配置
3. 在 AI 助手中发送需要任务规划的请求
4. 验证不显示 <TASK_LIST> 组件

# 测试关闭设备控制
1. 在管理后台关闭 "设备控制指令"
2. 保存配置
3. 在 AI 助手中请求控制设备
4. 验证不显示设备控制 JSON
```

### 2. 性能测试

```bash
# 测试配置加载性能
1. 打开浏览器开发者工具
2. 访问 AI 助手页面
3. 检查 /api/ai-features 请求时间
4. 验证配置缓存是否生效
```

### 3. 边界测试

```bash
# 测试配置文件不存在
1. 删除 data/ai-features-config.json
2. 访问 AI 助手页面
3. 验证使用默认配置（所有功能启用）

# 测试配置文件损坏
1. 修改 data/ai-features-config.json 为无效 JSON
2. 访问 AI 助手页面
3. 验证使用默认配置
```

## 注意事项

1. **性能优化**
   - 配置在组件挂载时加载一次
   - 避免在每次渲染时重新获取配置
   - 考虑使用 Context 或全局状态管理

2. **用户体验**
   - 配置变更后，建议提示用户刷新页面
   - 或者实现实时配置更新（通过 WebSocket）

3. **错误处理**
   - 配置加载失败时使用默认配置
   - 不要因为配置问题导致页面崩溃

4. **向后兼容**
   - 新增功能开关时，默认值应为 `true`
   - 确保旧版本的配置文件仍然可用
