/**
 * 支付宝环境变量修复工具
 * 自动检查和修复 .env.local 中的支付宝配置
 * 
 * 运行: node scripts/fix-alipay-env.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function normalizePem(value) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function formatPemForEnv(pem) {
  // 将实际换行符转换为 \n 字符串
  return pem.replace(/\n/g, '\\n');
}

async function main() {
  console.log('='.repeat(60));
  console.log('支付宝配置修复工具');
  console.log('='.repeat(60));
  console.log();

  const envPath = path.join(process.cwd(), '.env.local');
  
  // 检查 .env.local 是否存在
  if (!fs.existsSync(envPath)) {
    console.log('❌ 未找到 .env.local 文件');
    console.log('请先创建 .env.local 文件（可以从 .env.example 复制）');
    rl.close();
    return;
  }

  // 读取现有配置
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  
  let hasAppId = false;
  let hasPrivateKey = false;
  let hasPublicKey = false;
  
  let appId = '';
  let privateKey = '';
  let publicKey = '';

  // 解析现有配置
  for (const line of lines) {
    if (line.startsWith('ALIPAY_APP_ID=')) {
      hasAppId = true;
      appId = line.split('=')[1]?.trim().replace(/['"]/g, '') || '';
    } else if (line.startsWith('ALIPAY_PRIVATE_KEY=')) {
      hasPrivateKey = true;
      const match = line.match(/ALIPAY_PRIVATE_KEY=["']?(.+?)["']?$/);
      if (match) {
        privateKey = match[1];
      }
    } else if (line.startsWith('ALIPAY_PUBLIC_KEY=')) {
      hasPublicKey = true;
      const match = line.match(/ALIPAY_PUBLIC_KEY=["']?(.+?)["']?$/);
      if (match) {
        publicKey = match[1];
      }
    }
  }

  console.log('当前配置状态:');
  console.log(`  ALIPAY_APP_ID: ${hasAppId ? (appId ? '✓ 已配置' : '⚠️  已配置但为空') : '✗ 未配置'}`);
  console.log(`  ALIPAY_PRIVATE_KEY: ${hasPrivateKey ? (privateKey ? '✓ 已配置' : '⚠️  已配置但为空') : '✗ 未配置'}`);
  console.log(`  ALIPAY_PUBLIC_KEY: ${hasPublicKey ? (publicKey ? '✓ 已配置' : '⚠️  已配置但为空') : '✗ 未配置'}`);
  console.log();

  // 询问是否需要更新配置
  const shouldUpdate = await question('是否需要更新支付宝配置？(y/n): ');
  
  if (shouldUpdate.toLowerCase() !== 'y') {
    console.log('取消更新');
    rl.close();
    return;
  }

  console.log();
  console.log('请输入支付宝配置信息:');
  console.log('（直接按回车保持原值）');
  console.log();

  // 获取 APP ID
  const newAppId = await question(`ALIPAY_APP_ID [${appId || '未设置'}]: `);
  if (newAppId.trim()) {
    appId = newAppId.trim();
  }

  // 获取私钥
  console.log();
  console.log('ALIPAY_PRIVATE_KEY (应用私钥):');
  console.log('提示: 可以粘贴完整的 PEM 格式密钥（包含 BEGIN 和 END 标记）');
  console.log('或者输入文件路径（如: ./app_private_key.pem）');
  const privateKeyInput = await question('> ');
  
  if (privateKeyInput.trim()) {
    if (fs.existsSync(privateKeyInput.trim())) {
      // 从文件读取
      privateKey = fs.readFileSync(privateKeyInput.trim(), 'utf-8');
      console.log('✓ 从文件读取私钥成功');
    } else {
      privateKey = privateKeyInput.trim();
    }
  }

  // 获取公钥
  console.log();
  console.log('ALIPAY_PUBLIC_KEY (支付宝公钥):');
  console.log('提示: 可以粘贴完整的 PEM 格式密钥（包含 BEGIN 和 END 标记）');
  console.log('或者输入文件路径（如: ./alipay_public_key.pem）');
  const publicKeyInput = await question('> ');
  
  if (publicKeyInput.trim()) {
    if (fs.existsSync(publicKeyInput.trim())) {
      // 从文件读取
      publicKey = fs.readFileSync(publicKeyInput.trim(), 'utf-8');
      console.log('✓ 从文件读取公钥成功');
    } else {
      publicKey = publicKeyInput.trim();
    }
  }

  console.log();
  console.log('验证配置...');

  // 验证 APP ID
  if (!appId || !/^\d{16,}$/.test(appId)) {
    console.log('⚠️  APP_ID 格式可能不正确（应该是16位以上的数字）');
  } else {
    console.log('✓ APP_ID 格式正确');
  }

  // 规范化密钥
  const normalizedPrivateKey = normalizePem(privateKey);
  const normalizedPublicKey = normalizePem(publicKey);

  // 验证私钥
  if (!normalizedPrivateKey.includes('BEGIN') || !normalizedPrivateKey.includes('END')) {
    console.log('⚠️  私钥格式可能不完整（缺少 BEGIN 或 END 标记）');
  } else {
    console.log('✓ 私钥格式正确');
  }

  // 验证公钥
  if (!normalizedPublicKey.includes('BEGIN') || !normalizedPublicKey.includes('END')) {
    console.log('⚠️  公钥格式可能不完整（缺少 BEGIN 或 END 标记）');
  } else {
    console.log('✓ 公钥格式正确');
  }

  console.log();
  const confirmSave = await question('确认保存配置到 .env.local？(y/n): ');
  
  if (confirmSave.toLowerCase() !== 'y') {
    console.log('取消保存');
    rl.close();
    return;
  }

  // 更新 .env.local
  let newEnvContent = envContent;

  // 格式化密钥用于环境变量
  const formattedPrivateKey = formatPemForEnv(normalizedPrivateKey);
  const formattedPublicKey = formatPemForEnv(normalizedPublicKey);

  // 替换或添加配置
  if (hasAppId) {
    newEnvContent = newEnvContent.replace(/ALIPAY_APP_ID=.*/g, `ALIPAY_APP_ID=${appId}`);
  } else {
    newEnvContent += `\nALIPAY_APP_ID=${appId}`;
  }

  if (hasPrivateKey) {
    newEnvContent = newEnvContent.replace(/ALIPAY_PRIVATE_KEY=.*/g, `ALIPAY_PRIVATE_KEY="${formattedPrivateKey}"`);
  } else {
    newEnvContent += `\nALIPAY_PRIVATE_KEY="${formattedPrivateKey}"`;
  }

  if (hasPublicKey) {
    newEnvContent = newEnvContent.replace(/ALIPAY_PUBLIC_KEY=.*/g, `ALIPAY_PUBLIC_KEY="${formattedPublicKey}"`);
  } else {
    newEnvContent += `\nALIPAY_PUBLIC_KEY="${formattedPublicKey}"`;
  }

  // 备份原文件
  const backupPath = envPath + '.backup.' + Date.now();
  fs.copyFileSync(envPath, backupPath);
  console.log(`✓ 已备份原配置到: ${backupPath}`);

  // 保存新配置
  fs.writeFileSync(envPath, newEnvContent);
  console.log('✓ 配置已保存到 .env.local');

  console.log();
  console.log('='.repeat(60));
  console.log('配置完成！');
  console.log('='.repeat(60));
  console.log();
  console.log('下一步:');
  console.log('1. 重启开发服务器');
  console.log('2. 运行配置检查: npx tsx scripts/check-alipay-config.ts');
  console.log('3. 测试支付宝登录功能');
  console.log();

  rl.close();
}

main().catch(err => {
  console.error('错误:', err);
  rl.close();
  process.exit(1);
});
