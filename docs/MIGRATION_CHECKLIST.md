# ✅ PostgreSQL 迁移检查清单

## 📋 代码修复状态

### ✅ 已完成

- [x] **lib/db/database.ts** - PostgreSQL 连接池和查询方法
- [x] **scripts/set-admin.js** - 从 better-sqlite3 迁移到 pg
- [x] **check-data.js** - 从 better-sqlite3 迁移到 pg
- [x] **.env** - DATABASE_PATH → DATABASE_URL
- [x] **.env.example** - 更新为 PostgreSQL 配置
- [x] **prisma/schema.prisma** - 修复 provider 和 url
- [x] **docker-compose.yml** - 移除 DATABASE_PATH
- [x] **scripts/check-email-config.ts** - 更新数据库检查

### 📝 新增文件

- [x] **MIGRATION_GUIDE.md** - 完整迁移指南
- [x] **POSTGRES_MIGRATION_SUMMARY.md** - 技术总结
- [x] **README_POSTGRES_MIGRATION.md** - 快速开始指南
- [x] **scripts/migrate-sqlite-to-postgres.js** - 数据迁移工具
- [x] **.env.postgres.example** - Docker 环境变量示例
- [x] **MIGRATION_CHECKLIST.md** - 本文件

## 🔍 SQL 语法变更

### ✅ 已修复的语法

| 项目 | SQLite | PostgreSQL | 状态 |
|------|--------|-----------|------|
| 自增主键 | `INTEGER PRIMARY KEY AUTOINCREMENT` | `BIGSERIAL PRIMARY KEY` | ✅ |
| 表信息查询 | `PRAGMA table_info(table)` | `information_schema.columns` | ✅ |
| 参数占位符 | `?` | `$1, $2, $3` | ✅ |
| 浮点数类型 | `REAL` | `DOUBLE PRECISION` | ✅ |
| 查询方法 | `.prepare().all()` | `pool.query()` | ✅ |

## 📦 依赖包状态

### 当前依赖

```json
{
  "pg": "^8.18.0",                              // ✅ PostgreSQL 驱动
  "better-sqlite3": "^12.6.2",                  // ⚠️  仅用于迁移脚本
  "@types/better-sqlite3": "^7.6.13",           // ⚠️  仅用于迁移脚本
  "@prisma/adapter-better-sqlite3": "^7.3.0",   // ⚠️  可选移除
  "@prisma/client": "^7.3.0",                   // ✅ Prisma 客户端
  "prisma": "^7.3.0"                            // ✅ Prisma CLI
}
```

### 可选清理

如果不需要从 SQLite 迁移数据，可以移除：

```bash
npm uninstall better-sqlite3 @types/better-sqlite3 @prisma/adapter-better-sqlite3
```

## 🗄️ 数据库表结构

### ✅ 已创建的表

- [x] users
- [x] email_verifications
- [x] scheduled_tasks
- [x] login_logs
- [x] banned_ips
- [x] access_logs
- [x] device_logs
- [x] sensor_readings
- [x] login_tickets
- [x] system_settings
- [x] friend_requests
- [x] friends
- [x] messages
- [x] groups
- [x] group_members
- [x] automation_rules

### ✅ 已创建的索引

- [x] idx_email_verifications_email
- [x] idx_email_verifications_expires_at
- [x] idx_sensor_readings_created_at
- [x] idx_users_email
- [x] idx_users_wechat_openid
- [x] idx_users_uid
- [x] idx_messages_sender_receiver
- [x] idx_messages_receiver_read
- [x] idx_messages_group_id

## 🚀 部署前检查

### 本地开发环境

- [ ] PostgreSQL 已安装并运行
- [ ] 数据库 `stravision` 已创建
- [ ] `.env` 文件中 `DATABASE_URL` 已配置
- [ ] 运行 `npm install` 安装依赖
- [ ] 运行 `npm run dev` 测试启动
- [ ] 访问 `http://localhost:3000` 验证

### Docker 部署环境

- [ ] 复制 `.env.postgres.example` 为 `.env`
- [ ] 编辑 `.env` 填入实际配置
  - [ ] POSTGRES_PASSWORD
  - [ ] DATABASE_URL
  - [ ] JWT_SECRET
  - [ ] 其他必需的 API keys
- [ ] 运行 `docker-compose up -d`
- [ ] 检查容器状态 `docker-compose ps`
- [ ] 查看日志 `docker-compose logs web`

### 数据迁移（如果需要）

- [ ] 确认 SQLite 数据库文件路径
- [ ] 设置 `SQLITE_DB_PATH` 环境变量（可选）
- [ ] 运行迁移脚本：
  ```bash
  node scripts/migrate-sqlite-to-postgres.js
  ```
- [ ] 验证数据完整性

## 🧪 测试验证

### 基础功能测试

```bash
# 1. 测试数据库连接
node -e "require('./lib/db/database').query('SELECT 1').then(() => console.log('✅ 连接成功'))"

# 2. 检查表结构
node -e "require('./lib/db/database').query('SELECT table_name FROM information_schema.tables WHERE table_schema=\\'public\\'').then(r => console.log('✅ 表:', r.map(x => x.table_name)))"

# 3. 测试数据查询
node check-data.js

# 4. 测试管理员设置
node scripts/set-admin.js test@example.com admin

# 5. 启动应用
npm run dev
```

### 功能验证清单

- [ ] 用户注册功能正常
- [ ] 用户登录功能正常
- [ ] 数据查询显示正常
- [ ] 设备控制功能正常
- [ ] 定时任务功能正常
- [ ] 消息功能正常
- [ ] 管理员功能正常

## 📊 性能检查

### 数据库性能

```sql
-- 检查连接数
SELECT count(*) FROM pg_stat_activity;

-- 检查慢查询
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- 检查表大小
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 应用性能

- [ ] 页面加载时间 < 2秒
- [ ] API 响应时间 < 500ms
- [ ] 数据库查询时间 < 100ms
- [ ] 内存使用正常
- [ ] CPU 使用正常

## 🔒 安全检查

- [ ] DATABASE_URL 不包含在版本控制中
- [ ] 生产环境使用强密码
- [ ] PostgreSQL 配置了防火墙规则
- [ ] 启用了 SSL 连接（生产环境）
- [ ] 定期备份数据库
- [ ] 日志记录已配置

## 📝 文档更新

- [x] 创建迁移指南
- [x] 更新环境变量示例
- [x] 创建快速开始文档
- [ ] 更新主 README.md（如需要）
- [ ] 更新部署文档（如需要）
- [ ] 通知团队成员

## 🎯 后续优化建议

### 短期优化

- [ ] 添加数据库连接池监控
- [ ] 配置查询超时
- [ ] 添加慢查询日志
- [ ] 实现数据库健康检查端点

### 中期优化

- [ ] 考虑使用 Prisma ORM 替代原生 SQL
- [ ] 实现数据库读写分离
- [ ] 添加查询缓存层（Redis）
- [ ] 优化高频查询的索引

### 长期优化

- [ ] 迁移 JSON 字段到 JSONB
- [ ] 实现数据分区策略
- [ ] 配置数据库复制
- [ ] 实现自动备份和恢复

## 📞 问题排查

### 常见问题快速参考

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 连接失败 | PostgreSQL 未运行 | `brew services start postgresql` |
| 认证失败 | 密码错误 | 检查 DATABASE_URL |
| 表不存在 | 未初始化 | 运行应用或手动 initDB() |
| 性能慢 | 缺少索引 | 检查并创建索引 |
| 内存占用高 | 连接池配置 | 调整 pool.max 参数 |

### 获取帮助

1. 查看 `MIGRATION_GUIDE.md` 详细步骤
2. 查看 `POSTGRES_MIGRATION_SUMMARY.md` 技术细节
3. 查看 PostgreSQL 日志
4. 查看应用日志
5. 提交 Issue 到项目仓库

## ✨ 迁移完成确认

当以下所有项都完成时，迁移即告成功：

- [ ] 所有代码修复已完成
- [ ] 数据库已创建并初始化
- [ ] 数据已迁移（如适用）
- [ ] 所有测试通过
- [ ] 应用正常运行
- [ ] 性能符合预期
- [ ] 文档已更新
- [ ] 团队已通知

---

**迁移日期**: ___________
**执行人**: ___________
**验证人**: ___________
**备注**: ___________
