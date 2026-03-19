# 网页预览iframe阻止问题修复

## 问题描述
用户在使用工作室面板的网页预览功能时，遇到"已阻止此内容"的错误。这是因为许多网站（如B站、GitHub、YouTube等）设置了安全策略来阻止在iframe中显示内容。

## 根本原因
1. **X-Frame-Options头部**：网站设置`X-Frame-Options: DENY`或`SAMEORIGIN`
2. **Content-Security-Policy**：CSP策略中的`frame-ancestors`指令限制iframe嵌入
3. **安全考虑**：防止点击劫持（clickjacking）攻击

## 解决方案

### 1. 增强WebPreviewBody组件
- **自动检测**：识别常见的会阻止iframe的网站域名
- **错误处理**：监听iframe的加载错误事件
- **优雅降级**：当iframe被阻止时显示美观的降级界面

### 2. 降级界面特性
- **视觉一致性**：使用相同的设计语言和颜色主题
- **用户友好**：清晰说明为什么无法显示内容
- **功能完整**：提供"在新标签页打开"按钮
- **信息展示**：显示网站域名和完整URL

### 3. 技术实现

```tsx
export const WebPreviewBody = ({ className, loading, src, fallbackContent, ...props }: WebPreviewBodyProps) => {
  const { url } = useWebPreview()
  const [iframeError, setIframeError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const finalUrl = src ?? url

  // 检查URL是否可能被阻止
  const isLikelyBlocked = (url: string) => {
    if (!url) return false
    try {
      const domain = new URL(url).hostname.toLowerCase()
      const blockedDomains = [
        'bilibili.com', 'youtube.com', 'facebook.com', 'twitter.com', 
        'instagram.com', 'tiktok.com', 'weibo.com', 'zhihu.com',
        'baidu.com', 'google.com', 'github.com'
      ]
      return blockedDomains.some(blocked => domain.includes(blocked))
    } catch {
      return false
    }
  }

  const shouldShowFallback = iframeError || isLikelyBlocked(finalUrl || '')

  return (
    <div className="flex-1 relative">
      {!shouldShowFallback && (
        <iframe
          onLoad={() => { setIsLoading(false); setIframeError(false) }}
          onError={() => { setIsLoading(false); setIframeError(true) }}
          // ... 其他props
        />
      )}
      
      {shouldShowFallback && (
        // 降级界面UI
      )}
    </div>
  )
}
```

## 支持的检测域名
组件会自动检测以下常见的阻止iframe的网站：
- bilibili.com (B站)
- youtube.com (YouTube)
- github.com (GitHub)
- facebook.com, twitter.com, instagram.com (社交媒体)
- baidu.com, google.com (搜索引擎)
- zhihu.com, weibo.com (中文社区)
- tiktok.com (短视频)

## 用户体验改进
1. **即时反馈**：用户立即看到为什么无法显示内容
2. **替代方案**：提供"在新标签页打开"按钮
3. **视觉连贯**：降级界面与整体设计保持一致
4. **信息透明**：显示完整的URL和域名信息

## 测试页面
创建了专门的测试页面 `/test-web-preview-enhanced` 来验证：
- 被阻止网站的降级效果
- 正常网站的iframe显示
- 不同类型网站的处理方式
- 用户交互功能

## 部署位置
- `components/ai/web-preview.tsx` - 增强的WebPreview组件
- `app/ai-assistant/page.tsx` - AI助手工作室面板
- `app/test-web-preview-enhanced/page.tsx` - 功能测试页面

## 后续优化建议
1. **动态检测**：可以考虑先尝试加载iframe，失败后再显示降级界面
2. **缓存机制**：记住哪些域名会被阻止，避免重复尝试
3. **用户设置**：允许用户选择是否尝试iframe加载
4. **截图服务**：集成第三方截图服务作为预览替代方案