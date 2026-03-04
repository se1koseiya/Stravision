# 用户系统完善设计文档

## 概述

本设计文档描述了莓界(STRAVISION)平台用户系统的完整架构设计。系统将从基于JSON文件的简单存储升级为基于SQLite数据库的生产级实现,包含完整的用户注册、登录、会话管理和UI展示功能。

### 设计目标

1. **数据持久化**: 使用SQLite数据库替代JSON文件存储
2. **安全性**: 实现安全的密码哈希、JWT令牌管理和会话验证
3. **用户体验**: 提供流畅的注册/登录流程和直观的用户界面
4. **可扩展性**: 设计灵活的数据库架构,支持未来功能扩展
5. **一致性**: 遵循Next.js App Router和shadcn/ui设计规范

## 架构设计

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  登录页面    │  │  注册页面    │  │  监控页面    │      │
│  │ /login       │  │ /register    │  │ /monitor     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                        API 路由层                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ POST /api/   │  │ POST /api/   │  │ GET /api/    │      │
│  │ auth/login   │  │ auth/register│  │ auth/me      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            ▼                                 │
│                   ┌─────────────────┐                        │
│                   │  认证中间件      │                        │
│                   │  JWT验证/生成    │                        │
│                   └────────┬────────┘                        │
└────────────────────────────┼──────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                        业务逻辑层                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              lib/db/user-service.ts                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │ createUser() │  │ getUserBy    │  │ updateUser │ │   │
│  │  │              │  │ Email/Id()   │  │ ()         │ │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │   │
│  └────────────────────────┬─────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        数据访问层                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              lib/db/database.ts                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │ initDB()     │  │ getDB()      │  │ closeDB()  │ │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │   │
│  └────────────────────────┬─────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │  SQLite 数据库   │
                   │  data/users.db   │
                   └─────────────────┘
```

## 组件和接口设计

### 1. 数据库层 (lib/db/database.ts)

#### 数据库连接管理

```typescript
interface DatabaseConfig {
  path: string
  verbose?: boolean
}

// 初始化数据库连接和表结构
function initDB(): Promise<void>

// 获取数据库实例
function getDB(): Database

// 关闭数据库连接
function closeDB(): Promise<void>
```

#### 数据库表结构

**users 表**

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)

CREATE INDEX idx_users_email ON users(email)
```

### 2. 用户服务层 (lib/db/user-service.ts)

#### 用户数据模型

```typescript
interface User {
  id: number
  email: string
  password_hash: string
  username: string
  avatar_url: string | null
  created_at: number
  updated_at: number
}

interface UserPublic {
  id: number
  email: string
  username: string
  avatar_url: string | null
  created_at: number
}

interface CreateUserInput {
  email: string
  password: string
  username: string
}

interface UpdateUserInput {
  username?: string
  avatar_url?: string
}
```

#### 服务函数

```typescript
// 创建新用户
async function createUser(input: CreateUserInput): Promise<UserPublic>

// 通过邮箱查询用户
async function getUserByEmail(email: string): Promise<User | null>

// 通过ID查询用户
async function getUserById(id: number): Promise<User | null>

// 更新用户信息
async function updateUser(id: number, input: UpdateUserInput): Promise<UserPublic>

// 验证用户凭证
async function verifyCredentials(email: string, password: string): Promise<UserPublic | null>

// 转换为公开用户信息(移除敏感字段)
function toPublicUser(user: User): UserPublic
```

### 3. 认证工具 (lib/auth.ts)

#### JWT 令牌管理

```typescript
interface JWTPayload {
  id: number
  email: string
  username: string
}

// 生成JWT令牌
function generateToken(payload: JWTPayload): string

// 验证JWT令牌
function verifyToken(token: string): JWTPayload | null

// 获取JWT密钥
function getJwtSecret(): string
```

#### Cookie 管理

```typescript
interface CookieOptions {
  name: string
  value: string
  httpOnly: boolean
  sameSite: 'lax' | 'strict' | 'none'
  secure: boolean
  path: string
  maxAge: number
}

// 设置认证Cookie
async function setAuthCookie(token: string): Promise<void>

// 清除认证Cookie
async function clearAuthCookie(): Promise<void>

// 从请求中获取当前用户
async function getCurrentUser(req: Request): Promise<UserPublic | null>
```

### 4. API 路由

#### POST /api/auth/register

**请求体**
```typescript
{
  email: string      // 邮箱地址
  password: string   // 密码(至少8位)
  username: string   // 用户名(2-20字符)
}
```

**响应**
```typescript
// 成功 (200)
{
  ok: true
  user: UserPublic
}

// 失败 (400/409/500)
{
  error: string
}
```

**验证规则**
- 邮箱: 必须包含@符号,格式正确
- 密码: 至少8个字符
- 用户名: 2-20个字符,不能为空
- 邮箱唯一性: 不能与现有用户重复

#### POST /api/auth/login

**请求体**
```typescript
{
  email: string
  password: string
}
```

**响应**
```typescript
// 成功 (200)
{
  ok: true
  user: UserPublic
}

// 失败 (400/401/500)
{
  error: string
}
```

#### GET /api/auth/me

**响应**
```typescript
// 已认证 (200)
{
  authenticated: true
  user: UserPublic
}

// 未认证 (200)
{
  authenticated: false
}
```

#### POST /api/auth/logout

**响应**
```typescript
{
  ok: true
}
```

### 5. 前端组件

#### 注册页面 (app/register/page.tsx)

**状态管理**
```typescript
interface RegisterFormState {
  email: string
  username: string
  password: string
  loading: boolean
  error: string
}
```

**UI 更新**
- 在邮箱和密码字段之间添加用户名输入框
- 实时表单验证
- 错误消息显示
- 成功后重定向到 /monitor

#### 登录页面 (app/login/page.tsx)

**更新内容**
- 成功登录后重定向到 /monitor 而不是 /
- 改进错误消息显示

#### 监控页面 (app/monitor/page.tsx)

**新增组件**

```typescript
// 用户头像菜单组件
interface UserAvatarMenuProps {
  user: UserPublic
  onLogout: () => void
}

function UserAvatarMenu({ user, onLogout }: UserAvatarMenuProps): JSX.Element
```

**布局更新**
- 在页面右上角(连接状态旁边)添加用户头像
- 头像使用 shadcn/ui Avatar 组件
- 点击头像显示下拉菜单
- 菜单包含: 用户名、邮箱、个人设置、登出

**Avatar 组件结构**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger>
    <Avatar>
      <AvatarImage src={user.avatar_url} />
      <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
    </Avatar>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>
      <div>{user.username}</div>
      <div className="text-xs text-muted-foreground">{user.email}</div>
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>个人设置</DropdownMenuItem>
    <DropdownMenuItem onClick={onLogout}>登出</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## 数据模型

### User 实体

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 用户唯一标识 |
| email | TEXT | UNIQUE, NOT NULL | 用户邮箱(登录凭证) |
| password_hash | TEXT | NOT NULL | bcrypt哈希后的密码 |
| username | TEXT | NOT NULL | 用户显示名称 |
| avatar_url | TEXT | NULL | 用户头像URL(可选) |
| created_at | INTEGER | NOT NULL | 创建时间戳(毫秒) |
| updated_at | INTEGER | NOT NULL | 更新时间戳(毫秒) |

### JWT Payload

```typescript
{
  id: number          // 用户ID
  email: string       // 用户邮箱
  username: string    // 用户名
  iat: number        // 签发时间
  exp: number        // 过期时间(7天)
}
```

## 错误处理

### 错误类型定义

```typescript
enum AuthErrorCode {
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  INVALID_USERNAME = 'INVALID_USERNAME',
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

interface AuthError {
  code: AuthErrorCode
  message: string
  details?: any
}
```

### 错误处理策略

1. **客户端验证**: 在提交前进行基本格式验证
2. **服务端验证**: API路由进行完整的业务逻辑验证
3. **数据库错误**: 捕获并转换为用户友好的错误消息
4. **日志记录**: 在服务端记录详细错误信息(不暴露给客户端)

### 错误消息映射

| 错误代码 | 中文消息 | HTTP状态码 |
|---------|---------|-----------|
| INVALID_EMAIL | 邮箱格式不正确 | 400 |
| INVALID_PASSWORD | 密码至少需要8个字符 | 400 |
| INVALID_USERNAME | 用户名长度需在2-20个字符之间 | 400 |
| EMAIL_EXISTS | 该邮箱已被注册 | 409 |
| USER_NOT_FOUND | 用户不存在 | 404 |
| INVALID_CREDENTIALS | 邮箱或密码错误 | 401 |
| TOKEN_EXPIRED | 登录已过期,请重新登录 | 401 |
| TOKEN_INVALID | 登录状态无效,请重新登录 | 401 |
| DATABASE_ERROR | 服务异常,请稍后重试 | 500 |
| UNKNOWN_ERROR | 未知错误,请稍后重试 | 500 |

## 安全考虑

### 1. 密码安全

- 使用 bcrypt 进行密码哈希(salt rounds: 10)
- 密码最小长度: 8个字符
- 密码永不以明文存储或传输
- 密码验证失败不透露具体原因(邮箱或密码错误)

### 2. JWT 令牌安全

- 使用 httpOnly cookie 存储令牌(防止XSS攻击)
- 设置 sameSite: 'lax' (防止CSRF攻击)
- 生产环境启用 secure 标志(仅HTTPS传输)
- 令牌有效期: 7天
- 使用强随机密钥签名

### 3. 数据库安全

- 使用参数化查询防止SQL注入
- 邮箱字段建立唯一索引
- 敏感字段(password_hash)不返回给客户端

### 4. API 安全

- 输入验证和清理
- 速率限制(未来实现)
- CORS 配置
- 错误消息不泄露敏感信息

## 测试策略

### 1. 单元测试

**数据库层测试**
- 数据库初始化
- CRUD 操作
- 错误处理

**用户服务层测试**
- 用户创建(成功/失败场景)
- 用户查询
- 密码验证
- 数据转换

**认证工具测试**
- JWT 生成和验证
- Cookie 管理
- 令牌过期处理

### 2. 集成测试

**注册流程**
- 成功注册新用户
- 邮箱重复检测
- 表单验证
- 自动登录和重定向

**登录流程**
- 成功登录
- 错误凭证处理
- 会话创建
- 重定向到监控页面

**会话管理**
- 获取当前用户信息
- 令牌验证
- 登出功能

### 3. E2E 测试(可选)

- 完整的注册-登录-使用-登出流程
- 页面导航和权限控制
- UI 交互测试

## 实现顺序

### 阶段 1: 数据库基础设施
1. 创建数据库连接管理模块
2. 定义表结构和索引
3. 实现数据库初始化逻辑
4. 添加数据迁移功能(JSON → SQLite)

### 阶段 2: 用户服务层
1. 实现用户 CRUD 操作
2. 实现密码哈希和验证
3. 实现数据转换函数
4. 添加错误处理

### 阶段 3: 认证系统
1. 更新 JWT 令牌生成和验证
2. 实现 Cookie 管理
3. 创建认证中间件
4. 更新现有 auth.ts

### 阶段 4: API 路由
1. 更新注册 API
2. 更新登录 API
3. 更新 /me API
4. 确保登出 API 正常工作

### 阶段 5: 前端更新
1. 更新注册页面(添加用户名字段)
2. 更新登录页面(修改重定向)
3. 在监控页面添加 Avatar 组件
4. 实现用户菜单和登出功能

### 阶段 6: 测试和优化
1. 编写单元测试
2. 进行集成测试
3. 性能优化
4. 文档更新

## 环境配置

### 环境变量

```bash
# JWT 配置
JWT_SECRET=your-secret-key-here-change-in-production

# 数据库配置
DATABASE_PATH=./data/users.db

# 应用配置
NODE_ENV=development
```

### .env.example 更新

```bash
# Authentication
JWT_SECRET=your-secret-key-here-change-in-production

# Database
DATABASE_PATH=./data/users.db

# MQTT Configuration
MQTT_HOST=be18721454da4600b14a92424bb1181c.s1.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USERNAME=meimeifarm
MQTT_PASSWORD=Meimei83036666
MQTT_SUBSCRIBE_TOPIC=meimefarm/basic_env_data
MQTT_PUBLISH_TOPIC=data/set
MQTT_USE_SSL=true
MQTT_KEEPALIVE=60
MQTT_RECONNECT_PERIOD=5000

# Weather API
WEATHER_API_KEY=64267a90ec4143ee84965157252111
```

## 依赖项

### 新增依赖

```json
{
  "dependencies": {
    "better-sqlite3": "^11.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0"
  }
}
```

### 现有依赖(已满足)

- bcryptjs: 密码哈希
- jsonwebtoken: JWT 令牌
- @radix-ui/react-avatar: Avatar 组件
- @radix-ui/react-dropdown-menu: 下拉菜单

## 性能考虑

1. **数据库连接池**: 使用单例模式管理数据库连接
2. **索引优化**: 在 email 字段上建立索引加速查询
3. **JWT 缓存**: 考虑在内存中缓存已验证的令牌(短期)
4. **懒加载**: Avatar 组件按需加载
5. **错误边界**: 添加 React 错误边界防止崩溃

## 未来扩展

1. **密码重置**: 通过邮件重置密码
2. **邮箱验证**: 注册后发送验证邮件
3. **第三方登录**: 微信、企业微信集成
4. **用户资料编辑**: 允许用户更新个人信息
5. **头像上传**: 支持用户上传自定义头像
6. **角色权限**: 实现基于角色的访问控制(RBAC)
7. **审计日志**: 记录用户操作历史
8. **多因素认证**: 增强安全性
