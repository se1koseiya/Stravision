# 演示账号使用指南

## 概述

本文档介绍如何创建和使用演示账号。演示账号是一个拥有完整权限的测试账号，用于演示和测试系统的所有功能。

## 功能特性

演示账号具有以下特性：

### 1. 完整权限
- **角色**: `super_admin` (超级管理员)
- **会员等级**: `plus` (最高等级)
- **设备控制**: 拥有所有设备的控制权限 (`allowedControls: ['*']`)
- **管理权限**: 可以访问所有管理功能

### 2. AI 额度
- **每日限额**: 999999 次（几乎无限制）
- **账户余额**: 9999 次
- **总计**: 充足的 AI 调用额度用于测试

### 3. 安全特性
- **异地登录检测**: 已禁用 (`ignoreLocationCheck: true`)
- **无地域限制**: 可以从任何地点登录，不会触发安全警告

## 创建演示账号

### 方法一：使用 npm 脚本（推荐）

```bash
npm run create:demo
```

### 方法二：直接运行脚本

```bash
tsx scripts/create-demo-account.ts
```

## 账号信息

创建成功后，您将看到以下信息：

```
✅ 演示账号创建成功！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 邮箱: demo@example.com
🔑 密码: Demo123456!
👤 用户名: 演示账号
🎭 角色: super_admin
💎 会员等级: plus
🤖 AI 额度: 9999
🌍 异地登录检测: 已禁用
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 登录使用

1. 访问登录页面
2. 使用以下凭据登录：
   - **邮箱**: `demo@example.com`
   - **密码**: `Demo123456!`

## 权限说明

### 设备控制权限
```json
{
  "allowedControls": ["*"]
}
```
- `*` 表示可以控制所有设备
- 包括灯光、温度、湿度、风扇等所有设备类型

### 管理权限
```json
{
  "admin": true,
  "superAdmin": true
}
```
- 可以访问管理后台
- 可以管理其他用户
- 可以查看系统日志和监控数据

### 安全权限
```json
{
  "ignoreLocationCheck": true
}
```
- 禁用异地登录检测
- 不会因为 IP 变化而触发安全验证
- 适合演示和测试场景

## 注意事项

1. **安全性**: 演示账号仅用于开发和测试环境，请勿在生产环境使用
2. **密码**: 建议在生产环境中使用更强的密码
3. **权限**: 演示账号拥有最高权限，请谨慎使用
4. **数据**: 演示账号的操作会影响实际数据，请注意数据备份

## 更新演示账号

如果演示账号已存在，再次运行脚本会自动更新其配置：

```bash
npm run create:demo
```

脚本会：
- 检测账号是否存在
- 如果存在，更新权限和额度
- 如果不存在，创建新账号

## 技术实现

### 数据库字段

演示账号在数据库中的关键字段：

```sql
-- 用户基本信息
email: 'demo@example.com'
role: 'super_admin'
membership: 'plus'

-- AI 额度
daily_ai_limit: 999999
ai_balance: 9999

-- 权限配置
permissions: {
  "allowedControls": ["*"],
  "admin": true,
  "superAdmin": true,
  "ignoreLocationCheck": true
}
```

### 异地登录检测

在 `lib/db/security-service.ts` 中，`checkSuspiciousLogin` 函数会检查用户权限：

```typescript
export async function checkSuspiciousLogin(
  userId: number, 
  currentIp: string, 
  currentRegion: string | null,
  userPermissions?: { ignoreLocationCheck?: boolean }
): Promise<{ isSuspicious: boolean, lastRegion: string | null }> {
  // 如果用户有 ignoreLocationCheck 权限，直接返回不可疑
  if (userPermissions?.ignoreLocationCheck) {
    return { isSuspicious: false, lastRegion: null }
  }
  // ... 其他检测逻辑
}
```

## 故障排除

### 问题：脚本执行失败

**解决方案**:
1. 确保数据库已正确配置
2. 检查 `.env.local` 文件中的数据库连接信息
3. 确保已安装所有依赖：`npm install`

### 问题：无法登录

**解决方案**:
1. 确认邮箱和密码输入正确
2. 检查数据库中是否存在该账号
3. 查看浏览器控制台和服务器日志

### 问题：权限不足

**解决方案**:
1. 重新运行创建脚本更新权限
2. 检查数据库中的 `permissions` 字段
3. 清除浏览器缓存并重新登录

## 相关文件

- 创建脚本: `scripts/create-demo-account.ts`
- 用户服务: `lib/db/user-service.ts`
- 安全服务: `lib/db/security-service.ts`
- 登录 API: `app/api/auth/login/route.ts`
- AI 额度服务: `lib/db/ai-quota-service.ts`

## 总结

演示账号提供了一个完整的测试环境，让您可以：
- ✅ 测试所有功能
- ✅ 访问所有设备
- ✅ 使用充足的 AI 额度
- ✅ 无地域限制登录
- ✅ 体验完整的管理功能

祝您使用愉快！🎉
