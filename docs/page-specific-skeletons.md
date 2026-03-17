# 🎨 页面专属骨架屏完整指南

## 🎉 已完成的页面专属骨架屏

每个页面现在都有完美匹配其布局的专属骨架屏！

### ✅ 已创建的页面骨架屏

| 页面 | 骨架屏组件 | 特色 |
|------|------------|------|
| **仪表盘** | `DashboardSkeleton` | 📊 统计卡片 + 图表网格 |
| **监控页面** | `MonitorSkeleton` | 🏡 3D模型区域 + 设备面板 |
| **AI助手** | `AIAssistantSkeleton` | 💬 聊天界面 + 侧边栏 |
| **设备控制** | `DeviceControlSkeleton` | 🎛️ 控制网格 + 自动化规则 |
| **设置页面** | `SettingsSkeleton` | ⚙️ 表单字段 + 选项卡 |
| **个人资料** | `ProfileSkeleton` | 👤 用户卡片 + 活动流 |
| **MCP商店** | `MCPStoreSkeleton` | 🛍️ 商品网格 + 分类筛选 |
| **聊天页面** | `ChatSkeleton` | 💬 消息气泡 + 输入框 |

### 📁 文件结构

```
app/
├── dashboard/loading.tsx          ← 仪表盘专属
├── monitor/loading.tsx            ← 监控页面专属
├── ai-assistant/loading.tsx       ← AI助手专属
├── device-control/loading.tsx     ← 设备控制专属
├── settings/loading.tsx           ← 设置页面专属
├── profile/loading.tsx            ← 个人资料专属
├── mcp-store/loading.tsx          ← MCP商店专属
├── chat/loading.tsx               ← 聊天页面专属
└── loading.tsx                    ← 全局默认

components/loading/
├── dashboard-skeleton.tsx         ← 仪表盘骨架屏
├── monitor-skeleton.tsx           ← 监控页面骨架屏
├── ai-assistant-skeleton.tsx      ← AI助手骨架屏
├── device-control-skeleton.tsx    ← 设备控制骨架屏
├── settings-skeleton.tsx          ← 设置页面骨架屏
├── profile-skeleton.tsx           ← 个人资料骨架屏
├── mcp-store-skeleton.tsx         ← MCP商店骨架屏
├── chat-skeleton.tsx              ← 聊天页面骨架屏
└── page-skeleton.tsx              ← 通用骨架屏
```

## 🎨 每个骨架屏的特色设计

### 1. 仪表盘骨架屏 📊
```tsx
<DashboardSkeleton />
```
**特色**:
- 🟢 翠绿渐变背景
- 📈 4个统计卡片网格
- 📊 2个图表区域
- 📋 活动列表 + 快捷操作
- ⚡ 分阶段动画进入

### 2. 监控页面骨架屏 🏡
```tsx
<MonitorSkeleton />
```
**特色**:
- 🏠 3D模型加载区域（带房子图标）
- 🎛️ 设备状态面板
- 📊 传感器数据网格
- 📹 摄像头预览区域
- 🔄 浮动设备标记点

### 3. AI助手骨架屏 🤖
```tsx
<AIAssistantSkeleton />
```
**特色**:
- 💬 完整聊天界面布局
- 🤖 AI头像 + 用户头像
- 📝 消息气泡（左右对齐）
- 📋 侧边栏快捷操作
- ⌨️ 输入框 + 发送按钮

### 4. 设备控制骨架屏 🎛️
```tsx
<DeviceControlSkeleton />
```
**特色**:
- 🔵 蓝色渐变背景
- 🎛️ 8个设备控制卡片
- 🤖 自动化规则面板
- 📊 系统状态监控
- 🔘 开关按钮占位

### 5. 设置页面骨架屏 ⚙️
```tsx
<SettingsSkeleton />
```
**特色**:
- 📑 选项卡导航
- 👤 头像上传区域
- 📝 表单字段网格
- 🔧 偏好设置开关
- 🔑 API密钥输入框

### 6. 个人资料骨架屏 👤
```tsx
<ProfileSkeleton />
```
**特色**:
- 💜 紫色渐变背景
- 👤 用户卡片 + 统计数据
- 📈 活动时间线
- 🏆 成就徽章网格
- 📁 最近项目展示

### 7. MCP商店骨架屏 🛍️
```tsx
<MCPStoreSkeleton />
```
**特色**:
- 🟣 靛紫渐变背景
- 🌟 精选推荐区域
- 🏷️ 分类标签网格
- 📦 商品卡片网格
- 🔍 搜索 + 筛选栏

### 8. 聊天页面骨架屏 💬
```tsx
<ChatSkeleton />
```
**特色**:
- 💬 全屏聊天布局
- 🤖 AI + 用户消息气泡
- 📋 消息卡片组件
- ⌨️ 输入工具栏
- 💭 打字指示器

## 🎭 动画效果

每个骨架屏都包含精心设计的动画：

### 进入动画
```tsx
// 从上方滑入
animate-in fade-in slide-in-from-top-4 duration-500

// 从下方滑入
animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100

// 从左侧滑入
animate-in fade-in slide-in-from-left-4 duration-700 delay-100

// 从右侧滑入
animate-in fade-in slide-in-from-right-4 duration-700 delay-200
```

### 脉冲动画
```tsx
// 基础脉冲
animate-pulse

// 跳跃动画（用于点点）
animate-bounce

// 自定义延迟
style={{ animationDelay: `${i * 50}ms` }}
```

## 🎨 颜色主题

每个页面都有独特的渐变背景：

```tsx
// 仪表盘 - 翠绿主题
from-emerald-50 via-white to-blue-50 
dark:from-slate-950 dark:via-slate-900 dark:to-slate-950

// 监控页面 - 中性主题
from-slate-50 via-white to-slate-100

// AI助手 - 翠绿蓝色
from-emerald-50 via-white to-blue-50

// 设备控制 - 蓝色主题
from-blue-50 via-white to-indigo-50

// 个人资料 - 紫粉主题
from-purple-50 via-white to-pink-50

// MCP商店 - 靛紫主题
from-indigo-50 via-white to-purple-50
```

## 🚀 使用方法

### 自动使用
Next.js 会自动为每个页面使用对应的 `loading.tsx` 文件：

```
访问 /dashboard → 自动显示 DashboardSkeleton
访问 /monitor → 自动显示 MonitorSkeleton
访问 /ai-assistant → 自动显示 AIAssistantSkeleton
```

### 手动使用
也可以在组件中手动使用：

```tsx
import { DashboardSkeleton } from "@/components/loading"

export function MyComponent() {
  const [loading, setLoading] = useState(true)
  
  if (loading) {
    return <DashboardSkeleton />
  }
  
  return <ActualContent />
}
```

### Suspense 边界
配合 React Suspense 使用：

```tsx
<Suspense fallback={<DashboardSkeleton />}>
  <DashboardContent />
</Suspense>
```

## 📱 响应式设计

所有骨架屏都完全响应式：

```tsx
// 移动端 1列，平板 2列，桌面 4列
grid-cols-1 md:grid-cols-2 lg:grid-cols-4

// 灵活的间距
gap-4 md:gap-6

// 自适应高度
h-32 md:h-40 lg:h-48
```

## 🎯 最佳实践

### 1. 匹配真实布局
每个骨架屏都精确匹配对应页面的实际布局

### 2. 渐进式加载
使用分阶段的动画延迟，创造自然的加载感

### 3. 品牌一致性
所有骨架屏都使用统一的设计语言和色彩

### 4. 性能优化
使用 CSS 动画而不是 JavaScript，确保流畅性能

## 🔮 未来扩展

### 添加新页面骨架屏

1. **创建骨架屏组件**:
```tsx
// components/loading/new-page-skeleton.tsx
export function NewPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50">
      {/* 页面特定的骨架屏布局 */}
    </div>
  )
}
```

2. **创建页面加载文件**:
```tsx
// app/new-page/loading.tsx
import { NewPageSkeleton } from "@/components/loading/new-page-skeleton"

export default function NewPageLoading() {
  return <NewPageSkeleton />
}
```

3. **更新导出文件**:
```tsx
// components/loading/index.ts
export { NewPageSkeleton } from "./new-page-skeleton"
```

## 🎉 总结

现在每个页面都有：
- ✨ **专属设计** - 完美匹配页面布局
- 🎨 **独特主题** - 每个页面都有专属配色
- ⚡ **流畅动画** - 分阶段进入效果
- 📱 **响应式** - 完美适配所有设备
- 🚀 **高性能** - 纯CSS动画，零卡顿

用户再也不会看到千篇一律的加载效果了！每个页面的加载体验都是独一无二的！🎊