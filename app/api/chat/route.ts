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
    const { messages, apiKey: rawApiKey, apiUrl: rawApiUrl, model, systemPrompt, enableSearch, enableReasoning, deviceData, weatherData, mcpConfigs } =
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

    // 构建增强的系统提示词，包含当前设备和天气数据
    const enhancedSystemPrompt = getEnhancedSystemPrompt(systemPrompt)

    // === MCP Function Calling 集成 ===
    // 根据用户启用的 MCP 服务，生成 AI 可调用的工具定义
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const mcpToolDefs = getMCPToolDefinitions(mcpConfigs || [])
    
    // 提取最后一条用户消息文本，用于意图识别优化
    const lastUserMessageObj = messages.slice().reverse().find((m: any) => m.role === 'user')
    const lastUserContent = lastUserMessageObj?.content
    const lastUserText = typeof lastUserContent === 'string' ? lastUserContent : 
                         (Array.isArray(lastUserContent) ? lastUserContent.find((c:any) => c.type === 'text')?.text || "" : "")
    
    // Heuristic: 仅当消息看起来需要工具时才进行 Preflight 检查
    // 这大大提高了普通聊天的响应速度 (避免了双重请求延迟)
    const toolKeywords = ["搜索", "查", "找", "天气", "设备", "任务", "监控", "search", "find", "weather", "device", "task", "monitor", "img", "image", "图片", "画", "draw", "analyse", "分析", "帮我查", "帮我搜", "我想知道", "查一下", "搜一下", "找一下", "抓取", "获取", "bilibili", "视频", "链接", "网站", "网页"]
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
                     '视频', '链接', '网站', '网页', '资料', '信息', '内容'
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
1. **禁止搜索设备指令**：严禁搜索“打开水泵”、“如何开关灯”等设备操作指令。设备控制是你自带的能力。
2. **搜索农业知识**：当用户要求“调控环境”时，你应该搜索“作物生长标准”、“最佳温湿度范围”、“病害防治方法”等知识。
3. **上下文感知搜索**：搜索关键词必须包含当前的【月份】、【季节】或【作物生长阶段】。例如搜索 \`"${currentMonth}月 草莓大棚 通风 策略"\` 而不是简单的 \`"大棚通风"\`。
4. **基于结果调控**：获取到搜索结果（如“白天适宜25度”）后，再对比当前温度，如果当前是30度，则生成“开启风扇”的建议。`

    // 直接注入基础设备状态和环境数据
    if (deviceStatus) {
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
          water_pump: deviceStatus.relay5 === 1 ? "开启" : "关闭",
          fan: deviceStatus.relay6 === 1 ? "开启" : "关闭",
          grow_light_power: deviceStatus.relay7 === 1 ? "开启" : "关闭",
          white_light: deviceStatus.relay8 === 1 ? "开启" : "关闭",
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
      "## 设备控制能力与 Agent 交互规范\n" +
      "你不仅仅是一个聊天机器人，你是一个能够感知环境并控制设备的智能体 (Agent)。\n" +
      "为了确保操作的安全性和有效性，请遵循以下交互流程：\n\n" +
      "### 1. 分步执行原则 (Step-by-Step Execution)\n" +
      "- **不要一次性输出所有步骤的命令**。如果一个任务需要多个步骤（例如：先降温，再补水），请一次只建议一个步骤。\n" +
      "- **等待反馈**：在你输出控制命令后，用户端会显示执行按钮。用户点击执行后，系统会自动发送“指令已执行”的消息给你。收到该消息后，你再根据最新的传感器数据决定下一步操作。\n" +
      "- **闭环控制**：每次执行完命令后，必须检查传感器数据是否达到了预期效果。如果没有，请调整策略并再次尝试。\n\n" +
      "### 2. 决策流程\n" +
      "   a. **感知 (Perceive)**：分析当前传感器数据（temperature, humidity, etc.）和天气信息。\n" +
      "   b. **思考 (Think)**：使用 <REASONING> 标签输出你的思考过程。判断当前状态与目标状态的差距。\n" +
      "   c. **行动 (Act)**：如果需要调整，生成**单个步骤**的控制命令 JSON。\n" +
      "   d. **交互 (Interact)**：向用户解释你的计划，并请求确认（通过输出 JSON 触发前端的执行按钮）。\n\n" +
      "### 3. 控制命令格式\n" +
      "仅当确信需要操作时，输出如下 JSON（用代码块包裹）：\n" +
      "```json\n" +
      "{\n" +
      '  "action": "toggle_relay",\n' +
      '  "device": 5,\n' +
      '  "value": 1\n' +
      "}\n" +
      "```\n" +
      "（value: 1 为开启，0 为关闭）\n" +
      "或调节 LED：\n" +
      "```json\n" +
      "{\n" +
      '  "action": "set_led",\n' +
      '  "r": 255,\n' +
      '  "g": 100,\n' +
      '  "b": 50\n' +
      "}\n" +
      "```\n" +
      "注意：每次回复最多包含一个步骤的命令（可以包含并发的多个指令，只要它们属于同一个逻辑步骤）。不要试图在一个回复中完成跨时间段的任务。\n"

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

    const toolUsageInstruction =
      "## 工具使用可视化指示\n" +
      "当你使用任何 MCP 工具时，请在回复中包含 <TOOL_USED> 标签来显示工具使用情况：\n" +
      "```\n" +
      "<TOOL_USED toolName=\"工具名称\" description=\"工具描述\" result=\"success|error|loading\" executionTime=\"执行时间(毫秒)\" details=\"详细信息或错误信息\"></TOOL_USED>\n" +
      "```\n" +
      "示例：\n" +
      "- 成功调用：<TOOL_USED toolName=\"get_all_spectrum\" description=\"获取18通道光谱数据\" result=\"success\" executionTime=\"1200\"></TOOL_USED>\n" +
      "- 调用失败：<TOOL_USED toolName=\"mcp_weather\" description=\"查询天气信息\" result=\"error\" details=\"API密钥无效\"></TOOL_USED>\n" +
      "- 正在调用：<TOOL_USED toolName=\"mcp_brave_search\" description=\"搜索最新信息\" result=\"loading\"></TOOL_USED>\n" +
      "这些标签会在前端渲染为可视化的工具使用指示器，让用户清楚地看到你使用了哪些工具。"

    // MCP 工具说明 — 引导 AI 主动使用 Function Calling
    const mcpToolsInstruction = mcpToolDefs.length > 0
      ? `\n\n## 可用的 MCP 工具 (Function Calling)\n你已被授予以下工具的调用能力。请注意：对于这些工具，**必须使用原生 Function Calling (tool_calls)**，严禁使用 JSON 文本格式输出！\n\n可用工具列表：\n${mcpToolDefs.map(t => `- **${t.function.name}**: ${t.function.description}`).join('\n')}\n\n**🚨 严格执行规则：**\n1. **严禁**在回复中直接输出类似 \`{"action": "xxx"}\` 的 JSON 来调用这些工具。必须使用系统提供的 tool_calls 接口。\n2. **严禁编造、虚构或猜测任何信息**！当用户询问需要搜索的内容时，你**必须**主动调用搜索工具获取真实数据。\n3. **搜索类请求强制调用**：当用户说"帮我查"、"帮我搜"、"我想知道"、"找一下"、"搜索"等时，你**必须立即**调用相应的搜索工具，**绝对不能**凭记忆或编造答案。\n4. **禁止编造链接**：严禁编造任何网址、链接或引用。所有链接必须来自真实的工具调用结果。\n5. 当用户询问光谱数据、植物健康状况、NDVI 指数等问题时，你**必须**主动调用 \`get_all_spectrum\` 或 \`get_channel\` 工具获取实时数据。\n6. 当用户询问天气、路线规划等问题时，你**必须**主动调用对应的工具获取实时数据。\n7. 当用户的问题涉及作物病害、土壤管理、灌溉等农业话题时，如果有相关工具可用，应主动调用。\n8. 工具返回的数据是实时的、真实的，请优先使用工具数据而非猜测。\n9. 不需要询问用户是否调用工具，直接调用即可。\n\n**⚠️ 特别警告：**\n- 如果你没有调用工具就回答了需要搜索的问题，这是严重错误！\n- 如果你编造了任何链接或信息，这是严重违规！\n- 必须先调用工具获取真实数据，再基于结果回答用户。\n\n**光谱数据分析指南：**\n- 410-485nm (蓝紫光)：类胡萝卜素含量\n- 510-560nm (绿光)：叶绿素含量和氮素营养状态\n- 680nm (红光)：叶绿素吸收峰，反映光合作用强度\n- 730nm (红边)：植物胁迫响应指标\n- 760nm (近红外)：植物组织反射峰，反映生物量\n- NDVI 计算：(760 - 680) / (760 + 680)\n- 正常 NDVI 范围：0.6-0.8（健康植物）`
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

    let fullMessages: any[] = []
    let requestBody: any = {}
    // let targetUrl = apiUrl || "" // Already set above
    const hasImageContent = Array.isArray(messages) && messages.some((m: any) => {
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
        effectiveModel = 'qwen3.5-plus' // 优先使用视觉模型
      } else {
        effectiveModel = 'qwen3.5-plus' // 默认使用通用增强模型
      }
    }

    const modelLower = String(effectiveModel).toLowerCase()
    const isVLMModel = (
      modelLower.includes('vision') ||
      modelLower.includes('-vl-') ||
      /qwen\d*-vl/.test(modelLower) ||
      modelLower.includes('qvq') ||
      modelLower.includes('qwen3.5') // Qwen3.5 系列支持视觉
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
      const lastUser = ([...messages] as Array<{ role: string; content: string | any[] }>).reverse().find((m) => m?.role === "user")
      // ...
    } else if (isDashScope && useCompatibleMode) {
      // DashScope 兼容模式（OpenAI形状）
      // 规范URL，若为 /v1 结尾则补 /chat/completions
      if (/\/v1$/.test(targetUrl) && !/\/chat\/completions(\?|$)/.test(targetUrl)) {
        targetUrl = `${targetUrl}/chat/completions`
      }

      fullMessages = [
        {
          role: "system",
          content: `${finalSystemPrompt}\n\n${deviceControlInstruction}\n\n${enableReasoning ? reasoningInstruction : ""}\n\n${citationInstruction}\n\n${tasksInstruction}\n\n${chartInstruction}\n\n${monitorInstruction}\n\n${bentoInstruction}\n\n${controlBentoInstruction}\n\n${taskListInstruction}\n\n${axisInstruction}\n\n${toolUsageInstruction}${mcpToolsInstruction}`,
        },
        ...messages,
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
      const systemMessage = `${finalSystemPrompt}\n\n${deviceControlInstruction}\n\n${enableReasoning ? reasoningInstruction : ""}\n\n${citationInstruction}\n\n${tasksInstruction}\n\n${chartInstruction}\n\n${monitorInstruction}\n\n${bentoInstruction}\n\n${controlBentoInstruction}\n\n${taskListInstruction}\n\n${axisInstruction}\n\n${toolUsageInstruction}${mcpToolsInstruction}`

      // 转换消息格式：OpenAI format -> DashScope format
      // OpenAI: { type: "image_url", image_url: { url: "..." } } -> DashScope: { image: "..." }
      // OpenAI: { type: "text", text: "..." } -> DashScope: { text: "..." }
      const dashScopeMessages = messages.map((m: any) => {
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
          // incremental_output: true, // 移除 incremental_output 以获取全量文本，确保 acc 逻辑正确
          ...(enableSearch ? { enable_search: true } : {}),
        },
      }
      if (hasImageContent && /\/aigc\/text-generation\//.test(targetUrl)) {
        targetUrl = targetUrl.replace("/aigc/text-generation/", "/aigc/multimodal-generation/")
      }
    } else {
      // OpenAI 兼容模式
      fullMessages = [
        {
          role: "system",
          content: `${finalSystemPrompt}\n\n${deviceControlInstruction}\n\n${enableReasoning ? reasoningInstruction : ""}\n\n${citationInstruction}\n\n${tasksInstruction}\n\n${chartInstruction}\n\n${monitorInstruction}\n\n${bentoInstruction}\n\n${controlBentoInstruction}\n\n${taskListInstruction}\n\n${axisInstruction}\n\n${toolUsageInstruction}${mcpToolsInstruction}`,
        },
        ...messages,
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

    // === MCP Tool Call Resolution (Function Calling 预检) ===
    // 对于 OpenAI 兼容模式，先做一次非流式请求以检测 AI 是否要调用工具
    // 如果有 tool_calls，执行工具后再做流式请求生成最终回复
    // 优化：使用 heuristic (shouldPreflight) 避免对所有消息都进行预检，显著降低普通对话延迟
    if (shouldPreflight && !isDashScopeAppCall && (useCompatibleMode || !isDashScope)) {
      try {
        const preflightBody = {
          ...requestBody,
          stream: false,
          tools: mcpToolDefs,
        }
        
        // Ollama 特殊处理：Ollama 的 stream: false 模式下，tools 支持可能不完善，
        // 或者返回结构与 OpenAI 不完全一致。
        // 但根据报错信息 "cannot unmarshal object into Go struct field Message.messages.reasoning of type string"，
        // 这似乎是因为我们的 requestBody 中的 messages 包含了一些 Ollama 不认识的字段（如 reasoning）。
        // 我们需要清理一下 messages 中的字段。

        // 清理 requestBody.messages 中的额外字段
        if (preflightBody.messages) {
            preflightBody.messages = preflightBody.messages.map((m: any) => {
                const { role, content, name, tool_calls, tool_call_id } = m
                // 只保留标准字段
                const cleanMsg: any = { role, content }
                if (name) cleanMsg.name = name
                if (tool_calls) cleanMsg.tool_calls = tool_calls
                if (tool_call_id) cleanMsg.tool_call_id = tool_call_id
                return cleanMsg
            })
        }

        // 对于 DashScope 原生模式的非流式请求，不需要 SSE header
        const preflightHeaders = { ...headers }
        delete preflightHeaders["X-DashScope-SSE"]

        console.log('[MCP] Making preflight call to detect tool_calls...')
        const preflightRes = await fetch(targetUrl, {
          method: "POST",
          headers: preflightHeaders,
          body: JSON.stringify(preflightBody),
        })

        if (preflightRes.ok) {
          const preflightData = await preflightRes.json()
          const choice = preflightData.choices?.[0]

          if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
            // AI 决定调用工具！
            console.log('[MCP] AI requested tool calls:', choice.message.tool_calls.map((tc: any) => tc.function.name))

            // 将 AI 的 tool_call 消息加入会话
            fullMessages.push(choice.message)

            // 构造 ReadableStream 以便立即给前端反馈
            const encoder = new TextEncoder()
            const stream = new ReadableStream({
              async start(controller) {
                // Keep-Alive Interval to prevent timeout during long tool execution
                const keepAliveInterval = setInterval(() => {
                    try {
                        controller.enqueue(encoder.encode(": keep-alive\n\n"))
                    } catch (e) {
                        clearInterval(keepAliveInterval)
                    }
                }, 5000)

                try {
                  // 1. 立即推送工具调用状态
                  const toolStatusPayload = {
                    id: `tool-status-${Date.now()}`,
                    object: "chat.completion.chunk",
                    created: Date.now(),
                    model: effectiveModel,
                    tool_calls: choice.message.tool_calls
                  }
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(toolStatusPayload)}\n\n`))

                  // 2. 执行工具调用
                  for (const toolCall of choice.message.tool_calls) {
                    const fnName = toolCall.function.name
                    let fnArgs: Record<string, any> = {}
                    try { fnArgs = JSON.parse(toolCall.function.arguments || '{}') } catch { }

                    console.log(`[MCP] Executing tool: ${fnName}`, fnArgs)
                    const result = await executeMCPToolCall(fnName, fnArgs, mcpConfigs, appUrl)
                    console.log(`[MCP] Tool ${fnName} result:`, result.success ? 'success' : result.error)

                    // 将工具结果发送给前端，以便在工作室侧边栏展示
                    const toolResultPayload = {
                      id: `tool-result-${Date.now()}`,
                      object: "chat.completion.chunk",
                      created: Date.now(),
                      model: effectiveModel,
                      tool_result: {
                        name: fnName,
                        args: fnArgs,
                        result: result.success ? result.data : { error: result.error }
                      }
                    }
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(toolResultPayload)}\n\n`))

                    // 将工具结果加入会话
                    // 限制内容长度，防止爆 Context (尤其是网页抓取内容可能非常大)
                    let toolContent = JSON.stringify(result.success ? result.data : { error: result.error })
                    if (toolContent.length > 50000) {
                        toolContent = toolContent.slice(0, 50000) + "\n...[Content Truncated due to length]..."
                    }

                    fullMessages.push({
                      role: 'tool',
                      tool_call_id: toolCall.id,
                      content: toolContent
                    })
                  }

                  // 停止心跳
                  clearInterval(keepAliveInterval)

                  // 3. 检查工具执行结果，如果失败发送警告，并尝试自动重试 (Simple Retry Logic)
                  const toolResults = fullMessages.filter(m => m.role === 'tool')
                  
                  // 针对网页抓取的自动重试逻辑
                  // 如果抓取失败，且是 Firecrawl，尝试提示 AI 换一个 URL 或使用 Exa
                  const failedScrapes = toolResults.filter(m => {
                      try {
                          const c = JSON.parse(m.content as string)
                          return c.error && m.tool_call_id
                      } catch { return false }
                  })

                  if (failedScrapes.length > 0) {
                      console.log('[MCP] Detected failed tool calls, injecting retry instruction...')
                      // 查找失败的 tool call 原始请求
                      const failedCallIds = failedScrapes.map(m => m.tool_call_id)
                      const originalCalls = choice.message.tool_calls.filter((tc: any) => failedCallIds.includes(tc.id))
                      
                      const isScrapeFailure = originalCalls.some((tc: any) => tc.function.name === 'mcp_firecrawl_scrape')
                      
                      if (isScrapeFailure) {
                          // 注入系统消息，告知 AI 抓取失败，建议重试其他来源
                          // 修改逻辑：优先建议换一个 URL 继续尝试 Firecrawl，其次才建议 Exa
                          fullMessages.push({
                              role: 'system',
                              content: `⚠️ 上一次网页抓取失败 (可能是反爬虫或网络原因)。\n请**不要**放弃！请尝试以下步骤：\n1. **优先**：尝试使用 \`mcp_brave_search\` 或 \`mcp_exa_search\` 搜索该主题，找到**另一个不同的 URL**，然后再次调用 \`mcp_firecrawl_scrape\` 抓取那个新 URL。\n2. 如果依然失败，再直接使用 Exa 或 Brave 的搜索结果摘要回答。\n请务必获取到有效信息后再回答用户，直到成功为止。`
                          })
                      }
                  }

                  const failedTools = toolResults.filter(m => {
                    try {
                      const c = JSON.parse(m.content as string)
                      return c.error
                    } catch { return false }
                  })

                  if (failedTools.length > 0) {
                    const warningContent = "\n\n> ⚠️ 部分工具调用失败，正在尝试自动重试或寻找替代方案...\n\n"
                    const warningPayload = {
                      id: `tool-warning-${Date.now()}`,
                      object: "chat.completion.chunk",
                      created: Date.now(),
                      model: effectiveModel,
                      choices: [{ index: 0, delta: { content: warningContent }, finish_reason: null }]
                    }
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(warningPayload)}\n\n`))
                  }

                  // 4. 发起最终 AI 请求
                  console.log('[MCP] Tool results injected, starting final stream...')
                  
                  // 强制注入 System 指令，确保 AI 根据工具结果进行总结，而不是重复输出 JSON
                  fullMessages.push({
                    role: 'system',
                    content: `[SYSTEM] Tool execution completed. The results are provided in the 'tool' messages above. \nPlease use these results to provide a comprehensive and helpful response to the user. \nDo NOT output raw JSON or tool calls again unless necessary.`
                  })

                  requestBody = {
                    model: (requestBody as any).model || effectiveModel || 'qwen-plus',
                    messages: fullMessages,
                    stream: true,
                    temperature: 0.7,
                  }

                  // 清理 requestBody.messages 中的额外字段 (针对 Ollama 等严格后端)
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

                  const finalResponse = await fetch(targetUrl, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(requestBody),
                  })

                  if (!finalResponse.ok) {
                    const errorMsg = `Final AI response failed: ${finalResponse.status}`
                    console.error(errorMsg)
                    controller.enqueue(encoder.encode(`data: {"error": "${errorMsg}"}\n\n`))
                    controller.close()
                    return
                  }

                  // 5. 转发 AI 的流式响应
                  if (finalResponse.body) {
                    const reader = finalResponse.body.getReader()
                    const decoder = new TextDecoder()
                    let buffer = ""
                    
                    while (true) {
                      const { done, value } = await reader.read()
                      if (done) break
                      
                      // 检查是否包含 [DONE] 标记
                      const chunk = decoder.decode(value, { stream: true })
                      buffer += chunk
                      
                      // 直接转发数据
                      controller.enqueue(value)
                    }
                    
                    // 确保发送 [DONE] 标记
                    if (!buffer.includes("data: [DONE]")) {
                      controller.enqueue(encoder.encode("data: [DONE]\n\n"))
                    }
                  } else {
                    // 如果没有响应体，发送 [DONE] 标记
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"))
                  }

                  // 6. 扣除配额
                  if (useSystemKey) {
                    try { await incrementAiUsage(user.id as number) } catch (e) { }
                  }

                  controller.close()
                } catch (err: any) {
                  clearInterval(keepAliveInterval)
                  console.error('[MCP Stream Error]', err)
                  controller.enqueue(encoder.encode(`data: {"error": "Stream error: ${err.message}"}\n\n`))
                  controller.close()
                }
              }
            })

            return new Response(stream, {
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
              }
            })

          } else if (choice?.message?.content) {
            // AI 没有调用工具，直接返回内容（转为 SSE 流）
            console.log('[MCP] No tool calls needed, returning preflight content as SSE')
            const content = choice.message.content
            const encoder = new TextEncoder()
            const payload = {
              id: preflightData.id || `${Date.now()}`,
              object: "chat.completion.chunk",
              created: Date.now(),
              model: effectiveModel,
              choices: [{ index: 0, delta: { content }, finish_reason: "stop" }],
            }
            const sseBody = `data: ${JSON.stringify(payload)}\n\ndata: [DONE]\n\n`

            // 扣除系统 Key 配额
            if (useSystemKey) {
              try { await incrementAiUsage(user.id as number) } catch (e) { console.error("Failed to increment AI usage:", e) }
            }

            return new Response(sseBody, {
              headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }
            })
          }
          // 如果既无 tool_calls 也无 content（罕见情况），继续走正常流式路径
        } else {
          console.warn('[MCP] Preflight call failed (status:', preflightRes.status, '), falling back to streaming without tools')
        }
      } catch (preflightError) {
        console.error('[MCP] Preflight error, falling back to normal streaming:', preflightError)
      }
    }
    // === MCP Tool Call Resolution 结束 ===

    console.log('[MCP] Making final streaming request to AI...')
    
    // 同样清理 final requestBody 的 messages
    // 确保 requestBody.messages 不为空，防止 undefined 错误
    if (!requestBody.messages || requestBody.messages.length === 0) {
        requestBody.messages = fullMessages.length > 0 ? fullMessages : messages;
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
            let acc = ""
            let buffer = "" // 添加缓冲区
            if (!reader) { controller.close(); return }
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value, { stream: true })
                buffer += chunk
                const lines = buffer.split("\n")
                // 保留最后一个可能不完整的行
                buffer = lines.pop() || ""

                for (const line of lines) {
                  if (line.startsWith("data:")) {
                    const data = line.slice(5).trim()
                    if (data === "[DONE]") continue
                    try {
                      const json = JSON.parse(data)
                      const content =
                        json.output?.choices?.[0]?.message?.content ||
                        json.output?.text || ""
                      if (typeof content === "string") {
                        // 百炼应用 SSE 默认通常返回增量，但也取决于具体配置
                        // 如果 acc 逻辑导致无法输出，说明 content 是增量而非全量
                        // 这里尝试自适应：如果 content 长度小于 acc 长度，可能是增量（或重新开始），或者 content 就是 delta

                        // 观察发现百炼应用 SSE 返回的 text 通常是全量（accumulated）
                        // 但为了保险，我们可以检查 content 是否包含 acc 前缀
                        let next = ""
                        if (content.startsWith(acc)) {
                          next = content.slice(acc.length)
                          acc = content
                        } else {
                          // 如果不以 acc 开头，可能 content 本身就是 delta，或者发生了跳跃
                          // 假设是 delta
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
          let acc = ""
          let accReasoning = ""
          let reasoningClosed = false
          let buffer = "" // 添加缓冲区

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

                    // Handle Search Citations
                    if (json.output?.choices?.[0]?.finish_reason === "stop" && json.output?.choices?.[0]?.message?.content) {
                      const searchInfo = json.output?.search_info
                      if (searchInfo && Array.isArray(searchInfo.search_results) && searchInfo.search_results.length > 0) {
                        const sources = searchInfo.search_results.map((item: any, idx: number) => ({
                          number: idx + 1,
                          title: item.title,
                          url: item.url,
                          description: item.snippet || "",
                          quote: ""
                        }))

                        const sourcesTag = `\n\n<SOURCES> ${JSON.stringify(sources)} </SOURCES>`
                        const openaiFormat = {
                          id: json.request_id,
                          object: "chat.completion.chunk",
                          created: Date.now(),
                          model: model,
                          choices: [{ index: 0, delta: { content: sourcesTag }, finish_reason: null }]
                        }
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`))
                      }
                    }

                    // Handle Reasoning Content (DeepSeek-R1 style via DashScope)
                    // DashScope returns accumulated reasoning_content
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
                        // If this is the start of reasoning, prepend <think>
                        const prefix = accReasoning.length === nextReasoning.length ? "<think>" : ""

                        const openaiFormat = {
                          id: json.request_id,
                          object: "chat.completion.chunk",
                          created: Date.now(),
                          model: model,
                          choices: [{
                            index: 0,
                            delta: { content: prefix + nextReasoning },
                            finish_reason: null
                          }]
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
                        // If we were reasoning and haven't closed it, close it now
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
                          choices: [
                            {
                              index: 0,
                              delta: { content: prefix + next },
                              finish_reason: json.output?.finish_reason || null,
                            },
                          ],
                        }
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`)
                        )
                      }
                    }

                    // If finished and reasoning still open, close it
                    if (json.output?.finish_reason === "stop" && accReasoning.length > 0 && !reasoningClosed) {
                      const openaiFormat = {
                        id: json.request_id,
                        object: "chat.completion.chunk",
                        created: Date.now(),
                        model: model,
                        choices: [{ index: 0, delta: { content: "</think>\n\n" }, finish_reason: null }]
                      }
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`))
                      reasoningClosed = true
                    }

                  } catch (e) {
                    console.error("Parse error:", e)
                  }
                }
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            controller.close()

            // 成功完成后，扣除配额（如果使用了系统 Key）
            if (useSystemKey) {
              try {
                await incrementAiUsage(user.id as number)
              } catch (e) {
                console.error("Failed to increment AI usage:", e)
              }
            }
          } catch (error) {
            controller.error(error)
          }
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    } else {
      // OpenAI格式安全直通转发 (修复 Controller closed 问题)
      let directStream = response.body

      // 如果使用了系统 Key，记录配额消耗
      if (useSystemKey && user) {
        try {
          // 不等待，后台记录
          incrementAiUsage(user.id as number).catch(e => console.error("Failed to increment AI usage:", e))
        } catch (e) { }
      }

      if (!directStream) {
        return new Response('No response body from API', { status: 500 })
      }

      return new Response(directStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          // 为了流稳定性，最好从原始返回里抄一些头
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
