/**
 * 测试完整的 SSE 请求-响应流程
 */

const http = require('http')

const SSE_URL = 'http://8.153.175.190:8000/spectrum-stravision'

async function testFullFlow() {
    console.log('🧪 测试完整的 SSE 请求-响应流程\n')
    
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
            let requestSent = false
            
            res.on('data', (chunk) => {
                buffer += chunk.toString()
                console.log('📥 收到数据块:', chunk.toString().substring(0, 200))
                
                // 1. 获取 endpoint
                if (!endpoint) {
                    const eventMatch = buffer.match(/event:\s*endpoint[\s\S]*?data:\s*([^\n\r]+)/)
                    if (eventMatch && eventMatch[1]) {
                        const endpointPath = eventMatch[1].trim().replace(/^["']|["']$/g, '')
                        endpoint = `http://8.153.175.190:8000${endpointPath}`
                        console.log('✅ 获取到 endpoint:', endpoint)
                        
                        // 2. 发送请求
                        if (!requestSent) {
                            requestSent = true
                            console.log('\n📤 发送工具调用请求...')
                            
                            const body = {
                                jsonrpc: "2.0",
                                method: "resources/read",
                                params: {
                                    uri: "spectrum://channels"
                                },
                                id: Date.now()
                            }
                            
                            console.log('请求体:', JSON.stringify(body, null, 2))
                            
                            fetch(endpoint, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json'
                                },
                                body: JSON.stringify(body)
                            }).then(r => {
                                console.log('✅ POST 响应:', r.status)
                            }).catch(e => {
                                console.error('❌ POST 失败:', e.message)
                            })
                        }
                    }
                }
                
                // 3. 等待响应
                if (endpoint && requestSent) {
                    // 查找 message 事件
                    const lines = buffer.split('\n')
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].startsWith('event:')) {
                            console.log(`\n📨 事件: ${lines[i]}`)
                            if (lines[i + 1] && lines[i + 1].startsWith('data:')) {
                                console.log(`📨 数据: ${lines[i + 1].substring(0, 200)}...`)
                                
                                if (lines[i].includes('message')) {
                                    try {
                                        const dataLine = lines[i + 1].substring(5).trim() // 移除 "data:"
                                        const data = JSON.parse(dataLine)
                                        console.log('\n✅ 解析成功!')
                                        console.log('响应数据:', JSON.stringify(data, null, 2))
                                        
                                        req.destroy()
                                        resolve(data)
                                        return
                                    } catch (e) {
                                        console.error('❌ 解析失败:', e.message)
                                    }
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
            
            res.on('error', (e) => {
                console.error('❌ SSE 错误:', e.message)
                reject(e)
            })
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

testFullFlow().then(() => {
    console.log('\n✨ 测试完成')
    process.exit(0)
}).catch(e => {
    console.error('\n❌ 测试失败:', e)
    process.exit(1)
})
