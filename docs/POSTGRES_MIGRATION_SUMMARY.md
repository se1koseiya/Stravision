# PostgreSQL 迁移修复总结

## ✅ 已修复的问题

### 1. 核心数据库代码
- ✅ `lib/db/database.ts` - 已正确使用 PostgreSQL (pg Pool)
- ✅ 所有 SQL 语句已使用 PostgreSQL 语法（BIGSERIAL, $1/$2 占位符等）

### 2. 脚本文件迁移
- ✅ `scripts/set-admin.js` - 从 better-sqlite3 迁移到 pg
- ✅ `check-data.js` - 从 better-sqlite3 迁移到 pg
- ✅ 移除了所有 PRAGMA 语句，改用 information_schema 查询

### 3. 配置文件更新
- ✅ `.env` - 将 DATABASE_PATH 改为 DATABASE_URL
- ✅ `.env.example` - 更新为 PostgreSQL 配置示例
- ✅ `prisma/schema.prisma` - 修复 provider 和 url 配置
- ✅ `docker-compose.yml` - 移除 DATABASE_PATH，使用 DATABASE_URL
- ✅ `scripts/check-email-config.ts` - 更新数据库检查逻辑

### 4. 新增文件
- ✅ `MIGRATION_GUIDE.md` - 完整的迁移指南
- ✅ `scripts/migrate-sqlite-to-postgres.js` - 自动数据迁移脚本
- ✅ `.env.postgres.example` - Docker Compose 环境变量示例

## 📋 迁移检查清单

### 开发环境迁移

- [ ] 1. 安装 PostgreSQL
  ```bash
  # Windows: 下载安装包
  # macOS: brew install postgresql
  # Linux: sudo apt-get install postgresql
  ```

- [ ] 2. 创建数据库
  ```bash
  psql -U postgres
  CREATE DATABASE stravision;
  \q
  ```

- [ ] 3. 更新环境变量
  ```bash
  # 编辑 .env 文件
  DATABASE_URL=postgresql://postgres:password@localhost:5432/stravision
  ```

- [ ] 4. 迁移现有数据（如果有）
  ```bash
  # 如果有 SQLite 数据需要迁移
  node scripts/migrate-sqlite-to-postgres.js
  ```

- [ ] 5. 初始化数据库
  ```bash
  npm run dev
  # 或手动初始化
  node -e "require('./lib/db/database').initDB().then(() => console.log('Done'))"
  ```

- [ ] 6. 验证迁移
  ```bash
  node check-data.js
  node scripts/set-admin.js your-email@example.com super_admin
  ```

### 生产环境部署（Docker）

- [ ] 1. 复制环境变量配置
  ```bash
  cp .env.postgres.example .env
  ```

- [ ] 2. 编辑 .env 文件，填入实际值
  - POSTGRES_PASSWORD
  - DATABASE_URL
  - JWT_SECRET
  - 其他 API keys

- [ ] 3. 启动服务
  ```bash
  docker-compose up -d
  ```

- [ ] 4. 检查服务状态
  ```bash
  docker-compose ps
  docker-compose logs web
  ```

- [ ] 5. 迁移数据（如果需要）
  ```bash
  # 在容器内运行迁移脚本
  docker-compose exec web node scripts/migrate-sqlite-to-postgres.js
  ```

## 🔍 主要变更说明

### SQL 语法变更

| 变更项 | SQLite | PostgreSQL |
|--------|--------|-----------|
| 自增主键 | `INTEGER PRIMARY KEY AUTOINCREMENT` | `BIGSERIAL PRIMARY KEY` |
| 表信息查询 | `PRAGMA table_info(table)` | `SELECT * FROM information_schema.columns WHERE table_name='table'` |
| 参数占位符 | `?` | `$1, $2, $3` |
| 浮点数 | `REAL` | `DOUBLE PRECISION` |
| 布尔值 | `INTEGER (0/1)` | `INTEGER (0/1)` 或 `BOOLEAN` |

### 连接方式变更

**SQLite (旧):**
```javascript
const Database = require('better-sqlite3');
const db = new Database('./data/users.db');
const rows = db.prepare("SELECT * FROM users").all();
```

**PostgreSQL (新):**
```javascript
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const result = await pool.query("SELECT * FROM users");
const rows = result.rows;
```

## ⚠️ 注意事项

### 1. 数据类型兼容性
- 时间戳使用 BIGINT 存储毫秒级时间戳（与原 SQLite 保持一致）
- 布尔值仍使用 INTEGER (0/1)，保持向后兼容
- JSON 字段使用 TEXT 存储（可考虑后续改为 JSONB）

### 2. 事务处理
PostgreSQL 的事务处理更严格：
- 必须显式 BEGIN/COMMIT/ROLLBACK
- 代码中已使用 `withTransaction` 辅助函数

### 3. 并发控制
- PostgreSQL 使用 MVCC，不需要 WAL 模式配置
- 移除了 SQLite 的 `busy_timeout` 和 `journal_mode` 设置

### 4. 索引
所有必要的索引已在 `initDB()` 中创建：
- email, uid, wechat_openid 等唯一索引
- 消息查询的复合索引
- 时间戳字段的索引

## 🚀 性能优化建议

### 1. 连接池配置
当前使用默认配置，生产环境可调整：
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // 最大连接数
  idleTimeoutMillis: 30000,   // 空闲超时
  connectionTimeoutMillis: 2000, // 连接超时
});
```

### 2. 查询优化
- 使用 EXPLAIN ANALYZE 分析慢查询
- 考虑为常用查询添加索引
- 大数据量查询使用分页

### 3. 数据库维护
```bash
# 定期执行 VACUUM ANALYZE
psql -U postgres -d stravision -c "VACUUM ANALYZE;"

# 查看数据库大小
psql -U postgres -d stravision -c "SELECT pg_size_pretty(pg_database_size('stravision'));"
```

## 🔄 回滚方案

如果需要回滚到 SQLite（不推荐）：

1. 恢复备份的文件：
   - `.env` 中的 DATABASE_PATH
   - `scripts/set-admin.js`
   - `check-data.js`
   - `lib/db/database.ts`

2. 重新安装 SQLite 依赖：
   ```bash
   npm install better-sqlite3 @types/better-sqlite3
   ```

3. 从 PostgreSQL 导出数据并转换回 SQLite

**建议：在迁移前做好完整备份！**

## 📚 相关文档

- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [node-postgres (pg) 文档](https://node-postgres.com/)
- [Prisma PostgreSQL 指南](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [pgloader 迁移工具](https://pgloader.io/)

## 🆘 常见问题

### Q: 连接失败 "ECONNREFUSED"
A: 检查 PostgreSQL 是否运行，DATABASE_URL 是否正确

### Q: "relation does not exist" 错误
A: 运行应用初始化数据库表，或手动执行 initDB()

### Q: 性能比 SQLite 慢
A: 检查索引是否创建，考虑调整连接池配置

### Q: 如何备份数据
A: 使用 pg_dump：
```bash
pg_dump -U postgres stravision > backup.sql
```

## ✅ 验证步骤

迁移完成后，执行以下验证：

```bash
# 1. 检查数据库连接
node -e "require('./lib/db/database').query('SELECT 1').then(() => console.log('✅ 连接成功'))"

# 2. 检查表结构
node -e "require('./lib/db/database').query('SELECT table_name FROM information_schema.tables WHERE table_schema=\\'public\\'').then(r => console.log('✅ 表:', r.map(x => x.table_name)))"

# 3. 检查数据
node check-data.js

# 4. 测试管理员设置
node scripts/set-admin.js test@example.com admin

# 5. 启动应用
npm run dev
```

所有步骤成功后，迁移完成！🎉
