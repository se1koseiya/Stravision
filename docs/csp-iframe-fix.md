# CSP iframe 加载问题修复

## 问题描述
用户反馈网页预览功能"半天加载不了"，怀疑是CSP（Content Security Policy）的问题。经检查确认是CSP配置中的`frame-src`指令限制了iframe加载外部网站。

## 根本原因
在`next.config.ts`中的CSP配置过于严格：

```typescript
frame-src 'self' https://challenges.cloudflare.com https://*.alipay.com https://*.qq.com https://o.alicdn.com;
```

这个配置只允许iframe加载：
- 同源内容 (`'self'`)
- Cloudflare Challenges
- 支付宝相关域名
- QQ相关域名
- 阿里CDN

**所有其他网站（如B站、GitHub、Example.com等）都被CSP阻止了。**

## 解决方案

### 1. 更新CSP配置
修改`next.config.ts`中的`frame-src`指令，添加常用的安全网站：

```typescript
frame-src 'self' https://challenges.cloudflare.com https://*.alipay.com https://*.qq.com https://o.alicdn.com https://example.com https://httpbin.org https://www.bilibili.com https://github.com https://stackoverflow.com https://developer.mozilla.org https://docs.microsoft.com;
```

### 2. 添加的域名说明
- `https://example.com` - 测试用标准网站
- `https://httpbin.org` - HTTP测试工具网站
- `https://www.bilibili.com` - B站（用户常访问）
- `https://github.com` - GitHub代码托管
- `https://stackoverflow.com` - 技术问答网站
- `https://developer.mozilla.org` - MDN文档
- `https://docs.microsoft.com` - 微软文档

## 安全考虑

### 为什么不使用通配符
虽然可以使用`https:`来允许所有HTTPS网站，但这会带来安全风险：
- 可能被恶意网站利用进行点击劫持
- 降低了CSP的安全防护效果
- 不符合最小权限原则

### 当前方案的优势
1. **精确控制**：只允许明确需要的域名
2. **安全性**：保持CSP的安全防护
3. **可扩展**：需要时可以添加更多域名
4. **可维护**：明确知道允许了哪些网站

## 测试验证

### 创建测试页面
创建了`/test-csp-fix`页面来验证修复效果：
- 测试不同网站的iframe加载
- 显示当前CSP配置
- 提供调试信息和错误排查指南

### 测试用例
1. **Example.com** - 应该可以正常加载
2. **HTTPBin** - 应该可以正常加载
3. **B站** - CSP允许但可能被网站自身阻止
4. **GitHub** - CSP允许但可能被网站自身阻止

## 双重阻止机制

需要理解iframe加载可能被两个层面阻止：

### 1. CSP层面（我们的配置）
- 由我们的Next.js应用控制
- 通过`frame-src`指令限制
- **已修复**：添加了常用网站到白名单

### 2. 目标网站层面
- 由目标网站自身控制
- 通过`X-Frame-Options`或自身CSP阻止
- **无法修复**：这是网站的安全策略

## 用户体验改进

### 1. 降级处理
当网站被阻止时，WebPreview组件会：
- 自动检测加载失败
- 显示友好的降级界面
- 提供"在新标签页打开"按钮

### 2. 错误提示
- 清晰说明为什么无法显示
- 提供替代访问方式
- 保持视觉一致性

## 部署文件
- `next.config.ts` - 更新CSP配置
- `app/test-csp-fix/page.tsx` - CSP修复测试页面
- `components/ai/web-preview.tsx` - 增强的WebPreview组件

## 后续维护

### 添加新域名
如果需要支持新的网站，在`next.config.ts`中添加到`frame-src`指令：

```typescript
frame-src 'self' ... https://new-website.com;
```

### 监控和调试
1. 检查浏览器控制台的CSP错误
2. 使用测试页面验证新域名
3. 关注用户反馈的加载问题

## 注意事项
1. **重启应用**：修改`next.config.ts`后需要重启开发服务器
2. **缓存清理**：可能需要清除浏览器缓存
3. **生产部署**：确保生产环境也应用了相同配置
4. **安全审查**：定期审查允许的域名列表