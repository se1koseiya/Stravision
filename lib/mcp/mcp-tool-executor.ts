/**
 * MCP 工具执行器
 * 
 * 当 AI 模型发出 tool_call 请求时，本模块负责：
 * 1. 解析 tool_call 的 function name 和 arguments
 * 2. 路由到对应的 MCP 服务执行逻辑
 * 3. 返回执行结果供模型继续生成回复
 */

import { getMCPServerIdByToolName } from './mcp-tool-definitions'

interface MCPConfig {
    id: string
    name: string
    displayName?: string
    enabled: boolean
    apiKey?: string
    description?: string
    envVars?: Record<string, string>
}

interface ToolCallResult {
    success: boolean
    data?: any
    error?: string
}

/**
 * 带超时的 Fetch 辅助函数
 * 默认超时时间 60秒，确保给工具足够的执行时间
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 60000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return res;
    } catch (error: any) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error(`请求超时 (${timeoutMs}ms)，请稍后重试`);
        }
        throw error;
    }
}

// 城市名到经纬度的映射（用于天气 API）
const CITY_COORDS: Record<string, string> = {
    "北京": "116.4074,39.9042",
    "上海": "121.4737,31.2304",
    "广州": "113.2644,23.1291",
    "深圳": "114.0579,22.5431",
    "杭州": "120.1551,30.2741",
    "成都": "104.0668,30.5728",
    "重庆": "106.5516,29.5630",
    "武汉": "114.3055,30.5931",
    "西安": "108.9398,34.3416",
    "南京": "118.7969,32.0603",
    "天津": "117.2010,39.0842",
    "苏州": "120.5954,31.2989",
    "长沙": "112.9388,28.2282",
    "郑州": "113.6254,34.7466",
    "东莞": "113.7518,23.0209",
    "青岛": "120.3826,36.0671",
    "沈阳": "123.4328,41.8045",
    "宁波": "121.5440,29.8683",
    "昆明": "102.8329,24.8801",
    "合肥": "117.2272,31.8206",
    "福州": "119.3062,26.0753",
    "厦门": "118.0894,24.4798",
    "哈尔滨": "126.5358,45.8038",
    "济南": "117.1205,36.6519",
    "大连": "121.6147,38.9140",
    "贵阳": "106.6302,26.6477",
    "南宁": "108.3200,22.8240",
    "海口": "110.3500,20.0200",
    "兰州": "103.8343,36.0611",
    "太原": "112.5489,37.8706",
    "石家庄": "114.5149,38.0428",
    "长春": "125.3235,43.8171",
    "呼和浩特": "111.7510,40.8424",
    "银川": "106.2782,38.4664",
    "西宁": "101.7782,36.6171",
    "拉萨": "91.1145,29.6500",
    "乌鲁木齐": "87.6177,43.7928"
}

/**
 * 执行 MCP 工具调用
 */
export async function executeMCPToolCall(
    functionName: string,
    args: Record<string, any>,
    mcpConfigs: MCPConfig[],
    appUrl: string
): Promise<ToolCallResult> {
    const serverId = getMCPServerIdByToolName(functionName)
    if (!serverId) {
        return { success: false, error: `未知的 MCP 工具: ${functionName}` }
    }

    // 找到对应的 MCP 配置（获取 API Key 等信息）
    const config = mcpConfigs.find(c => c.id === serverId)
    if (!config) {
        return { success: false, error: `MCP 服务 ${serverId} 未安装或未启用` }
    }

    console.log(`[MCP Executor] Calling tool: ${functionName}, serverId: ${serverId}, args:`, args)

    try {
        switch (functionName) {
            // === 天气工具 ===
            case 'mcp_caiyun_weather':
                return await executeCaiyunWeather(args, config, appUrl)
            case 'mcp_gaode_weather':
                return await executeGaodeWeather(args, config, appUrl)
            case 'mcp_hefeng_weather':
                return await executeHefengWeather(args, config, appUrl)

            // === 路线规划 ===
            case 'mcp_amap_route':
                return await executeAmapRoute(args, config)

            // === 搜索 ===
            case 'mcp_brave_search':
                return await executeBraveSearch(args, config)
            case 'mcp_exa_search':
                return await executeExaSearch(args, config)

            // === 网页抓取 ===
            case 'mcp_firecrawl_scrape':
                return await executeFirecrawlScrape(args, config)

            // === 农业专用 ===
            case 'mcp_soil_sensor_query':
                return await executeSoilSensorQuery(args, config)
            case 'mcp_crop_disease_diagnose':
                return await executeCropDiseaseDiagnose(args, config)
            case 'mcp_irrigation_query':
                return await executeIrrigationQuery(args, config)
            case 'mcp_farm_data_query':
                return await executeFarmDataQuery(args, config)
            
            // === 光谱传感器 ===
            case 'get_channel':
            case 'get_all_spectrum':
                return await executeSpectrumTool(functionName, args, config)

            // === AI 增强 ===
            case 'mcp_sequential_thinking':
                return executeSequentialThinking(args)

            default:
                return { success: false, error: `工具 ${functionName} 暂不支持执行` }
        }
    } catch (error: any) {
        console.error(`[MCP Executor] Error executing ${functionName}:`, error)
        return { success: false, error: error.message || '工具执行失败' }
    }
}

// ===== 天气服务实现 =====

async function executeCaiyunWeather(args: Record<string, any>, config: MCPConfig, appUrl: string): Promise<ToolCallResult> {
    const apiKey = config.apiKey
    if (!apiKey) return { success: false, error: '彩云天气 API Token 未配置' }

    const city = args.city || '北京'

    try {
        const res = await fetchWithTimeout(`${appUrl}/api/mcp/weather`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'caiyun', city, apiKey })
        })

        if (res.ok) {
            const result = await res.json()
            return { success: true, data: result.data }
        } else {
            const errText = await res.text()
            return { success: false, error: `彩云天气查询失败: ${errText}` }
        }
    } catch (e: any) {
        return { success: false, error: `彩云天气请求失败: ${e.message}` }
    }
}

async function executeGaodeWeather(args: Record<string, any>, config: MCPConfig, appUrl: string): Promise<ToolCallResult> {
    const apiKey = config.apiKey
    if (!apiKey) return { success: false, error: '高德天气 API Key 未配置' }

    const city = args.city || '北京'

    try {
        const res = await fetchWithTimeout(`${appUrl}/api/mcp/weather`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'gaode', city, apiKey })
        })

        if (res.ok) {
            const result = await res.json()
            return { success: true, data: result.data }
        } else {
            const errText = await res.text()
            return { success: false, error: `高德天气查询失败: ${errText}` }
        }
    } catch (e: any) {
        return { success: false, error: `高德天气请求失败: ${e.message}` }
    }
}

async function executeHefengWeather(args: Record<string, any>, config: MCPConfig, appUrl: string): Promise<ToolCallResult> {
    const apiKey = config.apiKey
    if (!apiKey) return { success: false, error: '和风天气 API Key 未配置' }

    const city = args.city || '北京'

    try {
        const res = await fetchWithTimeout(`${appUrl}/api/mcp/weather`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'hefeng', city, apiKey })
        })

        if (res.ok) {
            const result = await res.json()
            return { success: true, data: result.data }
        } else {
            const errText = await res.text()
            return { success: false, error: `和风天气查询失败: ${errText}` }
        }
    } catch (e: any) {
        return { success: false, error: `和风天气请求失败: ${e.message}` }
    }
}

// ===== 路线规划 =====

async function executeAmapRoute(args: Record<string, any>, config: MCPConfig): Promise<ToolCallResult> {
    const apiKey = config.apiKey
    if (!apiKey) return { success: false, error: '高德地图 API Key 未配置' }

    const { origin, destination, mode = 'driving' } = args

    try {
        // 先对起点和终点做地理编码
        const originCoords = CITY_COORDS[origin] || await geocodeAmap(origin, apiKey)
        const destCoords = CITY_COORDS[destination] || await geocodeAmap(destination, apiKey)

        if (!originCoords || !destCoords) {
            return { success: false, error: '无法解析起点或终点地址' }
        }

        let routeUrl = ''
        if (mode === 'walking') {
            routeUrl = `https://restapi.amap.com/v3/direction/walking?origin=${originCoords}&destination=${destCoords}&key=${apiKey}`
        } else if (mode === 'bicycling') {
            routeUrl = `https://restapi.amap.com/v5/direction/electrobike?origin=${originCoords}&destination=${destCoords}&key=${apiKey}`
        } else {
            routeUrl = `https://restapi.amap.com/v3/direction/driving?origin=${originCoords}&destination=${destCoords}&key=${apiKey}`
        }

        const res = await fetchWithTimeout(routeUrl)
        const data = await res.json()

        if (data.status === '1') {
            return { success: true, data: { origin, destination, mode, route: data.route } }
        }
        return { success: false, error: data.info || '路线规划失败' }
    } catch (e: any) {
        return { success: false, error: `路线规划请求失败: ${e.message}` }
    }
}

async function geocodeAmap(address: string, apiKey: string): Promise<string | null> {
    try {
        const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${apiKey}`
        const res = await fetchWithTimeout(url)
        const data = await res.json()
        if (data.status === '1' && data.geocodes?.length > 0) {
            return data.geocodes[0].location // "lng,lat"
        }
        return null
    } catch {
        return null
    }
}

// ===== 搜索服务 =====

async function executeBraveSearch(args: Record<string, any>, config: MCPConfig): Promise<ToolCallResult> {
    const apiKey = config.apiKey
    if (!apiKey) return { success: false, error: 'Brave Search API Key 未配置' }

    const { query, count = 5 } = args

    try {
        const res = await fetchWithTimeout(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${Math.min(count, 10)}`, {
            headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip',
                'X-Subscription-Token': apiKey
            }
        })

        if (res.ok) {
            const data = await res.json()
            const results = data.web?.results?.map((r: any) => ({
                title: r.title,
                url: r.url,
                description: r.description
            })) || []
            return { success: true, data: { query, results } }
        } else {
            return { success: false, error: `Brave 搜索失败: ${res.status}` }
        }
    } catch (e: any) {
        return { success: false, error: `Brave 搜索请求失败: ${e.message}` }
    }
}

async function executeExaSearch(args: Record<string, any>, config: MCPConfig): Promise<ToolCallResult> {
    const apiKey = config.apiKey
    if (!apiKey) return { success: false, error: 'Exa API Key 未配置' }

    const { query, numResults = 5, useAutoprompt = true } = args

    try {
        // 默认使用官方 API，但也支持通过环境变量配置自定义端点（如 ModelScope 代理）
        // 注意：如果是 ModelScope MCP，通常是 SSE 协议，这里仅支持兼容 HTTP POST 的接口
        const endpoint = config.envVars?.API_ENDPOINT || 'https://api.exa.ai/search'
        
        const res = await fetchWithTimeout(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                // 某些代理可能需要 Authorization 头
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                query,
                numResults: Math.min(numResults, 10),
                useAutoprompt,
                contents: {
                    text: true,
                    highlights: true
                }
            })
        })

        if (res.ok) {
            const data = await res.json()
            const results = data.results?.map((r: any) => ({
                title: r.title,
                url: r.url,
                score: r.score,
                publishedDate: r.publishedDate,
                author: r.author,
                text: r.text ? r.text.slice(0, 300) + '...' : '', // 截断过长文本
                highlights: r.highlights
            })) || []
            return { success: true, data: { query, results } }
        } else {
            const errText = await res.text()
            return { success: false, error: `Exa 搜索失败: ${res.status} - ${errText}` }
        }
    } catch (e: any) {
        return { success: false, error: `Exa 搜索请求失败: ${e.message}` }
    }
}

// ===== 网页抓取 =====

async function executeFirecrawlScrape(args: Record<string, any>, config: MCPConfig): Promise<ToolCallResult> {
    const apiKey = config.apiKey
    if (!apiKey) return { success: false, error: 'Firecrawl API Key 未配置' }

    const { url } = args

    try {
        const res = await fetchWithTimeout('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                url,
                formats: ['markdown'],
                onlyMainContent: true
            })
        }, 120000) // 爬虫可能较慢，给120秒超时

        if (res.ok) {
            const data = await res.json()
            const markdown = data.data?.markdown || data.data?.content || ''
            // 截断过长内容，避免超出上下文窗口
            const truncated = markdown.length > 3000 ? markdown.slice(0, 3000) + '\n\n... (内容已截断)' : markdown
            return { success: true, data: { url, content: truncated } }
        } else {
            return { success: false, error: `Firecrawl 抓取失败: ${res.status}` }
        }
    } catch (e: any) {
        return { success: false, error: `Firecrawl 请求失败: ${e.message}` }
    }
}

// ===== 农业专用工具 =====

async function executeSoilSensorQuery(args: Record<string, any>, config: MCPConfig): Promise<ToolCallResult> {
    const apiKey = config.apiKey
    const endpoint = config.envVars?.IOT_ENDPOINT

    if (!apiKey || !endpoint || endpoint === 'https://your-iot-platform.com/api') {
        // 如果未配置真实端点，返回模拟数据作为示例
        return {
            success: true,
            data: {
                zone: args.zone || 'default',
                note: '当前使用系统内置传感器数据（IoT 端点未配置外部 MCP 服务），请参考系统上下文中的当前设备数据。',
                suggestion: '您可以在 MCP 设置中配置实际的 IoT 平台端点来获取外部传感器数据。'
            }
        }
    }

    try {
        const res = await fetchWithTimeout(`${endpoint}/sensors/${args.zone || 'default'}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        })
        if (res.ok) {
            const data = await res.json()
            return { success: true, data }
        }
        return { success: false, error: '土壤传感器查询失败' }
    } catch (e: any) {
        return { success: false, error: `土壤传感器请求失败: ${e.message}` }
    }
}

async function executeCropDiseaseDiagnose(args: Record<string, any>, config: MCPConfig): Promise<ToolCallResult> {
    const apiKey = config.apiKey

    if (!apiKey) {
        // 无外部 API 时使用内置知识库
        return {
            success: true,
            data: {
                crop: args.crop,
                symptoms: args.symptoms,
                note: '作物病害识别 API 未配置，将使用 AI 内置知识进行诊断。',
                suggestion: '请基于描述的症状，结合你的农业知识提供诊断意见和防治建议。'
            }
        }
    }

    try {
        const endpoint = config.envVars?.CROP_DISEASE_API_KEY ? 'https://api.crop-disease.example.com/diagnose' : ''
        if (!endpoint) {
            return { success: false, error: '病害识别服务端点未配置' }
        }
        const res = await fetchWithTimeout(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ crop: args.crop, symptoms: args.symptoms })
        })
        if (res.ok) {
            const data = await res.json()
            return { success: true, data }
        }
        return { success: false, error: '病害识别查询失败' }
    } catch (e: any) {
        return { success: false, error: `病害识别请求失败: ${e.message}` }
    }
}

async function executeIrrigationQuery(args: Record<string, any>, config: MCPConfig): Promise<ToolCallResult> {
    const apiKey = config.apiKey
    const endpoint = config.envVars?.IRRIGATION_API_ENDPOINT

    if (!apiKey || !endpoint) {
        return {
            success: true,
            data: {
                action: args.action,
                zone: args.zone || 'all',
                note: '灌溉控制系统 API 未配置外部端点。当前系统的水泵（Relay 5）提供基本灌溉控制。',
                suggestion: '您可通过设备控制命令操作系统内置水泵，或在 MCP 设置中配置外部灌溉控制系统。'
            }
        }
    }

    try {
        const res = await fetchWithTimeout(`${endpoint}/${args.action}${args.zone ? `?zone=${args.zone}` : ''}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        })
        if (res.ok) {
            const data = await res.json()
            return { success: true, data }
        }
        return { success: false, error: '灌溉系统查询失败' }
    } catch (e: any) {
        return { success: false, error: `灌溉系统请求失败: ${e.message}` }
    }
}

async function executeFarmDataQuery(args: Record<string, any>, config: MCPConfig): Promise<ToolCallResult> {
    const apiKey = config.apiKey
    const endpoint = config.envVars?.FARM_DATA_API_URL

    if (!apiKey || !endpoint) {
        return {
            success: true,
            data: {
                query_type: args.query_type,
                date_range: args.date_range || 'today',
                note: '农场数据平台 API 未配置。请参考系统上下文中的当前设备数据和天气信息进行分析。',
                suggestion: '您可在 MCP 设置中配置外部农场数据平台来获取更全面的数据分析。'
            }
        }
    }

    try {
        const res = await fetchWithTimeout(`${endpoint}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ type: args.query_type, range: args.date_range || 'today' })
        })
        if (res.ok) {
            const data = await res.json()
            return { success: true, data }
        }
        return { success: false, error: '农场数据查询失败' }
    } catch (e: any) {
        return { success: false, error: `农场数据请求失败: ${e.message}` }
    }
}

async function executeSpectrumTool(toolName: string, args: Record<string, any>, config: MCPConfig): Promise<ToolCallResult> {
    // 根据用户配置，使用 SSE (Server-Sent Events) 协议
    // 通常 SSE 用于连接建立，但 MCP over SSE 需要先连接获取 endpoint，然后 POST
    // 但如果用户给的是 /sse，可能是一个标准的 MCP SSE 入口。
    // 在 Web 环境下直接连接 SSE 比较复杂，特别是如果只是为了做一次工具调用。
    // 这里我们假设如果 URL 包含 /sse，则尝试探测其关联的 POST endpoint，或者使用 HTTP fallback。
    
    // 观察用户提供的截图配置：
    // "url": "http://stravision.cheesestrawberry.top:8080/sse"
    // "transport": "sse"
    
    // 标准 MCP SSE 流程：
    // 1. Client 连接 GET /sse
    // 2. Server 发送 endpoint 事件 (e.g. /messages)
    // 3. Client 发送 POST /messages (JSON-RPC)
    
    // 由于我们是在服务端环境 (Next.js API Route) 执行，我们可以简化这个流程。
    // 我们尝试直接 POST 到 /messages (假设它是标准的 MCP 实现)
    // 或者，我们可以尝试直接 POST 到 /mcp (如果它是基于 HTTP 的)
    
    const sseUrl = config.envVars?.SPECTRUM_API_URL || "http://stravision.cheesestrawberry.top:8080/sse"
    // 尝试推断 POST endpoint。通常是 sseUrl 替换 /sse 为 /messages
    const postEndpoint = sseUrl.replace(/\/sse\/?$/, '/messages')
    
    console.log(`[MCP] Executing Spectrum Tool: ${toolName}`)
    console.log(`[MCP] SSE URL: ${sseUrl}, Inferring POST Endpoint: ${postEndpoint}`)

    const body = {
        jsonrpc: "2.0",
        method: toolName,
        params: args,
        id: Date.now()
    }

    try {
        // 尝试直接 POST 到 inferred endpoint
        const res = await fetchWithTimeout(postEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }, 15000)

        if (res.ok) {
            // MCP over HTTP/SSE 的响应通常是空的 (202 Accepted) 或包含结果
            // 如果是 202，结果会通过 SSE 推送回来... 这在短连接 API 中很难处理。
            // 但很多实现为了兼容性，POST 请求会直接返回结果。
            
            const text = await res.text()
            try {
                if (!text) return { success: true, data: { status: 'Request sent', note: 'Command executed via SSE transport' } }
                
                const data = JSON.parse(text)
                if (data.result) return { success: true, data: data.result }
                if (data.error) return { success: false, error: data.error.message }
                return { success: true, data }
            } catch (e) {
                // 非 JSON 响应
                return { success: true, data: { response: text } }
            }
        }
        
        // 如果 inferred endpoint 失败，尝试 fallback 到原 URL (有些实现支持直接 POST 到 SSE URL)
        console.log(`[MCP] POST to ${postEndpoint} failed (${res.status}), retrying with original URL...`)
        
        const resFallback = await fetchWithTimeout(sseUrl, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(body)
        }, 15000)
        
        if (resFallback.ok) {
             const data = await resFallback.json()
             return { success: true, data: data.result || data }
        }

        return { success: false, error: `光谱服务请求失败: ${res.status} (Endpoint: ${postEndpoint})` }
    } catch (e: any) {
        return { success: false, error: `光谱服务连接错误: ${e.message}` }
    }
}

// ===== AI 增强工具 =====

function executeSequentialThinking(args: Record<string, any>): ToolCallResult {
    // Sequential Thinking 不需要外部 API，它只是一个提示 AI 进行结构化思考的工具
    return {
        success: true,
        data: {
            problem: args.problem,
            suggested_steps: args.steps || 5,
            instruction: `请按照以下步骤结构化分析问题 "${args.problem}"：
1. 问题定义：明确问题的核心要素
2. 信息收集：列出已知条件和需要的额外信息
3. 方案生成：提出多个可能的解决方案
4. 方案评估：对比各方案的优劣
5. 结论与建议：给出最终推荐方案和实施步骤`
        }
    }
}
