/**
 * 测试 Resource vs Tool 调用方式
 */

const http = require('http')

const SSE_URL = 'http://8.153.175.190:8000/spectrum-stravision'

async function getSession() {
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
            
            res.on('data', (chunk) => {
                buffer += chunk.toString()
                
                const eventMatch = buffer.match(/event:\s*endpoint[\s\S]*?data:\s*([^\n\r]+)/)
                if (eventMatch && eventMatch[1]) {
                    const endpointPath = eventMatch[1].trim().replace(/^["']|["']$/g, '')
                    const sessionMatch = endpointPath.match(/sessionId=([^&\s]+)/)
                    if (sessionMatch) {
                        resolve({
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
}

async function test() {
    console.log('🧪 测试 Resource vs Tool 调用方式\n')
    
    const session = await getSession()
    console.log('✅ 连接成功:', session.endpoint, '\n')
    
    // 测试 1: 使用 tools/call
    console.log('📊 测试 1: tools/call - get_all_spectrum')
    const toolBody = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
            name: "get_all_spectrum"
        },
        id: 1
    }
    console.log('请求:', JSON.stringify(toolBody, null, 2))
    
    let res1 = await fetch(session.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolBody)
    })
    console.log('响应状态:', res1.status, await res1.text())
    console.log()
    
    await new Promise(r => setTimeout(r, 2000))
    
    // 测试 2: 使用 resources/read
    console.log('📊 测试 2: resources/read - spectrum://channels')
    const resourceBody = {
        jsonrpc: "2.0",
        method: "resources/read",
        params: {
            uri: "spectrum://channels"
        },
        id: 2
    }
    console.log('请求:', JSON.stringify(resourceBody, null, 2))
    
    let res2 = await fetch(session.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resourceBody)
    })
    console.log('响应状态:', res2.status, await res2.text())
    console.log()
    
    await new Promise(r => setTimeout(r, 2000))
    
    // 测试 3: 使用 resources/list 查看所有资源
    console.log('📊 测试 3: resources/list')
    const listBody = {
        jsonrpc: "2.0",
        method: "resources/list",
        params: {},
        id: 3
    }
    console.log('请求:', JSON.stringify(listBody, null, 2))
    
    let res3 = await fetch(session.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listBody)
    })
    console.log('响应状态:', res3.status, await res3.text())
    
    session.connection.destroy()
    console.log('\n✨ 测试完成')
}

test().catch(console.error)
