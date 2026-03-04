# 🚨 PostgreSQL 错误快速修复 (Windows)

## 当前错误

```
错误: 数据库 "stravision" 不存在
Error code: 3D000
```

## ✅ 快速解决（3步）

### 步骤 1: 测试连接

```bash
node test-db-connection.js
```

这会告诉你具体问题是什么。

### 步骤 2: 创建数据库

**最简单的方法 - 使用 pgAdmin：**

1. 打开 pgAdmin（在开始菜单搜索）
2. 连接到 PostgreSQL（输入密码）
3. 右键点击 "Databases" → "Create" → "Database..."
4. 输入名称：`stravision`
5. 点击 "Save"

**或使用 SQL Shell (psql)：**

1. 打开 "SQL Shell (psql)"（在开始菜单搜索）
2. 全部按回车使用默认值，最后输入密码
3. 执行：`CREATE DATABASE stravision;`
4. 验证：`\l` （应该能看到 stravision）
5. 退出：`\q`

### 步骤 3: 重启应用

```bash
npm run dev
```

## 📋 详细指南

如果上述方法不行，查看：
- **setup-postgres-manual.md** - 完整的手动设置指南
- **setup-postgres-windows.bat** - Windows 自动化脚本（需要 psql 在 PATH 中）

## 🔍 常见问题

### 错误 1: 连接被拒绝
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**解决**: 启动 PostgreSQL
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Windows - 使用服务管理器
```

### 错误 2: 认证失败
```
Error: password authentication failed for user "postgres"
```
**解决**: 检查 DATABASE_URL 中的密码是否正确

### 错误 3: 数据库不存在
```
Error: database "stravision" does not exist
```
**解决**: 创建数据库
```bash
psql -U postgres -c "CREATE DATABASE stravision;"
```

## 📞 需要更多帮助？

查看完整文档：
- `MIGRATION_GUIDE.md` - 详细迁移指南
- `POSTGRES_MIGRATION_SUMMARY.md` - 技术细节和FAQ
- `数据库迁移完成报告.md` - 中文版完整报告

---

**修复完成后，刷新页面即可正常使用！** 🎉
