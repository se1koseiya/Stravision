# 设计系统快速启动指南

## 🚀 5分钟快速上手

### 1. 查看设计系统展示页面

```bash
npm run dev
# 访问 http://localhost:3000/design-system
```

在这个页面你可以看到：
- ✅ 完整的色彩系统
- ✅ 字体规范
- ✅ 所有组件示例
- ✅ 布局系统
- ✅ 实际应用案例

### 2. 核心颜色速查

```tsx
// 主色 - 青绿色
className="bg-primary"           // #00D4AA
className="text-primary"
className="border-primary"

// 背景色
className="bg-background"        // #0A1628 (深色模式)
className="bg-card"              // rgba(26, 38, 58, 0.8)

// 文本色
className="text-foreground"      // 主要文本
className="text-muted-foreground" // 次要文本

// 功能色
className="bg-destructive"       // 错误/危险
className="bg-[#FF9F43]"        // 警告/辅助色
```

### 3. 快速创建玻璃态卡片

```tsx
<div className="
  bg-card/80 
  backdrop-blur-[20px] 
  border border-border 
  rounded-[12px]
  p-6 
  shadow-design-lg
  hover:bg-card/90
  transition-all duration-300
">
  {/* 你的内容 */}
</div>
```

### 4. 快速创建按钮

```tsx
{/* 主按钮 */}
<button className="
  bg-primary 
  hover:bg-primary/90 
  text-white 
  rounded-lg 
  px-6 py-3 
  transition-all duration-300
">
  确认
</button>

{/* 次要按钮 */}
<button className="
  bg-primary/15 
  hover:bg-primary/25 
  text-primary 
  rounded-lg 
  px-6 py-3 
  transition-all duration-300
">
  取消
</button>
```

### 5. 快速创建输入框

```tsx
<input className="
  w-full 
  bg-input 
  border border-border 
  rounded-lg 
  px-4 py-3 
  focus:ring-2 
  focus:ring-primary 
  transition-all duration-300
" />
```

## 📦 使用设计系统对象

```tsx
import { designSystem } from '@/lib/design-system';

// 获取颜色
const primary = designSystem.colors.primary.DEFAULT;
const primaryWithAlpha = designSystem.colors.primary.rgba(0.15);

// 获取圆角
const cardRadius = designSystem.radius.md; // "12px"

// 获取阴影
const cardShadow = designSystem.shadow.lg;
```

## 🎨 常用组合

### 数据卡片
```tsx
<div className="bg-card/80 backdrop-blur-[20px] border border-border rounded-[12px] p-6 shadow-design-lg">
  <div className="flex items-center justify-between mb-4">
    <span className="text-muted-foreground text-sm">温度</span>
    <span className="text-xs px-2 py-1 rounded-md bg-primary/15 text-primary">实时</span>
  </div>
  <div className="flex items-baseline gap-2">
    <span className="text-4xl font-semibold text-foreground">19.2</span>
    <span className="text-muted-foreground">°C</span>
  </div>
</div>
```

### 状态徽章
```tsx
{/* 成功 */}
<span className="bg-primary/15 text-primary px-2 py-1 rounded-md text-xs">在线</span>

{/* 警告 */}
<span className="bg-[#FF9F43]/15 text-[#FF9F43] px-2 py-1 rounded-md text-xs">警告</span>

{/* 错误 */}
<span className="bg-destructive/15 text-destructive px-2 py-1 rounded-md text-xs">离线</span>
```

## 🔄 迁移现有组件

### 步骤1: 替换颜色
```tsx
// ❌ 旧的
className="bg-emerald-500"

// ✅ 新的
className="bg-primary"
```

### 步骤2: 替换背景
```tsx
// ❌ 旧的
className="bg-[#111827]"

// ✅ 新的
className="bg-background"
```

### 步骤3: 添加玻璃态效果
```tsx
// ❌ 旧的
className="bg-white dark:bg-gray-800"

// ✅ 新的
className="bg-card/80 backdrop-blur-[20px]"
```

## 📚 完整文档

- **应用指南**: [DESIGN_SYSTEM_GUIDE.md](./DESIGN_SYSTEM_GUIDE.md)
- **迁移指南**: [DESIGN_SYSTEM_MIGRATION.md](./DESIGN_SYSTEM_MIGRATION.md)
- **项目总结**: [DESIGN_SYSTEM_SUMMARY.md](./DESIGN_SYSTEM_SUMMARY.md)

## 🎯 核心原则

1. **使用 CSS 变量** - 不要硬编码颜色
2. **保持一致性** - 使用统一的组件模式
3. **支持深色模式** - 所有组件自动适配
4. **平滑过渡** - 添加 `transition-all duration-300`
5. **玻璃态效果** - 使用 `backdrop-blur-[20px]`

## ✅ 检查清单

创建新组件时确保：
- [ ] 使用 CSS 变量而不是硬编码颜色
- [ ] 应用正确的圆角（8px, 12px, 16px, 24px）
- [ ] 添加适当的阴影
- [ ] 支持深色模式
- [ ] 添加悬停效果
- [ ] 使用平滑过渡动画

## 🎉 开始使用

1. 访问 `/design-system` 查看所有组件
2. 复制你需要的组件代码
3. 根据需求调整
4. 测试深色模式
5. 完成！

---

**需要帮助？** 查看完整文档或访问设计系统展示页面。
