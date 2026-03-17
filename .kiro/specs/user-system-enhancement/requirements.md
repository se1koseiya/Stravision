# 用户系统完善需求文档

## 简介

本文档定义了莓界(STRAVISION)平台用户系统的完善需求。当前系统使用JSON文件存储用户数据,缺少完整的数据库集成、用户资料管理和UI展示。本需求旨在将用户系统升级为生产级别的实现,包括数据库集成、完善的认证流程、用户资料管理以及在界面中展示用户信息。

## 术语表

- **UserSystem**: 用户系统,负责用户注册、登录、认证和资料管理的完整系统
- **Database**: 数据库,用于持久化存储用户数据的关系型或非关系型数据存储系统
- **AuthenticationFlow**: 认证流程,包括用户注册、登录、会话管理和登出的完整流程
- **UserProfile**: 用户资料,包含用户的基本信息如邮箱、用户名、头像等
- **AvatarComponent**: 头像组件,shadcn/ui提供的用户头像展示组件
- **MonitorPage**: 监控页面,位于/monitor路径的设备监控界面
- **SessionManagement**: 会话管理,维护用户登录状态和会话有效性的机制
- **PasswordValidation**: 密码验证,确保密码符合安全要求的验证逻辑
- **EmailValidation**: 邮箱验证,确保邮箱格式正确且唯一的验证逻辑

## 需求

### 需求 1: 数据库集成

**用户故事:** 作为系统管理员,我希望用户数据存储在数据库中而不是JSON文件,以便系统能够安全、高效地管理用户数据并支持未来的扩展。

#### 验收标准

1. THE UserSystem SHALL 使用SQLite数据库存储用户数据
2. THE UserSystem SHALL 创建包含以下字段的users表: id(主键), email(唯一), password_hash, username, avatar_url, created_at, updated_at
3. WHEN 应用启动时, THE UserSystem SHALL 自动初始化数据库和表结构
4. THE UserSystem SHALL 提供数据库连接管理功能,确保连接的正确打开和关闭
5. THE UserSystem SHALL 将现有JSON文件中的用户数据迁移到数据库(如果存在)

### 需求 2: 用户注册增强

**用户故事:** 作为新用户,我希望注册时能够设置用户名并获得清晰的验证反馈,以便我能够成功创建账户并了解任何问题。

#### 验收标准

1. WHEN 用户提交注册表单时, THE UserSystem SHALL 验证邮箱格式是否正确
2. WHEN 用户提交注册表单时, THE UserSystem SHALL 验证密码长度至少为8个字符
3. WHEN 用户提交注册表单时, THE UserSystem SHALL 验证用户名长度在2-20个字符之间
4. IF 邮箱已存在, THEN THE UserSystem SHALL 返回"邮箱已被注册"错误消息
5. WHEN 注册成功时, THE UserSystem SHALL 将用户数据保存到数据库并生成JWT令牌
6. WHEN 注册成功时, THE UserSystem SHALL 自动登录用户并重定向到/monitor页面

### 需求 3: 登录验证增强

**用户故事:** 作为已注册用户,我希望登录过程安全可靠,并在登录后能够访问我的个人资料,以便我能够安全地使用系统功能。

#### 验收标准

1. WHEN 用户提交登录表单时, THE UserSystem SHALL 从数据库查询用户记录
2. WHEN 用户提交登录表单时, THE UserSystem SHALL 使用bcrypt验证密码哈希
3. IF 邮箱或密码不正确, THEN THE UserSystem SHALL 返回"邮箱或密码错误"消息
4. WHEN 登录成功时, THE UserSystem SHALL 生成包含用户ID和邮箱的JWT令牌
5. WHEN 登录成功时, THE UserSystem SHALL 设置httpOnly cookie并重定向到/monitor页面
6. THE UserSystem SHALL 在JWT令牌中包含用户ID、邮箱和用户名信息

### 需求 4: 用户会话管理

**用户故事:** 作为已登录用户,我希望系统能够维护我的登录状态,并在需要时能够安全登出,以便我能够持续使用系统或安全退出。

#### 验收标准

1. THE UserSystem SHALL 提供/api/auth/me接口返回当前登录用户信息
2. WHEN 请求/api/auth/me时, THE UserSystem SHALL 验证JWT令牌的有效性
3. WHEN JWT令牌有效时, THE UserSystem SHALL 从数据库获取完整的用户资料
4. WHEN JWT令牌无效或过期时, THE UserSystem SHALL 返回未认证状态
5. THE UserSystem SHALL 在用户登出时清除auth cookie
6. WHEN 用户访问受保护页面且未登录时, THE UserSystem SHALL 重定向到/login页面

### 需求 5: 用户资料展示

**用户故事:** 作为已登录用户,我希望在监控页面看到我的头像和用户名,以便我知道当前登录的账户并能够访问个人设置。

#### 验收标准

1. THE MonitorPage SHALL 在页面右上角显示shadcn/ui Avatar组件
2. WHEN 用户有头像URL时, THE MonitorPage SHALL 在Avatar组件中显示用户头像图片
3. WHEN 用户没有头像URL时, THE MonitorPage SHALL 在Avatar组件中显示用户名首字母作为fallback
4. THE MonitorPage SHALL 在Avatar旁边显示用户名
5. WHEN 用户点击Avatar时, THE MonitorPage SHALL 显示下拉菜单包含"个人设置"和"登出"选项
6. WHEN 用户点击"登出"时, THE MonitorPage SHALL 调用登出API并重定向到/login页面

### 需求 6: 注册页面UI增强

**用户故事:** 作为新用户,我希望注册页面包含用户名输入字段,以便我能够设置个性化的用户名。

#### 验收标准

1. THE 注册页面 SHALL 在邮箱和密码字段之间添加用户名输入字段
2. THE 注册页面 SHALL 为用户名字段提供占位符文本"请输入用户名(2-20个字符)"
3. THE 注册页面 SHALL 在提交前验证用户名不为空
4. THE 注册页面 SHALL 显示实时验证错误消息
5. WHEN 注册失败时, THE 注册页面 SHALL 保留用户已输入的邮箱和用户名(但不保留密码)

### 需求 7: 数据库工具函数

**用户故事:** 作为开发者,我希望有一套清晰的数据库操作函数,以便我能够安全、一致地进行用户数据的增删改查操作。

#### 验收标准

1. THE UserSystem SHALL 提供createUser函数用于创建新用户记录
2. THE UserSystem SHALL 提供getUserByEmail函数用于通过邮箱查询用户
3. THE UserSystem SHALL 提供getUserById函数用于通过ID查询用户
4. THE UserSystem SHALL 提供updateUser函数用于更新用户信息
5. THE UserSystem SHALL 确保所有数据库操作使用参数化查询防止SQL注入
6. THE UserSystem SHALL 在数据库操作失败时返回明确的错误信息

### 需求 8: 环境配置

**用户故事:** 作为系统管理员,我希望能够通过环境变量配置数据库路径和JWT密钥,以便在不同环境中灵活部署系统。

#### 验收标准

1. THE UserSystem SHALL 支持通过DATABASE_PATH环境变量配置数据库文件路径
2. WHEN DATABASE_PATH未设置时, THE UserSystem SHALL 使用默认路径./data/users.db
3. THE UserSystem SHALL 支持通过JWT_SECRET环境变量配置JWT签名密钥
4. WHEN JWT_SECRET未设置时, THE UserSystem SHALL 使用安全的默认密钥并在开发环境输出警告
5. THE UserSystem SHALL 在.env.example文件中记录所有必需的环境变量
