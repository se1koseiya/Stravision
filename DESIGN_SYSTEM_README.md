# 🎨 STRAVISION 智慧农业平台设计系统

> 基于设计规范 v1.0 的完整设计系统实现

## 📋 概述

本设计系统为 STRAVISION 智慧农业平台提供了统一的视觉语言和组件规范，确保整个平台的一致性和专业性。

### 核心特点

- 🎨 **统一的色彩系统** - 青绿色主调 (#00D4AA)，深色背景 (#0A1628)
- 🔮 **玻璃态设计** - 半透明背景 + 20px 模糊效果
- 📐 **系统化的圆角** - 5个层级（4px - 24px）
- 🌓 **完美的深色模式** - 自动适配，无需额外配置
- ⚡ **流畅的动画** - 300ms 标准过渡
- 📱 **响应式设计** - 移动端优先

## 🚀 快速开始

### 1. 查看设计系统

```bash
npm run dev
# 访问 http://localhost:3000/design-system
```

### 2. 使用设计系统

```tsx
import { designSystem } from '@/lib/design-system';

// 创建玻璃态卡片
<div className="bg-card/80 backdrop-blur-[20px] border border-border rounded-[12px] p-6 shadow-design-lg">
  {/* 内容 */}
</div>
```

### 3. 查看文档

- 📖 [快速启动指南](./DESIGN_SYSTEM_QUICK_START.md) - 5分钟上手
- 📚 [完整应用指南](./DESIGN_SYSTEM_GUIDE.md) - 详细的组件和样式指南
- 🔄 [迁移指南](./DESIGN_SYSTEM_MIGRATION.md) - 如何迁移现有组件
- 📊 [项目总结](./DESIGN_SYSTEM_SUMMARY.md) - 完整的实现总结

## 🎨 设计规范

### 色彩系统

| 颜色 | 值 | 用途 |
|------|-----|------|
| Primary | `#00D4AA` | 主色调 - 青绿色 |
| Secondary | `#FF9F43` | 辅助色 - 橙色 |
| Background | `#0A1628` | 深色背景 |
| Card | `rgba(26, 38, 58, 0.8)` | 卡片背景 |
| Success | `#00D4AA` | 成功状态 |
| Warning | `#FF9F43` | 警告状态 |
| Error | `#EF4444` | 错误状态 |

### 圆角系统

| 名称 | 值 | 用途 |
|------|-----|------|
| xs | 4px | 小元素（徽章、标签） |
| sm | 8px | 按钮、输入框 |
| md | 12px | 卡片 |
| lg | 16px | 大卡片 |
| xl | 24px | 模态框、面板 |

### 阴影系统

| 层级 | 浅色模式 | 深色模式 |
|------|----------|----------|
| sm | `0 1px 2px rgba(0,0,0,0.04)` | `0 1px 2px rgba(0,0,0,0.3)` |
| md | `0 4px 8px rgba(0,0,0,0.08)` | `0 4px 8px rgba(0,0,0,0.4)` |
| lg | `0 8px 16px rgba(0,0,0,0.12)` | `0 8px 16px rgba(0,0,0,0.5)` |
| xl | `0 12px 24px rgba(0,0,0,0.16)` | `0 12px 24px rgba(0,0,0,0.6)` |

## 📦 文件结构

```
project/
├── lib/
│   └── design-system.ts              # 核心配置文件
├── app/
│   ├── globals.css                   # 全局样式（已更新）
│   └── design-system/
│       └── page.tsx                  # 展示页面
├── components/
│   └── design-system/
│       └── device-card-example.tsx   # 示例组件
└── docs/
    ├── DESIGN_SYSTEM_README.md       # 本文档
    ├── DESIGN_SYSTEM_QUICK_START.md  # 快速启动
    ├── DESIGN_SYSTEM_GUIDE.md        # 应用指南
    ├── DESIGN_SYSTEM_MIGRATION.md    # 迁移指南
    └── DESIGN_SYSTEM_SUMMARY.md      # 项目总结
```

## 🧩 核心组件

### 玻璃态卡片

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
  {/* 内容 */}
</div>
```

### 主按钮

```tsx
<button className="
  bg-primary 
  hover:bg-primary/90 
  text-white 
  rounded-lg 
  px-6 py-3 
  transition-all duration-300
  shadow-design-md
">
  确认操作
</button>
```

### 次要按钮

```tsx
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

### 输入框

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

### 状态徽章

```tsx
{/* 在线 */}
<span className="bg-primary/15 text-primary px-2 py-1 rounded-md text-xs">
  在线
</span>

{/* 警告 */}
<span className="bg-[#FF9F43]/15 text-[#FF9F43] px-2 py-1 rounded-md text-xs">
  警告
</span>

{/* 离线 */}
<span className="bg-destructive/15 text-destructive px-2 py-1 rounded-md text-xs">
  离线
</span>
```

## 🎯 使用示例

### 设备卡片

```tsx
import { Droplets } from 'lucide-react';

<div className="bg-card/80 backdrop-blur-[20px] border border-border rounded-[12px] p-6 shadow-design-lg group hover:bg-card/90 hover:scale-[1.01] transition-all duration-300">
  {/* 头部 */}
  <div className="flex items-start justify-between mb-4">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        <Droplets className="w-5 h-5" />
      </div>
      <div>
        <h3 className="font-medium text-foreground">水泵 #1</h3>
        <p className="text-xs text-muted-foreground">灌溉系统</p>
      </div>
    </div>
    <span className="text-xs px-2 py-1 rounded-md bg-primary/15 text-primary">
      在线
    </span>
  </div>

  {/* 数值 */}
  <div className="flex items-baseline gap-2 mb-4">
    <span className="text-4xl font-semibold text-foreground">120</span>
    <span className="text-lg text-muted-foreground">W</span>
  </div>

  {/* 底部 */}
  <div className="flex items-center justify-between pt-4 border-t border-border">
    <span className="text-xs text-muted-foreground">2分钟前</span>
    <button className="text-xs text-primary hover:text-primary/80">
      查看详情 →
    </button>
  </div>

  {/* 悬停光效 */}
  <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
</div>
```

### 数据卡片

```tsx
<div className="bg-card/80 backdrop-blur-[20px] border border-border rounded-[12px] p-6 shadow-design-lg">
  <div className="flex items-center justify-between mb-4">
    <span className="text-sm text-muted-foreground">环境温度</span>
    <span className="text-xs px-2 py-1 rounded-md bg-primary/15 text-primary">
      实时
    </span>
  </div>
  
  <div className="flex items-baseline gap-2 mb-4">
    <span className="text-4xl font-semibold text-foreground">19.2</span>
    <span className="text-muted-foreground">°C</span>
  </div>
  
  <div className="flex items-center gap-2 text-xs text-muted-foreground">
    <span>正常范围</span>
    <span className="text-primary">18-25°C</span>
  </div>
  
  {/* 进度条 */}
  <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: '64%' }} />
  </div>
</div>
```

## 🔧 开发工具

### 导入设计系统

```tsx
import { designSystem } from '@/lib/design-system';

// 使用颜色
const primaryColor = designSystem.colors.primary.DEFAULT;
const primaryWithAlpha = designSystem.colors.primary.rgba(0.15);

// 使用圆角
const cardRadius = designSystem.radius.md;

// 使用阴影
const cardShadow = designSystem.shadow.lg;
```

### CSS 变量

```css
/* 在 CSS 中使用 */
.custom-element {
  background: var(--primary);
  border-radius: var(--ds-radius-md);
  box-shadow: var(--ds-shadow-lg);
}
```

## 📱 响应式设计

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

## 🌓 深色模式

所有组件自动支持深色模式，无需额外配置：

```tsx
<div className="bg-background text-foreground">
  <div className="bg-card border-border">
    <button className="bg-primary text-primary-foreground">
      操作
    </button>
  </div>
</div>
```

## ✅ 最佳实践

1. **使用 CSS 变量** - 避免硬编码颜色
2. **保持一致性** - 使用统一的组件模式
3. **添加过渡动画** - 使用 `transition-all duration-300`
4. **支持深色模式** - 使用设计系统的颜色变量
5. **玻璃态效果** - 使用 `backdrop-blur-[20px]`
6. **响应式设计** - 使用 Tailwind 的响应式类

## 📊 迁移进度

### ✅ 已完成
- [x] 设计系统核心配置
- [x] 全局样式更新
- [x] 示例组件
- [x] 展示页面
- [x] 完整文档

### 🔄 待迁移
- [ ] 主要页面组件
- [ ] UI 组件库
- [ ] 仪表盘组件
- [ ] 设备控制组件

## 🎓 学习资源

### 文档
- [快速启动指南](./DESIGN_SYSTEM_QUICK_START.md) - 5分钟快速上手
- [应用指南](./DESIGN_SYSTEM_GUIDE.md) - 详细的使用说明
- [迁移指南](./DESIGN_SYSTEM_MIGRATION.md) - 组件迁移步骤
- [项目总结](./DESIGN_SYSTEM_SUMMARY.md) - 完整实现总结

### 示例
- 展示页面：`/design-system`
- 示例组件：`components/design-system/device-card-example.tsx`
- 设计系统配置：`lib/design-system.ts`

## 🤝 贡献指南

### 添加新组件

1. 在 `components/design-system/` 创建组件
2. 遵循设计系统规范
3. 添加到展示页面
4. 更新文档

### 更新设计系统

1. 修改 `lib/design-system.ts`
2. 更新 `app/globals.css`
3. 更新文档
4. 测试所有组件

## 📞 支持

遇到问题？

1. 查看 [快速启动指南](./DESIGN_SYSTEM_QUICK_START.md)
2. 访问展示页面 `/design-system`
3. 查看 [完整文档](./DESIGN_SYSTEM_GUIDE.md)
4. 联系开发团队

## 📄 许可证

本设计系统是 STRAVISION 智慧农业平台的一部分。

---

**版本**: 1.0  
**最后更新**: 2026-04-28  
**维护者**: STRAVISION 开发团队  
**状态**: ✅ 生产就绪
