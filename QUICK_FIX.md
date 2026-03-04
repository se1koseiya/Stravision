# 🚨 快速修复指南

看到错误了？别担心！按照以下步骤快速修复。

## 错误信息

```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

## 原因

邮件服务未配置 `RESEND_API_KEY`。

## 🔧 快速修复（2分钟）

### 步骤 1: 检查配置

运行配置检查脚本：

```bash
npm run check:email
```

### 步骤 2: 获取 API Key

1. 访问 👉 https://resend.com
2. 注册或登录账号
3. 进入 👉 https://resend.com/api-keys
4. 点击 "Create API Key"
5. 复制生成的 API Key（格式：`re_xxxxx`）

### 步骤 3: 配置环境变量

在项目根目录创建或编辑 `.env.local` 文件：

```env
# 必填：Resend API Key
RESEND_API_KEY=re_xxxxx  # 替换为你的实际 API Key

# 可选：发件人邮箱（默认使用测试邮箱）
RESEND_FROM_EMAIL=Stravision <onboarding@resend.dev>
```

### 步骤 4: 重启开发服务器

```bash
# 停止当前服务器（Ctrl+C）
# 重新启动
npm run dev
```

### 步骤 5: 测试

访问 http://localhost:3000/register 并测试注册功能。

⚠️ **重要提示**: 测试邮箱只能发送到你的 Resend 账号邮箱！

## 📋 完整配置示例

创建 `.env.local` 文件，内容如下：

```env
# ============================================
# 邮件服务配置（必需）
# ============================================
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=Stravision <onboarding@resend.dev>

# ============================================
# 其他必需配置
# ============================================
JWT_SECRET=your-secret-key-change-in-production
DATABASE_URL=postgresql://postgres:password@localhost:5432/stravision

# ============================================
# AI 服务配置（如果使用）
# ============================================
DASHSCOPE_API_KEY=sk-your-dashscope-api-key
SYSTEM_OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
SYSTEM_OPENAI_API_KEY=sk-your-api-key

# ============================================
# MQTT 配置（如果使用）
# ============================================
MQTT_HOST=your-mqtt-host.hivemq.cloud
MQTT_PORT=8883
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password
```

## 🔍 验证配置

运行以下命令验证配置：

```bash
# 1. 检查配置
npm run check:email

# 2. 测试邮件服务（使用你的 Resend 账号邮箱）
npm run test:email your-resend-account-email@example.com

# 3. 启动开发服务器
npm run dev
```

## ❓ 常见问题

### Q: 还是收不到邮件？

**A**: 
1. 确认使用的是你的 Resend 账号注册邮箱
2. 检查垃圾邮件文件夹
3. 查看 Resend 控制台的发送日志：https://resend.com/emails

### Q: 如何支持其他用户注册？

**A**: 必须配置自己的域名。查看详细指南：
- [域名配置指南](./docs/resend-domain-setup.md)

### Q: 测试邮箱有什么限制？

**A**: 
- ✅ 免费使用
- ❌ 只能发送到你的 Resend 账号邮箱
- ❌ 不能用于生产环境

要支持任意邮箱，必须配置域名。

## 📚 更多帮助

- [完整文档](./EMAIL_VERIFICATION_README.md)
- [快速开始](./GETTING_STARTED_EMAIL_VERIFICATION.md)
- [域名配置](./docs/resend-domain-setup.md)
- [使用示例](./docs/email-verification-examples.md)

## 🆘 仍然有问题？

1. 查看服务器控制台的错误日志
2. 运行 `npm run check:email` 检查配置
3. 查看 [故障排查指南](./docs/email-verification-setup.md#故障排查)

---

**配置完成后，刷新页面重试！** 🎉
