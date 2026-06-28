/**
 * 创建演示账号脚本
 * 
 * 功能：
 * - 创建一个拥有所有权限的演示账号
 * - 设置 9999 AI 额度
 * - 配置为忽略异地登录检测
 */

// 加载环境变量
import { config } from 'dotenv'
import { resolve } from 'path'

// 加载 .env.local 文件
config({ path: resolve(process.cwd(), '.env.local') })

import { createUser, updateUser, getUserByEmail } from '../lib/db/user-service'
import { initDB, execute } from '../lib/db/database'
import crypto from 'crypto'

/**
 * 生成随机强密码（cryptographically secure）
 * 不使用 Math.random，因为该脚本创建的是超级管理员账号
 */
function generateRandomPassword(length = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  const bytes = crypto.randomBytes(length)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length]
  }
  return result
}

async function createDemoAccount() {
  try {
    console.log('🚀 开始创建演示账号...\n')

    // 安全守卫：生产环境禁止创建已知的演示超级管理员账号
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ 安全限制：禁止在生产环境创建演示账号（含公开密码的超级管理员账号）')
      process.exit(1)
    }

    // 初始化数据库
    await initDB()
    console.log('✅ 数据库初始化完成')

    const demoEmail = 'demo@example.com'
    // 密码从环境变量读取，缺失时随机生成，避免源码中存在已知的超级管理员密码
    const demoPassword = process.env.DEMO_PASSWORD || generateRandomPassword()
    const demoUsername = '演示账号'

    // 检查账号是否已存在
    let existingUser = await getUserByEmail(demoEmail)
    
    if (existingUser) {
      console.log('⚠️  演示账号已存在，将更新配置...')
      
      // 更新现有账号
      const updatedUser = await updateUser(existingUser.id, {
        role: 'super_admin',
        membership: 'plus',
        daily_ai_limit: 999999,
        ai_balance: 9999,
        permissions: {
          allowedControls: ['*'], // 所有设备控制权限
          admin: true,
          superAdmin: true,
          ignoreLocationCheck: true, // 忽略异地登录检测
        }
      })

      console.log('\n✅ 演示账号更新成功！')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📧 邮箱:', demoEmail)
      console.log('🔑 密码:', demoPassword)
      console.log('👤 用户名:', updatedUser.username)
      console.log('🎭 角色:', updatedUser.role)
      console.log('💎 会员等级:', updatedUser.membership)
      console.log('🤖 AI 额度:', 9999)
      console.log('🌍 异地登录检测: 已禁用')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      
    } else {
      // 创建新账号
      const newUser = await createUser({
        email: demoEmail,
        password: demoPassword,
        username: demoUsername,
        role: 'super_admin',
        membership: 'plus',
        permissions: {
          allowedControls: ['*'], // 所有设备控制权限
          admin: true,
          superAdmin: true,
          ignoreLocationCheck: true, // 忽略异地登录检测
        }
      })

      // 设置 AI 额度
      await updateUser(newUser.id, {
        daily_ai_limit: 999999,
        ai_balance: 9999
      })

      console.log('\n✅ 演示账号创建成功！')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📧 邮箱:', demoEmail)
      console.log('🔑 密码:', demoPassword)
      console.log('👤 用户名:', newUser.username)
      console.log('🎭 角色:', newUser.role)
      console.log('💎 会员等级:', newUser.membership)
      console.log('🤖 AI 额度:', 9999)
      console.log('🌍 异地登录检测: 已禁用')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    }

    console.log('💡 提示：')
    console.log('   - 该账号拥有超级管理员权限')
    console.log('   - 可以访问所有功能和设备')
    console.log('   - 不受异地登录限制')
    console.log('   - AI 额度充足，可以充分测试 AI 功能\n')

  } catch (error) {
    console.error('❌ 创建演示账号失败:', error)
    process.exit(1)
  }
}

// 运行脚本
createDemoAccount()
  .then(() => {
    console.log('✨ 脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error)
    process.exit(1)
  })
