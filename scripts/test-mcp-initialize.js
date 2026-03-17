/**
 * 测试完整的 MCP 初始化流程
 */

const http = require('http')

const SSE_URL = 'http://8.153.175.190:8000/spectrum-stravision'

async function testMCPInitialize() {
    console.log('🧪 测试 MCP 初始化流程\n')
    
    return new Promise((resolve, reject) => {
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
            let endpoint = ''
            let step = 0
            
            res.on('data', async (chunk) => {
                buffer += chunk.toString()
                
                // Step 1: 获取 endpoint
                if (step === 0) {
                    const eventMatch = buffer.match(/event:\s*endpoint[\s\S]*?data:\s*([^\n\r]+)/)
                    if (eventMatch && eventMatch[1]) {
                        const endpointPath = eventMatch[1].trim().replace(/^["']|["']$/g, '')
                        endpoint = `http://8.153.175.190:8000${endpointPath}`
                        console.log('✅ Step 1: 获取到 endpoint:', endpoint)
                        step = 1
                        
                        // Step 2: 发送 initialize
                        console.log('\n📤 Step 2: 发送 initialize 请求')
                        const initBody = {
                            jsonrpc: "2.0",
                            method: "initialize",
                            params: {
                                protocolVersion: "2024-11-05",
                                capabilities: {
                                    roots: { listChanged: false },
                                    sampling: {}
                                },
                                clientInfo: {
                                    name: "test-client",
                                    version: "1.0.0"
                                }
                            },
                            id: 1
                        }
                        
                        console.log('请求体:', JSON.stringify(initBody, null, 2))
                        
                        const initRes = await fetch(endpoint, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(initBody)
                        })
                        console.log('POST 响应:', initRes.status)
                    }
                }
                
                // Step 3: 等待 initialize 响应
                if (step === 1) {
                    const lines = buffer.split('\n')
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].includes('event: message')) {
                            if (lines[i + 1] && lines[i + 1].startsWith('data:')) {
                                try {
                                    const dataLine = lines[i + 1].substring(5).trim()
                                    const data = JSON.parse(dataLine)
                                    
                                    if (data.id === 1) {
                                        console.log('\n✅ Step 3: 收到 initialize 响应')
                                        console.log('响应:', JSON.stringify(data, null, 2))
                                        step = 2
                                        buffer = '' // 清空缓冲区
                                        
                                        // Step 4: 发送 initialized 通知
                                        console.log('\n📤 Step 4: 发送 initialized 通知')
                                        const notifyBody = {
                                            jsonrpc: "2.0",
                                            method: "notifications/initialized",
                                            params: {}
                                        }
                                        
                                        await fetch(endpoint, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(notifyBody)
                                        })
                                        
                                        // 等待一下
                                        await new Promise(r => setTimeout(r, 500))
                                        
                                        // Step 5: 发送工具调用
                                        console.log('\n📤 Step 5: 发送工具调用请求')
                                        const toolBody = {
                                            jsonrpc: "2.0",
                                            method: "tools/call",
                                            params: {
                                                name: "get_all_spectrum"
                                            },
                                            id: 2
                                        }
                                        
                                        console.log('请求体:', JSON.stringify(toolBody, null, 2))
                                        
                                        await fetch(endpoint, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(toolBody)
                                        })
                                    }
                                } catch (e) {
                                    // 忽略解析错误
                                }
                            }
                        }
                    }
                }
                
                // Step 6: 等待工具调用响应
                if (step === 2) {
                    const lines = buffer.split('\n')
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].includes('event: message')) {
                            if (lines[i + 1] && lines[i + 1].startsWith('data:')) {
                                try {
                                    const dataLine = lines[i + 1].substring(5).trim()
                                    const data = JSON.parse(dataLine)
                                    
                                    if (data.id === 2) {
                                        console.log('\n✅ Step 6: 收到工具调用响应')
                                        console.log('响应:', JSON.stringify(data, null, 2))
                                        
                                        req.destroy()
                                        resolve(data)
                                        return
                                    }
                                } catch (e) {
                                    // 忽略解析错误
                                }
                            }
                        }
                    }
                }
            })
            
            res.on('end', () => {
                console.log('\n⚠️  SSE 连接关闭')
                req.destroy()
                resolve(null)
            })
            
            res.on('error', reject)
        })
        
        req.on('error', reject)
        req.setTimeout(30000, () => {
            console.log('\n⏱️  超时')
            req.destroy()
            resolve(null)
        })
        
        req.end()
    })
}

testMCPInitialize().then(() => {
    console.log('\n✨ 测试完成')
    process.exit(0)
}).catch(e => {
    console.error('\n❌ 测试失败:', e)
    process.exit(1)
})
