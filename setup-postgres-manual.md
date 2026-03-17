# 🔧 PostgreSQL 手动设置指南 (Windows)

## 问题诊断

错误信息：`数据库 "stravision" 不存在`

这意味着 PostgreSQL 已安装并运行，但数据库还未创建。

## 🚀 快速解决方案

### 方法 1: 使用 pgAdmin（推荐，最简单）

1. **打开 pgAdmin**
   - 在开始菜单搜索 "pgAdmin"
   - 或访问：`C:\Program Files\PostgreSQL\16\pgAdmin 4\bin\pgAdmin4.exe`

2. **连接到 PostgreSQL**
   - 展开左侧的 "Servers"
   - 点击 "PostgreSQL 16"（或你的版本）
   - 输入密码（你在安装时设置的密码）

3. **创建数据库**
   - 右键点击 "Databases"
   - 选择 "Create" → "Database..."
   - 在 "Database" 字段输入：`stravision`
   - 点击 "Save"

4. **完成！**
   - 返回项目，运行 `npm run dev`

### 方法 2: 使用 SQL Shell (psql)

1. **打开 SQL Shell**
   - 在开始菜单搜索 "SQL Shell (psql)"
   - 或访问：`C:\Program Files\PostgreSQL\16\bin\psql.exe`

2. **连接到 PostgreSQL**
   ```
   Server [localhost]: (直接按回车)
   Database [postgres]: (直接按回车)
   Port [5432]: (直接按回车)
   Username [postgres]: (直接按回车)
   Password for user postgres: (输入你的密码)
   ```

3. **创建数据库**
   ```sql
   CREATE DATABASE stravision;
   ```

4. **验证创建**
   ```sql
   \l
   ```
   应该能看到 `stravision` 在列表中

5. **退出**
   ```sql
   \q
   ```

6. **完成！**
   - 返回项目，运行 `npm run dev`

### 方法 3: 使用命令行（需要配置 PATH）

如果 `psql` 命令不可用，需要先添加到 PATH：

1. **找到 PostgreSQL bin 目录**
   - 通常在：`C:\Program Files\PostgreSQL\16\bin`

2. **添加到 PATH**
   - 右键 "此电脑" → "属性"
   - 点击 "高级系统设置"
   - 点击 "环境变量"
   - 在 "系统变量" 中找到 "Path"
   - 点击 "编辑" → "新建"
   - 添加：`C:\Program Files\PostgreSQL\16\bin`
   - 点击 "确定" 保存

3. **重新打开命令行**
   ```bash
   psql -U postgres
   # 输入密码后
   CREATE DATABASE stravision;
   \q
   ```

## 📋 验证配置

### 检查 .env.local

确保文件包含正确的配置：

```env
DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/stravision
```

**重要**：
- 替换 `你的密码` 为你安装 PostgreSQL 时设置的密码
- 确保 URL 末尾有 `/stravision`（数据库名）

### 测试连接

创建测试文件 `test-db.js`：

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:你的密码@localhost:5432/stravision'
});

async function test() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ 连接成功！', result.rows[0]);
    await pool.end();
  } catch (error) {
    console.error('❌ 连接失败：', error.message);
    process.exit(1);
  }
}

test();
```

运行测试：
```bash
node test-db.js
```

## 🔍 常见问题

### Q1: 忘记了 PostgreSQL 密码

**解决方案**：
1. 找到 `pg_hba.conf` 文件（通常在 `C:\Program Files\PostgreSQL\16\data\`）
2. 备份该文件
3. 将所有 `md5` 改为 `trust`
4. 重启 PostgreSQL 服务
5. 使用 `psql -U postgres` 连接（无需密码）
6. 修改密码：`ALTER USER postgres PASSWORD '新密码';`
7. 恢复 `pg_hba.conf` 文件
8. 再次重启服务

### Q2: PostgreSQL 服务未运行

**解决方案**：
1. 打开 "服务" (Win+R → `services.msc`)
2. 找到 "postgresql-x64-16" 或类似名称
3. 右键 → "启动"
4. 设置为 "自动" 启动

### Q3: 端口 5432 被占用

**解决方案**：
1. 检查占用端口的程序：
   ```bash
   netstat -ano | findstr :5432
   ```
2. 终止占用的进程或更改 PostgreSQL 端口

### Q4: 连接被拒绝

**检查清单**：
- [ ] PostgreSQL 服务正在运行
- [ ] 防火墙允许 5432 端口
- [ ] `pg_hba.conf` 配置正确
- [ ] 密码正确

## 🎯 完整设置检查清单

- [ ] PostgreSQL 已安装
- [ ] PostgreSQL 服务正在运行
- [ ] 数据库 `stravision` 已创建
- [ ] `.env.local` 中 `DATABASE_URL` 配置正确
- [ ] 密码正确
- [ ] 可以通过 pgAdmin 或 psql 连接
- [ ] 测试脚本运行成功

## 📞 仍然有问题？

### 检查 PostgreSQL 安装

```bash
# 检查版本
psql --version

# 检查服务状态
sc query postgresql-x64-16
```

### 查看日志

PostgreSQL 日志位置：
```
C:\Program Files\PostgreSQL\16\data\log\
```

查看最新的日志文件以获取详细错误信息。

### 重新安装（最后手段）

如果以上方法都不行：
1. 备份数据（如果有）
2. 卸载 PostgreSQL
3. 删除数据目录
4. 重新下载并安装：https://www.postgresql.org/download/windows/
5. 记住设置的密码！

---

**设置完成后，运行 `npm run dev` 启动应用！** 🎉
