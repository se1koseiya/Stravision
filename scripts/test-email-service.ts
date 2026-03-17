/**
 * 邮件服务测试脚本
 * 
 * 使用方法:
 * npx tsx scripts/test-email-service.ts your-email@example.com
 */

import { sendVerificationEmail } from '../lib/email-verification-service';

async function testEmailService() {
  const testEmail = process.argv[2];

  if (!testEmail) {
    console.error('❌ 错误: 请提供测试邮箱地址');
    console.log('\n使用方法:');
    console.log('  npx tsx scripts/test-email-service.ts your-email@example.com');
    process.exit(1);
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(testEmail)) {
    console.error('❌ 错误: 邮箱格式不正确');
    process.exit(1);
  }

  console.log('🚀 开始测试邮件服务...\n');
  console.log(`📧 测试邮箱: ${testEmail}`);
  console.log('⏳ 正在发送验证码...\n');

  try {
    const result = await sendVerificationEmail(testEmail);

    if (result.success) {
      console.log('✅ 邮件发送成功！');
      console.log('\n📬 请检查邮箱收件箱（可能在垃圾邮件文件夹）');
      console.log('🔢 验证码有效期: 10分钟');
      console.log('\n💡 提示:');
      console.log('  - 如果使用测试邮箱 onboarding@resend.dev');
      console.log('  - 需要在 Resend 控制台添加接收邮箱地址');
      console.log('  - 访问: https://resend.com/settings/emails');
    } else {
      console.error('❌ 邮件发送失败');
      console.error(`错误信息: ${result.error}`);
      console.log('\n🔍 故障排查:');
      console.log('  1. 检查 .env.local 中的 RESEND_API_KEY 是否正确');
      console.log('  2. 确认 API Key 有效且有足够配额');
      console.log('  3. 测试环境需要在 Resend 控制台添加接收邮箱');
      console.log('  4. 查看 Resend 控制台的发送日志');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 测试失败');
    console.error('错误详情:', error);
    process.exit(1);
  }
}

// 检查环境变量
if (!process.env.RESEND_API_KEY) {
  console.error('❌ 错误: 未配置 RESEND_API_KEY');
  console.log('\n请在 .env.local 文件中添加:');
  console.log('  RESEND_API_KEY=re_your_actual_api_key_here');
  console.log('\n获取 API Key: https://resend.com/api-keys');
  process.exit(1);
}

testEmailService();
