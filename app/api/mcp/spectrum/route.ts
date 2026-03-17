/**
 * 光谱 MCP 代理 API
 * 
 * 这个 API 路由作为 MCP SSE 连接的代理，解决了 Next.js API Route 无法保持长连接的问题
 * 
 * 工作原理：
 * 1. 客户端调用此 API 并传递工具名称和参数
 * 2. 服务端建立 SSE 连接到 Supergateway
 * 3. 通过 SSE 连接发送工具调用请求
 * 4. 等待响应并返回给客户端
 */

export const runtime = 'nodejs'
export const maxDuration = 30 // 最长 30 秒

const SPECTRUM_SSE_URL = 'http://8.153.175.190:8000/spectrum-stravision'

interface ToolCallRequest {
    toolName: string
    arguments: Record<string, any>
}

export async function POST(req: Request) {
    try {
        const { toolName, arguments: args }: ToolCallRequest = await req.json()
        
        console.log(`[Spectrum Proxy] Calling tool: ${toolName}`, args)
        
        // 建立 SSE 连接
        const sseRes = await fetch(SPECTRUM_SSE_URL, {
            method: 'GET',
            headers: {
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache'
            }
        })
        
        if (!sseRes.ok || !sseRes.body) {
            return Response.json(
                { error: 'Failed to connect to Spectrum MCP server' },
                { status: 503 }
            )
        }
        
        // 解析 SSE 流获取 endpoint
        const reader = sseRes.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let postEndpoint = ''
        
        // 读取直到获取 endpoint 事件
        const startTime = Date.now()
        while (Date.now() - startTime < 5000) { // 5秒超时
            const { value, done } = await reader.read()
            if (done) break
            
            buffer += decoder.decode(value, { stream: true })
            
            const eventMatch = buffer.match(/event:\s*endpoint[\s\S]*?data:\s*([^\n\r]+)/)
            if (eventMatch && eventMatch[1]) {
                const endpointPath = eventMatch[1].trim().replace(/^["']|["']$/g, '')
                postEndpoint = `http://8.153.175.190:8000${endpointPath}`
                console.log(`[Spectrum Proxy] Got endpoint: ${postEndpoint}`)
                break
            }
        }
        
        if (!postEndpoint) {
            await reader.cancel()
            return Response.json(
                { error: 'Failed to get endpoint from SSE' },
                { status: 503 }
            )
        }
        
        // 发送工具调用请求
        const body = {
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: toolName,
                arguments: args
            },
            id: Date.now()
        }
        
        console.log(`[Spectrum Proxy] Sending request to ${postEndpoint}`)
        
        const toolRes = await fetch(postEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        })
        
        // 等待响应（通过 SSE 流）
        // 响应会通过 SSE 的 message 事件返回
        let responseData: any = null
        buffer = ''
        
        const responseStartTime = Date.now()
        while (Date.now() - responseStartTime < 10000) { // 10秒超时
            const { value, done } = await reader.read()
            if (done) break
            
            buffer += decoder.decode(value, { stream: true })
            
            // 解析 message 事件
            const messageMatch = buffer.match(/event:\s*message[\s\S]*?data:\s*({[\s\S]*?})\n\n/)
            if (messageMatch && messageMatch[1]) {
                try {
                    responseData = JSON.parse(messageMatch[1])
                    console.log(`[Spectrum Proxy] Got response`)
                    break
                } catch (e) {
                    console.error(`[Spectrum Proxy] Failed to parse response:`, e)
                }
            }
        }
        
        // 关闭 SSE 连接
        await reader.cancel()
        
        if (!responseData) {
            return Response.json(
                { error: 'No response from MCP server' },
                { status: 504 }
            )
        }
        
        // 解析 JSON-RPC 响应
        if (responseData.result) {
            // 提取 content
            if (responseData.result.content && Array.isArray(responseData.result.content)) {
                const textContent = responseData.result.content.find((c: any) => c.type === 'text')
                if (textContent) {
                    try {
                        const data = JSON.parse(textContent.text)
                        return Response.json({ success: true, data })
                    } catch {
                        return Response.json({ success: true, data: textContent.text })
                    }
                }
            }
            return Response.json({ success: true, data: responseData.result })
        }
        
        if (responseData.error) {
            return Response.json(
                { error: responseData.error.message || 'Unknown error' },
                { status: 500 }
            )
        }
        
        return Response.json({ success: true, data: responseData })
        
    } catch (error: any) {
        console.error('[Spectrum Proxy] Error:', error)
        return Response.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
