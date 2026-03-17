/**
 * 光谱 MCP 服务器测试脚本（支持 1Panel Supergateway）
 * 
 * 用法：node test-spectrum-mcp.js
 */

const SPECTRUM_SSE_URL = 'http://8.153.175.190:8000/spectrum-stravision'

/**
 * 建立 SSE 连接并获取 sessionId
 */
async function getSessionId() {
    console.log('🔗 建立 SSE 连接获取 sessionId...')
    
    return new Promise((resolve, reject) => {
        const https = require('http')
        const url = new URL(SPECTRUM_SSE_URL)
        
        const req = https.request({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'GET',
            headers: {
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache'
            }
        }, (res) => {
            let buffer = ''
            
            res.on('data', (chunk) => {
                buffer += chunk.toString()
                
                // 解析 SSE 事件
                const eventMatch = buffer.match(/event:\s*endpoint[\s\S]*?data:\s*([^\n\r]+)/)
                if (eventMatch && eventMatch[1]) {
                    const endpointPath = eventMatch[1].trim().replace(/^["']|["']$/g, '')
                    console.log('✅ 收到 endpoint 事件:', endpointPath)
                    
                    // 提取 sessionId
                    const sessionMatch = endpointPath.match(/sessionId=([^&\s]+)/)
                    if (sessionMatch) {
                        const sessionId = sessionMatch[1]
                        console.log('✅ 提取到 sessionId:', sessionId)
                        
                        // 关闭连接
                        req.destroy()
                        resolve({ sessionId, endpointPath })
                    }
                }
            })
            
            res.on('error', reject)
        })
        
        req.on('error', reject)
        req.setTimeout(10000, () => {
            req.destroy()
            reject(new Error('SSE 连接超时'))
        })
        
        req.end()
    })
}

async function testSpectrumMCP() {
    console.log('🧪 开始测试光谱 MCP 服务器...\n')
    
    // 先获取 sessionId
    let sessionInfo
    try {
        sessionInfo = await getSessionId()
    } catch (e) {
        console.log('❌ 无法获取 sessionId:', e.message)
        console.log('⚠️  请确保服务器正在运行并且可以访问')
        return
    }
    
    const { sessionId, endpointPath } = sessionInfo
    const postUrl = `http://8.153.175.190:8000${endpointPath}`
    
    console.log('\n' + '='.repeat(60) + '\n')
    
    // 测试 1: 调用 get_all_spectrum 工具
    console.log('📊 测试 1: 获取所有光谱数据')
    try {
        const body = {
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: "get_all_spectrum",
                arguments: {}
            },
            id: 1
        }
        
        console.log('发送请求到:', postUrl)
        console.log('请求体:', JSON.stringify(body, null, 2))
        
        const res = await fetch(postUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        })
        
        console.log('响应状态:', res.status)
        const text = await res.text()
        console.log('响应内容:', text.substring(0, 500))
        
        if (res.ok) {
            const data = JSON.parse(text)
            if (data.result) {
                console.log('✅ 测试 1 通过')
                
                // 解析 content
                if (data.result.content && Array.isArray(data.result.content)) {
                    const textContent = data.result.content.find(c => c.type === 'text')
                    if (textContent) {
                        try {
                            const spectrum = JSON.parse(textContent.text)
                            console.log('光谱数据:', JSON.stringify(spectrum, null, 2))
                        } catch {
                            console.log('光谱数据 (文本):', textContent.text)
                        }
                    }
                } else {
                    console.log('结果:', JSON.stringify(data.result, null, 2))
                }
            } else if (data.error) {
                console.log('❌ 测试 1 失败:', data.error.message)
            }
        } else {
            console.log('❌ 测试 1 失败: HTTP', res.status)
        }
    } catch (e) {
        console.log('❌ 测试 1 异常:', e.message)
    }
    
    console.log('\n' + '='.repeat(60) + '\n')
    
    // 测试 2: 调用 get_channel 工具
    console.log('📊 测试 2: 获取单个通道数据 (730nm)')
    try {
        const body = {
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: "get_channel",
                arguments: { name: "730" }
            },
            id: 2
        }
        
        console.log('发送请求到:', postUrl)
        console.log('请求体:', JSON.stringify(body, null, 2))
        
        const res = await fetch(postUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        })
        
        console.log('响应状态:', res.status)
        const text = await res.text()
        console.log('响应内容:', text)
        
        if (res.ok) {
            const data = JSON.parse(text)
            if (data.result) {
                console.log('✅ 测试 2 通过')
                
                // 解析 content
                if (data.result.content && Array.isArray(data.result.content)) {
                    const textContent = data.result.content.find(c => c.type === 'text')
                    if (textContent) {
                        console.log('730nm 通道值:', textContent.text)
                    }
                } else {
                    console.log('结果:', JSON.stringify(data.result, null, 2))
                }
            } else if (data.error) {
                console.log('❌ 测试 2 失败:', data.error.message)
            }
        } else {
            console.log('❌ 测试 2 失败: HTTP', res.status)
        }
    } catch (e) {
        console.log('❌ 测试 2 异常:', e.message)
    }
    
    console.log('\n✨ 测试完成！')
}

testSpectrumMCP().catch(console.error)
