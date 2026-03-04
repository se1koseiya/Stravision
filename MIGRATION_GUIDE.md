# SQLite 到 PostgreSQL 迁移指南

## 已修复的问题

### 1. 数据库连接配置
- ✅ 更新 `.env` 和 `.env.example`，将 `DATABASE_PATH` 改为 `DATABASE_URL`
- ✅ 修复 `prisma/schema.prisma` 配置

### 2. 脚本文件迁移
- ✅ `scripts/set-admin.js` - 从 better-sqlite3 迁移到 pg
- ✅ `check-data.js` - 从 better-sqlite3 迁移到 pg

### 3. 核心数据库代码
- ✅ `lib/db/database.ts` - 已使用 PostgreSQL (pg) 连接池

## 迁移步骤

### 步骤 1: 安装 PostgreSQL

确保你的系统已安装 PostgreSQL。

**Windows:**
```bash
# 下载并安装 PostgreSQL
# https://www.postgresql.org/download/windows/
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 步骤 2: 创建数据库

```bash
# 连接到 PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE stravision;

# 创建用户（可选）
CREATE USER stravision_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE stravision TO stravision_user;

# 退出
\q
```

### 步骤 3: 配置环境变量

更新 `.env` 文件：

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/stravision
```

或使用自定义用户：

```env
DATABASE_URL=postgresql://stravision_user:your_password@localhost:5432/stravision
```

### 步骤 4: 数据迁移（如果有旧数据）

如果你有 SQLite 数据需要迁移：

#### 方案 A: 使用 pgloader（推荐）

```bash
# 安装 pgloader
# macOS
brew install pgloader

# Ubuntu/Debian
sudo apt-get install pgloader

# 迁移数据
pgloader ./data/users.db postgresql://postgres:password@localhost:5432/stravision
```

#### 方案 B: 手动导出导入

1. 从 SQLite 导出数据：
```bash
sqlite3 ./data/users.db .dump > dump.sql
```

2. 转换 SQL 语法（需要手动调整）：
   - `INTEGER PRIMARY KEY AUTOINCREMENT` → `BIGSERIAL PRIMARY KEY`
   - `INTEGER` → `INTEGER` 或 `BIGINT`
   - `REAL` → `DOUBLE PRECISION`
   - 移除 `PRAGMA` 语句

3. 导入到 PostgreSQL：
```bash
psql -U postgres -d stravision -f converted_dump.sql
```

### 步骤 5: 初始化数据库表

运行应用程序，它会自动创建所有必要的表：

```bash
npm run dev
```

或手动运行初始化：

```bash
node -e "require('./lib/db/database').initDB().then(() => console.log('DB initialized'))"
```

### 步骤 6: 验证迁移

```bash
# 检查数据
node check-data.js

# 设置管理员
node scripts/set-admin.js your-email@example.com super_admin
```

## 需要清理的依赖（可选）

如果确认不再需要 SQLite，可以移除相关依赖：

```bash
npm uninstall better-sqlite3 @types/better-sqlite3 @prisma/adapter-better-sqlite3
```

然后从 `package.json` 中移除这些依赖。

## 主要差异说明

### SQL 语法差异

| SQLite | PostgreSQL |
|--------|-----------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `BIGSERIAL PRIMARY KEY` |
| `PRAGMA table_info(table)` | `SELECT * FROM information_schema.columns WHERE table_name='table'` |
| `PRAGMA foreign_keys = ON` | 默认启用 |
| `?` 占位符 | `$1, $2, $3` 占位符 |
| `.all()`, `.get()` | `query()` 返回 `{ rows: [] }` |

### 数据类型映射

| SQLite | PostgreSQL |
|--------|-----------|
| `INTEGER` | `INTEGER` 或 `BIGINT` |
| `REAL` | `DOUBLE PRECISION` |
| `TEXT` | `TEXT` 或 `VARCHAR` |
| `BLOB` | `BYTEA` |

## 常见问题

### Q: 如何连接远程 PostgreSQL？

A: 更新 DATABASE_URL：
```env
DATABASE_URL=postgresql://user:password@remote-host:5432/database?sslmode=require
```

### Q: 如何备份 PostgreSQL 数据？

A: 使用 pg_dump：
```bash
pg_dump -U postgres stravision > backup.sql
```

### Q: 性能优化建议？

A: 
1. 确保创建了必要的索引（代码中已包含）
2. 调整 PostgreSQL 配置（shared_buffers, work_mem 等）
3. 使用连接池（代码中已使用 pg.Pool）
4. 定期运行 VACUUM ANALYZE

## 回滚方案

如果需要回滚到 SQLite：

1. 恢复 `.env` 中的 `DATABASE_PATH`
2. 恢复脚本文件中的 better-sqlite3 代码
3. 恢复 `lib/db/database.ts` 中的 SQLite 代码
4. 重新安装 better-sqlite3 依赖

建议在迁移前备份所有数据和代码。
