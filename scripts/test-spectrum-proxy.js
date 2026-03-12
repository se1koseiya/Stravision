/**
 * 测试光谱 MCP 代理 API
 * 
 * 用法：npm run dev (在另一个终端)
 *       node test-spectrum-proxy.js
 */

const PROXY_URL = 'http://localhost:3000/api/mcp/spectrum'

async function testProxy() {
    console.log('🧪 测试光谱 MCP 代理 API...\n')
    
    // 测试 1: get_all_spectrum
    console.log('📊 测试 1: 获取所有光谱数据')
    try {
        const res = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                toolName: 'get_all_spectrum',
                arguments: {}
            })
        })
        
        console.log('响应状态:', res.status)
        const data = await res.json()
        console.log('响应数据:', JSON.stringify(data, null, 2))
        
        if (data.success) {
            console.log('✅ 测试 1 通过')
        } else {
            console.log('❌ 测试 1 失败:', data.error)
        }
    } catch (e) {
        console.log('❌ 测试 1 异常:', e.message)
    }
    
    console.log('\n' + '='.repeat(60) + '\n')
    
    // 测试 2: get_channel
    console.log('📊 测试 2: 获取 730nm 通道')
    try {
        const res = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                toolName: 'get_channel',
                arguments: { name: '730' }
            })
        })
        
        console.log('响应状态:', res.status)
        const data = await res.json()
        console.log('响应数据:', JSON.stringify(data, null, 2))
        
        if (data.success) {
            console.log('✅ 测试 2 通过')
        } else {
            console.log('❌ 测试 2 失败:', data.error)
        }
    } catch (e) {
        console.log('❌ 测试 2 异常:', e.message)
    }
    
    console.log('\n✨ 测试完成！')
}

testProxy().catch(console.error)
