# WebPreview 降级界面移除

## 更改说明
根据用户要求，移除了WebPreview组件中的降级界面处理逻辑。

## 具体更改

### 1. 移除降级检测逻辑
- 移除了`iframeError`状态管理
- 移除了`isLoading`状态管理
- 移除了`isLikelyBlocked`域名检测函数
- 移除了`shouldShowFallback`判断逻辑

### 2. 简化组件结构
**之前：** 复杂的条件渲染，包含降级界面
```tsx
{!shouldShowFallback && (
  <iframe ... />
)}
{shouldShowFallback && (
  <div>降级界面内容</div>
)}
```

**现在：** 直接渲染iframe
```tsx
<iframe
  className={cn("size-full", className)}
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
  src={finalUrl || undefined}
  title="Preview"
  {...props}
/>
```

### 3. 移除相关参数
- 移除了`fallbackContent`参数类型定义
- 移除了相关的错误处理回调
- 简化了组件接口

## 现在的行为
- iframe直接尝试加载目标URL
- 如果网站阻止iframe嵌入，会显示浏览器默认的错误页面或空白
- 不再显示自定义的降级界面
- CSP已配置为允许所有HTTPS网站

## 影响的文件
- `components/ai/web-preview.tsx` - 主要组件修改
- `app/ai-assistant/page.tsx` - 移除fallbackContent使用
- 其他测试页面会自动适配简化后的接口

## 用户体验
- 更简洁的实现
- 减少了复杂的状态管理
- iframe加载失败时显示浏览器原生行为
- 保持了基本的iframe功能