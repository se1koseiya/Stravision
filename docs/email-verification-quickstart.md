# 邮箱验证功能 - 快速开始

## 5分钟快速配置

### 步骤 1: 安装依赖

依赖已自动安装，无需手动操作。

### 步骤 2: 获取 Resend API Key

1. 访问 https://resend.com 并注册
2. 进入 https://resend.com/api-keys
3. 创建新的 API Key
4. 复制 API Key（格式：`re_xxxxx`）

### 步骤 3: 配置环境变量

在项目根目录的 `.env.local` 文件中添加：

```env
# Resend API Key（必填）
RESEND_API_KEY=re_your_actual_api_key_here

# 发件人邮箱（可选，默认使用测试邮箱）
RESEND_FROM_EMAIL=Stravision <onboarding@resend.dev>
```

**重要提示**: 
- 测试环境使用 `onboarding@resend.dev` 即可
- 测试邮箱只能发送到你在 Resend 控制台添加的邮箱地址
- 生产环境需要配置并验证自己的域名

### 步骤 4: 添加测试邮箱（仅测试环境）

⚠️ **重要限制**: 使用测试邮箱 `onboarding@resend.dev` 时，**只能发送到你的 Resend 账号注册邮箱**。

对于你的账号，只能发送到：`jokertenseven@gmail.com`

**如果需要支持其他邮箱**，必须配置自己的域名（见"生产环境配置"部分）。

### 步骤 5: 重启开发服务器

```bash
npm run dev
```

### 步骤 6: 测试功能

1. 访问 http://localhost:3000/register
2. 输入邮箱地址（**必须是 `jokertenseven@gmail.com`**）
3. 点击"获取验证码"
4. 检查邮箱收到的验证码
5. 输入验证码并完成注册

⚠️ **测试限制**: 目前只能使用你的 Resend 账号邮箱测试。要支持其他邮箱，请配置域名。

## 常见问题

### Q: 收不到邮件？

**A**: 检查以下几点：
1. **确认使用的是你的 Resend 账号邮箱**（`jokertenseven@gmail.com`）
2. 确认 RESEND_API_KEY 配置正确
3. 检查垃圾邮件文件夹
4. 查看 Resend 控制台的发送日志

⚠️ **重要**: 测试邮箱只能发送到你的 Resend 账号邮箱！要支持其他邮箱，必须配置域名。

### Q: 提示"请求过于频繁"？

**A**: 系统有速率限制保护：
- 发送验证码：每分钟最多3次
- 验证邮箱：每分钟最多5次
- 等待1分钟后重试

### Q: 验证码过期了？

**A**: 验证码有效期为10分钟，过期后需要重新获取。

### Q: 如何在生产环境使用？

**A**: 必须配置自己的域名

**步骤**:
1. 在 Resend 控制台添加你的域名（https://resend.com/domains）
2. 配置 DNS 记录（SPF, DKIM, DMARC）
3. 等待域名验证通过（几分钟到几小时）
4. 更新 RESEND_FROM_EMAIL 为你的域名邮箱：
   ```env
   RESEND_FROM_EMAIL=Stravision <noreply@yourdomain.com>
   ```
5. 现在可以发送到任何邮箱了！

**DNS 配置示例**:
```
类型    名称                值
TXT     @                   v=spf1 include:_spf.resend.com ~all
TXT     resend._domainkey   [Resend提供的DKIM值]
TXT     _dmarc              v=DMARC1; p=none;
```

## 功能特性

✅ 6位数字验证码  
✅ 10分钟有效期  
✅ 60秒发送冷却  
✅ 一次性使用  
✅ 美观的邮件模板  
✅ 速率限制保护  
✅ 自动清理过期记录  

## 下一步

- 查看完整文档: [email-verification-setup.md](./email-verification-setup.md)
- 自定义邮件模板: [lib/email-templates.tsx](../lib/email-templates.tsx)
- 配置生产环境域名: [Resend Domains](https://resend.com/domains)

## 技术支持

如遇问题，请查看：
- [Resend 官方文档](https://resend.com/docs)
- [项目 Issues](https://github.com/your-repo/issues)
