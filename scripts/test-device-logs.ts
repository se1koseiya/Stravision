/**
 * 测试设备日志功能
 * 用于验证数据库中的日志数据和添加测试日志
 */

import { initDB, query, execute } from '../lib/db/database'

async function testDeviceLogs() {
  try {
    console.log('初始化数据库...')
    await initDB()
    
    console.log('\n查询现有日志...')
    const existingLogs = await query(
      'SELECT * FROM device_logs ORDER BY created_at DESC LIMIT 10'
    )
    
    console.log(`找到 ${existingLogs.length} 条日志记录:`)
    existingLogs.forEach((log: any) => {
      const date = new Date(log.created_at)
      console.log(`  - [${date.toLocaleString()}] ${log.device_name}: ${log.action} (${log.operator})`)
    })
    
    // 添加一些测试日志（今天的）
    console.log('\n添加测试日志...')
    const now = Date.now()
    const testLogs = [
      {
        device_name: '水泵/灌溉',
        action: '开启',
        operator: '测试用户',
        details: '测试开启水泵',
        created_at: now - 3600000 // 1小时前
      },
      {
        device_name: '风扇/通风',
        action: '关闭',
        operator: '测试用户',
        details: '测试关闭风扇',
        created_at: now - 1800000 // 30分钟前
      },
      {
        device_name: 'RGB Light',
        action: '调整颜色',
        operator: 'AI Assistant',
        details: 'R:255 G:100 B:50',
        created_at: now - 600000 // 10分钟前
      },
      {
        device_name: '植物全光谱补光灯',
        action: '开启',
        operator: '测试用户',
        details: '测试开启补光灯',
        created_at: now - 300000 // 5分钟前
      }
    ]
    
    for (const log of testLogs) {
      await execute(
        `INSERT INTO device_logs (device_name, action, operator, details, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [log.device_name, log.action, log.operator, log.details, log.created_at]
      )
      console.log(`  ✓ 添加日志: ${log.device_name} - ${log.action}`)
    }
    
    console.log('\n再次查询日志...')
    const updatedLogs = await query(
      'SELECT * FROM device_logs ORDER BY created_at DESC LIMIT 10'
    )
    
    console.log(`现在有 ${updatedLogs.length} 条日志记录`)
    console.log('\n测试完成！')
    
  } catch (error) {
    console.error('测试失败:', error)
  } finally {
    process.exit(0)
  }
}

testDeviceLogs()
