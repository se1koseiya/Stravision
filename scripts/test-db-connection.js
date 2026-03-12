/**
 * PostgreSQL 连接测试脚本
 * 
 * 使用方法：
 * node test-db-connection.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

console.log('🔍 PostgreSQL 连接测试\n');

// 从环境变量读取配置
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ 错误: DATABASE_URL 未在 .env.local 中配置');
  console.log('\n请在 .env.local 中添加：');
  console.log('DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/stravision\n');
  process.exit(1);
}

console.log('📝 配置信息:');
// 隐藏密码显示
const safeUrl = DATABASE_URL.replace(/:[^:@]+@/, ':****@');
console.log(`   DATABASE_URL: ${safeUrl}\n`);

const pool = new Pool({
  connectionString: DATABASE_URL
});

async function testConnection() {
  let client;
  
  try {
    console.log('[1/4] 尝试连接到 PostgreSQL...');
    client = await pool.connect();
    console.log('✅ 连接成功！\n');

    console.log('[2/4] 检查 PostgreSQL 版本...');
    const versionResult = await client.query('SELECT version()');
    console.log(`✅ ${versionResult.rows[0].version.split(',')[0]}\n`);

    console.log('[3/4] 检查当前数据库...');
    const dbResult = await client.query('SELECT current_database()');
    console.log(`✅ 当前数据库: ${dbResult.rows[0].current_database}\n`);

    console.log('[4/4] 检查现有表...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log(`✅ 找到 ${tablesResult.rows.length} 个表:`);
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('ℹ️  数据库为空（首次运行时正常）');
      console.log('   应用启动时会自动创建表');
    }

    console.log('\n========================================');
    console.log('🎉 所有测试通过！');
    console.log('========================================\n');
    console.log('下一步：运行 npm run dev 启动应用\n');

  } catch (error) {
    console.error('\n❌ 连接失败！\n');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('错误: 无法连接到 PostgreSQL 服务器');
      console.error('\n可能的原因：');
      console.error('1. PostgreSQL 服务未运行');
      console.error('   解决: 启动 PostgreSQL 服务');
      console.error('   - Windows: 在服务管理器中启动 postgresql-x64-16');
      console.error('   - macOS: brew services start postgresql');
      console.error('   - Linux: sudo systemctl start postgresql\n');
      
    } else if (error.code === '3D000') {
      console.error('错误: 数据库不存在');
      console.error('\n解决方案：');
      console.error('1. 使用 pgAdmin 创建数据库 "stravision"');
      console.error('2. 或使用 SQL Shell (psql):');
      console.error('   CREATE DATABASE stravision;\n');
      console.error('详细步骤请查看: setup-postgres-manual.md\n');
      
    } else if (error.code === '28P01') {
      console.error('错误: 密码认证失败');
      console.error('\n解决方案：');
      console.error('1. 检查 .env.local 中的密码是否正确');
      console.error('2. 确认 DATABASE_URL 格式：');
      console.error('   postgresql://postgres:正确的密码@localhost:5432/stravision\n');
      
    } else if (error.code === '28000') {
      console.error('错误: 认证失败');
      console.error('\n解决方案：');
      console.error('1. 检查用户名是否正确（通常是 postgres）');
      console.error('2. 检查 pg_hba.conf 配置\n');
      
    } else {
      console.error('错误详情:');
      console.error(`   代码: ${error.code || '未知'}`);
      console.error(`   消息: ${error.message}`);
      console.error('\n完整错误:');
      console.error(error);
    }
    
    process.exit(1);
    
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

testConnection();
