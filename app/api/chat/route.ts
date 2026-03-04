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

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    await initDB()
    const { messages, apiKey: rawApiKey, apiUrl: rawApiUrl, model, systemPrompt, enableSearch, enableReasoning, deviceData, weatherData } =
      await req.json()

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

    // 格式化设备数据（将需要除以10的数据转换为正确的小数）
    const formattedDeviceData = deviceData ? {
      ...deviceData,
      temperature: (deviceData.temperature !== undefined && deviceData.temperature !== null) ? deviceData.temperature.toFixed(1) + '°C' : "暂无数据 (UNKNOWN)",
      humidity: (deviceData.humidity !== undefined && deviceData.humidity !== null) ? deviceData.humidity.toFixed(1) + '%' : "暂无数据 (UNKNOWN)",
      earth_temp: (deviceData.earth_temp !== undefined && deviceData.earth_temp !== null) ? deviceData.earth_temp.toFixed(1) + '°C' : "暂无数据 (UNKNOWN)",
      light: (deviceData.light !== undefined && deviceData.light !== null) ? deviceData.light + ' lux' : "暂无数据 (UNKNOWN)",
      co2: (deviceData.co2 !== undefined && deviceData.co2 !== null) ? deviceData.co2 + ' ppm' : "暂无数据 (UNKNOWN)",
      earth_water: (deviceData.earth_water !== undefined && deviceData.earth_water !== null) ? deviceData.earth_water.toFixed(1) + '%' : "暂无数据 (UNKNOWN)",
      earth_ec: (deviceData.earth_ec !== undefined && deviceData.earth_ec !== null) ? deviceData.earth_ec + ' μS/cm' : "暂无数据 (UNKNOWN)",
      earth_n: (deviceData.earth_n !== undefined && deviceData.earth_n !== null) ? deviceData.earth_n + ' mg/kg' : "暂无数据 (UNKNOWN)",
      earth_p: (deviceData.earth_p !== undefined && deviceData.earth_p !== null) ? deviceData.earth_p + ' mg/kg' : "暂无数据 (UNKNOWN)",
      earth_k: (deviceData.earth_k !== undefined && deviceData.earth_k !== null) ? deviceData.earth_k + ' mg/kg' : "暂无数据 (UNKNOWN)",
      relay5: deviceData.relay5 === 1 ? '【开启】（水泵）' : (deviceData.relay5 === 0 ? '【关闭】（水泵）' : "状态未知"),
      relay6: deviceData.relay6 === 1 ? '【开启】（风扇）' : (deviceData.relay6 === 0 ? '【关闭】（风扇）' : "状态未知"),
      relay7: deviceData.relay7 === 1 ? '【开启】（补光灯）' : (deviceData.relay7 === 0 ? '【关闭】（补光灯）' : "状态未知"),
      relay8: deviceData.relay8 === 1 ? '【开启】（白灯）' : (deviceData.relay8 === 0 ? '【关闭】（白灯）' : "状态未知"),
      led1: deviceData.led1 !== undefined ? `${deviceData.led1} (红色)` : "未知",
      led2: deviceData.led2 !== undefined ? `${deviceData.led2} (绿色)` : "未知",
      led3: deviceData.led3 !== undefined ? `${deviceData.led3} (蓝色)` : "未知",
      timestamp: deviceData.timestamp ? new Date(deviceData.timestamp).toLocaleString('zh-CN') : "未知时间"
    } : null

    // 添加当前数据上下文
    let contextInfo = ''
    if (formattedDeviceData) {
      contextInfo += `\n\n## 当前设备数据（这是唯一真实的数据源。注意：如果这里显示【开启】，那就是开启，不管你是否发送了关闭指令！严禁编造设备已关闭。）\n\`\`\`json\n${JSON.stringify(formattedDeviceData, null, 2)}\n\`\`\`\n`
    } else {
      contextInfo += `\n\n## 当前设备数据\n目前系统未能获取到最新的传感器数据。请告知用户数据连接可能中断，或设备处于离线状态。\n`
    }
    
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
      const tasks = getAllTasks()
      const tasksContext = tasks.map(t => ({
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

    const finalSystemPrompt = enhancedSystemPrompt + contextInfo

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
      "8. 不要在正文中直接展开 JSON"
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
      "当用户要求查看设备控制、调节设备状态或你建议进行设备调控时，请在回复中包含 <CONTROL_BENTO></CONTROL_BENTO> 标签（标签内不需要任何内容）。然后，必须在标签之后简要说明你的调控建议或理由。如果用户明确表达了“是”、“确认”、“执行”等意图，或者你非常有把握需要执行某些操作，请务必同时输出 JSON 格式的控制命令，以便系统自动执行。"
    const taskListInstruction =
      "当用户要求查看、管理或删除定时任务列表时，请在回复中包含 <SCHEDULED_TASKS></SCHEDULED_TASKS> 标签（标签内不需要任何内容）。这将在前端渲染一个交互式的真实任务列表组件。重要：因为你已经输出了 <SCHEDULED_TASKS> 标签，请不要再用文本重复列出任务内容，也不要描述“列表为空”或“包含X个任务”（除非你是在分析任务的合理性），因为你的文本描述可能与组件实时渲染的真实状态不一致。只需输出标签即可，让组件负责展示。"
    const bentoInstruction = 
      "当用户询问设备状态、环境数据、传感器读数或想要查看当前概况时，请直接在回复中插入 <DEVICE_BENTO></DEVICE_BENTO> 标签（标签内不需要任何内容）。然后，基于这些数据对当前环境状况进行简要的分析（例如：温湿度是否适宜，是否需要开启设备等）。请务必在 <DEVICE_BENTO> 标签之后输出分析内容，不要只输出标签。"
    const axisInstruction =
      "当需要返回可视化图表时，生成 Vega-Lite 规范的 JSON，并使用 <CHART type=\"vega-lite\"> 与 </CHART> 包裹；或返回 ECharts option 的 JSON，并使用 <CHART type=\"echarts\"> 与 </CHART> 包裹。只输出合法的 JSON，不要附加说明或代码块。"

    // 检测是否使用DashScope API
    const isDashScope =
      targetUrl?.includes("dashscope.aliyuncs.com") ||
      model?.startsWith("qwen")
    const isCompatibleMode = targetUrl?.includes("compatible-mode/v1") ?? false
    const isDashScopeAppCall = /\/api\/v1\/apps\/[^/]+\/completion(\?|$)/.test(targetUrl || "")

    let fullMessages
    let requestBody
    // let targetUrl = apiUrl || "" // Already set above
    const hasImageContent = Array.isArray(messages) && messages.some((m: any) => {
      const c = m?.content
      if (Array.isArray(c)) return c.some((x: any) => x?.type === "image_url" || x?.image_url || x?.image)
      return false
    })

    // 如果是DashScope且包含图片，强制使用兼容模式（因为Native API不支持Base64图片）
    let useCompatibleMode = isCompatibleMode
    if (isDashScope && hasImageContent && !isCompatibleMode) {
      useCompatibleMode = true
      targetUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    }

    // 智能模式 (Auto) 模型选择逻辑
    let effectiveModel = model || ''
    
    if (effectiveModel === 'auto') {
        if (enableReasoning) {
            effectiveModel = 'deepseek-r1' // 优先使用推理模型
        } else if (hasImageContent) {
            effectiveModel = 'qwen-vl-max' // 优先使用视觉模型
        } else {
            effectiveModel = 'qwen-plus' // 默认使用通用增强模型
        }
    }

    const modelLower = String(effectiveModel).toLowerCase()
    const isVLMModel = (
      modelLower.includes('vision') ||
      modelLower.includes('-vl-') ||
      /qwen\d*-vl/.test(modelLower) ||
      modelLower.includes('qvq')
    )

    if (hasImageContent) {
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
          content: `${finalSystemPrompt}\n\n${deviceControlInstruction}\n\n${enableReasoning ? reasoningInstruction : ""}\n\n${citationInstruction}\n\n${tasksInstruction}\n\n${chartInstruction}\n\n${monitorInstruction}\n\n${bentoInstruction}\n\n${controlBentoInstruction}\n\n${taskListInstruction}\n\n${axisInstruction}`,
        },
        ...messages,
      ]

      requestBody = {
        model: effectiveModel || "qwen-plus",
        messages: fullMessages,
        stream: true,
        temperature: 0.7,
        ...(enableSearch ? { enable_search: true } : {}),
      }
    } else if (isDashScope) {
      // DashScope 原生API格式
      const systemMessage = `${finalSystemPrompt}\n\n${deviceControlInstruction}\n\n${enableReasoning ? reasoningInstruction : ""}\n\n${citationInstruction}\n\n${tasksInstruction}\n\n${chartInstruction}\n\n${monitorInstruction}\n\n${bentoInstruction}\n\n${controlBentoInstruction}\n\n${taskListInstruction}\n\n${axisInstruction}`

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
      // ... OpenAI ...
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

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      return Response.json(
        { error: `API Error: ${response.status} - ${error}` },
        { status: response.status }
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
      // OpenAI格式直接返回
      // 成功响应后，扣除配额（如果使用了系统 Key）
      // 注意：流式响应可能无法精确判断是否完整，但只要开始传输就算一次调用
      if (useSystemKey) {
          try {
              await incrementAiUsage(user.id as number)
          } catch (e) {
              console.error("Failed to increment AI usage:", e)
          }
      }

      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
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
