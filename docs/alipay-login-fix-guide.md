# 支付宝登录问题修复指南

## 问题概述

支付宝登录功能可能遇到以下问题：
1. 配置错误导致无法初始化 SDK
2. 密钥格式不正确
3. 授权范围限制
4. 回调处理失败

## 修复内容

### 1. 改进的错误处理和日志

**文件**: `app/api/auth/alipay/callback/route.ts`

- ✅ 增强了 PEM 格式规范化，支持多种换行符格式
- ✅ 改进了密钥类型检测（PKCS1 vs PKCS8）
- ✅ 添加了详细的调试日志
- ✅ 改进了错误信息传递
- ✅ 尝试获取用户详细信息（如果权限允许）

### 2. 登录页面错误显示

**文件**: `app/login/page.tsx`

- ✅ 自动检测 URL 中的错误参数
- ✅ 显示友好的错误信息
- ✅ 自动清除 URL 参数

### 3. 配置检查工具

**文件**: `scripts/check-alipay-config.ts`

运行此工具检查您的支付宝配置：

```bash
npx tsx scripts/check-alipay-config.ts
```

## 配置步骤

### 1. 获取支付宝应用凭证

1. 访问 [支付宝开放平台](https://open.alipay.com/)
2. 创建应用或选择现有应用
3. 获取以下信息：
   - **APPID**: 应用的唯一标识（16位数字）
   - **应用私钥**: 您自己生成的 RSA 私钥
   - **支付宝公钥**: 从支付宝平台获取的公钥

### 2. 生成密钥对（如果还没有）

使用支付宝提供的密钥生成工具：
- [密钥生成工具下载](https://opendocs.alipay.com/common/02kipl)

或使用 OpenSSL：

```bash
# 生成 PKCS8 格式私钥（推荐）
openssl genrsa -out app_private_key.pem 2048
openssl pkcs8 -topk8 -inform PEM -in app_private_key.pem -outform PEM -nocrypt -out app_private_key_pkcs8.pem

# 生成公钥
openssl rsa -in app_private_key.pem -pubout -out app_public_key.pem
```

### 3. 配置环境变量

在 `.env.local` 文件中添加：

```env
# 支付宝 APP ID（16位数字）
ALIPAY_APP_ID=2021001234567890

# 应用私钥（您自己生成的）
# 注意：使用 \n 表示换行
ALIPAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----"

# 支付宝公钥（从支付宝平台获取）
ALIPAY_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----"
```

**重要提示**：
- 私钥是您的应用私钥，不是支付宝公钥
- 支付宝公钥是从支付宝开放平台获取的，不是您的应用公钥
- 密钥必须包含完整的 `-----BEGIN` 和 `-----END` 标记
- 使用 `\n` 表示换行符

### 4. 配置应用授权范围

在支付宝开放平台的应用设置中：

1. 添加功能：**用户信息授权**
2. 配置授权回调地址：
   - 开发环境: `http://localhost:3000/api/auth/alipay/callback`
   - 生产环境: `https://yourdomain.com/api/auth/alipay/callback`

### 5. 选择授权模式

代码中默认使用 `auth_base`（静默授权），只能获取用户 ID。

如果需要获取用户昵称和头像，修改 `app/api/auth/alipay/login/route.ts`：

```typescript
// 将 scope=auth_base 改为 scope=auth_user
const alipayUrl = `https://openauth.alipay.com/oauth2/publicAppAuthorize.htm?app_id=${appId}&scope=auth_user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
```

**注意**: `auth_user` 需要用户手动确认授权，`auth_base` 是静默授权。

## 常见问题排查

### 问题 1: SDK 初始化失败

**错误信息**: `alipay_sdk_init`

**可能原因**:
- 密钥格式不正确
- 密钥类型（PKCS1/PKCS8）不匹配
- 缺少 BEGIN/END 标记

**解决方案**:
1. 运行配置检查工具: `npx tsx scripts/check-alipay-config.ts`
2. 确保密钥包含完整的 PEM 格式
3. 检查换行符是否正确转换

### 问题 2: 获取令牌失败

**错误信息**: `alipay_token`

**可能原因**:
- auth_code 已过期或已使用
- 应用配置不正确
- 回调地址不匹配

**解决方案**:
1. 检查支付宝开放平台的应用状态
2. 确认回调地址配置正确
3. 查看服务器日志中的详细错误信息

### 问题 3: 无法获取用户信息

**错误信息**: `alipay_user_id_missing`

**可能原因**:
- 使用 `auth_base` 但 API 返回格式不包含 userId
- API 返回的字段名称变化
- 权限不足

**解决方案**:
1. 访问 `http://localhost:3000/api/auth/alipay/test` 检查配置
2. 查看服务器日志中的完整 token 响应
3. 确认支付宝应用已添加"获取会员信息"权限
4. 如果使用 `auth_base`，代码会尝试多种方式获取用户ID
5. 最后会使用 access_token 的 hash 作为备用标识

**调试步骤**:
```bash
# 1. 查看配置
curl http://localhost:3000/api/auth/alipay/test

# 2. 查看服务器日志中的这些信息：
# - "Token exchange raw result" - 完整的 token 响应
# - "Token result keys" - 响应中包含的所有字段
# - "Extracted user ID from token" - 提取到的用户ID
```

### 问题 4: 状态验证失败

**错误信息**: `alipay_state`

**可能原因**:
- Cookie 未正确设置
- CSRF 攻击防护触发
- 跨域问题

**解决方案**:
1. 确保浏览器允许 Cookie
2. 检查 `APP_URL` 环境变量配置
3. 确认回调地址与配置一致

## 测试流程

### 1. 检查配置

```bash
npx tsx scripts/check-alipay-config.ts
```

### 2. 启动开发服务器

```bash
npm run dev
```

### 3. 测试登录流程

1. 访问 `http://localhost:3000/login`
2. 点击"支付宝"登录按钮
3. 在支付宝授权页面确认授权
4. 检查是否成功跳转回应用

### 4. 查看日志

检查服务器控制台输出，关键日志包括：
- `Alipay SDK Config`: SDK 配置信息
- `Token exchange result`: 令牌交换结果
- `User info result`: 用户信息获取结果
- `Final user data`: 最终用户数据

## 沙箱环境测试

如果使用支付宝沙箱环境，需要修改网关地址：

在 `app/api/auth/alipay/callback/route.ts` 中：

```typescript
alipaySdk = new AlipaySdk({
    appId,
    privateKey,
    alipayPublicKey,
    keyType,
    gateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do', // 沙箱网关
})
```

## 生产环境部署

### 1. 环境变量

确保在生产环境配置了正确的环境变量：

```env
APP_URL=https://yourdomain.com
ALIPAY_APP_ID=your_production_app_id
ALIPAY_PRIVATE_KEY="your_production_private_key"
ALIPAY_PUBLIC_KEY="your_production_public_key"
```

### 2. HTTPS 配置

生产环境建议启用 HTTPS，修改 Cookie 设置：

在 `app/api/auth/alipay/callback/route.ts` 中：

```typescript
res.cookies.set("auth", jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: true, // 生产环境启用
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
})
```

### 3. 回调地址

在支付宝开放平台配置生产环境的回调地址：
- `https://yourdomain.com/api/auth/alipay/callback`

## 安全建议

1. **密钥保护**: 
   - 永远不要将私钥提交到版本控制系统
   - 使用环境变量存储敏感信息
   - 定期轮换密钥

2. **HTTPS**:
   - 生产环境必须使用 HTTPS
   - 启用 secure cookie 标志

3. **状态验证**:
   - 保持 state 参数验证
   - 防止 CSRF 攻击

4. **错误处理**:
   - 不要在客户端暴露详细的错误信息
   - 记录详细日志用于调试

## 调试技巧

### 1. 在线配置测试

访问测试端点查看配置状态：
```
http://localhost:3000/api/auth/alipay/test
```

这会返回：
- 配置完整性检查
- 密钥格式验证
- SDK 实例化测试

**注意**: 生产环境应该禁用此端点

### 2. 查看详细日志

服务器控制台会输出详细的调试信息：

```
Alipay SDK Config: { appId, keyType, ... }
Token exchange raw result: { ... }
Token exchange result: { code, msg, ... }
User info result: { code, msg, ... }
Final user data: { alipayUserId, nickname, ... }
```

### 3. 测试 SDK 配置

```bash
npx tsx scripts/check-alipay-config.ts
```

### 4. 检查数据库

```bash
npx tsx scripts/check-users.ts
```

## 获取帮助

如果问题仍未解决：

1. 查看服务器日志中的详细错误信息
2. 运行配置检查工具
3. 检查支付宝开放平台的应用配置
4. 参考 [支付宝开放平台文档](https://opendocs.alipay.com/)

## 更新日志

- **2026-01-19**: 
  - 改进错误处理和日志
  - 添加配置检查工具
  - 增强密钥格式处理
  - 改进用户信息获取逻辑
