/**
 * 邮件服务配置检查脚本
 * 
 * 使用方法:
 * npx tsx scripts/check-email-config.ts
 */

console.log('🔍 检查邮件服务配置...\n');

// 检查 RESEND_API_KEY
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('❌ 错误: RESEND_API_KEY 未配置');
  console.log('\n📝 解决方案:');
  console.log('1. 在项目根目录创建或编辑 .env.local 文件');
  console.log('2. 添加以下内容:');
  console.log('   RESEND_API_KEY=re_your_actual_api_key_here');
  console.log('\n🔑 获取 API Key:');
  console.log('   访问: https://resend.com/api-keys');
  process.exit(1);
}

console.log('✅ RESEND_API_KEY 已配置');
console.log(`   值: ${apiKey.substring(0, 10)}...`);

// 检查 RESEND_FROM_EMAIL
const fromEmail = process.env.RESEND_FROM_EMAIL;
if (!fromEmail) {
  console.log('\n⚠️  警告: RESEND_FROM_EMAIL 未配置');
  console.log('   将使用默认值: Stravision <onboarding@resend.dev>');
  console.log('\n💡 提示:');
  console.log('   测试环境可以使用默认值');
  console.log('   生产环境建议配置自己的域名邮箱');
} else {
  console.log('✅ RESEND_FROM_EMAIL 已配置');
  console.log(`   值: ${fromEmail}`);
}

// 检查数据库配置
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.log('\n⚠️  警告: DATABASE_URL 未配置');
  console.log('   请在 .env.local 中配置 PostgreSQL 连接字符串');
  console.log('   示例: DATABASE_URL=postgresql://user:password@localhost:5432/database');
} else {
  console.log('\n✅ 数据库配置');
  console.log(`   类型: PostgreSQL`);
}

console.log('\n✨ 配置检查完成！');
console.log('\n📚 下一步:');
console.log('1. 测试邮件服务:');
console.log('   npm run test:email your-email@example.com');
console.log('2. 启动开发服务器:');
console.log('   npm run dev');
console.log('3. 访问注册页面测试:');
console.log('   http://localhost:3000/register');
