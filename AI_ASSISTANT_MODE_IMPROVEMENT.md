# AI 助手模式区分与 Agent 编排集成改进

## 改进日期
2025-01-XX

## 问题描述
1. AI助手的工作模式区分不明显，用户难以理解当前处于什么模式
2. 模型选择器与工作模式混淆，"智能模式"既指模型又指工作方式
3. Agent编排功能已开发但未在AI助手中显现
4. 缺少对不同使用场景的明确引导

## 解决方案

### 1. 模式与模型分离

#### 之前的问题
- "智能模式 (Auto)" 既表示自动选择模型，又暗示某种工作方式
- 用户不清楚是在选择AI模型还是工作模式

#### 改进后
**三种独立的助手模式：**

1. **对话模式 (Chat Mode)** 🗨️
   - 图标：MessageSquare
   - 颜色：蓝色
   - 特点：自然交流，智能问答
   - 行为：友好对话，重要操作前需确认
   - 适用场景：日常咨询、学习交流、获取建议

2. **自动化模式 (Automation Mode)** ⚡
   - 图标：Zap
   - 颜色：绿色
   - 特点：智能执行，无需确认
   - 行为：主动执行任务，减少交互
   - 适用场景：批量操作、定时任务、快速执行

3. **专家模式 (Expert Mode)** 🧠
   - 图标：Brain
   - 颜色：紫色
   - 特点：深度分析，多Agent协作
   - 行为：多步骤推理，任务分解，专业建议
   - 适用场景：复杂问题诊断、系统优化、深度分析

**模型选择器独立：**
- 重命名："智能模式" → "智能模型 (Auto)"
- 明确这是模型选择，不是工作模式
- 保留所有现有模型选项（DeepSeek、Qwen等）

### 2. 视觉区分增强

#### 模式选择器
```tsx
<div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-zinc-900 border">
  <button onClick={() => setAssistantMode('chat')}>
    <MessageSquare size={14} />
    对话模式
  </button>
  <button onClick={() => setAssistantMode('automation')}>
    <Zap size={14} />
    自动化模式
  </button>
  <button onClick={() => setAssistantMode('expert')}>
    <Brain size={14} />
    专家模式
  </button>
</div>
```

#### 模式说明卡片
在欢迎界面显示当前模式的说明：
- 对话模式：自然交流，智能问答
- 自动化模式：智能执行，无需确认
- 专家模式：深度分析，多Agent协作

### 3. Agent 编排集成

#### 专家模式专属功能
在专家模式下，快捷操作区域会显示：
```tsx
<button onClick={() => router.push('/admin/agent-orchestration')}>
  <Brain size={18} />
  多Agent协作编排
</button>
```

#### 系统提示词注入
根据不同模式调整AI行为：

```typescript
if (assistantMode === 'automation') {
  effectiveSystemPrompt += "自动化模式：主动执行任务，减少交互...";
} else if (assistantMode === 'expert') {
  effectiveSystemPrompt += "专家模式：深度分析推理，多步骤思考...";
} else {
  effectiveSystemPrompt += "对话模式：友好交流，重要操作需确认...";
}
```

### 4. 用户体验优化

#### 模式切换流程
1. 用户在顶部工具栏看到三个模式按钮
2. 点击切换模式，按钮高亮显示当前模式
3. 欢迎界面显示模式说明卡片
4. 专家模式下显示Agent编排入口

#### 视觉反馈
- 当前模式按钮：彩色背景 + 白色文字
- 非当前模式：灰色文字 + 透明背景
- 悬停效果：灰色背景过渡

## 技术实现

### 状态管理
```typescript
const [assistantMode, setAssistantMode] = useState<'chat' | 'automation' | 'expert'>('chat')
```

### 图标导入
```typescript
import { MessageSquare, Zap, Brain } from "lucide-react"
```

### 路由跳转
```typescript
router.push('/admin/agent-orchestration')
```

## 用户指南

### 如何选择模式？

**对话模式** - 适合：
- 咨询草莓种植问题
- 了解设备状态
- 学习农业知识
- 需要详细解释的场景

**自动化模式** - 适合：
- 批量调整设备
- 执行预设任务
- 快速响应环境变化
- 不需要确认的常规操作

**专家模式** - 适合：
- 诊断复杂病害
- 优化种植方案
- 分析历史数据
- 需要多维度分析的问题

## 后续优化建议

1. **模式记忆**：保存用户最后使用的模式到 localStorage
2. **模式推荐**：根据用户输入自动推荐合适的模式
3. **模式切换提示**：首次使用时显示模式说明引导
4. **快捷键支持**：Ctrl+1/2/3 快速切换模式
5. **模式统计**：记录各模式使用频率，优化默认模式

## 相关文件

- `app/ai-assistant/page.tsx` - 主要改动文件
- `app/admin/agent-orchestration/page.tsx` - Agent编排页面
- `components/agent/multi-agent-orchestrator.tsx` - 多Agent编排组件

## 测试要点

- [ ] 三种模式切换正常
- [ ] 模式说明卡片显示正确
- [ ] 专家模式下显示Agent编排入口
- [ ] 模型选择器独立工作
- [ ] 系统提示词根据模式正确注入
- [ ] Agent编排页面跳转正常
- [ ] 视觉样式在深色/浅色主题下正常

## 总结

通过将"模式"和"模型"清晰分离，并为不同使用场景提供专门的工作模式，用户可以更直观地理解和使用AI助手。专家模式的引入为高级用户提供了多Agent协作的入口，提升了系统的专业性和可扩展性。
