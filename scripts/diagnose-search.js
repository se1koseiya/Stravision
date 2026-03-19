#!/usr/bin/env node

/**
 * AI 助手搜索功能诊断脚本
 * 
 * 用法：
 * 1. 在浏览器控制台中运行此脚本
 * 2. 或者将此脚本内容复制到浏览器控制台
 * 
 * 功能：
 * - 检查 MCP 搜索服务的安装状态
 * - 检查 API Key 配置
 * - 提供修复建议
 */

(function diagnoseSearchTools() {
  console.log('🔍 开始诊断 AI 助手搜索功能...\n')

  // 检查 localStorage 是否可用
  if (typeof localStorage === 'undefined') {
    console.error('❌ localStorage 不可用，请在浏览器环境中运行此脚本')
    return
  }

  // 1. 检查已安装的 MCP 服务
  const installedStr = localStorage.getItem('mcp-installed-servers')
  
  if (!installedStr) {
    console.error('❌ 未安装任何 MCP 服务')
    console.log('\n📝 修复建议：')
    console.log('1. 访问 MCP 商店：/mcp-store')
    console.log('2. 安装以下任一搜索服务：')
    console.log('   - Brave Search (通用搜索)')
    console.log('   - Exa Search (语义搜索)')
    console.log('   - Firecrawl (网页抓取，有免费额度)')
    return
  }

  const serverIds = JSON.parse(installedStr)
  console.log(`✅ 已安装 ${serverIds.length} 个 MCP 服务:`, serverIds)

  // 2. 检查搜索相关服务
  const searchServers = ['brave-search', 'exa-search', 'firecrawl']
  const installedSearchServers = serverIds.filter(id => searchServers.includes(id))

  if (installedSearchServers.length === 0) {
    console.warn('⚠️  未安装任何搜索服务')
    console.log('\n📝 修复建议：')
    console.log('安装以下任一服务：')
    console.log('- brave-search: 通用网络搜索')
    console.log('- exa-search: 语义搜索，适合技术内容')
    console.log('- firecrawl: 网页内容抓取')
    return
  }

  console.log(`\n✅ 已安装 ${installedSearchServers.length} 个搜索服务:`, installedSearchServers)

  // 3. 检查每个搜索服务的配置
  const results = []
  
  for (const serverId of installedSearchServers) {
    console.log(`\n🔧 检查 ${serverId}...`)
    
    // 检查配置
    const configStr = localStorage.getItem(`mcp-config-${serverId}`)
    if (!configStr) {
      results.push({
        id: serverId,
        status: 'error',
        message: '配置文件不存在'
      })
      console.error(`  ❌ 配置文件不存在`)
      continue
    }

    const config = JSON.parse(configStr)
    console.log(`  ✅ 配置文件存在`)
    console.log(`  - 显示名称: ${config.displayName || config.name}`)
    console.log(`  - 描述: ${config.description || '无'}`)

    // 检查是否启用
    const enabled = localStorage.getItem(`mcp-enabled-${serverId}`)
    if (enabled === 'false') {
      results.push({
        id: serverId,
        status: 'warning',
        message: '服务已禁用'
      })
      console.warn(`  ⚠️  服务已禁用`)
      continue
    }
    console.log(`  ✅ 服务已启用`)

    // 检查 API Key
    const apiKey = config.envVars ? Object.values(config.envVars)[0] : null
    if (!apiKey) {
      results.push({
        id: serverId,
        status: 'error',
        message: 'API Key 未配置'
      })
      console.error(`  ❌ API Key 未配置`)
      continue
    }

    if (apiKey === 'your-api-key-here' || apiKey === 'your-api-key' || apiKey.length < 10) {
      results.push({
        id: serverId,
        status: 'error',
        message: 'API Key 无效（使用了占位符）'
      })
      console.error(`  ❌ API Key 无效（使用了占位符）`)
      continue
    }

    // API Key 看起来正常
    const maskedKey = apiKey.slice(0, 8) + '...' + apiKey.slice(-4)
    console.log(`  ✅ API Key 已配置: ${maskedKey}`)
    
    results.push({
      id: serverId,
      status: 'success',
      message: '配置正常'
    })
  }

  // 4. 输出诊断结果
  console.log('\n' + '='.repeat(50))
  console.log('📊 诊断结果汇总')
  console.log('='.repeat(50))

  const successCount = results.filter(r => r.status === 'success').length
  const warningCount = results.filter(r => r.status === 'warning').length
  const errorCount = results.filter(r => r.status === 'error').length

  console.log(`\n✅ 正常: ${successCount}`)
  console.log(`⚠️  警告: ${warningCount}`)
  console.log(`❌ 错误: ${errorCount}`)

  console.log('\n详细信息：')
  results.forEach(r => {
    const icon = r.status === 'success' ? '✅' : r.status === 'warning' ? '⚠️' : '❌'
    console.log(`${icon} ${r.id}: ${r.message}`)
  })

  // 5. 提供修复建议
  if (errorCount > 0 || warningCount > 0) {
    console.log('\n📝 修复建议：')
    
    results.forEach(r => {
      if (r.status === 'error') {
        console.log(`\n${r.id}:`)
        if (r.message.includes('API Key')) {
          console.log('  1. 访问服务提供商网站获取 API Key:')
          if (r.id === 'brave-search') {
            console.log('     https://brave.com/search/api/')
          } else if (r.id === 'exa-search') {
            console.log('     https://exa.ai/')
          } else if (r.id === 'firecrawl') {
            console.log('     https://firecrawl.dev/')
          }
          console.log('  2. 在 MCP 设置中配置 API Key')
          console.log('  3. 刷新页面重试')
        } else if (r.message.includes('配置文件')) {
          console.log('  1. 重新安装该服务')
          console.log('  2. 或手动创建配置文件')
        }
      } else if (r.status === 'warning') {
        console.log(`\n${r.id}:`)
        console.log('  1. 在 MCP 设置中启用该服务')
        console.log('  2. 或在 MCP 商店中重新安装')
      }
    })
  }

  // 6. 测试建议
  if (successCount > 0) {
    console.log('\n🧪 测试建议：')
    console.log('在 AI 助手中输入以下测试命令：')
    console.log('  "搜索 2025年草莓种植技术"')
    console.log('  "查一下今天的天气"')
    console.log('  "帮我找一下农业最新资讯"')
    console.log('\n预期行为：')
    console.log('  1. 显示 "正在使用工具: mcp_xxx_search..."')
    console.log('  2. 工作室侧边栏自动打开')
    console.log('  3. 显示搜索结果')
    console.log('\n如果没有看到以上行为，请：')
    console.log('  1. 打开浏览器开发者工具 (F12)')
    console.log('  2. 查看 Console 标签，搜索 [MCP] 日志')
    console.log('  3. 查看 Network 标签，检查 /api/chat 请求')
  }

  // 7. 高级诊断
  console.log('\n🔬 高级诊断信息：')
  console.log('如果搜索功能仍然不工作，请检查：')
  console.log('1. 网络连接是否正常')
  console.log('2. API 配额是否用完（登录服务提供商网站查看）')
  console.log('3. 浏览器控制台是否有错误信息')
  console.log('4. 后端日志是否有错误（如果有访问权限）')

  console.log('\n✨ 诊断完成！')
})()
