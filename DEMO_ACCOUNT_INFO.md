# 🎯 演示账号快速参考

## 登录信息

```
📧 邮箱: demo@example.com
🔑 密码: Demo123456!
```

## 账号特性

| 特性 | 配置 |
|------|------|
| 👤 用户名 | 演示账号 |
| 🎭 角色 | super_admin (超级管理员) |
| 💎 会员等级 | plus (最高等级) |
| 🤖 每日 AI 限额 | 999999 次 |
| 💰 AI 账户余额 | 9999 次 |
| 🌍 异地登录检测 | 已禁用 |
| 🔐 设备控制权限 | 所有设备 (*) |

## 快速开始

### 创建/更新演示账号

```bash
npm run create:demo
```

### 登录测试

1. 访问登录页面
2. 输入邮箱：`demo@example.com`
3. 输入密码：`Demo123456!`
4. 点击登录

## 权限详情

### 完整权限配置

```json
{
  "allowedControls": ["*"],
  "admin": true,
  "superAdmin": true,
  "ignoreLocationCheck": true
}
```

### 可以做什么

✅ 控制所有设备（灯光、温度、湿度、风扇等）  
✅ 访问管理后台  
✅ 管理其他用户  
✅ 查看系统日志和监控数据  
✅ 使用所有 AI 功能  
✅ 从任何地点登录（无地域限制）  
✅ 访问所有 API 端点  

## 技术细节

### 数据库配置

```typescript
{
  email: 'demo@example.com',
  role: 'super_admin',
  membership: 'plus',
  daily_ai_limit: 999999,
  ai_balance: 9999,
  permissions: {
    allowedControls: ['*'],
    admin: true,
    superAdmin: true,
    ignoreLocationCheck: true
  }
}
```

### 安全特性

- **异地登录检测**: 通过 `ignoreLocationCheck` 权限禁用
- **实现位置**: `lib/db/security-service.ts` 中的 `checkSuspiciousLogin` 函数
- **效果**: 可以从任何 IP 地址登录，不会触发安全验证

## 相关命令

```bash
# 创建演示账号
npm run create:demo

# 启动开发服务器
npm run dev

# 查看数据库
# 使用数据库管理工具连接到配置的数据库
```

## 注意事项

⚠️ **仅用于开发和测试环境**  
⚠️ **请勿在生产环境使用默认密码**  
⚠️ **演示账号拥有最高权限，请谨慎使用**  

## 更多信息

详细文档请参考：[DEMO_ACCOUNT_GUIDE.md](./DEMO_ACCOUNT_GUIDE.md)

---

**最后更新**: 2026-04-16  
**版本**: 1.0.0
