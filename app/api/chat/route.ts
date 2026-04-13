export const runtime = 'nodejs'

export async function GET() {
  return Response.json({
    message: "Chat API is working. Use POST to send messages.",
  })
}

import { getEnhancedSystemPrompt } from '@/lib/ai-system-prompt'
import { getAllTasks } from '@/lib/db/scheduler-service'
import { initDB } from '@/lib/db/database'
import { getCurrentUser } from '@/lib/auth'
import { getUserAiQuota, incrementAiUsage } from '@/lib/db/ai-quota-service'
import { getMCPToolDefinitions } from '@/lib/mcp/mcp-tool-definitions'
import { executeMCPToolCall } from '@/lib/mcp/mcp-tool-executor'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    await initDB()
    const { messages, apiKey: rawApiKey, apiUrl: rawApiUrl, model, systemPrompt, enableSearch, enableReasoning, deviceData, weatherData, mcpConfigs, mandatorySkillsEnabled } =
      await req.json()

    // 兼容前端传来的 deviceData 字段
    const deviceStatus = deviceData;

    const stripWrappingQuotes = (value: unknown) => {
      const s = String(value ?? "").trim()
      return s.replace(/^[`"']+/, "").replace(/[`"']+$/, "").trim()
    }

    const normalizeOpenAIChatCompletionsUrl = (value: unknown) => {
      let s = stripWrappingQuotes(value)
      if (!s) return s

      const qIndex = s.indexOf("?")
      const hashIndex = s.indexOf("#")
      const cutIndex = qIndex === -1 ? hashIndex : (hashIndex === -1 ? qIndex : Math.min(qIndex, hashIndex))
      const suffix = cutIndex === -1 ? "" : s.slice(cutIndex)
      s = cutIndex === -1 ? s : s.slice(0, cutIndex)

      s = s.replace(/\/+$/, "")

      if (/\/chat\/completions$/.test(s)) return s + suffix
      if (/\/v1$/.test(s)) return `${s}/chat/completions${suffix}`
      if (/^https?:\/\/[\w.-]+(?::\d+)?$/.test(s)) return `${s}/v1/chat/completions${suffix}`
      return s + suffix
    }

    let apiKey = stripWrappingQuotes(rawApiKey)
    let targetUrl = normalizeOpenAIChatCompletionsUrl(rawApiUrl)

    // 检查是否使用系统托管 Key
    const useSystemKey = !apiKey && !rawApiUrl;

    if (useSystemKey) {
      // 1. 检查配额
      const quota = await getUserAiQuota(user.id as number)
      if (!quota.can_use) {
        const reason = quota.reason === 'limit_reached' ? '今日免费额度已用完' : '余额不足'
        return Response.json(
          { error: `${reason}，请明天再来或联系管理员充值。` },
          { status: 403 }
        )
      }

      // 2. 注入系统 Key
      apiKey = process.env.SYSTEM_OPENAI_API_KEY || ""
      const systemBaseUrl = process.env.SYSTEM_OPENAI_BASE_URL || ""
      
      // 强制兼容性：如果使用了 DashScope (Qwen)，确保 URL 正确
      // 对于 Qwen 模型，我们通常使用兼容模式的 endpoint
      
      if (systemBaseUrl) {
        targetUrl = normalizeOpenAIChatCompletionsUrl(systemBaseUrl)
      }

      if (!apiKey) {
        return Response.json(
          { error: "System AI service is not configured. Please contact admin." },
          { status: 503 }
        )
      }
    }

    if (!apiKey) {
      return Response.json(
        { error: "API Key is required. Please configure it in settings." },
        { status: 400 }
      )
    }



    // === MCP Function Calling 集成 ===
    // 根据用户启用的 MCP 服务，生成 AI 可调用的工具定义
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const mcpToolDefs = getMCPToolDefinitions(mcpConfigs || [])
    
    // 提取最后一条用户消息文本，用于意图识别优化
    const lastUserMessageObj = messages.slice().reverse().find((m: any) => m.role === 'user')
    const lastUserContent = lastUserMessageObj?.content
    const lastUserText = typeof lastUserContent === 'string' ? lastUserContent : 
                         (Array.isArray(lastUserContent) ? lastUserContent.find((c:any) => c.type === 'text')?.text || "" : "")
    
    // 构建增强的系统提示词，通过智能路由选择相关技能以节省 Token
    const { prompt: enhancedSystemPrompt, matchedSkills } = await getEnhancedSystemPrompt(lastUserText, systemPrompt, user.id as number)
    
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
                     forcedToolPrompt = `\n\n**重要指令：**\n用户在消息中显式使用了 "@${mentionedName}" 标记。\n你必须**优先**调用与 "${mentionedName}" 相关的工具（如 \`${matchedTool.function.name}\`）来回答用户的请求。\n不要拒绝调用，即使你认为没有必要。请直接执行工具调用。`
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
                         forcedToolPrompt = `\n\n**🚨 强制搜索指令：**\n用户的请求包含搜索意图："${lastUserContent}"\n\n你**必须立即**调用搜索工具（如 \`${bestTool.function.name}\`）来获取真实信息。\n\n**严禁行为：**\n- ❌ 不能凭记忆回答\n- ❌ 不能编造任何链接或信息\n- ❌ 不能猜测或推测内容\n\n**必须行为：**\n- ✅ 立即调用 \`${bestTool.function.name}\` 工具\n- ✅ 基于真实搜索结果回答\n- ✅ 提供真实的链接和信息\n\n请注意：${firecrawl ? '优先使用 Firecrawl 进行深度抓取。如果抓取失败或返回内容为空，请立即尝试使用 Exa/Brave 进行搜索作为备选。' : (exa ? '优先使用 Exa 进行语义搜索。' : '使用 Brave 进行网络搜索。')}`
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
      mcpInstallationHint = `\n\n## ⚠️ 外部工具能力未启用\n\n` +
        `检测到你可能需要以下能力，但当前没有安装相应的 MCP 工具：\n` +
        missingTools.map(t => `- ${t}`).join('\n') + `\n\n` +
        `**推荐的 MCP 工具：**\n` +
        `- **Exa Search**: 专业的 AI 搜索引擎，适合获取最新的技术文档和知识\n` +
        `- **Brave Search**: 隐私友好的通用搜索引擎，适合日常信息查询\n` +
        `- **Firecrawl**: 网页内容抓取工具，可以深度提取网页信息\n` +
        `- **彩云天气 / 高德天气 / 和风天气**: 实时天气查询服务\n\n` +
        `**如何安装：**\n` +
        `1. 点击右上角的设置图标 ⚙️\n` +
        `2. 进入 "MCP 工具商店" 标签页\n` +
        `3. 搜索并安装上述工具\n` +
        `4. 根据提示配置 API Key（部分工具需要）\n` +
        `5. 启用工具后即可使用\n\n` +
        `**当前回复限制：**\n` +
        `由于缺少相应工具，我只能基于已有知识回答，可能无法提供最新、最准确或实时的信息。\n` +
        `**建议：如果你经常需要这些能力，请先安装对应的 MCP 工具以获得最佳体验。**\n\n` +
        `**重要提示：**\n` +
        `- 你应该在回复中友好地告知用户这个限制\n` +
        `- 不要假装调用了工具或编造数据\n` +
        `- 可以建议用户安装工具后再次询问`
    }

    // 只将光谱数据获取推给 MCP，恢复基础设备状态的直接注入
    contextInfo += `\n\n## 光谱数据获取方式\n当需要获取光谱数据时，请使用以下 MCP 工具：\n- 使用 \`get_all_spectrum\` 获取完整的 18 通道光谱数据\n- 使用 \`get_channel\` 获取特定波长的光谱值\n\n这些工具会实时从 MQTT 获取最新的传感器数据。\n`

    contextInfo += `\n\n【任务规划器指令】
当用户下达复杂或多步骤任务时（特别是农业自动化、分析或控制），你必须使用 <TASK_LIST> 标签输出任务计划。
请遵循“SOP 标准作业程序”：
1. **搜寻标准**：先根据【当前季节/月份】搜索最佳农业实践（如：“${currentMonth}月 草莓大棚 温湿度管理标准”）。
2. **分析差距**：对比搜索到的标准值与当前设备传感器数据。
3. **制定策略**：基于差距生成调控指令。

格式如下：
<TASK_LIST>
{
  "status": "in_progress",
  "tasks": [
    {
      "title": "搜索${currentSeason}草莓种植标准",
      "status": "in_progress",
      "subActions": [
        { "text": "正在调用搜索工具获取${currentMonth}月管理要点...", "status": "in_progress" }
      ]
    },
    {
      "title": "分析环境数据差距",
      "status": "pending",
      "subActions": []
    },
    {
      "title": "执行环境调控",
      "status": "pending",
      "subActions": []
    }
  ]
}
</TASK_LIST>

【MCP工具调用指令】
你是农业平台智能助手。请积极使用系统提供的 MCP 工具。
**重要规则：**
1. **禁止搜索设备指令**：严禁搜索“打开水泵”、“如何开关灯”、“截取摄像头”、“查看监控”等设备操作指令。设备控制、视觉巡检和获取截图是你自带的能力，请直接输出相应的 JSON 控制指令。
2. **搜索农业知识**：当用户要求“调控环境”时，你应该搜索“作物生长标准”、“最佳温湿度范围”、“病害防治方法”等知识。
3. **上下文感知搜索**：搜索关键词必须包含当前的【月份】、【季节】或【作物生长阶段】。例如搜索 \`"${currentMonth}月 草莓大棚 通风 策略"\` 而不是简单的 \`"大棚通风"\`。
4. **基于结果调控**：获取到搜索结果（如“白天适宜25度”）后，再对比当前温度，如果当前是30度，则生成“开启风扇”的建议。`

    // 直接注入基础设备状态和环境数据
    if (deviceStatus && mandatorySkillsEnabled !== false) {
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
        location: weatherData.location?.name || "未知位置",
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

    const finalSystemPrompt = enhancedSystemPrompt + contextInfo + forcedToolPrompt

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
      "- **Parameters**:\n" +
      "  - `direction`: 1 (左移), 2 (右移), 0 (停止)\n" +
      "  - `distance_mm`: 移动距离 (数字，单位毫米)。滑台总行程 700mm。\n" +
      "- **Action**: `reset_camera` (将滑台复位到最左侧原点 0mm 处)\n" +
      "- **示例**:\n" +
      "```json\n" +
      '{\n  "action": "control_camera",\n  "direction": 1,\n  "distance_mm": 100\n}\n' +
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
      "**重要：必须在回答之前先展示思考过程！**\n" +
      "1. 在生成最终答案之前，必须先输出你的思考过程\n" +
      "2. 使用 <REASONING> 与 </REASONING> 标签包裹思考内容\n" +
      "3. 思考内容应该包括：问题分析、解决思路、关键步骤等\n" +
      "4. 思考过程用中文表达，简洁清晰\n" +
      "5. 格式示例：\n" +
      "<REASONING>\n" +
      "1. 分析用户问题：...\n" +
      "2. 确定解决方案：...\n" +
      "3. 执行步骤：...\n" +
      "</REASONING>\n" +
      "然后再输出最终答案。该思考块会在前端以可折叠卡片形式展示。"
    const tasksInstruction =
      "如果在执行具体工作流程，请在回复末尾使用 <TASKS> 与 </TASKS> 包裹一个 JSON 数组，数组项包含 title、items、status。items 为对象数组，包含 type('text'|'file')、text 以及可选的 file{name, icon}。该块用于前端展示任务进度，并会从最终正文中移除。"
    const chartInstruction =
      "当需要返回可视化图表时，生成 Vega-Lite 规范的 JSON，并使用 <CHART type=\"vega-lite\"> 与 </CHART> 包裹；或返回 ECharts option 的 JSON，并使用 <CHART type=\"echarts\"> 与 </CHART> 包裹。只输出合法的 JSON，不要附加说明或代码块。"
    const monitorInstruction =
      "当用户询问监控、摄像头、直播流或想要查看实时画面时，请直接在回复中插入 <MONITOR></MONITOR> 标签（标签内不需要任何内容）。"
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
      ? `\n\n## 可用的 MCP 工具 (Function Calling)\n你已被授予以下工具的调用能力。请注意：对于这些工具，**必须使用原生 Function Calling (tool_calls)**，严禁使用 JSON 文本格式输出！\n\n可用工具列表：\n${mcpToolDefs.map(t => `- **${t.function.name}**: ${t.function.description}`).join('\n')}\n\n**🚨 严格执行规则：**\n1. **严禁**在回复中直接输出类似 \`{"action": "xxx"}\` 的 JSON 来调用这些工具。必须使用系统提供的 tool_calls 接口。\n2. **严禁编造、虚构或猜测任何信息**！当用户询问需要搜索的内容时，你**必须**主动调用搜索工具获取真实数据。\n3. **搜索类请求强制调用**：当用户说"帮我查"、"帮我搜"、"我想知道"、"找一下"、"搜索"等时，你**必须立即**调用相应的搜索工具，**绝对不能**凭记忆或编造答案。\n4. **禁止编造链接**：严禁编造任何网址、链接或引用。所有链接必须来自真实的工具调用结果。\n5. 当用户询问光谱数据、植物健康状况、NDVI 指数等问题时，你**必须**主动调用 \`get_all_spectrum\` 或 \`get_channel\` 工具获取实时数据。\n6. 当用户询问天气、路线规划等问题时，你**必须**主动调用对应的工具获取实时数据。\n7. 当用户的问题涉及作物病害、土壤管理、灌溉等农业话题时，如果有相关工具可用，应主动调用。\n8. 工具返回的数据是实时的、真实的，请优先使用工具数据而非猜测。\n9. 不需要询问用户是否调用工具，直接调用即可。\n\n**⚠️ 特别警告：**\n- 如果你没有调用工具就回答了需要搜索的问题，这是严重错误！\n- 如果你编造了任何链接或信息，这是严重违规！\n- 必须先调用工具获取真实数据，再基于结果回答用户。\n- **严禁在回复中输出 <TOOL_USED> 标签！** 这个标签只能由系统自动生成，你不能手动输出。\n- **如果你想使用工具，必须通过 tool_calls 接口调用，而不是输出任何文本标签。**\n- **只有真正通过 tool_calls 调用的工具才会被系统识别和执行。**\n\n**光谱数据分析指南：**\n- 410-485nm (蓝紫光)：类胡萝卜素含量\n- 510-560nm (绿光)：叶绿素含量和氮素营养状态\n- 680nm (红光)：叶绿素吸收峰，反映光合作用强度\n- 730nm (红边)：植物胁迫响应指标\n- 760nm (近红外)：植物组织反射峰，反映生物量\n- NDVI 计算：(760 - 680) / (760 + 680)\n- 正常 NDVI 范围：0.6-0.8（健康植物）`
      : ""

    // 检测是否使用DashScope API
    // 注意：如果 URL 指向本地 (localhost/127.0.0.1)，即使模型名包含 qwen 也不是 DashScope
    const isLocal = targetUrl?.includes("localhost") || targetUrl?.includes("127.0.0.1")
    const isDashScope =
      !isLocal && (
        targetUrl?.includes("dashscope.aliyuncs.com") ||
        model?.startsWith("qwen")
      )
    const isCompatibleMode = targetUrl?.includes("compatible-mode/v1") ?? false
    const isDashScopeAppCall = /\/api\/v1\/apps\/[^/]+\/completion(\?|$)/.test(targetUrl || "")

    let userMessages = [...messages];
    let contextCompressed = false;
    let contextUpdateEvent: any = null;
    
    // === 自动上下文总结与压缩 (Auto Context Compression) ===
    const stringifyContent = (content: any) => typeof content === 'string' ? content : JSON.stringify(content)
    const stringifyMessages = (msgs: any[]) => msgs.map(m => m.role + stringifyContent(m.content)).join('\n')
    
    const MAX_CHAR_COUNT = 25000 // 设定一个阈值（约1.5万Token左右的长度）
    const GRAND_SUMMARY_THRESHOLD = 8000 // 总结如果超过此长度，重新大一统总结一次
    
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
    const messagesToKeep = 4;
    const historyToSummarize = nonMemoryMessages.slice(0, nonMemoryMessages.length - messagesToKeep)
    const historyToSummarizeLength = stringifyMessages(historyToSummarize).length
    
    if (currentOverflowCount > MAX_CHAR_COUNT && nonMemoryMessages.length > 5 && historyToSummarizeLength > 1000) {
       console.log(`[Chat API] Context overflow (${currentOverflowCount}), summarizing ${historyToSummarizeLength} chars of history...`)
       
       const recentMessages = nonMemoryMessages.slice(nonMemoryMessages.length - messagesToKeep)
       
       try {
           const summarizeTargetUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
           const summarizeKey = process.env.SYSTEM_OPENAI_API_KEY || apiKey
           
           // 多级总结逻辑
           let summaryPrompt = ""
           let summaryInput = ""
           
           if (!existingMemoryText) {
               // 第一级：首次总结
               summaryPrompt = "你是一个专门总结并在不丢失核心信息前提下压缩上下文的助手。请用一段极简的语言，提炼出以下截断的对话历史中的核心事实、用户主要意图以及AI已采取的关键行动。你的总结将作为下一轮AI对话的'过去的记忆'提供。"
               summaryInput = "请压缩以下对话记录：\n" + stringifyMessages(historyToSummarize)
           } else {
               // 第二级：增量叠加
               summaryPrompt = "你是一个专门合并并优化对话记忆的助手。我会给你一段【旧的历史记忆摘要】和一段【新增的对话记录】。请将它们合并在一起，形成一份连贯、精简且包含所有关键信息的【最新历史记忆摘要】。请保持客观叙事风格。"
               summaryInput = `【旧的历史记忆摘要】\n${existingMemoryText}\n\n【新增的对话记录】\n${stringifyMessages(historyToSummarize)}`
               
               // 第三级：如果旧摘要已经很大，要求大一统精简
               if (existingMemoryText.length > GRAND_SUMMARY_THRESHOLD) {
                   summaryPrompt += "\n警告：旧摘要已经非常冗长，请在合并时进行深度压缩和去重，只保留最核心的价值信息，将整体长度缩减 40% 以上。"
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
                  temperature: 0.1
               })
           })
           
           if (summarizeRes.ok) {
               const summarizeData = await summarizeRes.json()
               const summaryText = summarizeData.choices?.[0]?.message?.content
               if (summaryText) {
                   userMessages = [
                       { role: "assistant", content: `[系统消息：为了节省上下文长度，早期的历史已被提炼如下]\n<PAST_MEMORY>\n${summaryText}\n</PAST_MEMORY>` },
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
    let effectiveModel = model || ''

    if (effectiveModel === 'auto') {
      if (enableReasoning) {
        effectiveModel = 'deepseek-v3.2' // 优先使用推理模型
      } else if (hasImageContent) {
        effectiveModel = 'qwen3.6-plus' // 优先使用视觉模型
      } else {
        effectiveModel = 'qwen3.6-plus' // 默认使用通用增强模型
      }
    }

    const modelLower = String(effectiveModel).toLowerCase()
    const isVLMModel = (
      modelLower.includes('vision') ||
      modelLower.includes('-vl-') ||
      /qwen\d*-vl/.test(modelLower) ||
      modelLower.includes('qvq') ||
      modelLower.includes('qwen3.6') // Qwen3.6 系列支持视觉
    )

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

      const contextCompressedInstruction = contextCompressed ? `\n\n【重要指令】\n为了节省显存，较早的对话历史刚刚已被后台压缩并折叠。你必须在你的回复的**最开头**输出 \`<CONTEXT_COMPRESSED/>\` 这一标签，以在前端触发一条给用户的提示横幅，然后再正常回复用户。\n` : ""

      fullMessages = [
        {
          role: "system",
          content: `${finalSystemPrompt}\n\n${mandatorySkillsEnabled !== false ? deviceControlInstruction : ""}\n\n${enableReasoning ? reasoningInstruction : ""}\n\n${citationInstruction}\n\n${tasksInstruction}\n\n${chartInstruction}\n\n${monitorInstruction}\n\n${bentoInstruction}\n\n${controlBentoInstruction}\n\n${taskListInstruction}\n\n${axisInstruction}\n\n${toolUsageInstruction}${mcpToolsInstruction}${mcpInstallationHint}${contextCompressedInstruction}`,
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
      const contextCompressedInstruction = contextCompressed ? `\n\n【重要指令】\n为了节省显存，较早的对话历史刚刚已被后台压缩并折叠。你必须在你的回复的**最开头**输出 \`<CONTEXT_COMPRESSED/>\` 这一标签，以在前端触发一条给用户的提示横幅，然后再正常回复用户。\n` : ""
      const systemMessage = `${finalSystemPrompt}\n\n${mandatorySkillsEnabled !== false ? deviceControlInstruction : ""}\n\n${enableReasoning ? reasoningInstruction : ""}\n\n${citationInstruction}\n\n${tasksInstruction}\n\n${chartInstruction}\n\n${monitorInstruction}\n\n${bentoInstruction}\n\n${controlBentoInstruction}\n\n${taskListInstruction}\n\n${axisInstruction}\n\n${toolUsageInstruction}${mcpToolsInstruction}${mcpInstallationHint}${contextCompressedInstruction}`

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
      const contextCompressedInstruction = contextCompressed ? `\n\n【重要指令】\n为了节省显存，较早的对话历史刚刚已被后台压缩并折叠。你必须在你的回复的**最开头**输出 \`<CONTEXT_COMPRESSED/>\` 这一标签，以在前端触发一条给用户的提示横幅，然后再正常回复用户。\n` : ""
      
      fullMessages = [
        {
          role: "system",
          content: `${finalSystemPrompt}\n\n${mandatorySkillsEnabled !== false ? deviceControlInstruction : ""}\n\n${enableReasoning ? reasoningInstruction : ""}\n\n${citationInstruction}\n\n${tasksInstruction}\n\n${chartInstruction}\n\n${monitorInstruction}\n\n${bentoInstruction}\n\n${controlBentoInstruction}\n\n${taskListInstruction}\n\n${axisInstruction}\n\n${toolUsageInstruction}${mcpToolsInstruction}${contextCompressedInstruction}`,
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
                        // 只有在没检测到工具调用时，才即时推送内容给前端以支持打字机
                        // 这里的逻辑稍微纠结：如果又是想工具又是想说话（即 CoT），可以开启推送
                        // 为了最大限度支持打字机，我们始终推送 content
                        if (!hasToolCalls) {
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify(json)}\n\n`))
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

                // 执行工具
                for (const toolCall of toolCalls) {
                  const fnName = toolCall.function.name
                  let fnArgs = {}
                  try { fnArgs = JSON.parse(toolCall.function.arguments || '{}') } catch { }

                  const result = await executeMCPToolCall(fnName, fnArgs, mcpConfigs, appUrl)
                  
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    id: `tool-result-${Date.now()}`, object: "chat.completion.chunk",
                    created: Date.now(), model: effectiveModel,
                    tool_result: { name: fnName, args: fnArgs, result: result.success ? result.data : { error: result.error } }
                  })}\n\n`))

                  fullMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result.success ? result.data : { error: result.error })
                  })
                }
                requestBody = { ...requestBody, messages: fullMessages }
                continue
              } else {
                // 无工具，说明最后一部分内容已经通过之前的 SSE 流推送出去了，对话已完整
                fullMessages.push({ role: "assistant", content: accumulatedContent })
                console.log(`[Agent Loop] Round ${iteration} - Final answer finished streaming`)
                break
              }
            }

            clearInterval(keepAlive)
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))

            // 扣除配额
            if (useSystemKey) {
              try { await incrementAiUsage(user.id as number) } catch (e) { }
            }

            controller.close()
          } catch (err: any) {
            clearInterval(keepAlive)
            console.error('[Agent Loop Error]', err)
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
                          const openaiFormat = {
                            id: json.request_id,
                            object: "chat.completion.chunk",
                            created: Date.now(),
                            model: model,
                            choices: [{ index: 0, delta: { content: next }, finish_reason: null }],
                          }
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`))
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
        // 非SSE：读取完整JSON并封装为一次性OpenAI SSE
        const data = await response.json()
        const content: string = data?.output?.text || data?.output?.choices?.[0]?.message?.content || ""
        const payload = {
          id: data?.request_id || `${Date.now()}`,
          object: "chat.completion.chunk",
          created: Date.now(),
          model: model,
          choices: [{ index: 0, delta: { content }, finish_reason: "stop" }],
          skill_selection: matchedSkills?.map(s => ({ id: s.id, name: s.name }))
        }
        const body = `data: ${JSON.stringify(payload)}\n\ndata: [DONE]\n\n`
        return new Response(body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } })
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
