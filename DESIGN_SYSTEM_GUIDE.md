# 智慧农业平台设计系统应用指南

## 📋 概述

本文档基于设计规范 v1.0，提供了完整的设计系统实施指南。

## 🎨 核心设计原则

### 1. 色彩系统

#### 主色调
- **主色 (Primary)**: `#00D4AA` - 青绿色，用于主要操作、强调元素
- **辅助色 (Secondary)**: `#FF9F43` - 橙色，用于警告、次要强调

#### 中性色阶
```css
N-900: #0A1628  /* 深色背景 */
N-800: #1A263A  /* 卡片背景 */
N-700: #2F3F5F  /* 次级背景 */
N-600: #4F5F7F  /* 边框 */
N-500: #6F7F9F  /* 禁用文本 */
N-400: #8F9FBF  /* 次要文本 */
N-300: #AFBFDF  /* 辅助文本 */
N-200: #CFD7E6  /* 分隔线 */
N-100: #E8ECF4  /* 浅色背景 */
N-50:  #F8F9FA  /* 最浅背景 */
```

#### 功能色
```css
成功: #00D4AA (与主色相同)
警告: #FF9F43
错误: #EF4444
信息: #3B82F6
```

### 2. 字体规范

#### 字体家族
```css
--font-sans: var(--font-geist-sans), system-ui, -apple-system, sans-serif
--font-mono: var(--font-geist-mono)
```

#### 字号层级
```
H1: 32px / 40px (line-height) - 500 (weight)
H2: 28px / 36px - 500
H3: 24px / 32px - 500
Body: 16px / 24px - 400
Caption: 14px / 20px - 400
Number: 24px / 32px - 600
```

### 3. 圆角系统

```css
radius-xs: 4px   /* 小元素：徽章、标签 */
radius-sm: 8px   /* 按钮、输入框 */
radius-md: 12px  /* 卡片 */
radius-lg: 16px  /* 大卡片 */
radius-xl: 24px  /* 模态框、面板 */
```

### 4. 阴影系统

#### 浅色模式
```css
shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04)
shadow-md: 0 4px 8px rgba(0, 0, 0, 0.08)
shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.12)
shadow-xl: 0 12px 24px rgba(0, 0, 0, 0.16)
```

#### 深色模式
```css
shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3)
shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4)
shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.5)
shadow-xl: 0 12px 24px rgba(0, 0, 0, 0.6)
```

## 🧩 组件应用

### 设备卡片 (Device Card)

```tsx
<div className="
  bg-card/80 
  backdrop-blur-[20px] 
  border border-border 
  radius-md 
  p-4 
  shadow-design-lg
  hover:bg-card/90 
  transition-all duration-300
">
  {/* 卡片内容 */}
</div>
```

### 按钮 (Button)

#### 主按钮
```tsx
<button className="
  bg-primary 
  text-white 
  radius-sm 
  px-6 py-3 
  hover:bg-primary/90 
  active:bg-primary/80
  transition-all duration-300
">
  确认操作
</button>
```

#### 次要按钮
```tsx
<button className="
  bg-primary/15 
  text-primary 
  radius-sm 
  px-6 py-3 
  hover:bg-primary/25 
  active:bg-primary/35
  transition-all duration-300
">
  取消
</button>
```

### 开关 (Toggle)

```tsx
<div className="
  w-12 h-6 
  radius-md 
  bg-muted 
  data-[state=checked]:bg-primary
  transition-colors duration-300
">
  <div className="
    w-5 h-5 
    rounded-full 
    bg-white 
    shadow-md
    transition-transform duration-300
  " />
</div>
```

### 徽章 (Badge)

```tsx
{/* 成功徽章 */}
<span className="
  inline-flex items-center 
  radius-sm 
  px-2 py-1 
  text-xs 
  bg-primary/15 
  text-primary
">
  在线
</span>

{/* 警告徽章 */}
<span className="
  inline-flex items-center 
  radius-sm 
  px-2 py-1 
  text-xs 
  bg-warning/15 
  text-warning
">
  警告
</span>

{/* 错误徽章 */}
<span className="
  inline-flex items-center 
  radius-sm 
  px-2 py-1 
  text-xs 
  bg-destructive/15 
  text-destructive
">
  离线
</span>
```

### 输入框 (Input)

```tsx
<input className="
  w-full 
  bg-input 
  border border-border 
  radius-sm 
  px-4 py-3 
  text-foreground
  focus:outline-none 
  focus:ring-2 
  focus:ring-primary 
  focus:border-transparent
  transition-all duration-300
" />
```

### 数据卡片 (Data Card)

```tsx
<div className="
  bg-card/80 
  backdrop-blur-[20px] 
  border border-border 
  radius-md 
  p-6 
  shadow-design-lg
">
  <div className="flex items-center justify-between mb-4">
    <span className="text-muted-foreground text-sm">温度</span>
    <span className="text-primary text-xs">实时</span>
  </div>
  
  <div className="flex items-baseline gap-2">
    <span className="text-4xl font-semibold text-foreground">19.2</span>
    <span className="text-muted-foreground">°C</span>
  </div>
  
  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
    <span>正常范围</span>
    <span className="text-primary">18-25°C</span>
  </div>
</div>
```

### 图表容器 (Chart Container)

```tsx
<div className="
  bg-card/80 
  backdrop-blur-[20px] 
  border border-border 
  radius-lg 
  p-6 
  shadow-design-lg
">
  <h3 className="text-lg font-medium mb-4">环境数据趋势</h3>
  
  <div className="h-64">
    {/* 图表内容 */}
  </div>
</div>
```

## 🎭 玻璃态效果 (Glassmorphism)

### 标准玻璃卡片
```tsx
<div className="glass">
  {/* 内容 */}
</div>
```

### 带悬停效果的玻璃卡片
```tsx
<div className="glass glass-hover">
  {/* 内容 */}
</div>
```

### 自定义玻璃效果
```tsx
<div className="
  bg-card/80 
  backdrop-blur-[20px] 
  border border-border
">
  {/* 内容 */}
</div>
```

## 📐 布局系统

### 侧边栏 (Sidebar)
```tsx
<aside className="
  w-[280px] 
  bg-sidebar 
  backdrop-blur-[20px] 
  border-r border-sidebar-border
">
  {/* 侧边栏内容 */}
</aside>
```

### 顶部导航栏 (Topbar)
```tsx
<header className="
  h-16 
  bg-card/80 
  backdrop-blur-[20px] 
  border-b border-border
">
  {/* 导航内容 */}
</header>
```

### 内容区域
```tsx
<main className="
  flex-1 
  p-6 
  bg-background
">
  {/* 主要内容 */}
</main>
```

## 🎬 动画系统

### 过渡时长
```css
duration-150: 快速交互 (按钮点击)
duration-300: 标准过渡 (悬停效果)
duration-500: 慢速过渡 (页面切换)
```

### 缓动函数
```css
ease-out: 元素进入
ease-in: 元素退出
ease-in-out: 双向过渡
```

### 常用动画类
```tsx
{/* 悬停缩放 */}
<div className="hover:scale-[1.01] transition-transform duration-300">

{/* 悬停发光 */}
<div className="hover:shadow-[0_0_20px_rgba(0,212,170,0.3)] transition-shadow duration-300">

{/* 淡入淡出 */}
<div className="opacity-0 animate-in fade-in duration-500">
```

## 🌓 深色模式适配

所有组件都应支持深色模式，使用 CSS 变量自动适配：

```tsx
<div className="bg-background text-foreground">
  <div className="bg-card border-border">
    <button className="bg-primary text-primary-foreground">
      操作
    </button>
  </div>
</div>
```

## 📱 响应式设计

### 断点系统
```css
sm: 640px   /* 手机横屏 */
md: 768px   /* 平板 */
lg: 1024px  /* 小屏笔记本 */
xl: 1280px  /* 桌面 */
2xl: 1536px /* 大屏 */
```

### 响应式示例
```tsx
<div className="
  grid 
  grid-cols-1 
  md:grid-cols-2 
  lg:grid-cols-3 
  gap-4 
  md:gap-6
">
  {/* 响应式网格 */}
</div>
```

## 🔧 实用工具类

### 间距
```tsx
<div className="space-y-4">  {/* 垂直间距 16px */}
<div className="space-x-2">  {/* 水平间距 8px */}
<div className="gap-6">      {/* Grid/Flex 间距 24px */}
```

### 文本
```tsx
<p className="text-foreground">      {/* 主要文本 */}
<p className="text-muted-foreground"> {/* 次要文本 */}
<p className="text-primary">          {/* 强调文本 */}
```

### 边框
```tsx
<div className="border border-border">        {/* 标准边框 */}
<div className="border-2 border-primary">     {/* 强调边框 */}
<div className="divide-y divide-border">      {/* 分隔线 */}
```

## 📦 使用设计系统

### 导入设计系统
```tsx
import { designSystem } from '@/lib/design-system';

// 使用颜色
const primaryColor = designSystem.colors.primary.DEFAULT;

// 使用圆角
const cardRadius = designSystem.radius.md;

// 使用阴影
const cardShadow = designSystem.shadow.lg;
```

### 在组件中应用
```tsx
import { designSystem } from '@/lib/design-system';

export function CustomCard() {
  return (
    <div
      style={{
        background: designSystem.colors.primary.rgba(0.15),
        borderRadius: designSystem.radius.md,
        boxShadow: designSystem.shadow.lg,
      }}
    >
      {/* 内容 */}
    </div>
  );
}
```

## ✅ 设计检查清单

在创建新组件时，请确保：

- [ ] 使用设计系统中定义的颜色变量
- [ ] 应用正确的圆角尺寸
- [ ] 添加适当的阴影效果
- [ ] 支持深色模式
- [ ] 添加悬停和激活状态
- [ ] 使用平滑的过渡动画
- [ ] 确保响应式布局
- [ ] 保持一致的间距
- [ ] 使用玻璃态效果（如适用）
- [ ] 测试可访问性

## 🎯 最佳实践

1. **优先使用 CSS 变量**：使用 `var(--primary)` 而不是硬编码颜色
2. **保持一致性**：在整个应用中使用相同的组件模式
3. **性能优化**：使用 `backdrop-blur` 时注意性能影响
4. **可访问性**：确保足够的颜色对比度和键盘导航
5. **渐进增强**：确保在不支持某些特性的浏览器中有降级方案

## 📚 参考资源

- 设计规范文档：查看完整的设计规范
- 组件库：`/components` 目录中的实现示例
- 设计系统代码：`/lib/design-system.ts`
- 全局样式：`/app/globals.css`

---

**版本**: 1.0  
**最后更新**: 2026-04-28  
**维护者**: STRAVISION 开发团队
