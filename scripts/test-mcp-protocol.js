/**
 * 测试 MCP 协议的正确格式
 */

const http = require('http')

const SSE_URL = 'http://8.153.175.190:8000/spectrum-stravision'

async function testMCPProtocol() {
    console.log('🧪 测试 MCP 协议格式...\n')
    
    // 1. 建立 SSE 连接
    console.log('📡 建立 SSE 连接...')
    
    const sessionInfo = await new Promise((resolve, reject) => {
        const url = new URL(SSE_URL)
        
        const req = http.request({
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
                
                const eventMatch = buffer.match(/event:\s*endpoint[\s\S]*?data:\s*([^\n\r]+)/)
                if (eventMatch && eventMatch[1]) {
                    const endpointPath = eventMatch[1].trim().replace(/^["']|["']$/g, '')
                    console.log('✅ 收到 endpoint:', endpointPath)
                    
                    const sessionMatch = endpointPath.match(/sessionId=([^&\s]+)/)
                    if (sessionMatch) {
                        resolve({
                            sessionId: sessionMatch[1],
                            endpoint: `http://8.153.175.190:8000${endpointPath}`,
                            connection: req
                        })
                    }
                }
            })
            
            res.on('error', reject)
        })
        
        req.on('error', reject)
        req.setTimeout(10000, () => {
            req.destroy()
            reject(new Error('超时'))
        })
        
        req.end()
    })
    
    console.log('✅ SessionId:', sessionInfo.sessionId)
    console.log('✅ Endpoint:', sessionInfo.endpoint)
    console.log()
    
    // 2. 测试不同的请求格式
    const testCases = [
        {
            name: '格式 1: 不包含 arguments',
            body: {
                jsonrpc: "2.0",
                method: "tools/call",
                params: {
                    name: "get_all_spectrum"
                },
                id: 1
            }
        },
        {
            name: '格式 2: arguments 为空对象',
            body: {
                jsonrpc: "2.0",
                method: "tools/call",
                params: {
                    name: "get_all_spectrum",
                    arguments: {}
                },
                id: 2
            }
        },
        {
            name: '格式 3: 使用 tools/list 查看可用工具',
            body: {
                jsonrpc: "2.0",
                method: "tools/list",
                params: {},
                id: 3
            }
        }
    ]
    
    for (const testCase of testCases) {
        console.log(`📊 测试: ${testCase.name}`)
        console.log('请求体:', JSON.stringify(testCase.body, null, 2))
        
        try {
            const res = await fetch(sessionInfo.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(testCase.body)
            })
            
            console.log('响应状态:', res.status)
            const text = await res.text()
            console.log('响应内容:', text.substring(0, 200))
            
            if (res.ok) {
                console.log('✅ 成功')
            } else {
                console.log('❌ 失败')
            }
        } catch (e) {
            console.log('❌ 异常:', e.message)
        }
        
        console.log()
        
        // 等待 1 秒
        await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // 关闭连接
    sessionInfo.connection.destroy()
    console.log('✨ 测试完成')
}

testMCPProtocol().catch(console.error)
