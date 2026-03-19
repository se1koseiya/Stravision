# 长辈友好模式功能说明

## 功能概述

长辈友好模式是为了让年长用户更容易使用整个应用而设计的无障碍功能。开启此模式后，所有页面的字体大小会显著增大，提高可读性和用户体验。

## 主要特性

### 1. 全局支持
- 所有页面都支持长辈友好模式
- 设置在根布局中全局管理
- 状态在所有页面间保持同步

### 2. 字体大小增强
- 所有文字尺寸自动放大一个级别
- 数字显示更加清晰醒目
- 标签和说明文字更易阅读

### 3. 图标尺寸优化
- 图标尺寸相应增大
- 保持视觉平衡和美观

### 4. 间距调整
- 元素间距适当增加
- 提供更好的视觉分离

### 5. 持久化设置
- 用户选择自动保存到localStorage
- 下次访问时自动恢复设置

## 使用方法

### 统一的切换方式
在所有页面的右上角都有眼睛图标按钮：
1. 点击切换长辈友好模式
2. 开启时图标为实心眼睛，关闭时为空心眼睛
3. Logo右侧会显示"长辈友好模式"徽章提示

### 切换按钮状态
- **关闭状态**: 空心眼睛图标，灰色背景
- **开启状态**: 实心眼睛图标，蓝色背景

## 支持的页面

- ✅ Dashboard (仪表盘)
- ✅ AI Assistant (AI助手)
- ✅ Device Control (设备控制)
- ✅ 所有其他页面 (通过全局Context支持)

## 技术实现

### 全局Context管理
```typescript
// 在根布局中提供全局Context
<ElderFriendlyProvider>
  {/* 所有页面内容 */}
</ElderFriendlyProvider>

// 在任何页面中使用
const { isElderFriendlyMode, toggleElderFriendlyMode } = useElderFriendly()
```

### 统一的切换组件
```typescript
// 可配置的切换组件
<ElderFriendlyToggle 
  showBadge={true}    // 显示状态徽章
  showButton={true}   // 显示切换按钮
/>
```

### 通用页面头部
```typescript
// 统一的页面头部组件，包含长辈友好模式支持
<PageHeader user={currentUser}>
  {/* 页面特定的头部内容 */}
</PageHeader>
```

### CSS样式增强
```css
/* 长辈友好模式下的字体大小映射 */
.elder-friendly-text .text-xs { @apply text-sm; }
.elder-friendly-text .text-sm { @apply text-base; }
.elder-friendly-text .text-base { @apply text-lg; }
/* ... 更多尺寸映射 */
```

### 页面级别适配
每个页面的主容器都支持长辈友好模式：
```typescript
<div className={cn(
  "main-container",
  isElderFriendlyMode && "elder-friendly-text"
)}>
```

## 组件适配状态

- ✅ IOSWidgetCard (基础卡片)
- ✅ TemperatureWidget (温度组件)
- ✅ HumidityWidget (湿度组件)
- ✅ CO2Widget (CO2组件)
- ✅ TopBanner (顶部横幅)
- ✅ PageHeader (页面头部)
- ✅ ElderFriendlyToggle (切换组件)
- 🔄 其他组件持续适配中...

## 测试页面

访问 `/test-elder-friendly` 可以测试长辈友好模式的效果。

## 架构优势

1. **全局一致性**: 所有页面使用相同的长辈友好模式逻辑
2. **组件复用**: 统一的切换组件和页面头部组件
3. **状态同步**: 在任何页面切换模式，其他页面立即生效
4. **易于维护**: 集中管理样式和逻辑

## 未来改进

1. **更多组件支持**: 逐步为所有组件添加长辈友好模式支持
2. **对比度增强**: 考虑增加高对比度选项
3. **语音提示**: 集成语音朗读功能
4. **简化界面**: 提供简化版界面选项
5. **快捷键支持**: 添加键盘快捷键切换
6. **字体大小级别**: 提供多个字体大小级别选择

## 无障碍设计原则

本功能遵循以下无障碍设计原则：
- **可感知性**: 通过增大字体提高可读性
- **可操作性**: 保持简单的切换操作
- **可理解性**: 清晰的视觉反馈和状态提示
- **健壮性**: 兼容各种设备和浏览器

## 浏览器兼容性

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 相关文件

- `lib/contexts/elder-friendly-context.tsx` - Context管理
- `app/globals.css` - CSS样式定义
- `app/layout.tsx` - 全局Provider集成
- `components/elder-friendly-toggle.tsx` - 切换组件
- `components/page-header.tsx` - 通用页面头部
- `app/dashboard/page.tsx` - Dashboard页面集成
- `app/ai-assistant/page.tsx` - AI助手页面集成
- `app/device-control/page.tsx` - 设备控制页面集成
- `app/test-elder-friendly/page.tsx` - 测试页面