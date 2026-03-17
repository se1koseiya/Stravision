# 🔄 数据库迁移完成通知

## 📢 重要变更

本项目已从 **SQLite** 迁移到 **PostgreSQL**。

## ✅ 已完成的修复

### 核心代码
- ✅ 数据库连接层 (`lib/db/database.ts`)
- ✅ 所有 SQL 语句语法
- ✅ 管理脚本 (`scripts/set-admin.js`)
- ✅ 数据检查脚本 (`check-data.js`)

### 配置文件
- ✅ 环境变量配置 (`.env`, `.env.example`)
- ✅ Prisma Schema (`prisma/schema.prisma`)
- ✅ Docker Compose (`docker-compose.yml`)

### 新增工具
- ✅ 迁移指南 (`MIGRATION_GUIDE.md`)
- ✅ 数据迁移脚本 (`scripts/migrate-sqlite-to-postgres.js`)
- ✅ 迁移总结 (`POSTGRES_MIGRATION_SUMMARY.md`)

## 🚀 快速开始

### 本地开发

1. **安装 PostgreSQL**
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql
   
   # Windows - 下载安装包
   # https://www.postgresql.org/download/windows/
   
   # Linux
   sudo apt-get install postgresql
   ```

2. **创建数据库**
   ```bash
   psql -U postgres
   CREATE DATABASE stravision;
   \q
   ```

3. **配置环境变量**
   
   编辑 `.env` 文件：
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/stravision
   JWT_SECRET=your-secret-key
   ```

4. **迁移现有数据（可选）**
   
   如果你有 SQLite 数据库文件：
   ```bash
   node scripts/migrate-sqlite-to-postgres.js
   ```

5. **启动应用**
   ```bash
   npm install
   npm run dev
   ```

### Docker 部署

1. **配置环境变量**
   ```bash
   cp .env.postgres.example .env
   # 编辑 .env 文件，填入实际配置
   ```

2. **启动服务**
   ```bash
   docker-compose up -d
   ```

3. **查看日志**
   ```bash
   docker-compose logs -f web
   ```

## 📚 详细文档

- **完整迁移指南**: `MIGRATION_GUIDE.md`
- **迁移总结**: `POSTGRES_MIGRATION_SUMMARY.md`
- **环境变量示例**: `.env.example` (本地) / `.env.postgres.example` (Docker)

## ⚠️ 注意事项

### 依赖包说明

项目中仍保留了 `better-sqlite3` 依赖，原因：
- 用于数据迁移脚本 (`scripts/migrate-sqlite-to-postgres.js`)
- 如果你不需要从 SQLite 迁移数据，可以移除：
  ```bash
  npm uninstall better-sqlite3 @types/better-sqlite3 @prisma/adapter-better-sqlite3
  ```

### 环境变量变更

| 旧变量 | 新变量 | 说明 |
|--------|--------|------|
| `DATABASE_PATH` | `DATABASE_URL` | SQLite 文件路径 → PostgreSQL 连接字符串 |

### 数据类型保持兼容

为了保持向后兼容，以下设计保持不变：
- 时间戳：使用 `BIGINT` 存储毫秒级时间戳
- 布尔值：使用 `INTEGER` (0/1) 而非 `BOOLEAN`
- JSON：使用 `TEXT` 存储（未来可升级为 `JSONB`）

## 🔍 验证迁移

运行以下命令验证迁移是否成功：

```bash
# 1. 测试数据库连接
node -e "require('./lib/db/database').query('SELECT 1').then(() => console.log('✅ 连接成功'))"

# 2. 检查数据
node check-data.js

# 3. 设置管理员
node scripts/set-admin.js your-email@example.com super_admin

# 4. 启动应用
npm run dev
```

## 🆘 遇到问题？

### 连接失败
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**解决方案**: 确保 PostgreSQL 正在运行
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Windows - 使用服务管理器启动
```

### 数据库不存在
```
Error: database "stravision" does not exist
```
**解决方案**: 创建数据库
```bash
psql -U postgres -c "CREATE DATABASE stravision;"
```

### 认证失败
```
Error: password authentication failed
```
**解决方案**: 检查 DATABASE_URL 中的用户名和密码是否正确

## 📞 技术支持

如有问题，请查看：
1. `MIGRATION_GUIDE.md` - 详细迁移步骤
2. `POSTGRES_MIGRATION_SUMMARY.md` - 技术细节和常见问题
3. 项目 Issues - 提交问题或查看已知问题

---

**迁移完成日期**: 2024年
**PostgreSQL 版本**: 16+
**Node.js 版本**: 20+
