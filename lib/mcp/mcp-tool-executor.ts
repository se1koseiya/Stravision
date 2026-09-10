/**
 * MCP 工具执行器
 * 
 * 当 AI 模型发出 tool_call 请求时，本模块负责：
 * 1. 解析 tool_call 的 function name 和 arguments
 * 2. 路由到对应的 MCP 服务执行逻辑
 * 3. 返回执行结果供模型继续生成回复
 */

import { getMCPServerIdByToolName } from './mcp-tool-definitions'
import { spectrumConnectionPool } from './spectrum-connection-pool'
import { getMultiSensorHistory } from '@/lib/db/device-service'
import { skillManager } from '@/lib/ai/skill-system/skill-manager'
import { executeDeviceControlTool, isMultimodal } from './builtin-device-control'
import { executeAgentTaskTool } from './builtin-agent-tasks'
import { executeDeepResearchTool } from './builtin-deep-research'
import { executeSkillForgeTool } from './builtin-skill-forge'
import { executeDeviceForgeTool } from './builtin-device-forge'
import { executeFarmTool } from './builtin-farm-data'
import { executeUserMemoryTool } from './builtin-user-memory'

interface MCPConfig {
    id: string
    name: string
    displayName?: string
    enabled: boolean
    apiKey?: string
    description?: string
    envVars?: Record<string, string>
}

export interface ToolCallResult {
    success: boolean
    data?: any
    error?: string
    /** 工具执行耗时（ms），仅部分工具返回 */
    executionTime?: number
}

/** Agent 工具执行上下文（传递 userId/sessionId 等会话信息） */
export interface AgentToolContext {
    userId?: number
    sessionId?: string
    /** 长耗时工具（如 deep_research）的阶段进度回调，chat 路由会把它转成 SSE 推给前端思维链 */
    onProgress?: (stage: string, detail?: string) => void
}

/**
 * 带超时的 Fetch 辅助函数
 * 默认超时时间 30秒，优化后的超时设置
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
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
    appUrl: string,
    agentContext?: AgentToolContext
): Promise<ToolCallResult> {
    const serverId = getMCPServerIdByToolName(functionName)
    if (!serverId) {
        return { success: false, error: `未知的 MCP 工具: ${functionName}` }
    }

    // === 内置工具：不依赖用户 MCP 配置，直接执行 ===
    if (serverId === 'builtin-sensor-history') {
        console.log(`[MCP Executor] Calling builtin tool: ${functionName}, args:`, args)
        try {
            switch (functionName) {
                case 'get_sensor_history':
                    return await executeSensorHistoryQuery(args)
                default:
                    return { success: false, error: `内置工具 ${functionName} 暂不支持执行` }
            }
        } catch (error: any) {
            console.error(`[MCP Executor] Error executing builtin ${functionName}:`, error)
            return { success: false, error: error.message || '内置工具执行失败' }
        }
    }

    // === 内置 Agent 工具包（用户交互、定时任务、任务管理）===
    if (serverId === 'builtin-agent-tools') {
        console.log(`[MCP Executor] Calling agent tool: ${functionName}, args:`, args)
        try {
            return await executeAgentTool(functionName, args, agentContext)
        } catch (error: any) {
            console.error(`[MCP Executor] Error executing agent tool ${functionName}:`, error)
            return { success: false, error: error.message || 'Agent 工具执行失败' }
        }
    }

    // === 内置技能加载器（AI 自路由架构：按需返回技能全文）===
    if (serverId === 'builtin-skill-loader') {
        console.log(`[MCP Executor] Calling skill loader: ${functionName}, args:`, args)
        try {
            return await executeLoadSkill(args, agentContext)
        } catch (error: any) {
            console.error(`[MCP Executor] Error executing skill loader ${functionName}:`, error)
            return { success: false, error: error.message || '技能加载失败' }
        }
    }

    // === 内置设备控制（阻塞式 MCP 工具：直接调 MQTT，工具内部等待物理动作完成）===
    if (serverId === 'builtin-device-control') {
        console.log(`[MCP Executor] Calling device control tool: ${functionName}, args:`, args)
        try {
            return await executeDeviceControlTool(functionName, args, agentContext)
        } catch (error: any) {
            console.error(`[MCP Executor] Error executing device control ${functionName}:`, error)
            return { success: false, error: error.message || '设备控制工具执行失败' }
        }
    }

    // === 内置任务管理（update_task：增量更新 task list 状态，替代重复输出 <TASK_LIST> 标签）===
    if (serverId === 'builtin-agent-tasks') {
        console.log(`[MCP Executor] Calling agent task tool: ${functionName}, args:`, args)
        try {
            return await executeAgentTaskTool(functionName, args, agentContext)
        } catch (error: any) {
            console.error(`[MCP Executor] Error executing agent task tool ${functionName}:`, error)
            return { success: false, error: error.message || '任务管理工具执行失败' }
        }
    }

    // === 内置技能工坊（读文档 → 生成技能 → 自测 → 注册全域可用）===
    if (serverId === 'builtin-skill-forge') {
        console.log(`[MCP Executor] Calling skill forge tool: ${functionName}`)
        try {
            return await executeSkillForgeTool(functionName, args, agentContext)
        } catch (error: any) {
            console.error(`[MCP Executor] Error executing skill forge tool ${functionName}:`, error)
            return { success: false, error: error.message || '技能工坊工具执行失败' }
        }
    }

    // === 内置设备接入工坊（读接入文档 → 生成 devices 配置草稿，用户确认后装入）===
    if (serverId === 'builtin-device-forge') {
        console.log(`[MCP Executor] Calling device forge tool: ${functionName}`)
        try {
            return await executeDeviceForgeTool(functionName, args, agentContext)
        } catch (error: any) {
            console.error(`[MCP Executor] Error executing device forge tool ${functionName}:`, error)
            return { success: false, error: error.message || '设备接入工坊工具执行失败' }
        }
    }

    // === 内置深度研究（联网搜索 + 多源融合 + 沉淀入库）===
    if (serverId === 'builtin-deep-research') {
        console.log(`[MCP Executor] Calling deep research tool: ${functionName}, args:`, args)
        try {
            return await executeDeepResearchTool(functionName, args, agentContext)
        } catch (error: any) {
            console.error(`[MCP Executor] Error executing deep research tool ${functionName}:`, error)
            return { success: false, error: error.message || '深度研究工具执行失败' }
        }
    }

    // === 内置农业数据（当前态势 / 土壤诊断 / 操作记录，直连本地库）===
    if (serverId === 'builtin-farm-data') {
        console.log(`[MCP Executor] Calling farm data tool: ${functionName}, args:`, args)
        try {
            return await executeFarmTool(functionName, args, agentContext)
        } catch (error: any) {
            console.error(`[MCP Executor] Error executing farm tool ${functionName}:`, error)
            return { success: false, error: error.message || '农业数据工具执行失败' }
        }
    }

    // === 内置用户记忆（记住/更新/删除用户信息，md 文件为真相源）===
    if (serverId === 'builtin-user-memory') {
        console.log(`[MCP Executor] Calling user memory tool: ${functionName}, args:`, args)
        try {
            return await executeUserMemoryTool(functionName, args, agentContext)
        } catch (error: any) {
            console.error(`[MCP Executor] Error executing user memory tool ${functionName}:`, error)
            return { success: false, error: error.message || '记忆工具执行失败' }
        }
    }

    // === AnySearch 远程 MCP（Streamable HTTP；免 Key 匿名可用，配 Key 提升限额）===
    if (serverId === 'anysearch') {
        const config = mcpConfigs.find(c => c.id === 'anysearch')
        try {
            return await executeAnySearchMcpTool(functionName, args, config)
        } catch (e: any) {
            return { success: false, error: `AnySearch 执行失败: ${e.message}` }
        }
    }

    // 找到对应的 MCP 配置（获取 API Key 等信息）
    const config = mcpConfigs.find(c => c.id === serverId)
    if (!config) {
        return { success: false, error: `MCP 服务 ${serverId} 未安装或未启用` }
    }

    console.log(`[MCP Executor] Calling tool: ${functionName}, serverId: ${serverId}, args:`, args)

    try {
        switch (functionName) {
            // === 天气工具（统一调用 executeWeatherQuery） ===
            case 'mcp_caiyun_weather':
                return await executeWeatherQuery('caiyun', args, config, appUrl)
            case 'mcp_gaode_weather':
                return await executeWeatherQuery('gaode', args, config, appUrl)
            case 'mcp_hefeng_weather':
                return await executeWeatherQuery('hefeng', args, config, appUrl)

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

// 天气提供商配置映射（provider 名 → 中文名）
const WEATHER_PROVIDERS: Record<string, string> = {
    caiyun: '彩云天气',
    gaode: '高德天气',
    hefeng: '和风天气',
}

/**
 * 统一天气查询函数 - 消除 3 个几乎完全相同的函数
 * 所有天气提供商都通过 /api/mcp/weather 代理调用，仅 provider 字段不同
 */
async function executeWeatherQuery(
    provider: string,
    args: Record<string, any>,
    config: MCPConfig,
    appUrl: string
): Promise<ToolCallResult> {
    const apiKey = config.apiKey
    const providerName = WEATHER_PROVIDERS[provider] || provider
    if (!apiKey) return { success: false, error: `${providerName} API Key 未配置` }

    const city = args.city || '北京'

    try {
        const res = await fetchWithTimeout(`${appUrl}/api/mcp/weather`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider, city, apiKey })
        })

        if (res.ok) {
            const result = await res.json()
            return { success: true, data: result.data }
        } else {
            const errText = await res.text()
            return { success: false, error: `${providerName}查询失败: ${errText}` }
        }
    } catch (e: any) {
        return { success: false, error: `${providerName}请求失败: ${e.message}` }
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
    } catch (e: any) {
        console.warn(`[geocodeAmap] 地址解析失败 "${address}":`, e?.message || e)
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

/**
 * AnySearch 远程 MCP 工具（传输层复用 remote-mcp-client 的通用 Streamable HTTP 实现）
 */
async function executeAnySearchMcpTool(
    functionName: string,
    args: Record<string, any>,
    config?: MCPConfig
): Promise<ToolCallResult> {
    const { remoteMcpToolCall } = await import('./remote-mcp-client')
    // Key 可选：安装时填的 apiKey 或环境变量 ANYSEARCH_API_KEY；都不填走匿名
    const apiKey = config?.apiKey || config?.envVars?.ANYSEARCH_API_KEY || ''

    const toolName = functionName.replace(/^mcp_anysearch_/, '')
    const r = await remoteMcpToolCall('https://api.anysearch.com/mcp', toolName, args, {
        apiKey: apiKey || undefined,
        extraHeaders: { 'X-Anysearch-Client': 'mcp/1.0.0' },
        timeoutMs: 60000
    })

    if (!r.text) {
        return { success: true, data: { tool: toolName, result: '', note: 'AnySearch 返回空结果，可尝试更换关键词' } }
    }

    // 截断超长文本（extract 全文可能 5 万字符），避免撑爆上下文
    const truncated = r.text.length > 20000
        ? r.text.slice(0, 20000) + '\n\n…（内容过长已截断，可缩小范围分次提取）'
        : r.text
    return { success: true, data: { tool: toolName, result: truncated } }
}

async function executeFirecrawlScrape(args: Record<string, any>, config: MCPConfig): Promise<ToolCallResult> {
    const apiKey = config.apiKey
    if (!apiKey) return { success: false, error: 'Firecrawl API Key 未配置' }

    const { url } = args
    const maxRetries = 2
    let lastError: any

    for (let i = 0; i <= maxRetries; i++) {
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
                
                if (!markdown) {
                     // 如果内容为空，且还有重试次数，则重试
                     throw new Error('Firecrawl 返回内容为空')
                }

                // 截断过长内容，避免超出上下文窗口
                const truncated = markdown.length > 15000 ? markdown.slice(0, 15000) + '\n\n... (内容已截断)' : markdown
                return { success: true, data: { url, content: truncated } }
            } else {
                const errText = await res.text()
                let errMsg = `Firecrawl 抓取失败: ${res.status}`
                try {
                    const errJson = JSON.parse(errText)
                    if (errJson.error) errMsg += ` - ${errJson.error}`
                } catch {}
                
                throw new Error(errMsg)
            }
        } catch (e: any) {
            lastError = e
            console.warn(`Firecrawl scrape attempt ${i + 1} failed:`, e.message)
            
            // 如果是 URL 无效等 4xx 错误，通常重试也没用，直接返回
            if (e.message.includes('400') || e.message.includes('404')) {
                return { success: false, error: e.message }
            }

            if (i < maxRetries) {
                await new Promise(r => setTimeout(r, 2000)) // Wait 2s before retry
            }
        }
    }
    
    return { success: false, error: `Firecrawl 请求失败 (已重试 ${maxRetries} 次): ${lastError?.message || '未知错误'}` }
}

async function executeSpectrumTool(toolName: string, args: Record<string, any>, config: MCPConfig): Promise<ToolCallResult> {
    console.log(`[MCP] Executing Spectrum Tool: ${toolName}`, args)

    try {
        const startTime = Date.now();
        
        // 使用连接池执行（复用连接，大幅提升性能）
        const data = await spectrumConnectionPool.executeToolCall(toolName, args);
        
        const executionTime = Date.now() - startTime;
        console.log(`[MCP] ✅ Spectrum tool completed in ${executionTime}ms (using connection pool)`);
        
        return { 
            success: true, 
            data,
            executionTime
        };
    } catch (e: any) {
        console.error(`[MCP] Spectrum tool error:`, e)
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

// ===== 内置工具：本地传感器历史查询 =====

/**
 * 查询本地 sensor_readings 表的历史数据
 *
 * 返回结构精简以节省 token：
 * - 每个指标只返回统计摘要 + 降采样后的数据点（最多 ~50 个点）
 * - 数据点用 [timestamp, value] 二元组而非对象，减少 JSON 体积
 */
async function executeSensorHistoryQuery(args: Record<string, any>): Promise<ToolCallResult> {
    const metrics: string[] = Array.isArray(args.metrics) ? args.metrics : []
    const range: string = args.range || '1h'

    if (metrics.length === 0) {
        return { success: false, error: '必须指定至少一个要查询的指标（metrics 参数）' }
    }

    if (metrics.length > 5) {
        return { success: false, error: '单次最多查询 5 个指标，请减少 metrics 数量' }
    }

    const result = await getMultiSensorHistory(metrics, range)

    // 精简输出格式：数据点转为 [ts, val] 二元组，时间戳转可读时间
    const compactMetrics = result.metrics.map(m => {
        // 最多返回 30 个数据点（进一步抽稀，避免 token 爆炸）
        const points = m.points
        const maxPoints = 30
        const stepped = points.length > maxPoints
          ? points.filter((_, i) => i % Math.ceil(points.length / maxPoints) === 0)
          : points
        return {
            key: m.key,
            label: m.label,
            unit: m.unit,
            stats: m.stats,
            points: stepped.map(p => ({
                time: new Date(p.timestamp).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' }),
                value: p.value
            }))
        }
    })

    return {
        success: true,
        data: {
            range,
            metric_count: compactMetrics.length,
            metrics: compactMetrics,
            note: '数据来自本地传感器历史记录（保留最近 7 天）。stats 含 min/max/avg/latest 统计摘要，points 为降采样后的时间序列。'
        }
    }
}

// ===========================================================================
// 技能加载器执行器（AI 自路由架构）
// 处理 load_skill：根据 AI 传入的 skill_ids 返回对应技能的完整内容
// ===========================================================================

async function executeLoadSkill(
    args: Record<string, any>,
    agentContext?: AgentToolContext
): Promise<ToolCallResult> {
    const skillIds: string[] = Array.isArray(args?.skill_ids)
        ? args.skill_ids.filter((id: any) => typeof id === 'string' && id.trim())
        : [];

    if (skillIds.length === 0) {
        return {
            success: false,
            error: 'skill_ids 不能为空，请从系统提示词的技能清单中选择至少一个技能 ID'
        };
    }

    const userId = agentContext?.userId;
    console.log(`[SkillLoader] Loading ${skillIds.length} skill(s) for user=${userId || 'anon'}: ${skillIds.join(', ')}`);

    const { found, missingIds } = await skillManager.getSkillsByIds(skillIds, userId);

    if (found.length === 0) {
        return {
            success: false,
            error: `未找到任何技能，请检查 ID 是否正确。请求的 ID: ${skillIds.join(', ')}`
        };
    }

    // 构造返回内容：每个技能一段，含元信息头 + 完整 content
    const sections = found.map(skill => {
        const header = `### 技能: ${skill.name} (id: ${skill.id})\n来源: ${skill.source} | 描述: ${skill.description}`;
        return `${header}\n\n${skill.content}`;
    });

    let resultText = `已加载 ${found.length} 个技能：\n\n${sections.join('\n\n---\n\n')}`;

    if (missingIds.length > 0) {
        resultText += `\n\n---\n\n⚠️ 以下技能 ID 未找到: ${missingIds.join(', ')}（可能拼写错误或已被移除）`;
    }

    return {
        success: true,
        data: { loaded: found.map(s => s.id), missing: missingIds, content: resultText }
    };
}

// ===========================================================================
// Agent 工具包执行器
// 处理 ask_user_question / cron_create / cron_list / cron_delete /
//       task_create / task_list / task_update
// ===========================================================================

async function executeAgentTool(
    functionName: string,
    args: Record<string, any>,
    agentContext?: AgentToolContext
): Promise<ToolCallResult> {
    switch (functionName) {
        // --- 用户交互 ---
        case 'ask_user_question':
            return executeAskUserQuestion(args)

        // --- 定时任务 ---
        case 'cron_create':
            return executeCronCreate(args, agentContext)
        case 'cron_list':
            return executeCronList(args, agentContext)
        case 'cron_delete':
            return executeCronDelete(args, agentContext)

        // --- 任务管理 ---
        case 'task_create':
            return executeTaskCreate(args, agentContext)
        case 'task_list':
            return executeTaskList(args, agentContext)
        case 'task_update':
            return executeTaskUpdate(args, agentContext)

        // --- 计划模式 ---
        case 'enter_plan_mode':
            return executeEnterPlanMode(args)
        case 'exit_plan_mode':
            return executeExitPlanMode(args)

        default:
            return { success: false, error: `未知的 Agent 工具: ${functionName}` }
    }
}

/**
 * ask_user_question：返回特殊标记，由 Agent Loop 转为 <CLARIFY> 标签
 * 不直接执行，而是返回结构化数据让前端渲染表单
 */
function executeAskUserQuestion(args: Record<string, any>): ToolCallResult {
    const clarifyData: Record<string, any> = {
        title: args.title || '需要更多信息',
    }
    if (args.context) clarifyData.context = args.context
    if (args.fields && Array.isArray(args.fields)) clarifyData.fields = args.fields
    if (args.options && Array.isArray(args.options)) clarifyData.options = args.options

    return {
        success: true,
        data: {
            _agent_action: 'clarify',
            clarify_data: clarifyData,
        },
    }
}

/**
 * cron_create：创建定时任务
 *
 * 写入 scheduled_tasks 表（前端 /api/scheduler/tasks 和 ScheduledTasksList 组件读取的表）。
 * AI 传入的 task_action 是自然语言描述（如"开启水泵浇水 5 分钟"），
 * 这里需要解析出 action_type / device_id / params，以匹配 SchedulerRunner 的执行契约：
 *   - relay 任务需要 { device_id, params: { value: 1|0 } }
 *   - led   任务需要 { params: { r,g,b,w } }
 *   - agent/reminder 任务仅记录描述，由前端处理
 */
async function executeCronCreate(
    args: Record<string, any>,
    ctx?: AgentToolContext
): Promise<ToolCallResult> {
    if (!ctx?.userId) {
        return { success: false, error: '无法获取用户信息，请重新登录' }
    }

    const { createTask } = await import('@/lib/db/scheduler-service')
    const { SchedulerRunner } = await import('@/lib/scheduler/runner')
    const { DEVICE_IDS } = await import('@/lib/constants')

    const title: string = args.title || '未命名任务'
    const taskType: string = args.task_type || 'custom'
    const taskAction: string = args.task_action || ''
    const delaySeconds = args.delay_seconds
    const cronExpression = args.cron_expression

    // 解析调度时间：cron 或 单次 execute_at
    let cron_expression: string | undefined
    let execute_at: number | undefined
    let scheduleDesc: string

    if (cronExpression) {
        cron_expression = cronExpression
        scheduleDesc = `按 cron 表达式 ${cronExpression} 周期执行`
    } else if (delaySeconds !== undefined && delaySeconds > 0) {
        execute_at = Date.now() + delaySeconds * 1000
        scheduleDesc = `将在 ${delaySeconds < 3600 ? `${Math.round(delaySeconds / 60)} 分钟` : `${Math.round(delaySeconds / 3600)} 小时`}后执行`
    } else {
        return { success: false, error: '必须提供 delay_seconds 或 cron_expression 之一' }
    }

    // 解析 task_action → action_type / device_id / params
    // task_action 是 AI 生成的自然语言描述，需要从中识别设备与动作
    const parsed = parseTaskAction(taskAction, taskType, DEVICE_IDS)

    try {
        const task = await createTask({
            title,
            cron_expression,
            execute_at,
            action_type: parsed.action_type,
            device_id: parsed.device_id,
            params: parsed.params,
        })

        // 通知 SchedulerRunner 立即加载新任务（否则要等下次轮询）
        try {
            await SchedulerRunner.getInstance().refreshTasks()
        } catch (e) {
            console.warn('[cron_create] SchedulerRunner.refreshTasks 失败（不影响任务创建）:', e)
        }

        console.log(`[cron_create] 任务已创建: id=${task.id}, title=${title}, type=${parsed.action_type}, cron=${cron_expression || '一次性'}`)

        return {
            success: true,
            data: {
                task_id: task.id,
                title,
                action_type: parsed.action_type,
                device_id: parsed.device_id || null,
                cron_expression: cron_expression || null,
                execute_at: execute_at || null,
                schedule_description: scheduleDesc,
                message: `定时任务已创建：${title}（#${task.id}），${scheduleDesc}`,
            },
        }
    } catch (error: any) {
        console.error('[cron_create] 创建失败:', error)
        return { success: false, error: error.message || '定时任务创建失败' }
    }
}

/**
 * 从 AI 生成的 task_action 文本中解析出设备控制意图
 *
 * 匹配策略：
 * 1. 优先识别"设备名 + 开/关" → relay 任务
 * 2. 识别"补光/灯光 + 颜色" → led 任务
 * 3. 其余（分析、通知、提醒、自定义）→ agent 任务（前端处理）
 */
function parseTaskAction(
    taskAction: string,
    taskType: string,
    deviceIds: { PUMP: number; FAN: number; RGB_LIGHT: number; WHITE_LIGHT: number }
): {
    action_type: 'relay' | 'led' | 'agent' | 'reminder'
    device_id?: number
    params: Record<string, any>
} {
    const text = taskAction.toLowerCase()

    // 设备名映射（支持多种说法）
    const devicePatterns: { id: number; names: string[] }[] = [
        { id: deviceIds.PUMP, names: ['水泵', '灌溉', '浇水', 'pump', '灌溉水泵'] },
        { id: deviceIds.FAN, names: ['风扇', '通风', '排风', 'fan'] },
        { id: deviceIds.RGB_LIGHT, names: ['rgb', 'rgb补光', 'rgb灯'] },
        { id: deviceIds.WHITE_LIGHT, names: ['白光', '白光灯', 'white'] },
        // "补光灯" 单独提及时默认走 RGB 通道（与项目 DEVICE_NAMES 一致）
        { id: deviceIds.RGB_LIGHT, names: ['补光灯', '补光'] },
    ]

    // 开/关 关键词
    const isTurnOn = /开启|打开|开一下|启动|启动|启动一下|on\b/.test(text)
    const isTurnOff = /关闭|关掉|关一下|停止|off\b/.test(text)

    // 仅对 device_control 类型尝试解析设备
    if (taskType === 'device_control' || isTurnOn || isTurnOff) {
        for (const dev of devicePatterns) {
            if (dev.names.some(name => text.includes(name.toLowerCase()))) {
                if (dev.id === deviceIds.RGB_LIGHT || dev.id === deviceIds.WHITE_LIGHT) {
                    // LED 设备：走 led 类型，默认全开（白光最大亮度）
                    // 若用户明确说"关闭"，则全 0
                    const value = isTurnOff ? 0 : 255
                    return {
                        action_type: 'led',
                        device_id: dev.id,
                        params: { r: value, g: value, b: value, w: value },
                    }
                }
                // 继电器设备：走 relay 类型
                return {
                    action_type: 'relay',
                    device_id: dev.id,
                    params: { value: isTurnOff ? 0 : 1 },
                }
            }
        }
    }

    // 非设备控制类：映射到 agent/reminder
    if (taskType === 'reminder' || taskType === 'notification') {
        return { action_type: 'reminder', params: { description: taskAction } }
    }

    // 默认：agent 任务（分析、自定义等，由前端拾取并处理）
    return { action_type: 'agent', params: { description: taskAction, task_type: taskType } }
}

/**
 * cron_list：查询定时任务列表
 *
 * 从 scheduled_tasks 表读取（与前端 /api/scheduler/tasks 一致）。
 * 注意：scheduled_tasks 表无 user_id 字段，由 /api/scheduler/tasks 的 admin 守卫保证安全。
 */
async function executeCronList(
    args: Record<string, any>,
    ctx?: AgentToolContext
): Promise<ToolCallResult> {
    if (!ctx?.userId) {
        return { success: false, error: '无法获取用户信息' }
    }

    const { getAllTasks } = await import('@/lib/db/scheduler-service')
    const tasks = await getAllTasks()

    // status 过滤：scheduled_tasks 用 is_active（1/0），映射到 pending/completed
    const status = args.status || 'all'
    let filtered = tasks
    if (status === 'pending') {
        filtered = tasks.filter(t => t.is_active === 1)
    } else if (status === 'completed') {
        filtered = tasks.filter(t => t.is_active === 0)
    }

    return {
        success: true,
        data: {
            total: filtered.length,
            tasks: filtered.map(t => ({
                id: t.id,
                title: t.title,
                action_type: t.action_type,
                device_id: t.device_id,
                cron_expression: t.cron_expression,
                execute_at: t.execute_at,
                is_active: t.is_active,
                created_at: t.created_at,
                last_run_at: t.last_run_at,
                run_status: t.run_status,
            })),
        },
    }
}

/**
 * cron_delete：取消/删除定时任务
 *
 * 操作 scheduled_tasks 表（与前端一致）。
 */
async function executeCronDelete(
    args: Record<string, any>,
    ctx?: AgentToolContext
): Promise<ToolCallResult> {
    if (!ctx?.userId) {
        return { success: false, error: '无法获取用户信息' }
    }

    const { deleteTask } = await import('@/lib/db/scheduler-service')
    const { SchedulerRunner } = await import('@/lib/scheduler/runner')

    const taskId = Number(args.task_id)
    if (!taskId) {
        return { success: false, error: 'task_id 不能为空' }
    }

    try {
        await deleteTask(taskId)
        try {
            await SchedulerRunner.getInstance().refreshTasks()
        } catch (e) {
            console.warn('[cron_delete] SchedulerRunner.refreshTasks 失败:', e)
        }
        return { success: true, data: { message: `任务 #${taskId} 已删除` } }
    } catch (error: any) {
        return { success: false, error: error.message || `任务 #${taskId} 删除失败` }
    }
}

/**
 * task_create：创建子任务
 * 使用 agent_tasks 表（本函数内动态建表确保存在）
 */
async function executeTaskCreate(
    args: Record<string, any>,
    ctx?: AgentToolContext
): Promise<ToolCallResult> {
    if (!ctx?.userId) {
        return { success: false, error: '无法获取用户信息' }
    }

    const { queryOne, execute } = await import('@/lib/db/database')

    // 确保表存在
    await execute(`
        CREATE TABLE IF NOT EXISTS agent_tasks (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            session_id TEXT,
            content TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            priority TEXT NOT NULL DEFAULT 'medium',
            created_at BIGINT NOT NULL,
            updated_at BIGINT NOT NULL
        )
    `, [])
    await execute(`CREATE INDEX IF NOT EXISTS idx_agent_tasks_user ON agent_tasks(user_id)`, [])

    const now = Date.now()
    const priority = args.priority || 'medium'

    const row = await queryOne<{ id: number }>(
        `INSERT INTO agent_tasks (user_id, session_id, content, status, priority, created_at, updated_at)
         VALUES ($1, $2, $3, 'pending', $4, $5, $6) RETURNING id`,
        [ctx.userId, ctx.sessionId || '', args.content, priority, now, now]
    )

    return {
        success: true,
        data: {
            task_id: row?.id ?? 0,
            content: args.content,
            status: 'pending',
            priority,
            message: `任务已创建：${args.content}`,
        },
    }
}

/**
 * task_list：查询任务列表
 */
async function executeTaskList(
    args: Record<string, any>,
    ctx?: AgentToolContext
): Promise<ToolCallResult> {
    if (!ctx?.userId) {
        return { success: false, error: '无法获取用户信息' }
    }

    const { query } = await import('@/lib/db/database')
    const status = args.status || 'all'

    let sql = `SELECT id, content, status, priority, created_at, updated_at
               FROM agent_tasks WHERE user_id = $1`
    const params: any[] = [ctx.userId]

    if (status !== 'all') {
        sql += ` AND status = $2`
        params.push(status)
    }
    sql += ` ORDER BY created_at DESC LIMIT 100`

    const tasks = await query<any>(sql, params)

    return {
        success: true,
        data: {
            total: tasks.length,
            tasks: tasks.map(t => ({
                id: t.id,
                content: t.content,
                status: t.status,
                priority: t.priority,
                created_at: t.created_at,
            })),
        },
    }
}

/**
 * task_update：更新任务状态或内容
 */
async function executeTaskUpdate(
    args: Record<string, any>,
    ctx?: AgentToolContext
): Promise<ToolCallResult> {
    if (!ctx?.userId) {
        return { success: false, error: '无法获取用户信息' }
    }

    const { execute } = await import('@/lib/db/database')
    const taskId = args.task_id
    const updates: string[] = []
    const params: any[] = []
    let paramIdx = 1

    if (args.status) {
        updates.push(`status = $${paramIdx++}`)
        params.push(args.status)
    }
    if (args.content) {
        updates.push(`content = $${paramIdx++}`)
        params.push(args.content)
    }
    updates.push(`updated_at = $${paramIdx++}`)
    params.push(Date.now())

    if (updates.length === 1) {
        return { success: false, error: '没有需要更新的字段' }
    }

    params.push(taskId, ctx.userId)
    const result = await execute(
        `UPDATE agent_tasks SET ${updates.join(', ')} WHERE id = $${paramIdx++} AND user_id = $${paramIdx++}`,
        params
    )

    return {
        success: result.rowCount > 0,
        data: result.rowCount > 0
            ? { message: `任务 #${taskId} 已更新` }
            : { message: `任务 #${taskId} 不存在` },
    }
}

// ===========================================================================
// 计划模式工具
// ===========================================================================

/**
 * enter_plan_mode：返回特殊标记，由 Agent Loop 设置 planMode 状态
 * 计划模式下屏蔽有副作用的工具（设备控制、cron_create、task_create 等）
 */
function executeEnterPlanMode(args: Record<string, any>): ToolCallResult {
    return {
        success: true,
        data: {
            _agent_action: 'enter_plan_mode',
            reason: args.reason || '进入计划模式进行调研和规划',
            message: '已进入计划模式。在此模式下，你只能进行调研和信息收集（查询传感器、天气、搜索等），不能执行有副作用的操作。完成调研后请调用 exit_plan_mode 提交计划。',
        },
    }
}

/**
 * exit_plan_mode：返回特殊标记，由 Agent Loop 转为 <PLAN> 标签
 * 计划内容展示为审批卡片，用户批准后 AI 按计划执行
 */
function executeExitPlanMode(args: Record<string, any>): ToolCallResult {
    const planData = {
        title: args.title || '执行计划',
        summary: args.summary || '',
        steps: Array.isArray(args.steps) ? args.steps : [],
    }

    return {
        success: true,
        data: {
            _agent_action: 'exit_plan_mode',
            plan_data: planData,
            message: '计划已提交，等待用户审批。用户批准后请按计划步骤逐步执行。',
        },
    }
}
