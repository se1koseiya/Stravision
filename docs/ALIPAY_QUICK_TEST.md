# 支付宝登录快速测试指南

## 问题诊断

您遇到的错误："无法获取支付宝用户ID"

这通常是因为支付宝 API 返回的数据格式与预期不符。

## 已实施的修复

✅ **增强的用户ID提取逻辑**
- 尝试多个可能的字段名：`userId`, `user_id`, `alipay_user_id`, `openId`, `open_id`
- 如果 token 响应中没有，会调用用户信息 API
- 最后使用 access_token 的 hash 作为备用标识

✅ **详细的调试日志**
- 打印完整的 API 响应
- 显示所有可用的字段名
- 记录每一步的处理结果

✅ **在线配置测试**
- 新增测试端点：`/api/auth/alipay/test`
- 无需重启服务器即可检查配置

## 立即测试

### 步骤 1: 检查配置

在浏览器中访问：
```
http://localhost:3000/api/auth/alipay/test
```

应该看到类似这样的响应：
```json
{
  "timestamp": "2026-01-19T...",
  "config": {
    "hasAppId": true,
    "appIdFormat": true,
    "hasPrivateKey": true,
    "hasPublicKey": true
  },
  "sdkTest": {
    "canImport": true,
    "canInstantiate": true,
    "error": null
  }
}
```

**如果 `canInstantiate` 为 `false`**:
- 检查 `error` 字段的错误信息
- 运行: `npx tsx scripts/check-alipay-config.ts`
- 或运行: `node scripts/fix-alipay-env.js`

### 步骤 2: 重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
npm run dev
```

### 步骤 3: 测试登录

1. 访问: `http://localhost:3000/login`
2. 点击"支付宝"按钮
3. 完成授权

### 步骤 4: 查看日志

在服务器控制台中查找这些关键日志：

```
✓ 成功的日志：
Alipay SDK initialized successfully
Access token obtained successfully
Extracted user ID from token: 2088...
Final user data: { alipayUserId: '2088...', nickname: '...', hasAvatar: true }
User created/found: { id: 1, username: '...' }
JWT generated successfully

❌ 如果看到错误：
Token exchange raw result: { ... }  # 查看完整响应
Token result keys: [...]            # 查看包含哪些字段
Extracted user ID from token: undefined  # 没有提取到ID
```

## 常见问题快速修复

### 问题 1: SDK 初始化失败

```bash
# 运行配置检查
npx tsx scripts/check-alipay-config.ts

# 或使用交互式修复工具
node scripts/fix-alipay-env.js
```

### 问题 2: 仍然无法获取用户ID

**查看完整的 API 响应**:

在服务器日志中找到 `Token exchange raw result`，复制完整的 JSON 响应。

**可能的情况**:

1. **使用沙箱环境**
   - 沙箱环境的响应格式可能不同
   - 在 `app/api/auth/alipay/callback/route.ts` 中启用沙箱网关：
   ```typescript
   gateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do'
   ```

2. **权限不足**
   - 在支付宝开放平台检查应用权限
   - 确保已添加"获取会员信息"功能

3. **API 版本问题**
   - 支付宝可能更新了 API 响应格式
   - 查看日志中的 `Token result keys` 了解实际返回的字段

### 问题 3: 备用方案

如果以上都不行，代码会自动使用 access_token 的 hash 作为用户标识：

```
Using access token hash as fallback user ID
Generated fallback user ID: alipay_abc123...
```

这样至少可以让用户登录，虽然每次登录可能会创建新用户。

## 手动调试

### 1. 检查环境变量

```bash
# Windows PowerShell
$env:ALIPAY_APP_ID
$env:ALIPAY_PRIVATE_KEY
$env:ALIPAY_PUBLIC_KEY

# Linux/Mac
echo $ALIPAY_APP_ID
echo $ALIPAY_PRIVATE_KEY
echo $ALIPAY_PUBLIC_KEY
```

### 2. 测试 SDK

创建测试文件 `test-alipay.js`:

```javascript
require('dotenv').config({ path: '.env.local' })
const { AlipaySdk } = require('alipay-sdk')

const normalizePem = (value) => {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
}

const appId = process.env.ALIPAY_APP_ID?.trim()
const privateKey = normalizePem(process.env.ALIPAY_PRIVATE_KEY)
const alipayPublicKey = normalizePem(process.env.ALIPAY_PUBLIC_KEY)

console.log('Config:', {
  hasAppId: !!appId,
  appId,
  privateKeyLength: privateKey.length,
  publicKeyLength: alipayPublicKey.length,
})

try {
  const sdk = new AlipaySdk({
    appId,
    privateKey,
    alipayPublicKey,
    keyType: privateKey.includes('BEGIN RSA PRIVATE KEY') ? 'PKCS1' : 'PKCS8',
  })
  console.log('✓ SDK 初始化成功')
} catch (error) {
  console.error('✗ SDK 初始化失败:', error.message)
}
```

运行:
```bash
node test-alipay.js
```

## 获取详细帮助

如果问题仍未解决，请提供以下信息：

1. **配置测试结果**
   ```bash
   curl http://localhost:3000/api/auth/alipay/test
   ```

2. **服务器日志**
   - 复制从 "Alipay SDK Config" 到 "Final user data" 的所有日志
   - 特别是 "Token exchange raw result" 的完整内容

3. **支付宝应用信息**
   - 应用类型（网页应用/移动应用）
   - 是否使用沙箱环境
   - 已添加的功能权限

4. **错误截图**
   - 浏览器显示的错误
   - 服务器控制台的错误

## 相关文档

- 完整修复指南: `docs/alipay-login-fix-guide.md`
- 修复总结: `ALIPAY_LOGIN_FIX.md`
- 配置检查工具: `scripts/check-alipay-config.ts`
- 配置修复工具: `scripts/fix-alipay-env.js`

## 紧急联系

如果是生产环境紧急问题：

1. 临时禁用支付宝登录（注释掉登录按钮）
2. 使用其他登录方式（邮箱、QQ等）
3. 收集完整日志后再调试

---

**最后更新**: 2026-01-19
**修复版本**: v2.0 - 增强用户ID提取和错误处理
