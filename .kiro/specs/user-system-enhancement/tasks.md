# 用户系统完善实现任务

- [x] 1. 安装依赖和环境配置




  - 安装 better-sqlite3 和类型定义
  - 更新 .env.example 文件添加 JWT_SECRET 和 DATABASE_PATH
  - 确保 data 目录存在
  - _需求: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2. 实现数据库基础设施




  - _需求: 1.1, 1.2, 1.3, 1.4_

- [x] 2.1 创建数据库连接管理模块


  - 创建 lib/db/database.ts 文件
  - 实现 initDB() 函数初始化数据库和表结构
  - 实现 getDB() 函数获取数据库实例(单例模式)
  - 实现 closeDB() 函数关闭数据库连接
  - 创建 users 表包含所有必需字段和索引
  - _需求: 1.1, 1.2, 1.3, 1.4_

- [x] 2.2 实现数据迁移功能


  - 在 initDB() 中添加从 data/users.json 迁移到数据库的逻辑
  - 检查 JSON 文件是否存在,如果存在则读取并迁移用户数据
  - 迁移完成后重命名或删除 JSON 文件
  - _需求: 1.5_

- [x] 3. 实现用户服务层




  - _需求: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 3.1 创建用户数据模型和类型定义





  - 创建 lib/db/user-service.ts 文件
  - 定义 User, UserPublic, CreateUserInput, UpdateUserInput 接口
  - 实现 toPublicUser() 函数移除敏感字段
  - _需求: 7.1, 7.2, 7.3, 7.4_

- [x] 3.2 实现用户 CRUD 操作


  - 实现 createUser() 函数创建新用户(包含密码哈希)
  - 实现 getUserByEmail() 函数通过邮箱查询用户
  - 实现 getUserById() 函数通过ID查询用户
  - 实现 updateUser() 函数更新用户信息
  - 使用参数化查询防止SQL注入
  - _需求: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3.3 实现密码验证功能


  - 实现 verifyCredentials() 函数验证邮箱和密码
  - 使用 bcrypt.compare() 验证密码哈希
  - 返回 UserPublic 或 null
  - _需求: 3.2, 7.5_

- [x] 4. 更新认证工具模块





  - _需求: 3.4, 3.5, 3.6, 4.6_

- [x] 4.1 更新 JWT 令牌管理


  - 更新 lib/auth.ts 文件
  - 修改 JWT payload 包含 id, email, username
  - 实现 generateToken() 函数生成包含完整用户信息的令牌
  - 实现 verifyToken() 函数验证令牌并返回 payload
  - _需求: 3.4, 3.6_


- [x] 4.2 实现 Cookie 管理函数


  - 实现 setAuthCookie() 函数设置 httpOnly cookie
  - 实现 clearAuthCookie() 函数清除 cookie
  - 确保生产环境使用 secure 标志
  - _需求: 3.5, 4.5_


- [x] 4.3 实现获取当前用户函数


  - 实现 getCurrentUser() 函数从请求中提取并验证令牌
  - 从数据库获取完整用户信息
  - 返回 UserPublic 或 null
  - _需求: 4.2, 4.3_

- [x] 5. 更新注册 API 路由





  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 5.1 更新注册 API 实现


  - 更新 app/api/auth/register/route.ts
  - 添加 username 字段验证(2-20字符)
  - 更新密码验证为至少8个字符
  - 使用 user-service 的 createUser() 保存到数据库
  - 生成包含完整用户信息的 JWT 令牌
  - 返回 UserPublic 信息
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 6. 更新登录 API 路由





  - _需求: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 6.1 更新登录 API 实现


  - 更新 app/api/auth/login/route.ts
  - 使用 user-service 的 verifyCredentials() 验证用户
  - 生成包含 id, email, username 的 JWT 令牌
  - 设置 httpOnly cookie
  - 返回 UserPublic 信息
  - _需求: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 7. 更新用户信息 API 路由





  - _需求: 4.1, 4.2, 4.3, 4.4_

- [x] 7.1 更新 /api/auth/me 实现


  - 更新 app/api/auth/me/route.ts
  - 使用 getCurrentUser() 获取当前用户
  - 从数据库获取完整用户资料
  - 返回包含 UserPublic 的响应
  - _需求: 4.1, 4.2, 4.3, 4.4_

- [x] 8. 更新注册页面





  - _需求: 6.1, 6.2, 6.3, 6.4, 6.5_


- [x] 8.1 添加用户名输入字段

  - 更新 app/register/page.tsx
  - 在邮箱和密码字段之间添加用户名输入框
  - 添加 username 状态管理
  - 设置占位符文本"请输入用户名(2-20个字符)"
  - 添加用户名验证逻辑
  - _需求: 6.1, 6.2, 6.3_

- [x] 8.2 改进表单验证和错误处理


  - 实现实时表单验证
  - 显示详细的验证错误消息
  - 注册失败时保留已输入的邮箱和用户名
  - 成功后重定向到 /monitor 页面
  - _需求: 6.4, 6.5, 2.6_

- [x] 9. 更新登录页面



  - _需求: 3.5_

- [x] 9.1 修改登录成功重定向


  - 更新 app/login/page.tsx
  - 将成功登录后的重定向目标从 "/" 改为 "/monitor"
  - _需求: 3.5_

- [x] 10. 在监控页面添加用户头像组件




  - _需求: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 10.1 安装和配置 Avatar 组件


  - 使用 shadcn/ui CLI 安装 Avatar 组件: `npx shadcn@latest add avatar`
  - 使用 shadcn/ui CLI 安装 DropdownMenu 组件: `npx shadcn@latest add dropdown-menu`
  - _需求: 5.1_



- [ ] 10.2 创建用户头像菜单组件
  - 创建 components/user-avatar-menu.tsx 组件
  - 实现 Avatar 显示逻辑(头像URL或用户名首字母)
  - 实现下拉菜单包含用户名、邮箱、个人设置、登出选项
  - 实现登出功能调用 /api/auth/logout 并重定向


  - _需求: 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 10.3 集成到监控页面
  - 更新 app/monitor/page.tsx
  - 在页面加载时获取当前用户信息
  - 在页面右上角(连接状态旁边)添加 UserAvatarMenu 组件
  - 如果未登录则重定向到 /login
  - _需求: 5.1, 5.4, 4.6_

- [ ]* 11. 编写测试
  - _需求: 所有需求_

- [ ]* 11.1 编写数据库层单元测试
  - 测试数据库初始化
  - 测试 CRUD 操作
  - 测试错误处理
  - _需求: 1.1, 1.2, 1.3, 1.4_

- [ ]* 11.2 编写用户服务层单元测试
  - 测试用户创建(成功和失败场景)
  - 测试用户查询
  - 测试密码验证
  - 测试数据转换
  - _需求: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ]* 11.3 编写 API 集成测试
  - 测试注册流程
  - 测试登录流程
  - 测试会话管理
  - 测试错误场景
  - _需求: 2.1-2.6, 3.1-3.6, 4.1-4.6_

- [ ]* 12. 文档和优化
  - _需求: 所有需求_

- [ ]* 12.1 更新项目文档
  - 更新 README.md 说明用户系统功能
  - 记录环境变量配置
  - 添加数据库架构文档
  - _需求: 8.1-8.5_

- [ ]* 12.2 性能优化
  - 优化数据库查询
  - 添加适当的错误边界
  - 优化前端组件渲染
  - _需求: 所有需求_
