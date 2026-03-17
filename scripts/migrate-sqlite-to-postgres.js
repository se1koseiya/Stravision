/**
 * SQLite 到 PostgreSQL 数据迁移脚本
 * 
 * 使用方法:
 * node scripts/migrate-sqlite-to-postgres.js
 * 
 * 环境变量:
 * - SQLITE_DB_PATH: SQLite 数据库文件路径 (默认: ./data/users.db)
 * - DATABASE_URL: PostgreSQL 连接字符串
 */

const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const sqlitePath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'users.db');
const postgresUrl = process.env.DATABASE_URL;

if (!postgresUrl) {
  console.error('❌ 错误: DATABASE_URL 环境变量未设置');
  console.log('请在 .env 文件中配置 PostgreSQL 连接字符串');
  process.exit(1);
}

if (!fs.existsSync(sqlitePath)) {
  console.error(`❌ 错误: SQLite 数据库文件不存在: ${sqlitePath}`);
  process.exit(1);
}

console.log('🔄 开始数据迁移...');
console.log(`📂 SQLite: ${sqlitePath}`);
console.log(`🐘 PostgreSQL: ${postgresUrl.replace(/:[^:@]+@/, ':****@')}\n`);

const sqlite = new Database(sqlitePath, { readonly: true });
const pool = new Pool({ connectionString: postgresUrl });

// 需要迁移的表
const tables = [
  'users',
  'email_verifications',
  'scheduled_tasks',
  'login_logs',
  'banned_ips',
  'access_logs',
  'device_logs',
  'sensor_readings',
  'login_tickets',
  'system_settings',
  'friend_requests',
  'friends',
  'messages',
  'groups',
  'group_members',
  'automation_rules'
];

async function migrateTable(tableName) {
  try {
    // 检查表是否存在
    const tableExists = sqlite.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
    ).get(tableName);

    if (!tableExists) {
      console.log(`⏭️  跳过 ${tableName} (表不存在)`);
      return { table: tableName, rows: 0, skipped: true };
    }

    // 获取所有数据
    const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
    
    if (rows.length === 0) {
      console.log(`⏭️  跳过 ${tableName} (无数据)`);
      return { table: tableName, rows: 0, skipped: true };
    }

    // 获取列名
    const columns = Object.keys(rows[0]);
    
    // 构建 INSERT 语句
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const insertSql = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT DO NOTHING
    `;

    const client = await pool.connect();
    let inserted = 0;
    
    try {
      await client.query('BEGIN');
      
      for (const row of rows) {
        const values = columns.map(col => row[col]);
        const result = await client.query(insertSql, values);
        if (result.rowCount > 0) inserted++;
      }
      
      await client.query('COMMIT');
      console.log(`✅ ${tableName}: ${inserted}/${rows.length} 行已迁移`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return { table: tableName, rows: inserted, total: rows.length };
    
  } catch (error) {
    console.error(`❌ ${tableName} 迁移失败:`, error.message);
    return { table: tableName, error: error.message };
  }
}

async function migrate() {
  const results = [];
  
  for (const table of tables) {
    const result = await migrateTable(table);
    results.push(result);
  }

  console.log('\n📊 迁移总结:');
  console.log('─'.repeat(60));
  
  let totalRows = 0;
  let successTables = 0;
  let skippedTables = 0;
  let failedTables = 0;

  results.forEach(r => {
    if (r.error) {
      console.log(`❌ ${r.table}: 失败 - ${r.error}`);
      failedTables++;
    } else if (r.skipped) {
      skippedTables++;
    } else {
      console.log(`✅ ${r.table}: ${r.rows} 行`);
      totalRows += r.rows;
      successTables++;
    }
  });

  console.log('─'.repeat(60));
  console.log(`✅ 成功: ${successTables} 个表`);
  console.log(`⏭️  跳过: ${skippedTables} 个表`);
  console.log(`❌ 失败: ${failedTables} 个表`);
  console.log(`📝 总计: ${totalRows} 行数据已迁移`);
  
  sqlite.close();
  await pool.end();
  
  if (failedTables > 0) {
    console.log('\n⚠️  部分表迁移失败，请检查错误信息');
    process.exit(1);
  } else {
    console.log('\n🎉 数据迁移完成！');
  }
}

migrate().catch(error => {
  console.error('❌ 迁移过程出错:', error);
  sqlite.close();
  pool.end();
  process.exit(1);
});
