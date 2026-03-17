# 🎨 替换丑陋转圈加载指南

## 已完成的替换

✅ **全局页面加载** - `app/loading.tsx`
✅ **3D 模型加载** - `app/monitor/page.tsx`
✅ **AI 助手页面** - `app/test/ai-agent/page.tsx`
✅ **设置页面保存** - `app/settings/page.tsx`
✅ **注册页面** - `app/register/page.tsx`
✅ **语音输入** - `components/ui/qwen-voice-input.tsx`
✅ **MCP 服务器安装** - `components/mcp/mcp-server-detail-dialog.tsx`

## 新的加载组件

### 1. LoadingDots 组件
```tsx
import { LoadingDots } from "@/components/ui/loading-dots"

// 小尺寸点点
<LoadingDots size="sm" />

// 中尺寸点点
<LoadingDots size="md" />

// 大尺寸点点
<LoadingDots size="lg" />
```

### 2. LoadingButton 组件
```tsx
import { LoadingButton } from "@/components/ui/loading-dots"

<LoadingButton 
  loading={isLoading} 
  loadingText="保存中..."
  size="md"
>
  保存更改
</LoadingButton>
```

## 替换模式

### ❌ 旧的丑陋转圈
```tsx
<Loader2 className="w-4 h-4 animate-spin" />
```

### ✅ 新的优雅点点
```tsx
<div className="flex gap-1">
  <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
  <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
  <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
</div>
```

### ✅ 或者使用组件
```tsx
<LoadingDots size="md" />
```

## 快速替换脚本

如果你想批量替换剩余的转圈加载，可以使用以下模式：

### 1. 按钮加载状态
```tsx
// 替换前
{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon />}

// 替换后
{loading ? <LoadingDots size="sm" /> : <Icon />}
```

### 2. 页面加载状态
```tsx
// 替换前
<div className="flex items-center justify-center">
  <Loader2 className="h-8 w-8 animate-spin" />
</div>

// 替换后
<PageSkeleton />
// 或者
<div className="flex items-center justify-center">
  <LoadingDots size="lg" />
</div>
```

### 3. 行内加载状态
```tsx
// 替换前
<Loader2 className="animate-spin mr-2" size={16} />

// 替换后
<LoadingDots size="sm" className="mr-2" />
```

## 特殊场景的骨架屏

### 仪表盘加载
```tsx
import { DashboardSkeleton } from "@/components/loading/dashboard-skeleton"
<DashboardSkeleton />
```

### 监控页面加载
```tsx
import { MonitorSkeleton } from "@/components/loading/monitor-skeleton"
<MonitorSkeleton />
```

### AI 助手加载
```tsx
import { AIAssistantSkeleton } from "@/components/loading/ai-assistant-skeleton"
<AIAssistantSkeleton />
```

### 3D 模型加载
```tsx
// 已内置在 GreenhouseModel 组件中
<GreenhouseModel /> // 自动显示漂亮的加载动画
```

## 剩余需要替换的文件

以下文件仍包含丑陋的转圈，建议逐步替换：

1. `components/ai/control-bento-grid.tsx` - 设备控制加载
2. `components/ai/schedule-card.tsx` - 调度卡片加载
3. `components/ai/voice-chat-modal.tsx` - 语音聊天加载
4. `components/realtime-voice-orb.tsx` - 实时语音加载
5. `components/ai/scheduled-tasks-list.tsx` - 任务列表加载
6. `app/proposal-cover/page.tsx` - 提案封面导出
7. `app/test/tencent-map/page.tsx` - 地图测试加载

## 替换优先级

### 🔥 高优先级（用户经常看到）
- ✅ 页面级加载（已完成）
- ✅ 按钮加载状态（主要的已完成）
- ✅ 表单提交（已完成）

### 🟡 中优先级（偶尔看到）
- 🔄 组件内部加载状态
- 🔄 数据获取加载
- 🔄 文件上传/下载

### 🟢 低优先级（很少看到）
- 🔄 调试页面加载
- 🔄 测试功能加载
- 🔄 管理员功能

## 设计原则

### 1. 一致性
所有加载状态应该使用相同的视觉语言：
- 点点动画用于按钮和小组件
- 骨架屏用于页面和大组件
- 渐变动画用于特殊场景（如 3D 模型）

### 2. 性能
- 优先使用 CSS 动画而不是 JavaScript
- 避免过度复杂的动画
- 使用 `animate-bounce` 而不是 `animate-spin`

### 3. 可访问性
- 保持足够的对比度
- 提供有意义的加载文本
- 支持 `prefers-reduced-motion`

### 4. 品牌一致性
- 使用品牌色彩（emerald, blue）
- 保持圆润的设计语言
- 与整体 UI 风格协调

## 快速检查清单

在替换加载状态时，确保：

- [ ] 移除了 `animate-spin` 类
- [ ] 移除了 `Loader2` 组件
- [ ] 使用了 `LoadingDots` 或骨架屏
- [ ] 保持了原有的功能逻辑
- [ ] 测试了加载和完成状态
- [ ] 检查了深色模式兼容性

---

**目标**: 让用户再也看不到丑陋的转圈加载！🎉