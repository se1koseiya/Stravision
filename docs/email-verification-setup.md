# 邮箱验证功能配置指南

本文档介绍如何配置和使用基于 Resend 的邮箱验证功能。

## 功能概述

邮箱验证功能用于在用户注册时验证邮箱的真实性，包括：

- 发送6位数字验证码到用户邮箱
- 验证码有效期为10分钟
- 防止重复发送（60秒冷却时间）
- 验证码使用后自动失效
- 美观的邮件模板设计

## 配置步骤

### 1. 注册 Resend 账号

访问 [Resend](https://resend.com) 并注册账号。

### 2. 获取 API Key

1. 登录 Resend 控制台
2. 进入 [API Keys](https://resend.com/api-keys) 页面
3. 点击 "Create API Key"
4. 复制生成的 API Key（格式：`re_xxxxx`）

### 3. 配置发件人邮箱

#### 测试环境（推荐新手）

Resend 提供测试邮箱 `onboarding@resend.dev`，无需验证即可使用：

```env
RESEND_FROM_EMAIL=Stravision <onboarding@resend.dev>
```

**注意**：测试邮箱只能发送到你在 Resend 账号中添加的邮箱地址。

#### 生产环境

使用自己的域名邮箱：

1. 在 Resend 控制台添加你的域名
2. 配置 DNS 记录（按照 Resend 提供的说明）
3. 等待域名验证通过
4. 使用你的域名邮箱：

```env
RESEND_FROM_EMAIL=Stravision <noreply@yourdomain.com>
```

### 4. 配置环境变量

在 `.env.local` 文件中添加：

```env
# Resend API Key
RESEND_API_KEY=re_your_actual_api_key_here

# 发件人邮箱（测试环境）
RESEND_FROM_EMAIL=Stravision <onboarding@resend.dev>

# 或生产环境
# RESEND_FROM_EMAIL=Stravision <noreply@yourdomain.com>
```

## 数据库结构

系统会自动创建以下表和字段：

### users 表新增字段

```sql
email_verified INTEGER DEFAULT 0        -- 邮箱是否已验证（0=未验证，1=已验证）
email_verified_at INTEGER               -- 邮箱验证时间戳
```

### email_verifications 表

```sql
CREATE TABLE email_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,                  -- 邮箱地址
  code TEXT NOT NULL,                   -- 6位验证码
  expires_at INTEGER NOT NULL,          -- 过期时间戳
  used INTEGER DEFAULT 0,               -- 是否已使用（0=未使用，1=已使用）
  created_at INTEGER NOT NULL           -- 创建时间戳
)
```

## API 接口

### 1. 发送验证码

**端点**: `POST /api/auth/send-verification`

**请求体**:
```json
{
  "email": "user@example.com"
}
```

**响应**:
```json
{
  "success": true,
  "message": "验证码已发送，请查收邮件"
}
```

**速率限制**: 每个IP每分钟最多3次请求

### 2. 验证邮箱

**端点**: `POST /api/auth/verify-email`

**请求体**:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**响应**:
```json
{
  "success": true,
  "message": "邮箱验证成功"
}
```

**速率限制**: 每个IP每分钟最多5次验证尝试

## 前端集成

注册页面已集成邮箱验证功能：

1. 用户输入邮箱后点击"获取验证码"
2. 系统发送验证码到用户邮箱
3. 用户输入收到的6位验证码
4. 提交注册时先验证邮箱，验证通过后完成注册

### 关键功能

- **倒计时**: 发送验证码后60秒内不能重复发送
- **实时验证**: 输入框自动过滤非数字字符
- **错误提示**: 清晰的错误信息提示
- **加载状态**: 发送和验证过程中的加载动画

## 邮件模板

邮件采用响应式设计，包含：

- 渐变色背景
- 品牌 Logo
- 突出显示的验证码
- 过期时间提醒
- 安全提示

## 安全特性

1. **验证码随机生成**: 6位数字，100000-999999范围
2. **有效期限制**: 10分钟后自动过期
3. **一次性使用**: 验证成功后立即失效
4. **速率限制**: 防止暴力破解和垃圾邮件
5. **数据库索引**: 优化查询性能

## 维护和清理

### 清理过期验证码

可以通过定时任务清理过期的验证码记录：

```typescript
import { cleanupExpiredVerifications } from '@/lib/email-verification-service';

// 在定时任务中调用
await cleanupExpiredVerifications();
```

建议每天执行一次清理任务。

## 故障排查

### 1. 邮件发送失败

**检查项**:
- RESEND_API_KEY 是否正确配置
- API Key 是否有效
- 发件人邮箱是否已验证（生产环境）
- Resend 账号是否有足够的配额

### 2. 收不到邮件

**检查项**:
- 检查垃圾邮件文件夹
- 确认邮箱地址正确
- 测试环境需要在 Resend 控制台添加接收邮箱
- 查看 Resend 控制台的发送日志

### 3. 验证码无效

**检查项**:
- 验证码是否已过期（10分钟）
- 验证码是否已被使用
- 邮箱地址是否匹配
- 数据库连接是否正常

## 测试建议

### 开发环境测试

1. 使用 `onboarding@resend.dev` 作为发件人
2. 在 Resend 控制台添加你的测试邮箱
3. 测试完整的注册流程

### 生产环境测试

1. 配置并验证自己的域名
2. 测试不同邮箱服务商（Gmail, Outlook, QQ等）
3. 检查邮件在不同客户端的显示效果
4. 测试速率限制功能

## 成本估算

Resend 定价（截至2024年）：

- **免费套餐**: 每月3,000封邮件
- **付费套餐**: $20/月起，包含50,000封邮件

对于大多数中小型应用，免费套餐已经足够使用。

## 参考资源

- [Resend 官方文档](https://resend.com/docs)
- [Resend Next.js 集成指南](https://resend.com/docs/send-with-nextjs)
- [Resend API 参考](https://resend.com/docs/api-reference)

## 后续优化建议

1. **邮件模板多样化**: 支持欢迎邮件、密码重置等场景
2. **国际化支持**: 根据用户语言发送不同语言的邮件
3. **邮件统计**: 记录邮件发送成功率、打开率等
4. **备用方案**: 集成短信验证作为备选方案
5. **用户体验**: 添加邮件预览功能
