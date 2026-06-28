export const runtime = 'nodejs'

export async function GET() {
  return Response.json({
    message: "Chat API is working. Use POST to send messages.",
  })
}

import { getEnhancedSystemPrompt } from '@/lib/ai-system-prompt'
import { generateMemoryEnhancedPrompt } from '@/lib/ai/memory-prompt-enhancer'
import { resolveProvider, normalizeOpenAIChatCompletionsUrl, readProvidersConfig } from '@/lib/ai/provider-resolver'
import { learnFromConversation } from '@/lib/ai/auto-learning-service'
import { getAllTasks } from '@/lib/db/scheduler-service'
import { initDB } from '@/lib/db/database'
import { getCurrentUser } from '@/lib/auth'
import { getUserAiQuota, incrementAiUsage } from '@/lib/db/ai-quota-service'
import { getMCPToolDefinitions } from '@/lib/mcp/mcp-tool-definitions'
import { executeMCPToolCall } from '@/lib/mcp/mcp-tool-executor'
import { createOrchestrator, globalOrchestratorManager } from '@/lib/ai/agent-orchestrator'
import type { AgentContext } from '@/lib/ai/agent-orchestrator/types'
import { getRelevantSkillsContentCached } from '@/lib/ai/skill-router-cached'
import { executeToolCallsSmart } from '@/lib/ai/parallel-tool-executor'
import { generateCompactSystemPrompt, filterDisabledFeatures, type AIFeatureConfig } from '@/lib/ai/prompt-templates'
import fs from 'fs/promises'
import path from 'path'

// 读取 AI 功能配置
async function getAIFeaturesConfig(): Promise<AIFeatureConfig | undefined> {
  try {
    const configPath = path.join(process.cwd(), 'data', 'ai-features-config.json')
    const data = await fs.readFile(configPath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // 配置文件不存在或读取失败，返回 undefined（使用默认配置）
    return undefined
  }
}

/**
 * 🔥 智能过滤器：拦截裸露的 TASK_LIST JSON
 * 防止 AI 错误输出导致 JSON 暴露在用户界面
 *
 * 重要：只过滤裸露的 JSON，保留正确包裹在 <TASK_LIST> 标签内的 JSON
 *
 * @param chunkContent 当前流式 chunk 的内容
 * @param accumulatedContent 累积的全部内容（用于判断是否已处于 <TASK_LIST> 块内）
 */
function filterBareTaskListJson(chunkContent: string, accumulatedContent: string = ''): string {
  if (!chunkContent) return chunkContent

  // 使用累积内容判断是否已经处于 <TASK_LIST> 块内
  // 如果累积内容中已有 <TASK_LIST> 开标签但还没有 </TASK_LIST> 闭标签，
  // 说明当前 chunk 是 TASK_LIST 块内部内容，不应过滤
  const accHasOpenTag = accumulatedContent.includes('<TASK_LIST>')
  const accHasCloseTag = accumulatedContent.includes('</TASK_LIST>')
  const chunkHasOpenTag = chunkContent.includes('<TASK_LIST>')
  const chunkHasCloseTag = chunkContent.includes('</TASK_LIST>')

  // 如果累积内容或当前 chunk 包含 TASK_LIST 标签，说明是正确的格式，不要过滤
  if (accHasOpenTag || accHasCloseTag || chunkHasOpenTag || chunkHasCloseTag) {
    return chunkContent
  }

  // 🔥 关键修复：先识别并保留 schedule_task JSON 代码块
  // schedule_task JSON 绝不能被 TASK_LIST 过滤器误删
  // 用占位符替换，过滤完再恢复
  const scheduleTaskBlocks: string[] = []
  let stashed = chunkContent
  stashed = stashed.replace(/```json\s*[\s\S]*?"action"\s*:\s*"schedule_task"[\s\S]*?(?:```|$)/g, (match) => {
    scheduleTaskBlocks.push(match)
    return `\x00ST_BLOCK_${scheduleTaskBlocks.length - 1}\x00`
  })

  // 🔥 关键修复：同时识别并保留自动化策略 JSON
  // 自动化策略是含 nodes/edges 的图结构，含 triggerNode/logicNode/actionNode
  // 使用非贪婪匹配直到遇到 ``` 或字符串结尾；不要求 JSON 已闭合（流式支持）
  const automationBlocks: string[] = []
  stashed = stashed.replace(/```json\s*[\s\S]*?(?:```|$)/g, (match) => {
    const jsonText = match.replace(/^```json\s*/, "").replace(/```$/, "").trim()
    // 任何含策略标记的代码块都保护
    if (jsonText.includes('"triggerNode"') || jsonText.includes('"logicNode"') || jsonText.includes('"actionNode"')) {
      automationBlocks.push(match)
      return `\x00AUTO_BLOCK_${automationBlocks.length - 1}\x00`
    }
    return match
  })

  // 🔥 关键修复：保护无 fence 的裸策略 JSON（如 { "nodes": [...], "edges": [...] }）
  // 避免被下方的 TASK_LIST 模式误识别（虽然一般不会匹配，但作为保险）
  stashed = stashed.replace(/\{\s*"(?:nodes|edges)"[\s\S]*?"nodes"\s*:\s*\[[\s\S]*?\}\s*(?=\n|$)/g, (match) => {
    if (match.includes('"triggerNode"') || match.includes('"logicNode"') || match.includes('"actionNode"')) {
      automationBlocks.push('```json\n' + match + '\n```')
      return `\x00AUTO_BLOCK_${automationBlocks.length - 1}\x00`
    }
    return match
  })

  // 只有在没有标签包裹的情况下，才过滤裸露的 JSON

  // 1. 拦截完整的裸露 TASK_LIST JSON 对象
  // 匹配模式：{ "status": "in_progress", "tasks": [...] }
  const taskListJsonPattern = /\{\s*"status"\s*:\s*"(?:in_progress|completed|pending)"\s*,\s*"tasks"\s*:\s*\[[\s\S]*?\]\s*\}/g
  const hasTaskListJson = taskListJsonPattern.test(stashed)

  if (hasTaskListJson) {
    stashed = stashed.replace(taskListJsonPattern, (match) => {
      // 二次防御：不能是 schedule_task JSON
      if (match.includes('"action": "schedule_task"')) return match
      console.warn('[TASK_LIST Filter] Intercepted BARE TASK_LIST JSON (no tags):', match.slice(0, 100))
      return '' // 完全移除裸露的 JSON
    })
  }

  // 2. 拦截不完整的裸露 TASK_LIST JSON 片段（流式输出时）
  // 匹配模式：{ "status": "in_progress", "tasks": [{ "id": "task-1"...
  const incompleteTaskPattern = /\{\s*"status"\s*:\s*"(?:in_progress|completed|pending)"[\s\S]*?(?:"tasks"\s*:\s*\[[\s\S]*)?$/
  if (incompleteTaskPattern.test(stashed)) {
    const lastBrace = stashed.lastIndexOf('{')
    if (lastBrace !== -1) {
      const potentialJson = stashed.slice(lastBrace)
      // 二次防御：必须包含 tasks 或 status，且不能是 schedule_task
      if (
        (potentialJson.includes('"tasks"') || (potentialJson.includes('"status"') && potentialJson.includes('"in_progress"'))) &&
        !potentialJson.includes('"action": "schedule_task"')
      ) {
        console.warn('[TASK_LIST Filter] Intercepted incomplete BARE TASK_LIST JSON (no tags)')
        stashed = stashed.slice(0, lastBrace).trim()
      }
    }
  }

  // 还原 schedule_task 代码块
  const result = stashed.replace(/\x00ST_BLOCK_(\d+)\x00/g, (_, idx) => {
    return scheduleTaskBlocks[Number(idx)] || ''
  })
  // 还原自动化策略代码块
  return result.replace(/\x00AUTO_BLOCK_(\d+)\x00/g, (_, idx) => {
    return automationBlocks[Number(idx)] || ''
  })
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    await initDB()
    
    // 读取 AI 功能配置
    const aiFeatures = await getAIFeaturesConfig()
    console.log('[Chat API] AI Features Config:', aiFeatures ? 'Loaded' : 'Using defaults')
    
    const { messages, apiKey: rawApiKey, apiUrl: rawApiUrl, model, systemPrompt, enableSearch, enableReasoning, deviceData, weatherData, mcpConfigs, mandatorySkillsEnabled, deviceOnline } =
      await req.json()

    // 兼容前端传来的 deviceData 字段
    const deviceStatus = deviceData;
    // 🔥 设备离线时禁用控制能力，避免 AI 生成无效控制指令浪费 token
    const isDeviceOnline = deviceOnline !== false;

    // ====== 多提供商解析 ======
    // 优先级：用户自配 > 已配置提供商 > 系统环境变量
    const stripWrappingQuotes = (value: unknown) => {
      const s = String(value ?? "").trim()
      return s.replace(/^[`"']+/, "").replace(/[`"']+$/, "").trim()
    }

    const userApiKey = rawApiKey ? stripWrappingQuotes(rawApiKey) : undefined
    const userApiUrl = rawApiUrl ? normalizeOpenAIChatCompletionsUrl(rawApiUrl) : undefined
    let effectiveModel = model || 'auto'

    const resolved = await resolveProvider(effectiveModel === 'auto' ? 'qwen3.6-plus' : effectiveModel, userApiKey, userApiUrl)

    // 如果有用户自定义的 apiKey（未在提供商中匹配到），使用原有逻辑
    let apiKey: string
    let targetUrl: string

    if (userApiKey && !resolved) {
      // 用户提供了自定义 key 但未匹配到提供商 → 使用原有逻辑
      apiKey = userApiKey
      targetUrl = userApiUrl || ''

      if (!apiKey) {
        return Response.json({ error: "API Key is required. Please configure it in settings." }, { status: 400 })
      }
    } else if (resolved) {
      // 从提供商配置中解析成功
      apiKey = resolved.apiKey
      targetUrl = resolved.baseUrl
      console.log(`[Chat API] Resolved provider: ${resolved.providerId}, model: ${effectiveModel}`)
    } else {
      // 未找到任何匹配
      return Response.json(
        { error: "No AI provider configured. Please add a provider in admin settings." },
        { status: 503 }
      )
    }

    // 是否使用系统托管 Key（用于配额扣减判断）
    const useSystemKey = !userApiKey || !!resolved

    // 请求前校验配额：使用系统托管 Key 时必须检查配额，防止超额使用
    if (useSystemKey) {
      const quota = await getUserAiQuota(user.id as number)
      if (!quota.can_use) {
        let reason: string
        if (quota.reason === 'membership_required') {
          reason = 'AI 功能仅限 Pro/Plus 会员使用，请升级会员后继续使用'
        } else if (quota.reason === 'limit_reached') {
          reason = '今日额度已用完'
        } else {
          reason = '余额不足'
        }
        return Response.json(
          { error: `${reason}。`, quota },
          { status: 403 }
        )
      }
    }



    // === MCP Function Calling 集成 ===
    // 根据用户启用的 MCP 服务，生成 AI 可调用的工具定义
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const mcpToolDefs = getMCPToolDefinitions(mcpConfigs || [])
    
    const lastUserMessageObj = messages.slice().reverse().find((m: any) => m.role === 'user')
    const lastUserContent = lastUserMessageObj?.content
    const lastUserText = typeof lastUserContent === 'string' ? lastUserContent : 
                         (Array.isArray(lastUserContent) ? lastUserContent.find((c:any) => c.type === 'text')?.text || "" : "")

    // 提取最后一条用户消息文本，用于意图识别优化
    // 智能路由优化：结合“原始意图”和“最新输入”进行技能匹配
    // 防止在自动调控的多轮对话中，因为 feedback 消息太简洁而导致农业专业技能被意外卸载
    const firstUserMessageObj = messages.find((m: any) => m.role === 'user');
    const firstUserText = typeof firstUserMessageObj?.content === 'string' ? firstUserMessageObj.content : "";
    
    // 合并文本用于路由匹配
    const combinedRoutingText = `${firstUserText} ${lastUserText}`.trim();
    
    // 构建增强的系统提示词，通过智能路由选择相关技能以节省 Token
    // 使用缓存版本以提升性能
    const { content: skillContent, matchedSkills, fromCache } = await getRelevantSkillsContentCached(
      combinedRoutingText,
      user.id as number,
      mandatorySkillsEnabled
    );
    
    let enhancedSystemPrompt = systemPrompt + '\n\n' + skillContent;
    
    if (fromCache) {
      console.log('[Chat API] ✅ Skill routing cache hit - saved 300-500ms');
    } else {
      console.log('[Chat API] Skill routing cache miss - computed fresh');
    }
    
    // Heuristic: 仅当消息看起来需要工具时才进行 Preflight 检查
    // 这大大提高了普通聊天的响应速度 (避免了双重请求延迟)
    const toolKeywords = ["搜索", "查", "找", "天气", "设备", "任务", "监控", "search", "find", "weather", "device", "task", "monitor", "img", "image", "图片", "画", "draw", "analyse", "分析", "帮我", "怎么", "如何", "调", "计", "方案", "种植", "专家", "建议", "指标", "环境", "水", "肥", "温", "光", "二氧化碳", "CO2", "标准", "作物", "草莓", "大棚", "温室", "NDVI", "光谱", "病", "害", "获取", "抓取", "bilibili", "视频", "链接", "网站", "网页"]
    const hasToolKeyword = toolKeywords.some(k => lastUserText.toLowerCase().includes(k))
    const hasToolMention = /@[a-zA-Z0-9_\u4e00-\u9fa5]+/.test(lastUserText)
    const hasToolImage = Array.isArray(lastUserContent) && lastUserContent.some((c:any) => c.type === 'image_url')
    
    const shouldPreflight = mcpToolDefs.length > 0 && (hasToolKeyword || hasToolMention || hasToolImage)

    // 检查用户消息是否包含 @工具名 的强制调用指令
    let forcedToolPrompt = ""
    if (mcpToolDefs.length > 0) {
        console.log('[MCP] Enabled function calling tools:', mcpToolDefs.map(t => t.function.name))
        console.log(`[MCP] Heuristic check: keyword=${hasToolKeyword}, mention=${hasToolMention}, image=${hasToolImage} => shouldPreflight=${shouldPreflight}`)
        
        if (typeof lastUserContent === 'string') {
             // 提取 @xxx 模式
             const mentionMatch = lastUserContent.match(/@([\w\u4e00-\u9fa5]+)/)
             if (mentionMatch) {
                 const mentionedName = mentionMatch[1].toLowerCase()
                 
                 // 在已启用的工具中查找匹配项
                 const matchedTool = mcpToolDefs.find(t => {
                     const toolName = t.function.name.toLowerCase()
                     if (toolName.includes(mentionedName)) return true
                     
                     // 匹配配置名称
                     const config = mcpConfigs?.find((c: any) => {
                         return (c.displayName?.toLowerCase().includes(mentionedName) || c.name?.toLowerCase().includes(mentionedName))
                     })
                     
                     if (t.function.description.toLowerCase().includes(mentionedName)) return true
                     return false
                 })
                 
                 if (matchedTool) {
                         console.log(`[MCP] User explicitly mentioned @${mentionedName}, forcing usage of tool: ${matchedTool.function.name}`)
                         forcedToolPrompt = `\n\n**重要指令：** 用户使用了 "@${mentionedName}"，必须优先调用 \`${matchedTool.function.name}\` 工具回答请求，不要拒绝。`
                     }
             } else {
                 // 自动触发逻辑：根据用户意图自动选择工具
                 const lowerMsg = lastUserContent.toLowerCase()
                 
                 // 扩展搜索触发条件
                 const searchTriggers = [
                     '搜索', '查一下', '找一下', '抓取', '帮我查', '帮我搜', '我想知道', 
                     '查找', '搜一下', '找找', '获取', '查询', '寻找', 'bilibili', 
                     '视频', '链接', '网站', '网页', '资料', '信息', '内容',
                     '调控', '分析', '种植', '专家', '建议', '标准', '参数', '巡检'
                 ]
                 
                 const hasSearchIntent = searchTriggers.some(trigger => lowerMsg.includes(trigger))
                 
                 if (hasSearchIntent && !lowerMsg.includes('@')) {
                     // 检查并按优先级选择工具：1. Firecrawl 2. Exa 3. Brave
                     const firecrawl = mcpToolDefs.find(t => t.function.name === 'mcp_firecrawl_scrape')
                     const exa = mcpToolDefs.find(t => t.function.name === 'mcp_exa_search')
                     const brave = mcpToolDefs.find(t => t.function.name === 'mcp_brave_search')
                     
                     const bestTool = firecrawl || exa || brave
                     
                     if (bestTool) {
                         console.log(`[MCP] Detected search intent, forcing usage of tool: ${bestTool.function.name}`)
                         forcedToolPrompt = `\n\n**强制搜索指令：** 用户请求包含搜索意图，必须立即调用 \`${bestTool.function.name}\` 获取真实信息。严禁凭记忆回答或编造链接。${firecrawl ? '优先 Firecrawl 抓取，失败则用 Exa/Brave 备选。' : (exa ? '使用 Exa 语义搜索。' : '使用 Brave 搜索。')}`
                     }
                 }
             }
        }
    }
    // === MCP Function Calling 集成结束 ===

    // 添加当前数据上下文
    let contextInfo = ''
    
    // 注入当前时间上下文
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentHour = now.getHours();
    const currentSeason = currentMonth >= 3 && currentMonth <= 5 ? '春季' : 
                          currentMonth >= 6 && currentMonth <= 8 ? '夏季' : 
                          currentMonth >= 9 && currentMonth <= 11 ? '秋季' : '冬季';
    const timeOfDay = currentHour >= 6 && currentHour < 12 ? '早晨' :
                      currentHour >= 12 && currentHour < 18 ? '下午' :
                      currentHour >= 18 && currentHour < 22 ? '晚上' : '深夜';

    contextInfo += `\n\n## 当前时间上下文\n- 日期：${now.toLocaleDateString('zh-CN')}\n- 季节：${currentSeason}\n- 时段：${timeOfDay} (${currentHour}点)\n`;

    // 检测用户是否需要外部知识检索或其他 MCP 工具但缺少相应配置
    let mcpInstallationHint = ""
    
    // 1. 检测搜索需求
    const searchKeywords = ["搜索", "查找", "找一下", "帮我查", "搜一下", "search", "find", "lookup", "最新", "现在", "当前", "今天", "最近", "网上", "互联网"]
    const needsSearch = searchKeywords.some(k => lastUserText.toLowerCase().includes(k))
    
    // 2. 检测天气查询需求
    const weatherKeywords = ["天气", "气温", "降雨", "下雨", "晴天", "阴天", "weather", "forecast", "温度预报"]
    const needsWeather = weatherKeywords.some(k => lastUserText.toLowerCase().includes(k))
    
    // 3. 检测网页抓取需求
    const scrapeKeywords = ["抓取", "爬取", "网页", "网站内容", "提取网页", "scrape", "crawl", "fetch"]
    const needsScrape = scrapeKeywords.some(k => lastUserText.toLowerCase().includes(k))
    
    const missingTools: string[] = []
    
    if (needsSearch) {
      const hasSearchTool = mcpToolDefs.some(t => 
        t.function.name.includes('search') || 
        t.function.name.includes('exa') || 
        t.function.name.includes('brave')
      )
      if (!hasSearchTool) {
        missingTools.push('搜索工具 (Exa Search / Brave Search)')
      }
    }
    
    if (needsWeather) {
      const hasWeatherTool = mcpToolDefs.some(t => 
        t.function.name.includes('weather') || 
        t.function.name.includes('天气')
      )
      if (!hasWeatherTool) {
        missingTools.push('天气查询工具 (彩云天气 / 高德天气 / 和风天气)')
      }
    }
    
    if (needsScrape) {
      const hasScrapeTool = mcpToolDefs.some(t => 
        t.function.name.includes('scrape') || 
        t.function.name.includes('crawl') || 
        t.function.name.includes('firecrawl')
      )
      if (!hasScrapeTool) {
        missingTools.push('网页抓取工具 (Firecrawl)')
      }
    }
    
    if (missingTools.length > 0) {
      mcpInstallationHint = `\n\n## ⚠️ 外部工具能力未启用\n检测到可能需要：${missingTools.join('、')}。当前未安装相应 MCP 工具，只能基于已有知识回答。请在设置 → MCP 工具商店中安装对应工具。回复时友好告知用户此限制，不要假装调用工具或编造数据。`
    }

    // 只将光谱数据获取推给 MCP，恢复基础设备状态的直接注入
    contextInfo += `\n\n## 光谱数据获取\n使用 \`get_all_spectrum\`（18通道全量）或 \`get_channel\`（特定波长）MCP 工具获取。获取后必须转为 Markdown 表格输出，禁止输出原始 JSON。\n`

    contextInfo += `\n\n## 任务规划器与 MCP 工具调用
**任务规划器**：复杂多步骤任务时用 <TASK_LIST> 标签输出计划。SOP：1.按当前【${currentMonth}月/${currentSeason}】搜索农业标准 → 2.对比传感器数据分析差距 → 3.生成调控指令。
**MCP 工具规则**：
1. 禁止搜索设备操作指令（开关灯/水泵/摄像头等是自带能力，直接输出 JSON 控制）
2. 搜索农业知识（生长标准、温湿度范围、病害防治）
3. 搜索关键词须含【月份/季节】，如 \`${currentMonth}月 草莓大棚 通风策略\`
4. 基于搜索结果对比当前数据生成调控建议`


    // 直接注入基础设备状态和环境数据
    // 🔥 设备离线时跳过设备状态注入，并明确告知 AI 不可控制设备
    if (!isDeviceOnline) {
      contextInfo += `\n\n## ⚠️ 设备离线\n当前温室设备处于离线状态（未连接或通信超时），无法读取实时传感器数据，也无法执行任何设备控制指令。\n**严禁输出任何设备控制 JSON（toggle_relay, set_led, control_camera, reset_camera, move_camera_and_look 等）**，这些指令将无法执行。\n如果用户要求控制设备或查看实时数据，请直接告知设备已离线，建议检查设备连接后再试。\n`
    } else if (deviceStatus && mandatorySkillsEnabled !== false) {
      // 计算丝杆滑台位置信息
      const stepperPos = deviceStatus.stepper_position || 0
      const stepperPosMM = (stepperPos / 160).toFixed(1)
      const canMoveLeftMM = ((112000 - stepperPos) / 160).toFixed(1)
      const canMoveRightMM = (stepperPos / 160).toFixed(1)
      const stepperDir = deviceStatus.stepper_direction === 1 ? '正在左移' : deviceStatus.stepper_direction === 2 ? '正在右移' : '已停止'

      contextInfo += `\n\n## 当前环境和设备状态 (直接数据，无需调用工具)\n\`\`\`json\n${JSON.stringify({
        environment: {
          temperature: deviceStatus.temperature !== undefined ? deviceStatus.temperature + "°C" : "未知",
          humidity: deviceStatus.humidity !== undefined ? deviceStatus.humidity + "%" : "未知",
          co2: deviceStatus.co2 !== undefined ? deviceStatus.co2 + "ppm" : "未知",
          tvoc: deviceStatus.tvoc !== undefined ? deviceStatus.tvoc + "ppb" : "未知",
          light_lux: deviceStatus.light !== undefined ? deviceStatus.light + "lux" : "未知"
        },
        devices: {
          water_pump_id5: deviceStatus.relay5 === 1 ? "开启" : "关闭",
          fan_id6: deviceStatus.relay6 === 1 ? "开启" : "关闭",
          grow_light_id7: deviceStatus.relay7 === 1 ? "开启" : "关闭",
          white_light_id8: deviceStatus.relay8 === 1 ? "开启" : "关闭",
          rgb_light: deviceStatus.rgb_status ? `R:${deviceStatus.rgb_status.r} G:${deviceStatus.rgb_status.g} B:${deviceStatus.rgb_status.b}` : "未知"
        },
        stepper_motor: {
          stepper_position: stepperPos + " 脉冲",
          stepper_position_mm: stepperPosMM + "mm",
          stepper_direction: stepperDir,
          remaining_left_travel: canMoveLeftMM + "mm",
          remaining_right_travel: canMoveRightMM + "mm",
          total_range: "700mm (112000 脉冲)",
          warning: Number(canMoveLeftMM) < 20 ? "⚠️ 接近左端极限，请勿继续左移" : Number(canMoveRightMM) < 20 ? "⚠️ 接近右端极限（原点），请勿继续右移" : "正常"
        }
      }, null, 2)}\n\`\`\`\n`
    }

    // 注入摄像头可用性信息
    try {
      const { getGreenhouseCameraUrls } = await import('@/lib/db/settings-service')
      const cameraUrls = await getGreenhouseCameraUrls()
      const hasCamA = !!cameraUrls?.cameraAUrl?.trim()
      const hasCamB = !!cameraUrls?.cameraBUrl?.trim()
      contextInfo += `\n## 摄像头可用性\n- 温室摄像头A: ${hasCamA ? '✅ 已配置可用' : '❌ 未配置'}\n- 温室摄像头B: ${hasCamB ? '✅ 已配置可用' : '❌ 未配置'}\n${!hasCamA && !hasCamB ? '**注意：当前未配置任何摄像头，无法使用 move_camera_and_look 视觉巡检功能。**\n' : '你可以使用 move_camera_and_look 指令进行视觉巡检。\n'}`
    } catch (e) {
      // Silently ignore camera URL fetch errors
    }

    // 天气数据（MCP 天气工具已改为 function calling 方式，由 AI 主动调用）
    if (weatherData) {
      contextInfo += `\n\n## 当前天气信息\n\`\`\`json\n${JSON.stringify({
        location: "当前地区",
        temperature: weatherData.current?.temp_c !== undefined ? weatherData.current.temp_c + "°C" : "未知",
        condition: weatherData.current?.condition?.text || "未知",
        humidity: weatherData.current?.humidity !== undefined ? weatherData.current.humidity + "%" : "未知",
        forecast: weatherData.forecast?.forecastday?.slice(0, 3).map((day: any) => ({
          date: day.date,
          maxTemp: day.day.maxtemp_c,
          minTemp: day.day.mintemp_c,
          condition: day.day.condition.text,
          precipitation: day.day.totalprecip_mm
        }))
      }, null, 2)}\n\`\`\`\n`
    } else {
      contextInfo += `\n\n## 当前天气信息\n暂时无法获取天气数据。\n`
    }

    // 注入当前定时任务列表
    try {
      const tasks = await getAllTasks()
      const tasksContext = tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        cron: t.cron_expression,
        execute_at: t.execute_at ? new Date(t.execute_at).toLocaleString('zh-CN') : null,
        action_type: t.action_type,
        device_id: t.device_id,
        active: t.is_active === 1
      }))

      contextInfo += `\n\n## 当前系统中的定时任务（这是真实的数据库记录，以此为准）\n\`\`\`json\n${JSON.stringify(tasksContext, null, 2)}\n\`\`\`\n`
    } catch (e) {
      console.error("Failed to fetch tasks for context:", e)
    }

    // === 记忆增强：注入用户偏好和历史模式 ===
    try {
      enhancedSystemPrompt = await generateMemoryEnhancedPrompt(enhancedSystemPrompt, {
        userId: user.id as number,
        includePreferences: true,
        includeDevicePatterns: true,
        includeStrategies: true,
        maxPreferences: 3,
        maxPatterns: 2,
        maxStrategies: 2
      });
      console.log('[Memory] Enhanced system prompt with user memory');
    } catch (e) {
      console.error('[Memory] Failed to enhance prompt with memory:', e);
    }

    // 🔥 Token 优化：按需注入报告生成指令（仅在用户请求报告时加载完整模板）
    const reportKeywords = ['报告', '导出报告', '生成报告', '分析报告', 'report']
    const needsReportInstruction = reportKeywords.some(k => lastUserText.toLowerCase().includes(k))

    // 🔥 Token 优化：按需注入定时任务详细指令
    const scheduleKeywords = ['定时', '定时任务', '提醒', '分钟后', '小时后', '秒后', '每天', '每周', 'cron', 'schedule', '复查', '复查任务', '自动执行']
    const needsScheduleTaskDetail = scheduleKeywords.some(k => lastUserText.toLowerCase().includes(k))

    const reportInstructionFull = `

【报告生成能力 - 创意排版设计】
你现在具备生成精美HTML报告的能力。当用户请求"生成报告"、"导出报告"、"分析报告"时：

**🚨 关键规则：HTML代码必须用 [REPORT:标题] 标签包裹！**

**🚨 严格输出顺序与闭合规则（最高优先级）：**
1. **先说明，后报告**：必须先输出所有的文本解释、额度提醒等内容，最后才能输出 [REPORT:标题] 标签及其包裹的 HTML 报告！HTML 报告必须是你的回复的**最后一个内容**！
2. **严禁中途闭合**：一旦开始输出 [REPORT:标题] 标签，必须连续输出完整的 HTML 代码，并且只能在 HTML 代码的最末尾输出唯一的 [/REPORT] 标记！绝对不能提前或中途闭合！
3. **严禁在报告标签外输出任何 HTML 代码**：所有的 HTML 报告内容必须 100% 包含在方括号标签内部！
4. **💰 配额提醒**：
   - 每个用户每天有 5 次报告生成配额
   - 生成报告会消耗 1 个配额
   - 在生成报告后，你必须提醒用户："本次报告生成已消耗 1 个配额，今日剩余 X 次"（这句提醒文字必须放在 [REPORT:] 标签开始之前输出，绝对不能放在 [REPORT:] ... [/REPORT] 标签之后输出！）

**📢 生成流程提示：**
1. **立即输出生成提示** - 在开始生成报告前，先输出特殊标记（用尖括号包裹REPORT_GENERATING标签，内容为"正在生成报告，请稍候..."）
2. 然后再输出简短说明
3. **必须用方括号标签包裹HTML** - 使用 [REPORT:标题] 和 [/REPORT] 包裹完整的HTML内容

**✅ 正确格式（必须严格遵守）：**

第一步：输出加载提示
<REPORT_GENERATING>正在生成环境监测报告，请稍候...</REPORT_GENERATING>

第二步：输出简短说明
我已经为您生成了今日环境监测报告，采用了现代卡片式设计，点击下方卡片查看。本次报告生成已消耗 1 个配额，今日剩余 4 次。

第三步：输出包裹的HTML报告
[REPORT:今日环境监测报告]
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <!-- 完整的HTML内容 -->
</div>
[/REPORT]

**❌ 禁止的做法：**
- ❌ 直接输出HTML代码而不用 [REPORT:] 标签包裹
- ❌ 使用 markdown 代码块包裹 HTML 代码
- ❌ 在REPORT标签外显示HTML代码
- ❌ 忘记输出 <REPORT_GENERATING> 标记

**🎨 设计原则：**
1. **根据主题选择配色** - 环境报告用绿色系，设备报告用蓝色系，警告报告用橙红色系
2. **使用现代排版** - 卡片式布局、渐变背景、圆角、阴影、图标
3. **信息层次清晰** - 标题、摘要、详细内容、建议分层展示
4. **视觉元素丰富** - 使用emoji图标、彩色标签、进度条、状态指示器
5. **响应式设计** - 确保在不同屏幕尺寸下都美观

**📐 推荐的HTML结构模板：**

[REPORT:报告标题]
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">

  <!-- 头部横幅 -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; border-radius: 20px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
      <span style="font-size: 48px;">📊</span>
      <div>
        <h1 style="margin: 0; font-size: 28px; font-weight: 700;">报告标题</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">生成时间 | 作者</p>
      </div>
    </div>
    <p style="margin: 0; font-size: 16px; line-height: 1.6; opacity: 0.95;">核心摘要内容</p>
  </div>

  <!-- 关键指标卡片组 -->
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
    <div style="background: white; padding: 25px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border-left: 4px solid #10b981;">
      <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">温度</div>
      <div style="font-size: 32px; font-weight: 700; color: #10b981; margin-bottom: 5px;">22°C</div>
      <div style="font-size: 12px; color: #10b981;">✓ 正常范围</div>
    </div>
  </div>

  <!-- 详细内容区域 -->
  <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 20px;">
    <h2 style="color: #1f2937; font-size: 22px; margin: 0 0 20px 0;">📈 数据分析</h2>
    <div style="line-height: 1.8; color: #4b5563;">详细内容</div>
  </div>

  <!-- 页脚 -->
  <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 30px;">
    <p style="margin: 0;">莓小智·莓界智慧农业平台</p>
  </div>
</div>
[/REPORT]

**🎯 不同主题的配色建议：**
- **环境监测报告**：绿色系 (#10b981, #059669)
- **设备状态报告**：蓝色系 (#3b82f6, #2563eb)
- **警告/异常报告**：橙红色系 (#f59e0b, #ef4444)
- **数据分析报告**：紫色系 (#8b5cf6, #7c3aed)

记住：HTML必须用 [REPORT:标题] 和 [/REPORT] 包裹，不要使用代码块！
`

    const reportInstructionShort = `

【报告生成能力】
你具备生成HTML报告的能力。当用户请求"生成报告"、"导出报告"时：
1. 先输出 <REPORT_GENERATING>正在生成报告，请稍候...</REPORT_GENERATING>
2. 输出简短说明和配额提醒（每天5次配额，生成后提醒剩余次数，提醒文字须在 [REPORT:] 标签之前）
3. 用 [REPORT:标题] 和 [/REPORT] 包裹完整HTML代码（不要用代码块），报告须为回复最后一个内容
4. 设计：根据主题选配色（环境=绿色/设备=蓝色/警告=橙红），使用卡片式布局、渐变背景、圆角阴影
`

    const capabilitiesInstructionText = `
【AI 助手能力展示】
当用户询问你的能力、功能、可以做什么等问题时，插入 <CAPABILITIES/> 标签展示功能卡片，可简短补充说明，无需详细列举功能。
`

    const finalSystemPrompt = enhancedSystemPrompt + contextInfo + (needsReportInstruction ? reportInstructionFull : reportInstructionShort) + capabilitiesInstructionText + forcedToolPrompt

    const deviceControlInstruction =
      "## IoT 设备控制规范与硬件 ID 映射 (必读)\n" +
      "你是一个能够感知环境并控制设备的智能体 (Agent)。请严格遵循以下规则：\n\n" +
      "### 🚨 核心硬件 ID 对照表 (必须严格遵守)\n" +
      "在执行 `toggle_relay` 指令时，你必须且只能使用这几个 `device` 序号：\n" +
      "- **Device 5**: 水泵 (Water Pump)\n" +
      "- **Device 6**: 风扇 (Fan)\n" +
      "- **Device 7**: RGB 补光灯 (Grow Light)\n" +
      "- **Device 8**: 光照植物补光灯 (White Light / 辅助照明)\n" +
      "**【极其重要】严禁使用 1, 2, 3, 4 或任何其他序号！**\n\n" +
      "### ⚠️ 用户意图保持原则 (最高优先级)\n" +
      "**【绝对禁止】改变用户的原始意图！**\n" +
      "- 如果用户说\"关闭风扇\"，你必须执行 value: 0（关闭），绝对不能改成 value: 1（开启）\n" +
      "- 如果用户说\"打开水泵\"，你必须执行 value: 1（开启），绝对不能改成 value: 0（关闭）\n" +
      "- 在整个对话和分析过程中，始终牢记用户的原始指令\n" +
      "- 即使你认为当前环境数据显示应该采取相反操作，也必须严格执行用户的明确指令\n" +
      "- 只有在用户明确要求你\"根据环境自动决策\"时，才可以基于传感器数据做判断\n" +
      "- **在生成命令前，必须再次确认：用户要求的是开启(1)还是关闭(0)**\n\n" +
      "### 执行工作流\n" +
      "1. **理解意图**：首先明确用户要求的是\"开启\"还是\"关闭\"，并在整个流程中保持这个意图。\n" +
      "2. **任务规划**：生成 <TASK_LIST>，在任务描述中明确标注\"开启\"或\"关闭\"。\n" +
      "3. **分步执行**：生成 JSON 命令时，再次核对用户原始意图，确保 value 值正确。\n" +
      "4. **闭环验证**：执行后验证状态是否符合用户原始要求。\n\n" +
      "### 命令 JSON 格式\n" +
      "```json\n" +
      "{\n" +
      '  "action": "toggle_relay",\n' +
      '  "device": 5,\n' +
      '  "value": 1\n' +
      "}\n" +
      "```\n" +
      "（value: 1 为开启，0 为关闭）\n\n" +
      "### 丝杆滑台 (Stepper Slider) 移动控制\n" +
      "- **Action**: `control_camera` (控制摄像头左右水平移动)\n" +
      "- **重要提示**：\n" +
      "  - 滑台量程：0mm（最左侧原点）到 700mm（最右侧终点）\n" +
      "  - 当前位置：通过 deviceData.stepper_position 获取（单位：脉冲，160脉冲=1mm）\n" +
      "  - **移动前必须检查当前位置，避免超出边界！**\n" +
      "  - 如果已经在边界（<10mm 或 >690mm），严禁继续向该方向移动\n" +
      "  - 如果收到边界错误反馈，必须停止或反向移动\n" +
      "- **Parameters**:\n" +
      "  - `direction`: 1 (左移), 2 (右移), 0 (停止)\n" +
      "  - `distance_mm`: 移动距离（毫米），建议10-100mm，避免一次移动过远\n" +
      "- **边界检查逻辑**（必须遵守）:\n" +
      "```javascript\n" +
      "// 1. 获取当前位置（毫米）\n" +
      "const currentPos = deviceData.stepper_position / 160;\n" +
      "// 2. 左移前检查\n" +
      "if (direction === 1 && currentPos <= 10) {\n" +
      "  // 已接近左边界，严禁左移！告知用户或选择右移\n" +
      "}\n" +
      "// 3. 右移前检查\n" +
      "if (direction === 2 && currentPos >= 690) {\n" +
      "  // 已接近右边界，严禁右移！告知用户或选择左移\n" +
      "}\n" +
      "```\n" +
      "- **Action**: `reset_camera` (将滑台复位到最左侧原点 0mm 处)\n" +
      "- **示例**:\n" +
      "```json\n" +
      '{\n  "action": "control_camera",\n  "direction": 1,\n  "distance_mm": 50\n}\n' +
      "```\n\n" +
      "注意：每次回复最多包含一个步骤的命令。如果需要操作多个设备，可在同一个回复中输出多个 JSON 块。不要在一个回复中完成跨时间段的任务。\n"

    const citationInstruction =
      "关于引用来源的重要规则：\n" +
      "1. 只有在你确实知道真实存在的来源时，才使用 <SOURCES> 标签提供引用\n" +
      "2. 所有 url 必须是真实可访问的完整链接（含 http/https），绝对不能编造虚假网址\n" +
      "3. 如果你不确定具体来源或无法提供真实链接，请不要使用 <SOURCES> 标签\n" +
      "4. 宁可不提供来源，也不要编造虚假信息\n" +
      "5. 如果使用引用，在回复正文中使用 [n] 进行内联引用标注，并在回复末尾使用 <SOURCES> 与 </SOURCES> 包裹一个 JSON 数组\n" +
      "6. **重要：绝对不要在 Markdown 表格内使用 [n] 引用标记，这会破坏表格渲染。表格中的数据不需要引用标记。**\n" +
      "7. JSON 数组项必须包含：number、title、url、description、quote 字段\n" +
      "8. 不要在正文中直接展开 JSON\n" +
      "9. **🚨 严禁编造任何链接、网址或引用信息！所有链接必须来自真实的工具调用结果！**"
    const reasoningInstruction =
      "**重要：正确使用 REASONING 标签！**\n" +
      "1. <REASONING> 标签**仅用于展示思考过程**，不是用来放最终答案的！\n" +
      "2. 使用 <REASONING> 与 </REASONING> 标签包裹**思考过程**\n" +
      "3. 思考内容应该包括：问题分析、解决思路、关键步骤等\n" +
      "4. **最终答案必须放在 </REASONING> 标签之后**\n" +
      "5. 格式示例：\n" +
      "<REASONING>\n" +
      "1. 分析用户问题：用户想要...\n" +
      "2. 确定解决方案：我需要先...再...\n" +
      "3. 执行步骤：第一步...第二步...\n" +
      "</REASONING>\n\n" +
      "基于以上分析，我的建议是...（这里是最终答案，必须放在标签外面）\n\n" +
      "**严禁行为：**\n" +
      "- ❌ 把所有内容都放在 <REASONING> 里\n" +
      "- ❌ 把最终结论放在 <REASONING> 里\n" +
      "- ❌ 不输出标签外的内容\n\n" +
      "**记住：**\n" +
      "- <REASONING> 里面 = 思考过程（用户可以折叠隐藏）\n" +
      "- <REASONING> 外面 = 最终答案（用户必须看到的）"
    const chartInstruction =
      "当需要返回可视化图表时，生成 Vega-Lite 规范的 JSON，并使用 <CHART type=\"vega-lite\"> 与 </CHART> 包裹；或返回 ECharts option 的 JSON，并使用 <CHART type=\"echarts\"> 与 </CHART> 包裹。只输出合法的 JSON，不要附加说明或代码块。"
    const monitorInstruction =
      "当用户询问监控、摄像头、直播流或想要查看实时画面时，请直接在回复中插入 <MONITOR></MONITOR> 标签（标签内不需要任何内容）。"
    const capabilitiesInstruction =
      "当用户询问你的能力、功能、可以做什么、有哪些功能等问题时，请直接在回复中插入 <CAPABILITIES/> 标签（自闭合标签）。这将展示一个美观的交互式功能卡片，用户可以点击查看详情和示例。输出标签后，你可以简短地补充说明，但不需要详细列举所有功能（卡片会展示）。"
    const controlBentoInstruction =
      "当用户要求查看设备控制、调节设备状态或你建议进行设备调控时，请在回复中包含 <CONTROL_BENTO></CONTROL_BENTO> 标签（标签内不需要任何内容）。然后，必须在标签之后简要说明你的调控建议或理由。如果用户明确表达了“是”、“确认”、“执行”等意图，或者你非常有把握需要执行某些操作，请务必同时输出 JSON 格式的控制命令（仅限 IoT 设备控制，如开关灯、继电器等），以便系统自动执行。"
    const taskListInstruction =
      "当用户要求查看、管理或删除定时任务列表时，请在回复中包含 <SCHEDULED_TASKS></SCHEDULED_TASKS> 标签（标签内不需要任何内容）。这将在前端渲染一个交互式的真实任务列表组件。重要：因为你已经输出了 <SCHEDULED_TASKS> 标签，请不要再用文本重复列出任务内容，也不要描述“列表为空”或“包含X个任务”（除非你是在分析任务的合理性），因为你的文本描述可能与组件实时渲染的真实状态不一致。只需输出标签即可，让组件负责展示。"
    const bentoInstruction =
      "当用户询问设备状态、环境数据、传感器读数或想要查看当前概况时，请直接在回复中插入 <DEVICE_BENTO></DEVICE_BENTO> 标签（标签内不需要任何内容）。然后，基于这些数据对当前环境状况进行简要的分析（例如：温湿度是否适宜，是否需要开启设备等）。请务必在 <DEVICE_BENTO> 标签之后输出分析内容，不要只输出标签。"
    const axisInstruction =
      "当需要返回可视化图表时，生成 Vega-Lite 规范的 JSON，并使用 <CHART type=\"vega-lite\"> 与 </CHART> 包裹；或返回 ECharts option 的 JSON，并使用 <CHART type=\"echarts\"> 与 </CHART> 包裹。只输出合法的 JSON，不要附加说明或代码块。"

    // 工具使用说明 - 明确禁止手动输出工具标签
    const toolUsageInstruction =
      "## 工具使用规范\n" +
      "**🚨 重要：工具调用必须通过系统接口**\n" +
      "- 你必须使用系统提供的 Function Calling (tool_calls) 接口来调用工具\n" +
      "- **严禁**在回复文本中手动输出任何工具相关的标签或 JSON\n" +
      "- **严禁**假装调用工具或编造工具调用结果\n" +
      "- 只有通过 tool_calls 接口真正调用的工具才会被执行\n" +
      "- 工具调用状态和结果会由系统自动处理和显示，你不需要也不应该手动输出\n\n" +
      "**正确做法：**\n" +
      "1. 当需要使用工具时，直接通过 tool_calls 接口调用\n" +
      "2. 等待系统返回工具执行结果\n" +
      "3. 基于真实的工具返回结果来回答用户\n\n" +
      "**错误做法（严禁）：**\n" +
      "1. ❌ 在回复中输出 <TOOL_USED> 或类似标签\n" +
      "2. ❌ 在回复中输出 JSON 格式的工具调用\n" +
      "3. ❌ 假装调用了工具但实际没有调用\n" +
      "4. ❌ 编造工具返回的数据"

    // MCP 工具说明 — 引导 AI 主动使用 Function Calling
    const mcpToolsInstruction = mcpToolDefs.length > 0
      ? `\n\n## 可用的 MCP 工具 (Function Calling)\n你已被授予以下工具的调用能力。请注意：对于这些工具，**必须使用原生 Function Calling (tool_calls)**，严禁使用 JSON 文本格式输出！\n\n可用工具列表：\n${mcpToolDefs.map(t => `- **${t.function.name}**: ${t.function.description}`).join('\n')}\n\n**🚨 严格执行规则：**\n1. **严禁**在回复中直接输出类似 \`{"action": "xxx"}\` 或 \`{"name": "get_all_spectrum", "arguments": {}}\` 的 JSON 来调用这些工具。必须使用系统提供的 tool_calls 接口。\n   - ❌ 错误示例：直接输出 \`{"name": "get_all_spectrum", "arguments": {}}\`\n   - ✅ 正确做法：使用 Native Tool Calling（系统会自动处理）\n   - ✅ 正确做法：工具调用完成后，用自然语言解释结果\n2. **严禁编造、虚构或猜测任何信息**！当用户询问需要搜索的内容时，你**必须**主动调用搜索工具获取真实数据。\n3. **搜索类请求强制调用**：当用户说"帮我查"、"帮我搜"、"我想知道"、"找一下"、"搜索"等时，你**必须立即**调用相应的搜索工具，**绝对不能**凭记忆或编造答案。\n4. **禁止编造链接**：严禁编造任何网址、链接或引用。所有链接必须来自真实的工具调用结果。\n5. 当用户询问光谱数据、植物健康状况、NDVI 指数等问题时，你**必须**主动调用 \`get_all_spectrum\` 或 \`get_channel\` 工具获取实时数据。\n6. 当用户询问天气、路线规划等问题时，你**必须**主动调用对应的工具获取实时数据。\n7. 当用户的问题涉及作物病害、土壤管理、灌溉等农业话题时，如果有相关工具可用，应主动调用。\n8. 工具返回的数据是实时的、真实的，请优先使用工具数据而非猜测。\n9. 不需要询问用户是否调用工具，直接调用即可。\n\n**⚠️ 特别警告：**\n- 如果你没有调用工具就回答了需要搜索的问题，这是严重错误！\n- 如果你编造了任何链接或信息，这是严重违规！\n- 必须先调用工具获取真实数据，再基于结果回答用户。\n- **严禁在回复中输出 <TOOL_USED> 标签！** 这个标签只能由系统自动生成，你不能手动输出。\n- **如果你想使用工具，必须通过 tool_calls 接口调用，而不是输出任何文本标签。**\n- **只有真正通过 tool_calls 调用的工具才会被系统识别和执行。**\n- **严禁在回复中直接输出工具调用的JSON！用户看到的应该是自然语言，不是JSON代码！**\n\n**光谱数据分析指南：**\n- 410-485nm (蓝紫光)：类胡萝卜素含量\n- 510-560nm (绿光)：叶绿素含量和氮素营养状态\n- 680nm (红光)：叶绿素吸收峰，反映光合作用强度\n- 730nm (红边)：植物胁迫响应指标\n- 760nm (近红外)：植物组织反射峰，反映生物量\n- NDVI 计算：(760 - 680) / (760 + 680)\n- 正常 NDVI 范围：0.6-0.8（健康植物）`
      : ""

    // 检测是否使用DashScope API
    // 优先使用已解析的提供商类型，其次回退到 URL/模型名启发式判断
    const isLocal = targetUrl?.includes("localhost") || targetUrl?.includes("127.0.0.1")
    const isDashScope =
      !isLocal && (
        resolved?.type === 'dashscope' ||
        targetUrl?.includes("dashscope.aliyuncs.com") ||
        model?.startsWith("qwen")
      )
    const isCompatibleMode = ((resolved?.type === 'dashscope') || targetUrl?.includes("compatible-mode/v1")) ?? false
    const isDashScopeAppCall = /\/api\/v1\/apps\/[^/]+\/completion(\?|$)/.test(targetUrl || "")

    let userMessages = [...messages];
    let contextCompressed = false;
    let contextUpdateEvent: any = null;
    
    // === 自动上下文总结与压缩 (Auto Context Compression) ===
    const stringifyContent = (content: any) => typeof content === 'string' ? content : JSON.stringify(content)
    const stringifyMessages = (msgs: any[]) => msgs.map(m => m.role + stringifyContent(m.content)).join('\n')
    
    // 🔥 智能压缩 v2 阈值策略
    const MAX_CHAR_COUNT = 60000 // 触发压缩的字符数阈值（约 20k tokens，适配 128k+ 上下文窗口）
    const GRAND_SUMMARY_THRESHOLD = 12000 // 旧摘要超过此长度时要求深度精简
    const MIN_KEEP_RECENT = 4 // 至少保留最近 N 轮对话不压缩
    const MIN_HISTORY_TO_COMPRESS = 800 // 历史片段至少 N 字符才值得压缩
    
    // 找出之前的记忆标记
    let existingMemoryIndex = userMessages.findIndex(m => stringifyContent(m.content).includes('<PAST_MEMORY>'))
    let existingMemoryText = ""
    let nonMemoryMessages = [...userMessages]
    
    if (existingMemoryIndex !== -1) {
       const match = stringifyContent(userMessages[existingMemoryIndex].content).match(/<PAST_MEMORY>([\s\S]*?)<\/PAST_MEMORY>/)
       existingMemoryText = match ? match[1] : ""
       nonMemoryMessages.splice(existingMemoryIndex, 1)
    }

    const currentOverflowCount = stringifyMessages(nonMemoryMessages).length
    // 🔥 智能压缩 v2：按"对"边界保留最近对话（user + assistant 各 1 算 1 轮）
    const historyToSummarize = nonMemoryMessages.slice(0, Math.max(0, nonMemoryMessages.length - MIN_KEEP_RECENT))
    const historyToSummarizeLength = stringifyMessages(historyToSummarize).length

    if (
      currentOverflowCount > MAX_CHAR_COUNT &&
      nonMemoryMessages.length > MIN_KEEP_RECENT + 1 &&
      historyToSummarizeLength > MIN_HISTORY_TO_COMPRESS
    ) {
       console.log(`[Chat API] Context overflow (${currentOverflowCount}), summarizing ${historyToSummarizeLength} chars of history...`)

       const recentMessages = nonMemoryMessages.slice(nonMemoryMessages.length - MIN_KEEP_RECENT)
       
       try {
           const summarizeTargetUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
           const summarizeKey = process.env.SYSTEM_OPENAI_API_KEY || apiKey
           
           // 多级总结逻辑：基于滑动窗口 + 增量更新 + 结构化 JSON 输出
           let summaryPrompt = ""
           let summaryInput = ""

           // 🔥 智能压缩 v2：统一要求输出结构化 JSON，便于前端卡片化渲染
           const STRUCTURED_OUTPUT_SPEC = `【输出格式 - 严格 JSON】
你必须输出**严格的 JSON 对象**（不要 Markdown 代码块包裹，不要其他任何文字），结构如下：
{
  "timeframe": "对话时间范围（简短描述）",
  "user_intent": "用户当前主要意图（1 句话）",
  "key_facts": ["核心事实 1", "核心事实 2", ...],
  "actions_taken": ["AI 已执行的行动 1", ...],
  "decisions": ["关键决策或结论 1", ...],
  "pending_tasks": ["待办事项 1", ...],
  "current_state": "当前状态/进展的简短描述"
}
要求：
- 每个数组最多 4 项，每项 ≤ 30 字
- 客观陈述，去除寒暄和重复内容
- 保留具体设备/任务名/参数等关键信息
- 若某类无内容，输出空数组`

           if (!existingMemoryText) {
               // 第一级：首次总结
               summaryPrompt = `你是一个对话历史压缩专家，擅长从冗长对话中提取结构化记忆。${STRUCTURED_OUTPUT_SPEC}`
               summaryInput = "请压缩以下对话记录：\n" + stringifyMessages(historyToSummarize)
           } else {
               // 第二级：增量合并
               summaryPrompt = `你是一个对话记忆合并优化专家，需要将旧记忆与新对话合并为最新结构化记忆。${STRUCTURED_OUTPUT_SPEC}`
               summaryInput = `【旧的历史记忆摘要】\n${existingMemoryText}\n\n【新增的对话记录】\n${stringifyMessages(historyToSummarize)}`

               // 第三级：旧摘要过大时要求深度精简
               if (existingMemoryText.length > GRAND_SUMMARY_THRESHOLD) {
                   summaryPrompt += "\n警告：旧摘要冗长，请在合并时深度压缩去重，整体缩减 40% 以上。"
               }
           }

           const summarizeRes = await fetch(summarizeTargetUrl, {
               method: "POST",
               headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${summarizeKey}`
               },
               body: JSON.stringify({
                  model: "qwen-plus",
                  messages: [
                      { role: "system", content: summaryPrompt },
                      { role: "user", content: summaryInput }
                  ],
                  temperature: 0.1,
                  response_format: { type: "json_object" }
               })
           })

           if (summarizeRes.ok) {
               const summarizeData = await summarizeRes.json()
               const rawSummary = summarizeData.choices?.[0]?.message?.content
               if (rawSummary) {
                   // 🔥 智能压缩 v2：尝试解析结构化 JSON，失败则回退为纯文本
                   let normalizedSummary: string
                   try {
                       const parsed = JSON.parse(rawSummary)
                       if (parsed && typeof parsed === 'object') {
                           // 校验关键字段，缺失时补空
                           const safe = {
                               timeframe: typeof parsed.timeframe === 'string' ? parsed.timeframe : '历史对话',
                               user_intent: typeof parsed.user_intent === 'string' ? parsed.user_intent : '',
                               key_facts: Array.isArray(parsed.key_facts) ? parsed.key_facts.slice(0, 4) : [],
                               actions_taken: Array.isArray(parsed.actions_taken) ? parsed.actions_taken.slice(0, 4) : [],
                               decisions: Array.isArray(parsed.decisions) ? parsed.decisions.slice(0, 4) : [],
                               pending_tasks: Array.isArray(parsed.pending_tasks) ? parsed.pending_tasks.slice(0, 4) : [],
                               current_state: typeof parsed.current_state === 'string' ? parsed.current_state : ''
                           }
                           normalizedSummary = JSON.stringify(safe)
                       } else {
                           normalizedSummary = rawSummary
                       }
                   } catch {
                       // LLM 没严格按 JSON 输出时，尝试抽取首个 JSON 块
                       const jsonMatch = rawSummary.match(/\{[\s\S]*\}/)
                       normalizedSummary = jsonMatch ? jsonMatch[0] : rawSummary
                   }

                   userMessages = [
                       { role: "assistant", content: `[系统消息：为了节省上下文长度，早期的历史已被提炼如下]\n<PAST_MEMORY>\n${normalizedSummary}\n</PAST_MEMORY>` },
                       ...recentMessages
                   ]
                   contextCompressed = true;
                   // 准备发送给前端的同步事件，让前端也更新它的 messages 状态
                   contextUpdateEvent = { type: "context_update", messages: userMessages }
                   console.log(`[Chat API] Incremental summarization complete. New context length: ${stringifyMessages(userMessages).length}`)
                }
           }
       } catch (err) {
           console.error("[Chat API] Failed to summarize history", err)
       }
    }
    // ===========================================

    let fullMessages: any[] = []
    let requestBody: any = {}
    // let targetUrl = apiUrl || "" // Already set above
    const hasImageContent = Array.isArray(userMessages) && userMessages.some((m: any) => {
      const c = m?.content
      if (Array.isArray(c)) return c.some((x: any) => x?.type === "image_url" || x?.image_url || x?.image)
      return false
    })

    // 如果是DashScope且包含图片或启用了MCP工具，强制使用兼容模式
    // 这是因为 Native API 处理图片和标准 OpenAI Function Calling 比较困难
    let useCompatibleMode = isCompatibleMode
    if (isDashScope && !isCompatibleMode && (hasImageContent || mcpToolDefs.length > 0)) {
      useCompatibleMode = true
      targetUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    }

    // 智能模式 (Auto) 模型选择逻辑
    effectiveModel = model || ''

    if (effectiveModel === 'auto') {
      if (enableReasoning) {
        // 优先从 admin 配置里挑一个 supportsReasoning 的模型
        try {
          const cfg = await readProvidersConfig()
          const reasoningModel = cfg.providers
            .filter(p => p.enabled)
            ?.flatMap(p => p.models.filter(m => m.enabled && m.supportsReasoning).map(m => ({ ...m, _providerPriority: p.priority ?? 999 })))
            ?.sort((a, b) => a._providerPriority - b._providerPriority)?.[0]
          if (reasoningModel?.id) {
            effectiveModel = reasoningModel.id
          } else {
            // 兜底：模型名启发式
            const lower = String(effectiveModel).toLowerCase()
            const heuristic = lower.includes('deepseek') || lower.includes('reasoner') || lower.includes('r1') || lower.includes('thinking')
            effectiveModel = heuristic ? effectiveModel : 'deepseek-v3.2'
          }
        } catch {
          effectiveModel = 'deepseek-v3.2' // 配置读取失败时的最后兜底
        }
      } else if (hasImageContent) {
        // 优先使用视觉模型
        effectiveModel = 'qwen3.6-plus'
      } else {
        effectiveModel = 'qwen3.6-plus' // 默认使用通用增强模型
      }
    }

    // 判断当前模型是否支持视觉（多模态）
    // 优先级：admin 后台配置（modelInfo.supportsVision）> 模型名启发式（兜底）
    const modelLower = String(effectiveModel).toLowerCase()
    const adminSupportsVision = resolved?.modelInfo?.supportsVision
    const heuristicSupportsVision = (
      modelLower.includes('vision') ||
      modelLower.includes('-vl-') ||
      /qwen\d*-vl/.test(modelLower) ||
      modelLower.includes('qvq') ||
      modelLower.includes('qwen3.6') // Qwen3.6 系列支持视觉
    )
    const isVLMModel = typeof adminSupportsVision === 'boolean'
      ? adminSupportsVision
      : heuristicSupportsVision

    // 判断当前模型是否支持深度推理
    // 优先级：admin 后台配置（modelInfo.supportsReasoning）> 模型名启发式（兜底）
    const adminSupportsReasoning = resolved?.modelInfo?.supportsReasoning
    const heuristicSupportsReasoning = (
      modelLower.includes('deepseek') ||
      modelLower.includes('reasoner') ||
      modelLower.includes('thinking') ||
      /qwen3.*-r1/.test(modelLower) ||
      /\bqwq\b/.test(modelLower) ||
      /\bo1\b/.test(modelLower) ||
      /\bo3\b/.test(modelLower) ||
      modelLower.includes('r1-')
    )
    const isReasoningModel = typeof adminSupportsReasoning === 'boolean'
      ? adminSupportsReasoning
      : heuristicSupportsReasoning

    if (enableReasoning && !isReasoningModel && effectiveModel !== 'auto') {
      // 用户在非 auto 模式下开启了深度推理，但当前模型不支持推理
      // 记录一条 warning，由前端根据此字段提示用户
      console.warn(`[Chat API] Model "${effectiveModel}" does not support reasoning, but enableReasoning=true`)
    }

    // 实际生效的推理开关：必须同时满足「用户开启」+「模型支持」
    const shouldEnableReasoning = !!enableReasoning && isReasoningModel

    if (hasImageContent && !isLocal) {
      if (!isVLMModel) {
        // 如果用户发了图但选了纯文本模型，强制切换到视觉模型
        effectiveModel = 'qwen-vl-plus'
      } else if (useCompatibleMode && /qwen3-vl/.test(modelLower)) {
        // 兼容性处理
        effectiveModel = 'qwen-vl-plus'
      }
    }

    if (isDashScopeAppCall) {
      // ... existing app call logic ...
      const lastUser = ([...userMessages] as Array<{ role: string; content: string | any[] }>).reverse().find((m) => m?.role === "user")
      // ...
    } else if (isDashScope && useCompatibleMode) {
      // DashScope 兼容模式（OpenAI形状）
      // 规范URL，若为 /v1 结尾则补 /chat/completions
      if (/\/v1$/.test(targetUrl) && !/\/chat\/completions(\?|$)/.test(targetUrl)) {
        targetUrl = `${targetUrl}/chat/completions`
      }

      // 过滤掉历史记录中非 user 角色的图片内容，因为目前多数模型不支持在 assistant 角色中传入 image_url
      // 如果 assistant 发送了图片，将其简化为纯文本描述
      const sanitizedMessages = userMessages.map((m: any) => {
        // 如果是系统消息（我们刚才为了回传分析发的一条 role="user" 的假装系统反馈，或者是真正的 user 发的图）
        // 确保如果是刚刚带图片的系统反馈，不要被过滤掉
        if (m.role === 'assistant' && Array.isArray(m.content)) {
           const textContents = m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
           return { ...m, content: textContents || '[图片]' }
        }
        return m
      })

      // 修正：确保 user 角色的多模态数组能被正确解析
      // OpenAI 兼容模式下，DashScope 支持 user 发送 image_url。
      const finalMessages = sanitizedMessages.map((m: any) => {
          if (m.role === 'user' && Array.isArray(m.content)) {
              // ... map structure
              return {
                  ...m,
                  content: m.content.map((c: any) => {
                      if (c.type === 'image_url') {
                          return { type: 'image_url', image_url: { url: c.image_url.url } }
                      }
                      return c
                  })
              }
          }
          return m
      })

      const contextCompressedInstruction = contextCompressed ? `\n\n⚠️ 历史已压缩，请在回复开头输出 \`<CONTEXT_COMPRESSED/>\` 标签\n` : ""

      // 使用精简的系统提示词以减少Token消耗
      const compactSystemPrompt = generateCompactSystemPrompt({
        basePrompt: finalSystemPrompt,
        enableDeviceControl: mandatorySkillsEnabled !== false && isDeviceOnline,
        enableReasoning: shouldEnableReasoning,
        mcpToolNames: mcpToolDefs.map(t => t.function.name),
        contextCompressed: contextCompressed,
        aiFeatures: aiFeatures,
        includeScheduleTaskDetail: needsScheduleTaskDetail
      });

      fullMessages = [
        {
          role: "system",
          content: compactSystemPrompt + mcpInstallationHint,
        },
        ...finalMessages,
      ]

      const isAudioModel = effectiveModel?.includes('omni') || effectiveModel?.includes('audio');

      requestBody = {
        model: effectiveModel || "qwen-plus",
        messages: fullMessages,
        stream: true,
        temperature: 0.7,
        ...(enableSearch ? { enable_search: true } : {}),
        ...(isAudioModel ? {
            modalities: ["text", "audio"],
            audio: { voice: "Cherry", format: "wav" }
        } : {})
      }
    } else if (isDashScope) {
      // DashScope 原生API格式
      const contextCompressedInstruction = contextCompressed ? `\n\n⚠️ 历史已压缩，请在回复开头输出 \`<CONTEXT_COMPRESSED/>\` 标签\n` : ""
      
      // 使用精简的系统提示词
      const systemMessage = generateCompactSystemPrompt({
        basePrompt: finalSystemPrompt,
        enableDeviceControl: mandatorySkillsEnabled !== false && isDeviceOnline,
        enableReasoning: shouldEnableReasoning,
        mcpToolNames: mcpToolDefs.map(t => t.function.name),
        contextCompressed: contextCompressed,
        aiFeatures: aiFeatures,
        includeScheduleTaskDetail: needsScheduleTaskDetail
      }) + mcpInstallationHint;

      // 转换消息格式：OpenAI format -> DashScope format
      // OpenAI: { type: "image_url", image_url: { url: "..." } } -> DashScope: { image: "..." }
      // OpenAI: { type: "text", text: "..." } -> DashScope: { text: "..." }
      const dashScopeMessages = userMessages.map((m: any) => {
        if (Array.isArray(m.content)) {
          return {
            role: m.role,
            content: m.content.map((c: any) => {
              if (c.type === 'image_url') return { image: c.image_url.url }
              if (c.type === 'text') return { text: c.text }
              return c
            })
          }
        }
        return m
      })

      fullMessages = [
        { role: "system", content: systemMessage },
        ...dashScopeMessages,
      ]

      requestBody = {
        model: effectiveModel || "qwen-plus",
        input: {
          messages: fullMessages,
        },
        parameters: {
          result_format: "message",
          incremental_output: true, // 必须开启增量输出才能有打字机效果
          ...(enableSearch ? { enable_search: true } : {}),
        },
      }
      if (hasImageContent && /\/aigc\/text-generation\//.test(targetUrl)) {
        targetUrl = targetUrl.replace("/aigc/text-generation/", "/aigc/multimodal-generation/")
      }
    } else {
      // OpenAI 兼容模式
      const contextCompressedInstruction = contextCompressed ? `\n\n⚠️ 历史已压缩，请在回复开头输出 \`<CONTEXT_COMPRESSED/>\` 标签\n` : ""
      
      // 使用精简的系统提示词
      const compactSystemPrompt = generateCompactSystemPrompt({
        basePrompt: finalSystemPrompt,
        enableDeviceControl: mandatorySkillsEnabled !== false && isDeviceOnline,
        enableReasoning: shouldEnableReasoning,
        mcpToolNames: mcpToolDefs.map(t => t.function.name),
        contextCompressed: contextCompressed,
        aiFeatures: aiFeatures,
        includeScheduleTaskDetail: needsScheduleTaskDetail
      });
      
      fullMessages = [
        {
          role: "system",
          content: compactSystemPrompt + mcpInstallationHint,
        },
        ...userMessages,
      ]

      requestBody = {
        model: effectiveModel || "gpt-4o-mini",
        messages: fullMessages,
        stream: true,
        temperature: 0.7,
      }
    }

    // 调用AI API
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (isDashScopeAppCall) {
      headers["Authorization"] = `Bearer ${apiKey}`
      // 尝试开启 SSE（若不支持，将回退为一次性输出）
      headers["X-DashScope-SSE"] = "enable"
    } else if (isDashScope && !useCompatibleMode) {
      headers["Authorization"] = `Bearer ${apiKey}`
      headers["X-DashScope-SSE"] = "enable"
    } else {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    // === Multi-Round Agent Loop (真正的多轮 ReAct Loop) ===
    // 标准 Agent 标准流程：Query → LLM → [Thinking+Action+ActionInput] → Tool → Observation → 循环 → Final Answer
    // 最多允许 MAX_AGENT_ITERATIONS 轮工具调用，防止无限循环
    const MAX_AGENT_ITERATIONS = 5
    const preflightHeaders = { ...headers }
    delete preflightHeaders["X-DashScope-SSE"]

    if (shouldPreflight && !isDashScopeAppCall && (useCompatibleMode || !isDashScope)) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          // Keep-Alive ping to prevent gateway timeouts during long tool chains
          const keepAlive = setInterval(() => {
            try { controller.enqueue(encoder.encode(": keep-alive\n\n")) } catch { clearInterval(keepAlive) }
          }, 5000)

          // === 初始化 Agent 编排器 ===
          const sessionId = `session-${user.id}-${Date.now()}`;
          const orchestrator = createOrchestrator(sessionId, {
            enableMemory: true,
            enableMonitoring: true,
            enableLogging: true
          });

          // 注册到全局管理器
          globalOrchestratorManager.register(sessionId, orchestrator);

          const agentContext: AgentContext = {
            userId: user.id as number,
            sessionId,
            conversationHistory: fullMessages,
            deviceData: deviceStatus,
            weatherData,
            mcpConfigs,
            appUrl
          };

          console.log(`[Orchestrator] Initialized for user ${user.id}, session ${sessionId}`);

          try {
            // 0. 发送上下文同步事件 (如果发生压缩)
            if (contextUpdateEvent) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(contextUpdateEvent)}\n\n`))
            }

            // 0. 发送知识模块路由事件
            if (matchedSkills && matchedSkills.length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                id: `skill-selection-${Date.now()}`, object: "chat.completion.chunk",
                created: Date.now(), model: effectiveModel,
                skill_selection: matchedSkills.map(s => ({ id: s.id, name: s.name }))
              })}\n\n`))
            }

            // === AGENT LOOP ===
            let iteration = 0
            
            while (iteration < MAX_AGENT_ITERATIONS) {
              iteration++
              console.log(`[Agent Loop] Iteration ${iteration}/${MAX_AGENT_ITERATIONS}`)

              const cleanMessages = (fullMessages as any[]).map((m: any) => {
                const { role, content, name, tool_calls, tool_call_id } = m
                const clean: any = { role, content }
                if (name) clean.name = name
                if (tool_calls) clean.tool_calls = tool_calls
                if (tool_call_id) clean.tool_call_id = tool_call_id
                return clean
              })

              const loopBody = {
                ...requestBody,
                messages: cleanMessages,
                stream: true, // 开启流式以支持打字机效果
                tools: mcpToolDefs,
              }

              console.log(`[Agent Loop] Calling LLM (streaming) with ${cleanMessages.length} messages...`)
              const loopRes = await fetch(targetUrl, {
                method: "POST",
                headers, // 使用原始 headers (含 SSE 指令)
                body: JSON.stringify(loopBody),
              })

              if (!loopRes.ok) {
                console.warn(`[Agent Loop] LLM call failed (status ${loopRes.status}), breaking loop`)
                break
              }

              const reader = loopRes.body?.getReader()
              if (!reader) break

              const decoder = new TextDecoder()
              let buffer = ""
              let hasToolCalls = false
              let currentToolCalls: any[] = []
              let accumulatedContent = ""
              let iterationFinished = false

              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split("\n")
                buffer = lines.pop() || ""

                for (const line of lines) {
                  const trimmed = line.trim()
                  if (!trimmed || trimmed === "data: [DONE]") continue
                  if (trimmed.startsWith("data: ")) {
                    try {
                      const json = JSON.parse(trimmed.slice(6))
                      const delta = json.choices?.[0]?.delta
                      
                      // 检查 tool_calls
                      if (delta?.tool_calls) {
                        hasToolCalls = true
                        for (const tc of delta.tool_calls) {
                          if (tc.index === undefined) continue
                          if (!currentToolCalls[tc.index]) {
                            currentToolCalls[tc.index] = { id: tc.id, function: { name: "", arguments: "" } }
                          }
                          if (tc.id) currentToolCalls[tc.index].id = tc.id
                          if (tc.function?.name) currentToolCalls[tc.index].function.name += tc.function.name
                          if (tc.function?.arguments) currentToolCalls[tc.index].function.arguments += tc.function.arguments
                        }
                      }

                      if (delta?.content) {
                        accumulatedContent += delta.content

                        // 🔥 应用智能过滤器，拦截裸露的 TASK_LIST JSON（传入累积内容用于上下文判断）
                        let filteredContent = filterBareTaskListJson(delta.content, accumulatedContent)
                        
                        // 🔥 应用功能禁用过滤器
                        filteredContent = filterDisabledFeatures(filteredContent, aiFeatures)
                        
                        // 始终推送 content 给前端展示，剥离 tool_calls 避免前端意外处理
                        const cleanJson = JSON.parse(JSON.stringify(json))
                        if (cleanJson.choices?.[0]?.delta?.tool_calls) {
                           delete cleanJson.choices[0].delta.tool_calls
                        }
                        // 使用过滤后的内容
                        if (cleanJson.choices?.[0]?.delta) {
                          cleanJson.choices[0].delta.content = filteredContent
                        }
                        // 只有在过滤后还有内容时才发送
                        if (filteredContent) {
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify(cleanJson)}\n\n`))
                        }
                      }
                    } catch (e) { }
                  }
                }
              }

              if (hasToolCalls) {
                const toolCalls = currentToolCalls.filter(Boolean)
                console.log(`[Agent Loop] Round ${iteration} - Tool calls:`, toolCalls.map((t: any) => t.function.name))
                
                // 将 AI 回复（含可能的 content 和 tool_calls）存入上下文
                fullMessages.push({ 
                  role: "assistant", 
                  content: accumulatedContent || null, 
                  tool_calls: toolCalls 
                })

                // 通知前端
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  id: `tool-status-${Date.now()}`, object: "chat.completion.chunk",
                  created: Date.now(), model: effectiveModel,
                  tool_calls: toolCalls,
                  agent_iteration: iteration
                })}\n\n`))

                // 执行工具 - 使用智能并行执行以提升性能
                console.log(`[Agent Loop] Round ${iteration} - Executing ${toolCalls.length} tools`);

                // 准备工具调用对象
                const toolCallObjects = [];
                for (const toolCall of toolCalls) {
                  let fnArgs = {};
                  let parseError = "";
                  
                  try { 
                    fnArgs = JSON.parse(toolCall.function.arguments || '{}') 
                  } catch (e: any) { 
                    parseError = e.message;
                    console.error(`[Agent Loop] Failed to parse tool arguments:`, parseError);
                  }

                  if (parseError) {
                    // 直接添加错误结果
                    fullMessages.push({
                      role: 'tool',
                      tool_call_id: toolCall.id,
                      content: JSON.stringify({ 
                        success: false, 
                        error: `JSON解析失败: ${parseError}` 
                      })
                    });
                    continue;
                  }
                  
                  toolCallObjects.push({
                    id: toolCall.id,
                    name: toolCall.function.name,
                    arguments: fnArgs,
                    timestamp: Date.now()
                  });
                }

                // 并行执行工具（带进度回调）
                const toolResults = await executeToolCallsSmart(
                  toolCallObjects,
                  orchestrator,
                  agentContext,
                  (completed, total, currentTool) => {
                    // 发送进度更新到前端
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      id: `tool-progress-${Date.now()}`,
                      object: "chat.completion.chunk",
                      created: Date.now(),
                      model: effectiveModel,
                      tool_progress: {
                        completed,
                        total,
                        current: currentTool
                      }
                    })}\n\n`));
                  }
                );

                // 处理结果并添加到消息历史
                for (const [toolCallId, result] of toolResults.entries()) {
                  const toolCall = toolCalls.find(tc => tc.id === toolCallId);
                  if (!toolCall) continue;

                  // 发送工具结果到前端
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    id: `tool-result-${Date.now()}`,
                    object: "chat.completion.chunk",
                    created: Date.now(),
                    model: effectiveModel,
                    tool_result: {
                      name: toolCall.function.name,
                      args: JSON.parse(toolCall.function.arguments || '{}'),
                      result: result.success ? result.data : { error: result.error }
                    }
                  })}\n\n`));

                  // 添加到消息历史
                  fullMessages.push({
                    role: 'tool',
                    tool_call_id: toolCallId,
                    content: JSON.stringify(result.success ? result.data : { error: result.error })
                  });
                }
                
                requestBody = { ...requestBody, messages: fullMessages }
                continue
              } else {
                // 无工具，说明最后一部分内容已经通过之前的 SSE 流推送出去了，对话已完整
                fullMessages.push({ role: "assistant", content: accumulatedContent })
                console.log(`[Agent Loop] Round ${iteration} - Final answer finished streaming`)
                
                // 🔍 验证定时任务格式（如果启用了定时任务功能）
                if (aiFeatures?.enableScheduleTask !== false && accumulatedContent) {
                  // 检查是否包含 schedule_task JSON
                  const jsonBlockRegex = /```json\s*\n([\s\S]*?)\n```/g
                  let match
                  let foundScheduleTask = false
                  
                  while ((match = jsonBlockRegex.exec(accumulatedContent)) !== null) {
                    try {
                      const jsonContent = match[1]
                      const data = JSON.parse(jsonContent)
                      
                      if (data.action === 'schedule_task') {
                        foundScheduleTask = true
                        console.log('[Schedule Task Validation] ✅ Found schedule_task JSON:', data)
                        
                        // 验证必需字段
                        const errors: string[] = []
                        if (!data.title) errors.push('缺少 title 字段')
                        if (!data.task_action) errors.push('缺少 task_action 字段')
                        if (!data.delay_seconds && !data.cron) errors.push('缺少 delay_seconds 或 cron 字段')
                        if (data.delay_seconds && typeof data.delay_seconds !== 'number') {
                          errors.push(`delay_seconds 必须是数字，当前类型: ${typeof data.delay_seconds}`)
                        }
                        if (data.task_action === 'toggle_relay' && (!data.device || data.value === undefined)) {
                          errors.push('toggle_relay 任务缺少 device 或 value 字段')
                        }
                        
                        if (errors.length > 0) {
                          console.error('[Schedule Task Validation] ❌ 格式错误:', errors)
                          console.error('[Schedule Task Validation] 错误的 JSON:', jsonContent)
                        } else {
                          console.log('[Schedule Task Validation] ✅ 格式验证通过')
                        }
                      }
                    } catch (e) {
                      // JSON 解析失败，忽略
                    }
                  }
                  
                  // 检查是否使用了旧格式
                  if (accumulatedContent.includes('<SCHEDULE_TASK>')) {
                    console.warn('[Schedule Task Validation] ⚠️ 检测到旧格式 <SCHEDULE_TASK> 标签！AI 应该使用 JSON 代码块格式。')
                  }
                  
                  // 如果用户要求创建定时任务但没有找到正确格式
                  const userMessage = fullMessages[fullMessages.length - 2]?.content
                  if (typeof userMessage === 'string' && 
                      (userMessage.includes('定时') || userMessage.includes('提醒') || userMessage.includes('后')) &&
                      !foundScheduleTask && 
                      !accumulatedContent.includes('<SCHEDULE_TASK>')) {
                    console.warn('[Schedule Task Validation] ⚠️ 用户可能要求创建定时任务，但 AI 没有输出正确的 JSON 格式')
                  }
                }
                
                break
              }
            }

            clearInterval(keepAlive)
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))

            // 生成性能报告并记录
            const metrics = orchestrator.getMetrics();
            const toolStats = orchestrator.getToolStats();
            console.log(`[Orchestrator] Session ${sessionId} completed:`, {
              metrics,
              toolStats
            });

            // === 自动学习：从对话中学习用户偏好和模式 ===
            try {
              await learnFromConversation({
                userId: user.id as number,
                userMessage: lastUserText,
                aiResponse: fullMessages.filter(m => m.role === 'assistant').map(m => m.content).join('\n')
              });
              console.log('[AutoLearning] Learned from conversation');
            } catch (e) {
              console.error('[AutoLearning] Failed to learn from conversation:', e);
            }

            // 清理编排器
            globalOrchestratorManager.unregister(sessionId);
            orchestrator.cleanup();

            // 扣除配额
            if (useSystemKey) {
              try { await incrementAiUsage(user.id as number) } catch (e) { }
            }

            controller.close()
          } catch (err: any) {
            clearInterval(keepAlive)
            console.error('[Agent Loop Error]', err)
            
            // 清理编排器
            globalOrchestratorManager.unregister(sessionId);
            orchestrator.cleanup();
            
            controller.enqueue(encoder.encode(`data: {"error": "Agent loop error: ${err.message}"}\n\n`))
            controller.close()
          }
        }
      })

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" }
      })
    }
    // === Multi-Round Agent Loop 结束 ===


    console.log('[MCP] Making final streaming request to AI...')
    
    // 同样清理 final requestBody 的 messages
    // 确保 requestBody.messages 不为空，防止 undefined 错误
    if (!requestBody.messages || requestBody.messages.length === 0) {
        requestBody.messages = fullMessages.length > 0 ? fullMessages : userMessages;
    }

    if (requestBody.messages) {
        requestBody.messages = requestBody.messages.map((m: any) => {
            const { role, content, name, tool_calls, tool_call_id } = m
            const cleanMsg: any = { role, content }
            if (name) cleanMsg.name = name
            if (tool_calls) cleanMsg.tool_calls = tool_calls
            if (tool_call_id) cleanMsg.tool_call_id = tool_call_id
            return cleanMsg
        })
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      console.error(`[Chat API] Error from AI provider: ${response.status}`, await response.text().catch(() => ''))
      return new Response(
        JSON.stringify({ error: `API Error: ${response.status}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (isDashScopeAppCall) {
      // 兼容百炼应用调用的输出：优先处理 SSE，否则一次性输出转为 OpenAI SSE
      const isSSE = /text\/event-stream/i.test(response.headers.get("content-type") || "")
      const encoder = new TextEncoder()
      if (isSSE) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        const stream = new ReadableStream({
          async start(controller) {
            // 0. 发送已选取的知识模块 (AI Skill Routing)
            if (matchedSkills && matchedSkills.length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                id: `skill-selection-${Date.now()}`,
                object: "chat.completion.chunk",
                created: Date.now(),
                model: effectiveModel,
                skill_selection: matchedSkills.map(s => ({ id: s.id, name: s.name }))
              })}\n\n`))
            }

            let acc = ""
            let buffer = "" 
            if (!reader) { controller.close(); return }
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value, { stream: true })
                buffer += chunk
                const lines = buffer.split("\n")
                buffer = lines.pop() || ""

                for (const line of lines) {
                  if (line.startsWith("data:")) {
                    const data = line.slice(5).trim()
                    if (data === "[DONE]") continue
                    try {
                      const json = JSON.parse(data)
                      const content = json.output?.choices?.[0]?.message?.content || json.output?.text || ""
                      if (typeof content === "string") {
                        let next = ""
                        if (content.startsWith(acc)) {
                          next = content.slice(acc.length)
                          acc = content
                        } else {
                          next = content
                          acc += content
                        }

                        if (next) {
                          // 🔥 应用智能过滤器，拦截裸露的 TASK_LIST JSON（传入累积内容用于上下文判断）
                          const filteredNext = filterBareTaskListJson(next, acc)
                          
                          if (filteredNext) {
                            const openaiFormat = {
                              id: json.request_id,
                              object: "chat.completion.chunk",
                              created: Date.now(),
                              model: model,
                              choices: [{ index: 0, delta: { content: filteredNext }, finish_reason: null }],
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`))
                          }
                        }
                      }
                    } catch { }
                  }
                }
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"))
              controller.close()
            } catch (e) { controller.error(e instanceof Error ? e : new Error(String(e))) }
          }
        })
        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }
        })
      } else {
        // 非SSE：读取完整JSON后模拟流式输出，避免用户长时间白屏等待
        const data = await response.json()
        const content: string = data?.output?.text || data?.output?.choices?.[0]?.message?.content || ""
        
        console.log(`[Chat API] Provider returned non-SSE response, simulating stream for ${content.length} chars`)

        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          async start(controller) {
            // 发送知识模块
            if (matchedSkills && matchedSkills.length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                id: `skill-selection-${Date.now()}`, object: "chat.completion.chunk",
                created: Date.now(), model: effectiveModel,
                skill_selection: matchedSkills.map(s => ({ id: s.id, name: s.name }))
              })}\n\n`))
            }

            // 模拟流式：按 token 级切块（平均3-7字符/token），每批 20ms 间隔
            const CHUNK_SIZE = 6 // 每次发送约1个token
            const DELAY_MS = 15  // 约60 tokens/秒，接近真实打字速度
            const requestId = data?.request_id || `${Date.now()}`

            for (let i = 0; i < content.length; i += CHUNK_SIZE) {
              const chunk = content.slice(i, i + CHUNK_SIZE)
              const payload = {
                id: requestId,
                object: "chat.completion.chunk",
                created: Date.now(),
                model: model,
                choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }],
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
              
              // 小延迟模拟流式效果（最后一个chunk不需要延迟）
              if (i + CHUNK_SIZE < content.length) {
                await new Promise(r => setTimeout(r, DELAY_MS))
              }
            }

            // 发送 finish
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              id: requestId,
              object: "chat.completion.chunk",
              created: Date.now(),
              model: model,
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
            })}\n\n`))
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            controller.close()
          }
        })
        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }
        })
      }
    } else if (isDashScope && !useCompatibleMode) {
      // DashScope返回SSE格式，需要转换
      const reader = response.body?.getReader()
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()

      const stream = new ReadableStream({
        async start(controller) {
          // 0. 发送已选取的知识模块 (AI Skill Routing)
          if (matchedSkills && matchedSkills.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              id: `skill-selection-${Date.now()}`,
              object: "chat.completion.chunk",
              created: Date.now(),
              model: effectiveModel,
              skill_selection: matchedSkills.map(s => ({ id: s.id, name: s.name }))
            })}\n\n`))
          }

          let acc = ""
          let accReasoning = ""
          let reasoningClosed = false
          let buffer = "" 

          if (!reader) {
            controller.close()
            return
          }

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = decoder.decode(value, { stream: true })
              buffer += chunk
              const lines = buffer.split("\n")
              buffer = lines.pop() || ""

              for (const line of lines) {
                if (line.startsWith("data:")) {
                  const data = line.slice(5).trim()
                  if (data === "[DONE]") continue

                  try {
                    const json = JSON.parse(data)
                    // (Handle Reasoning, Content, Citations...)
                    const rawReasoning = json.output?.choices?.[0]?.message?.reasoning_content || ""
                    if (typeof rawReasoning === "string" && rawReasoning.length > 0) {
                      let nextReasoning = ""
                      if (rawReasoning.startsWith(accReasoning)) {
                        nextReasoning = rawReasoning.slice(accReasoning.length)
                        accReasoning = rawReasoning
                      } else {
                        nextReasoning = rawReasoning
                        accReasoning += rawReasoning
                      }
                      if (nextReasoning) {
                        const prefix = accReasoning.length === nextReasoning.length ? "<think>" : ""
                        const openaiFormat = {
                          id: json.request_id,
                          object: "chat.completion.chunk",
                          created: Date.now(),
                          model: model,
                          choices: [{ index: 0, delta: { content: prefix + nextReasoning }, finish_reason: null }]
                        }
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`))
                      }
                    }

                    const raw = json.output?.choices?.[0]?.message?.content || ""
                    if (typeof raw === "string") {
                      let next = ""
                      if (raw.startsWith(acc)) {
                        next = raw.slice(acc.length)
                        acc = raw
                      } else {
                        next = raw
                        acc += raw
                      }
                      if (next) {
                        let prefix = ""
                        if (accReasoning.length > 0 && !reasoningClosed) {
                          prefix = "</think>\n\n"
                          reasoningClosed = true
                        }
                        const openaiFormat = {
                          id: json.request_id,
                          object: "chat.completion.chunk",
                          created: Date.now(),
                          model: model,
                          choices: [{ index: 0, delta: { content: prefix + next }, finish_reason: json.output?.finish_reason || null }],
                        }
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`))
                      }
                    }
                  } catch (e) { }
                }
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            controller.close()
          } catch (error) { controller.error(error) }
        },
      })

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      })
    } else {
      // OpenAI格式直通转发
      const encoder = new TextEncoder()
      const directStream = response.body
      if (!directStream) return new Response('No response body', { status: 500 })

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const reader = directStream.getReader()
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              controller.enqueue(value)
            }
            controller.close()
          } catch (e) { controller.error(e) }
        }
      })
      if (useSystemKey && user) {
        incrementAiUsage(user.id as number).catch(e => console.error("Quota error:", e))
      }
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          ...(response.headers.get("Transfer-Encoding") ? { "Transfer-Encoding": response.headers.get("Transfer-Encoding")! } : {})
        },
        status: response.status
      })
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Chat API Error:", error)
    return Response.json(
      { error: msg || "Internal server error" },
      { status: 500 }
    )
  }
}
