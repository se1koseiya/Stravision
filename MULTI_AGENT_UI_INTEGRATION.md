# 多 Agent 编排 UI 集成指南

## 📋 概述

本文档说明如何将多 Agent 编排的可视化 UI 集成到 AI 助手页面中，让用户可以实时看到 AI 在处理任务时的多 Agent 协作过程。

## ✅ 已完成的组件

### 1. Agent 编排面板 (AgentOrchestrationPanel)

**文件**: `components/ai/agent-orchestration-panel.tsx`

**功能**:
- ✅ 实时显示 Agent 执行步骤
- ✅ 进度条可视化
- ✅ 可折叠/展开
- ✅ 动画效果
- ✅ 支持 4 种 Agent 类型（规划、执行、验证、协调）
- ✅ 状态指示（idle/thinking/executing/completed/failed）

**使用示例**:

```typescript
import { AgentOrchestrationPanel } from '@/components/ai/agent-orchestration-panel';

// 在消息渲染中使用
<AgentOrchestrationPanel
  steps={[
    {
      id: 'step-1',
      name: '分析用户需求',
      type: 'planner',
      status: 'completed',
      message: '已识别用户意图：查询环境数据',
      timestamp: Date.now(),
    },
    {
      id: 'step-2',
      name: '获取传感器数据',
      type: 'executor',
      status: 'executing',
      message: '正在从 MCP 工具获取数据...',
      timestamp: Date.now(),
    },
    {
      id: 'step-3',
      name: '验证数据完整性',
      type: 'validator',
      status: 'idle',
    },
  ]}
  isActive={true}
/>
```

### 2. 完整的编排中心页面

**文件**: `app/admin/agent-orchestration/page.tsx`

**功能**:
- ✅ 实时编排视图
- ✅ 工作流构建器
- ✅ 流程图可视化
- ✅ 协作对话展示

**访问路径**: `/admin/agent-orchestration`

### 3. 其他组件

- `components/agent/multi-agent-orchestrator.tsx` - 实时编排器
- `components/agent/agent-workflow-builder.tsx` - 工作流构建器
- `components/agent/agent-flow-diagram.tsx` - 流程图
- `components/agent/agent-collaboration-chat.tsx` - 协作对话

## 🔧 集成到 AI 助手页面

### 方案 1: 在消息流中显示（推荐）

在 `app/ai-assistant/page.tsx` 中，当 AI 处理复杂任务时显示 Agent 编排面板。

#### 步骤 1: 导入组件

```typescript
import { AgentOrchestrationPanel } from '@/components/ai/agent-orchestration-panel';
```

#### 步骤 2: 添加状态管理

```typescript
// 在 AIAssistantContent 组件中添加
const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
const [isAgentActive, setIsAgentActive] = useState(false);

interface AgentStep {
  id: string;
  name: string;
  type: 'planner' | 'executor' | 'validator' | 'coordinator';
  status: 'idle' | 'thinking' | 'executing' | 'completed' | 'failed';
  message?: string;
  timestamp?: number;
}
```

#### 步骤 3: 在 Chat API 响应中更新 Agent 步骤

修改 `handleSubmit` 函数，在流式响应中解析 Agent 步骤：

```typescript
const handleSubmit = async (e?: React.FormEvent) => {
  // ... 现有代码 ...
  
  // 初始化 Agent 步骤
  setIsAgentActive(true);
  setAgentSteps([
    {
      id: 'step-1',
      name: '分析任务',
      type: 'planner',
      status: 'thinking',
      message: '正在分析用户需求...',
      timestamp: Date.now(),
    }
  ]);
  
  // 在流式响应中更新步骤
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        
        // 检查是否有 Agent 步骤更新
        if (data.agentStep) {
          setAgentSteps(prev => {
            const existing = prev.find(s => s.id === data.agentStep.id);
            if (existing) {
              return prev.map(s => 
                s.id === data.agentStep.id ? { ...s, ...data.agentStep } : s
              );
            } else {
              return [...prev, data.agentStep];
            }
          });
        }
        
        // ... 处理其他数据 ...
      }
    }
  }
  
  // 完成后标记为非活动
  setIsAgentActive(false);
};
```

#### 步骤 4: 在消息渲染中显示面板

在消息渲染逻辑中添加：

```typescript
// 在 assistant 消息渲染中
{msg.role === 'assistant' && (
  <>
    {/* 显示 Agent 编排面板 */}
    {agentSteps.length > 0 && (
      <AgentOrchestrationPanel
        steps={agentSteps}
        isActive={isAgentActive}
        className="mb-4"
      />
    )}
    
    {/* 原有的消息内容 */}
    <div className="prose">
      {renderMessageContent(msg.content)}
    </div>
  </>
)}
```

### 方案 2: 作为侧边栏显示

在页面右侧添加一个固定的 Agent 编排面板。

```typescript
<div className="flex h-screen">
  {/* 主聊天区域 */}
  <div className="flex-1">
    {/* 现有的聊天界面 */}
  </div>
  
  {/* Agent 编排侧边栏 */}
  <div className="w-80 border-l border-zinc-200 dark:border-zinc-800 p-4 overflow-y-auto">
    <h3 className="text-sm font-bold mb-4">Agent 执行流程</h3>
    <AgentOrchestrationPanel
      steps={agentSteps}
      isActive={isAgentActive}
    />
  </div>
</div>
```

### 方案 3: 作为浮动面板

添加一个可拖动的浮动面板。

```typescript
import { Draggable } from 'react-beautiful-dnd';

<Draggable draggableId="agent-panel" index={0}>
  {(provided) => (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className="fixed bottom-4 right-4 w-96 max-h-[600px] overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50"
    >
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 cursor-move">
        <h3 className="text-sm font-bold">Agent 执行流程</h3>
      </div>
      <div className="p-4">
        <AgentOrchestrationPanel
          steps={agentSteps}
          isActive={isAgentActive}
        />
      </div>
    </div>
  )}
</Draggable>
```

## 🎨 后端集成

### 修改 Chat API 以支持 Agent 步骤

在 `app/api/chat/route.ts` 中：

```typescript
// 在流式响应中发送 Agent 步骤
const sendAgentStep = (step: AgentStep) => {
  const data = JSON.stringify({ agentStep: step });
  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
};

// 示例：在工具调用前发送步骤
sendAgentStep({
  id: 'step-executor-1',
  name: '执行工具调用',
  type: 'executor',
  status: 'executing',
  message: `正在调用 ${toolCall.name}...`,
  timestamp: Date.now(),
});

// 执行工具
const result = await executeTool(toolCall);

// 工具调用后更新步骤
sendAgentStep({
  id: 'step-executor-1',
  name: '执行工具调用',
  type: 'executor',
  status: 'completed',
  message: `${toolCall.name} 执行成功`,
  timestamp: Date.now(),
});
```

### 与 Agent 编排器集成

使用现有的 Agent 编排器：

```typescript
import { getAgentOrchestrator } from '@/lib/ai/agent-orchestrator';

const orchestrator = getAgentOrchestrator();

// 监听编排器事件
orchestrator.on('stepStart', (step) => {
  sendAgentStep({
    id: step.id,
    name: step.name,
    type: step.type,
    status: 'executing',
    message: step.description,
    timestamp: Date.now(),
  });
});

orchestrator.on('stepComplete', (step) => {
  sendAgentStep({
    id: step.id,
    name: step.name,
    type: step.type,
    status: 'completed',
    message: '执行成功',
    timestamp: Date.now(),
  });
});
```

## 📊 Agent 步骤示例

### 典型的多 Agent 协作流程

```typescript
const exampleSteps: AgentStep[] = [
  // 1. 规划阶段
  {
    id: 'step-1',
    name: '分析用户需求',
    type: 'planner',
    status: 'completed',
    message: '识别意图：查询大棚环境数据并提供优化建议',
    timestamp: Date.now() - 5000,
  },
  {
    id: 'step-2',
    name: '制定执行计划',
    type: 'planner',
    status: 'completed',
    message: '计划：1) 获取传感器数据 2) 分析数据 3) 生成建议',
    timestamp: Date.now() - 4000,
  },
  
  // 2. 执行阶段
  {
    id: 'step-3',
    name: '获取传感器数据',
    type: 'executor',
    status: 'completed',
    message: '已获取温度、湿度、光照等数据',
    timestamp: Date.now() - 3000,
  },
  {
    id: 'step-4',
    name: '调用分析工具',
    type: 'executor',
    status: 'executing',
    message: '正在使用 MCP 工具分析环境数据...',
    timestamp: Date.now() - 2000,
  },
  
  // 3. 验证阶段
  {
    id: 'step-5',
    name: '验证数据完整性',
    type: 'validator',
    status: 'idle',
  },
  {
    id: 'step-6',
    name: '验证建议可行性',
    type: 'validator',
    status: 'idle',
  },
  
  // 4. 协调阶段
  {
    id: 'step-7',
    name: '整合分析结果',
    type: 'coordinator',
    status: 'idle',
  },
  {
    id: 'step-8',
    name: '生成最终响应',
    type: 'coordinator',
    status: 'idle',
  },
];
```

## 🎯 最佳实践

### 1. 性能优化

- 使用 `useMemo` 缓存步骤数据
- 限制同时显示的步骤数量（最多 10 个）
- 使用虚拟滚动处理大量步骤

```typescript
const visibleSteps = useMemo(() => {
  return agentSteps.slice(-10); // 只显示最近 10 个步骤
}, [agentSteps]);
```

### 2. 用户体验

- 自动滚动到最新步骤
- 提供折叠/展开功能
- 添加声音提示（可选）
- 支持暗色模式

### 3. 错误处理

```typescript
{
  id: 'step-error',
  name: '执行失败',
  type: 'executor',
  status: 'failed',
  message: '工具调用超时，正在重试...',
  timestamp: Date.now(),
}
```

### 4. 国际化

```typescript
const AGENT_LABELS = {
  'zh-CN': {
    planner: '规划',
    executor: '执行',
    validator: '验证',
    coordinator: '协调',
  },
  'en-US': {
    planner: 'Planning',
    executor: 'Executing',
    validator: 'Validating',
    coordinator: 'Coordinating',
  },
};
```

## 🧪 测试

### 单元测试

```typescript
import { render, screen } from '@testing-library/react';
import { AgentOrchestrationPanel } from '@/components/ai/agent-orchestration-panel';

describe('AgentOrchestrationPanel', () => {
  it('should render steps correctly', () => {
    const steps = [
      {
        id: 'step-1',
        name: '测试步骤',
        type: 'planner',
        status: 'completed',
      },
    ];
    
    render(<AgentOrchestrationPanel steps={steps} isActive={false} />);
    
    expect(screen.getByText('测试步骤')).toBeInTheDocument();
  });
  
  it('should show active indicator when isActive is true', () => {
    render(<AgentOrchestrationPanel steps={[]} isActive={true} />);
    
    expect(screen.getByText('处理中')).toBeInTheDocument();
  });
});
```

### 集成测试

```typescript
// 测试完整的 Agent 流程
it('should display agent steps during chat', async () => {
  const { getByText, getByPlaceholderText } = render(<AIAssistantPage />);
  
  const input = getByPlaceholderText('输入消息...');
  fireEvent.change(input, { target: { value: '查询环境数据' } });
  fireEvent.submit(input);
  
  // 等待 Agent 步骤出现
  await waitFor(() => {
    expect(getByText('分析用户需求')).toBeInTheDocument();
  });
  
  // 验证步骤状态更新
  await waitFor(() => {
    expect(getByText('执行成功')).toBeInTheDocument();
  });
});
```

## 📚 相关文档

- [Agent 编排器集成](./AGENT_ORCHESTRATOR_INTEGRATION.md)
- [Week 7-8 监控测试](./WEEK_7-8_MONITORING_TESTING.md)
- [优化进度](./AGENT_OPTIMIZATION_PROGRESS.md)

## 🎊 总结

通过集成多 Agent 编排 UI，用户可以：

✅ **实时可见** - 看到 AI 的思考和执行过程
✅ **透明度高** - 了解每个步骤的状态和结果
✅ **交互友好** - 可折叠、可展开、动画流畅
✅ **信息丰富** - 显示时间戳、进度、错误信息

这大大提升了用户对 AI 系统的信任度和使用体验！

---

**创建时间**: 2026年4月15日  
**版本**: v1.0  
**状态**: ✅ 已完成
