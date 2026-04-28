# 设计系统迁移指南

## 📋 概述

本文档指导如何将现有组件迁移到新的设计系统规范。

## 🎯 迁移目标

1. 统一视觉风格
2. 提升用户体验
3. 改善代码可维护性
4. 确保设计一致性

## 🔄 颜色迁移

### 旧颜色 → 新颜色映射

```tsx
// ❌ 旧的硬编码颜色
className="bg-emerald-500"
className="text-emerald-600"
className="border-emerald-400"

// ✅ 新的设计系统颜色
className="bg-primary"
className="text-primary"
className="border-primary"
```

### 具体替换规则

| 旧颜色 | 新颜色 | 用途 |
|--------|--------|------|
| `emerald-500` | `primary` | 主色调 |
| `emerald-600` | `primary` | 主色调深色 |
| `orange-500` | `secondary` | 辅助色 |
| `red-500` | `destructive` | 错误/危险 |
| `blue-500` | `info` | 信息提示 |
| `gray-900` | `background` | 背景色 |
| `gray-800` | `card` | 卡片背景 |
| `gray-700` | `muted` | 次要背景 |
| `gray-600` | `border` | 边框 |
| `gray-400` | `muted-foreground` | 次要文本 |

### 深色模式颜色

```tsx
// ❌ 旧的深色模式
className="bg-[#111827] dark:bg-[#1F2937]"

// ✅ 新的深色模式（自动适配）
className="bg-background"
className="bg-card"
```

## 🎨 背景和玻璃态效果

### 卡片背景

```tsx
// ❌ 旧的卡片样式
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">

// ✅ 新的玻璃态卡片
<div className="glass radius-md">
// 或
<div className="bg-card/80 backdrop-blur-[20px] border border-border rounded-[12px] shadow-design-lg">
```

### 深色背景

```tsx
// ❌ 旧的深色背景
className="bg-[#050505]"
className="bg-[#0A0A0A]"
className="bg-[#111827]"

// ✅ 新的背景色
className="bg-background"  // #0A1628 in dark mode
className="bg-card"        // rgba(26, 38, 58, 0.8) in dark mode
```

## 📐 圆角迁移

```tsx
// ❌ 旧的圆角
className="rounded-lg"    // 8px
className="rounded-xl"    // 12px
className="rounded-2xl"   // 16px
className="rounded-3xl"   // 24px

// ✅ 新的圆角系统
className="radius-sm"     // 8px
className="radius-md"     // 12px
className="radius-lg"     // 16px
className="radius-xl"     // 24px

// 或使用 Tailwind 的 rounded-[Xpx]
className="rounded-[8px]"
className="rounded-[12px]"
className="rounded-[16px]"
className="rounded-[24px]"
```

## 🎭 阴影迁移

```tsx
// ❌ 旧的阴影
className="shadow-md"
className="shadow-lg"
className="shadow-xl"

// ✅ 新的阴影系统
className="shadow-design-md"
className="shadow-design-lg"
className="shadow-design-xl"
```

## 🔘 按钮迁移

### 主按钮

```tsx
// ❌ 旧的主按钮
<button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2">

// ✅ 新的主按钮
<button className="bg-primary hover:bg-primary/90 text-white rounded-lg px-6 py-3 transition-all duration-300 shadow-design-md">
```

### 次要按钮

```tsx
// ❌ 旧的次要按钮
<button className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg px-4 py-2">

// ✅ 新的次要按钮
<button className="bg-primary/15 hover:bg-primary/25 text-primary rounded-lg px-6 py-3 transition-all duration-300">
```

## 📝 输入框迁移

```tsx
// ❌ 旧的输入框
<input className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500">

// ✅ 新的输入框
<input className="bg-input border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300">
```

## 🏷️ 徽章迁移

```tsx
// ❌ 旧的徽章
<span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs">在线</span>

// ✅ 新的徽章
<span className="bg-primary/15 text-primary px-2 py-1 rounded-md text-xs">在线</span>
```

## 📊 数据卡片迁移

```tsx
// ❌ 旧的数据卡片
<div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
  <h3 className="text-gray-500 text-sm mb-2">温度</h3>
  <p className="text-3xl font-bold text-gray-900 dark:text-white">19.2°C</p>
</div>

// ✅ 新的数据卡片
<div className="bg-card/80 backdrop-blur-[20px] border border-border rounded-[12px] p-6 shadow-design-lg">
  <h3 className="text-muted-foreground text-sm mb-2">温度</h3>
  <p className="text-3xl font-bold text-foreground">19.2°C</p>
</div>
```

## 🎨 渐变和特效

### 主色渐变

```tsx
// ❌ 旧的渐变
className="bg-gradient-to-r from-emerald-500 to-emerald-600"

// ✅ 新的渐变
className="bg-gradient-to-r from-primary to-primary/80"
```

### 悬停光效

```tsx
// ✅ 新增悬停光效
<div className="group relative">
  {/* 内容 */}
  <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
</div>
```

## 🔄 迁移步骤

### 1. 全局搜索替换

使用 VS Code 的全局搜索替换功能：

```
查找: bg-emerald-500
替换: bg-primary

查找: text-emerald-600
替换: text-primary

查找: border-emerald-400
替换: border-primary

查找: bg-\[#111827\]
替换: bg-background

查找: bg-\[#1F2937\]
替换: bg-card
```

### 2. 更新组件库

优先迁移以下组件：

1. **按钮组件** (`components/ui/button.tsx`)
2. **卡片组件** (`components/ui/card.tsx`)
3. **输入组件** (`components/ui/input.tsx`)
4. **徽章组件** (`components/ui/badge.tsx`)
5. **对话框组件** (`components/ui/dialog.tsx`)

### 3. 更新页面

按优先级迁移页面：

1. **首页** (`app/page.tsx`)
2. **仪表盘** (`app/dashboard/page.tsx`)
3. **设备控制** (`app/device-control/page.tsx`)
4. **监控页面** (`app/monitor/page.tsx`)
5. **AI 助手** (`app/ai-assistant/page.tsx`)

### 4. 测试验证

- [ ] 浅色模式显示正常
- [ ] 深色模式显示正常
- [ ] 悬停效果正常
- [ ] 动画流畅
- [ ] 响应式布局正常
- [ ] 可访问性符合标准

## 📝 迁移检查清单

### 组件级别

- [ ] 移除所有硬编码颜色（如 `#111827`, `#00D4AA`）
- [ ] 使用 CSS 变量（如 `var(--primary)`, `var(--background)`）
- [ ] 应用新的圆角系统
- [ ] 应用新的阴影系统
- [ ] 添加玻璃态效果（如适用）
- [ ] 添加平滑过渡动画
- [ ] 确保深色模式兼容

### 页面级别

- [ ] 更新页面背景色
- [ ] 更新卡片样式
- [ ] 更新按钮样式
- [ ] 更新输入框样式
- [ ] 更新文本颜色
- [ ] 测试响应式布局
- [ ] 测试交互效果

## 🎯 最佳实践

### 1. 使用设计系统工具

```tsx
import { designSystem } from '@/lib/design-system';

// 在需要动态样式时使用
const cardStyle = {
  background: designSystem.colors.primary.rgba(0.15),
  borderRadius: designSystem.radius.md,
  boxShadow: designSystem.shadow.lg,
};
```

### 2. 保持一致性

```tsx
// ✅ 好的做法 - 使用一致的模式
<div className="bg-card/80 backdrop-blur-[20px] border border-border rounded-[12px] p-6 shadow-design-lg">

// ❌ 避免混用不同的模式
<div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-xl p-6 shadow-lg">
```

### 3. 渐进式迁移

不要一次性修改所有文件，按模块逐步迁移：

1. 先迁移核心组件库
2. 再迁移常用页面
3. 最后迁移边缘功能

### 4. 保留备份

```bash
# 创建迁移分支
git checkout -b design-system-migration

# 提交前测试
npm run build
npm run test
```

## 🐛 常见问题

### Q: 颜色看起来不对？

A: 确保使用了正确的 CSS 变量，并且在深色模式下测试。

### Q: 玻璃态效果不显示？

A: 检查是否添加了 `backdrop-blur-[20px]` 和半透明背景。

### Q: 动画不流畅？

A: 确保添加了 `transition-all duration-300` 或类似的过渡类。

### Q: 深色模式颜色不对？

A: 使用 CSS 变量而不是硬编码颜色，变量会自动适配深色模式。

## 📚 参考资源

- [设计系统指南](./DESIGN_SYSTEM_GUIDE.md)
- [设计系统代码](./lib/design-system.ts)
- [组件示例](./components/design-system/)
- [展示页面](./app/design-system/page.tsx)

## 🎉 迁移完成后

- [ ] 运行完整测试套件
- [ ] 在多个浏览器中测试
- [ ] 测试移动端显示
- [ ] 更新文档
- [ ] 通知团队成员
- [ ] 部署到测试环境

---

**版本**: 1.0  
**最后更新**: 2026-04-28  
**维护者**: STRAVISION 开发团队
