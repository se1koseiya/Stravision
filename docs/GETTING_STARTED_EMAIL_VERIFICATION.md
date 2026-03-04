# 🚀 邮箱验证功能 - 立即开始

## 3分钟快速配置

### 步骤 1: 获取 Resend API Key

1. 打开浏览器访问 👉 https://resend.com
2. 点击 "Sign Up" 注册账号（支持 GitHub 登录）
3. 登录后访问 👉 https://resend.com/api-keys
4. 点击 "Create API Key" 按钮
5. 输入名称（如：`Stravision Development`）
6. 复制生成的 API Key（格式：`re_xxxxx`）

### 步骤 2: 配置环境变量

打开项目根目录的 `.env.local` 文件（如果不存在则创建），添加：

```env
# Resend API Key（必填）
RESEND_API_KEY=re_xxxxx  # 替换为你的实际 API Key

# 发件人邮箱（可选，默认使用测试邮箱）
RESEND_FROM_EMAIL=Stravision <onboarding@resend.dev>
```

**💡 提示**: 
- 测试环境使用 `onboarding@resend.dev` 即可，无需额外配置
- 生产环境需要配置自己的域名（见下文）

### 步骤 3: 了解测试环境限制

⚠️ **重要提示**: 使用测试邮箱 `onboarding@resend.dev` 时，**只能发送到你的 Resend 账号注册邮箱**（即 `jokertenseven@gmail.com`）。

如果需要发送到其他邮箱，必须：
1. 在 Resend 控制台验证自己的域名
2. 使用该域名的邮箱作为发件人

**测试环境建议**:
- 使用你的 Resend 账号邮箱（`jokertenseven@gmail.com`）进行测试
- 或者立即配置自己的域名（见下文"生产环境配置"）

### 步骤 4: 测试邮件服务

在项目根目录运行（**使用你的 Resend 账号邮箱**）：

```bash
npm run test:email jokertenseven@gmail.com
```

⚠️ **注意**: 测试邮箱只能发送到你的 Resend 账号邮箱！

如果看到 ✅ 成功提示，说明配置正确！

### 步骤 5: 启动开发服务器

```bash
npm run dev
```

### 步骤 6: 测试注册流程

1. 打开浏览器访问 👉 http://localhost:3000/register
2. 输入邮箱地址（**必须是 `jokertenseven@gmail.com`**）
3. 点击 "获取验证码" 按钮
4. 检查邮箱收到的验证码（可能在垃圾邮件文件夹）
5. 输入6位验证码
6. 完成其他注册信息并提交

🎉 恭喜！邮箱验证功能已成功运行！

⚠️ **测试限制**: 目前只能使用 `jokertenseven@gmail.com` 测试。要支持其他邮箱，请配置自己的域名（见下文）。

## 📧 邮件示例

你将收到如下格式的邮件：

```
主题: 验证您的邮箱 - Stravision

🍓 Stravision

验证您的邮箱

感谢您注册 Stravision！请使用以下验证码完成注册：

┌─────────────┐
│   123456    │  ← 6位验证码
└─────────────┘

此验证码将在 10分钟 后失效

⚠️ 如果这不是您的操作，请忽略此邮件

© 2026 Stravision - AI驱动的智慧农业平台
```

## 🔧 常见问题

### Q1: 收不到邮件？

**解决方案**:
1. ✅ **确认使用的是你的 Resend 账号邮箱**（`jokertenseven@gmail.com`）
2. ✅ 检查垃圾邮件文件夹
3. ✅ 验证 RESEND_API_KEY 配置正确
4. ✅ 查看 Resend 控制台的发送日志

⚠️ **重要**: 测试邮箱 `onboarding@resend.dev` 只能发送到你的 Resend 账号邮箱！

### Q2: 提示 "请求过于频繁"？

**解决方案**:
- 系统有60秒冷却时间，等待倒计时结束后重试
- 速率限制：每分钟最多3次发送请求

### Q3: 验证码显示 "无效或已过期"？

**解决方案**:
1. ✅ 验证码有效期为10分钟，过期需重新获取
2. ✅ 每个验证码只能使用一次
3. ✅ 确保邮箱地址完全匹配

### Q4: 如何支持其他用户注册？

**当前限制**: 测试邮箱只能发送到 `jokertenseven@gmail.com`

**解决方案**: 配置自己的域名（必须）

#### 步骤 1: 添加域名

1. 访问 👉 https://resend.com/domains
2. 点击 "Add Domain" 按钮
3. 输入你的域名（如：`yourdomain.com`）

#### 步骤 2: 配置 DNS 记录

在你的域名 DNS 管理面板添加以下记录（Resend 会提供具体值）：

```
类型    名称    值
SPF     @       v=spf1 include:_spf.resend.com ~all
DKIM    resend._domainkey    [Resend提供的值]
DMARC   _dmarc  v=DMARC1; p=none;
```

#### 步骤 3: 等待验证

- 通常需要几分钟到几小时
- 在 Resend 控制台查看验证状态

#### 步骤 4: 更新配置

```env
RESEND_FROM_EMAIL=Stravision <noreply@yourdomain.com>
```

#### 步骤 5: 测试

```bash
npm run test:email any-email@example.com
```

现在可以发送到任何邮箱了！🎉

## 📊 功能特性

| 特性 | 说明 |
|------|------|
| ✅ 验证码长度 | 6位数字（100000-999999） |
| ✅ 有效期 | 10分钟 |
| ✅ 冷却时间 | 60秒 |
| ✅ 使用次数 | 一次性（验证后失效） |
| ✅ 速率限制 | 发送3次/分钟，验证5次/分钟 |
| ✅ 邮件模板 | 响应式设计，品牌化展示 |

## 🎯 下一步

### 查看完整文档

- 📖 [主文档](./EMAIL_VERIFICATION_README.md) - 完整功能介绍
- 📖 [配置指南](./docs/email-verification-setup.md) - 详细配置说明
- 📖 [使用示例](./docs/email-verification-examples.md) - 代码示例

### 自定义配置

#### 修改验证码有效期

编辑 `lib/email-verification-service.ts`:

```typescript
// 修改为5分钟
const expiresAt = Date.now() + 5 * 60 * 1000;
```

#### 修改邮件模板

编辑 `lib/email-verification-service.ts` 中的 HTML 模板，自定义样式和内容。

#### 修改速率限制

编辑 API 路由文件：
- `app/api/auth/send-verification/route.ts`
- `app/api/auth/verify-email/route.ts`

```typescript
// 修改为每分钟5次
const limiter = rateLimit(req, { limit: 5, windowMs: 60 * 1000 });
```

## 💡 最佳实践

### 开发环境

```env
# 使用测试邮箱
RESEND_FROM_EMAIL=Stravision <onboarding@resend.dev>
```

### 生产环境

```env
# 使用自己的域名
RESEND_FROM_EMAIL=Stravision <noreply@yourdomain.com>
```

### 安全建议

1. ✅ 不要在代码中硬编码 API Key
2. ✅ 使用环境变量管理敏感信息
3. ✅ 定期轮换 API Key
4. ✅ 监控邮件发送量和成功率
5. ✅ 设置合理的速率限制

## 📈 监控和维护

### 查看发送日志

访问 Resend 控制台：
- 👉 https://resend.com/emails

可以看到：
- 发送状态（成功/失败）
- 发送时间
- 收件人
- 错误信息（如果有）

### 查看统计数据

管理员可以访问：
```
GET /api/admin/email-verification-stats
```

查看：
- 总验证码数量
- 使用/未使用统计
- 今日发送量
- 用户验证状态

## 💰 成本

### Resend 定价

| 套餐 | 价格 | 邮件数量 | 适用场景 |
|------|------|----------|----------|
| 免费 | $0/月 | 3,000封/月 | 开发测试、小型应用 |
| 付费 | $20/月 | 50,000封/月 | 生产环境、中型应用 |

**💡 提示**: 
- 免费套餐对大多数应用已经足够
- 超出配额后可以升级套餐
- 按月计费，随时可以取消

## 🆘 需要帮助？

### 文档资源

- 📖 [Resend 官方文档](https://resend.com/docs)
- 📖 [Resend Next.js 集成](https://resend.com/docs/send-with-nextjs)
- 📖 [项目完整文档](./EMAIL_VERIFICATION_README.md)

### 技术支持

- 💬 查看 [故障排查指南](./docs/email-verification-setup.md#故障排查)
- 💬 访问 [Resend 社区](https://resend.com/community)
- 💬 提交 [GitHub Issue](https://github.com/your-repo/issues)

## ✨ 快速命令参考

```bash
# 测试邮件服务
npm run test:email your-email@example.com

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

---

**🎉 开始使用邮箱验证功能吧！**

如有问题，请查看 [完整文档](./EMAIL_VERIFICATION_README.md) 或 [故障排查指南](./docs/email-verification-setup.md#故障排查)。
