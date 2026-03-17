/**
 * 支付宝配置检查工具
 * 运行: npx tsx scripts/check-alipay-config.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// 加载环境变量
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const normalizePem = (value: string) => {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
}

function checkAlipayConfig() {
  console.log('='.repeat(60))
  console.log('支付宝配置检查')
  console.log('='.repeat(60))
  console.log()

  const appId = process.env.ALIPAY_APP_ID?.trim()
  const privateKeyRaw = process.env.ALIPAY_PRIVATE_KEY
  const publicKeyRaw = process.env.ALIPAY_PUBLIC_KEY

  // 1. 检查是否配置
  console.log('1. 配置完整性检查:')
  console.log(`   ALIPAY_APP_ID: ${appId ? '✓ 已配置' : '✗ 未配置'}`)
  console.log(`   ALIPAY_PRIVATE_KEY: ${privateKeyRaw ? '✓ 已配置' : '✗ 未配置'}`)
  console.log(`   ALIPAY_PUBLIC_KEY: ${publicKeyRaw ? '✓ 已配置' : '✗ 未配置'}`)
  console.log()

  if (!appId || !privateKeyRaw || !publicKeyRaw) {
    console.log('❌ 配置不完整，请在 .env.local 中配置所有必需的支付宝参数')
    return
  }

  // 2. 检查 APP_ID 格式
  console.log('2. APP_ID 格式检查:')
  if (!/^\d{16,}$/.test(appId)) {
    console.log(`   ⚠️  APP_ID 格式可能不正确: ${appId}`)
    console.log('   正确格式应该是16位以上的纯数字')
  } else {
    console.log(`   ✓ APP_ID 格式正确: ${appId}`)
  }
  console.log()

  // 3. 检查私钥格式
  console.log('3. 私钥格式检查:')
  const privateKey = normalizePem(privateKeyRaw)
  console.log(`   原始长度: ${privateKeyRaw.length} 字符`)
  console.log(`   规范化后长度: ${privateKey.length} 字符`)
  console.log(`   前50字符: ${privateKey.substring(0, 50)}...`)
  
  let keyType: 'PKCS1' | 'PKCS8' | 'UNKNOWN' = 'UNKNOWN'
  if (privateKey.includes('BEGIN RSA PRIVATE KEY')) {
    keyType = 'PKCS1'
    console.log('   ✓ 检测到 PKCS1 格式私钥')
  } else if (privateKey.includes('BEGIN PRIVATE KEY')) {
    keyType = 'PKCS8'
    console.log('   ✓ 检测到 PKCS8 格式私钥')
  } else {
    console.log('   ✗ 无法识别私钥格式')
    console.log('   私钥应该以 "-----BEGIN RSA PRIVATE KEY-----" 或 "-----BEGIN PRIVATE KEY-----" 开头')
  }
  
  // 检查是否包含完整的 PEM 结构
  const hasBegin = privateKey.includes('BEGIN')
  const hasEnd = privateKey.includes('END')
  console.log(`   包含 BEGIN 标记: ${hasBegin ? '✓' : '✗'}`)
  console.log(`   包含 END 标记: ${hasEnd ? '✓' : '✗'}`)
  console.log()

  // 4. 检查公钥格式
  console.log('4. 支付宝公钥格式检查:')
  const publicKey = normalizePem(publicKeyRaw)
  console.log(`   原始长度: ${publicKeyRaw.length} 字符`)
  console.log(`   规范化后长度: ${publicKey.length} 字符`)
  console.log(`   前50字符: ${publicKey.substring(0, 50)}...`)
  
  if (publicKey.includes('BEGIN PUBLIC KEY')) {
    console.log('   ✓ 检测到标准公钥格式')
  } else {
    console.log('   ⚠️  公钥格式可能不标准')
    console.log('   支付宝公钥应该以 "-----BEGIN PUBLIC KEY-----" 开头')
  }
  
  const hasPublicBegin = publicKey.includes('BEGIN')
  const hasPublicEnd = publicKey.includes('END')
  console.log(`   包含 BEGIN 标记: ${hasPublicBegin ? '✓' : '✗'}`)
  console.log(`   包含 END 标记: ${hasPublicEnd ? '✓' : '✗'}`)
  console.log()

  // 5. 检查换行符
  console.log('5. 换行符检查:')
  const hasLiteralBackslashN = privateKeyRaw.includes('\\n')
  const hasActualNewline = privateKeyRaw.includes('\n')
  console.log(`   私钥包含 \\n 字符串: ${hasLiteralBackslashN ? '是 (需要转换)' : '否'}`)
  console.log(`   私钥包含实际换行: ${hasActualNewline ? '是' : '否'}`)
  console.log()

  // 6. SDK 兼容性测试
  console.log('6. SDK 兼容性测试:')
  try {
    // 动态导入以避免在没有安装包时报错
    const { AlipaySdk } = require('alipay-sdk')
    
    const sdk = new AlipaySdk({
      appId,
      privateKey,
      alipayPublicKey: publicKey,
      keyType: keyType === 'UNKNOWN' ? 'PKCS8' : keyType,
    })
    
    console.log('   ✓ SDK 实例化成功')
    console.log(`   使用密钥类型: ${keyType}`)
  } catch (error: any) {
    console.log('   ✗ SDK 实例化失败')
    console.log(`   错误信息: ${error.message}`)
  }
  console.log()

  // 7. 配置建议
  console.log('7. 配置建议:')
  console.log('   - 确保在支付宝开放平台已创建应用并获取 APP_ID')
  console.log('   - 私钥应该是您自己生成的应用私钥（不是支付宝公钥）')
  console.log('   - 支付宝公钥应该从支付宝开放平台获取（不是您的应用公钥）')
  console.log('   - 在 .env.local 中配置时，可以使用 \\n 表示换行，代码会自动转换')
  console.log('   - 确保密钥包含完整的 BEGIN 和 END 标记')
  console.log('   - 如果使用沙箱环境，需要在代码中配置沙箱网关地址')
  console.log()

  console.log('='.repeat(60))
  console.log('检查完成')
  console.log('='.repeat(60))
}

checkAlipayConfig()
