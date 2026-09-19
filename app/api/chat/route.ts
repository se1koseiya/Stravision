export const runtime = 'nodejs'

export async function GET() {
  return Response.json({
    message: "Chat API is working. Use POST to send messages.",
  })
}

import { generateMemoryEnhancedPrompt, extractPreferencesFromMessage } from '@/lib/ai/memory-prompt-enhancer'
import { getPersonaPrompt } from '@/lib/ai/persona-system'
import { resolveProvider, normalizeOpenAIChatCompletionsUrl, readProvidersConfig, resolveDefaultModelId } from '@/lib/ai/provider-resolver'
import { learnFromConversation } from '@/lib/ai/auto-learning-service'
import { extractMemoriesFromConversation, persistMemories } from '@/lib/ai/memory-extraction-service'
import { getUserMemoryForPrompt, writeUserMemory, getMemoryKeyLabel } from '@/lib/ai/user-memory-file-service'
import { buildPersonalizationPrompt, getPersonalization } from '@/lib/db/personalization-service'
import { getAllTasks } from '@/lib/db/scheduler-service'
import { initDB } from '@/lib/db/database'
import { getSummarizationConfig, STEPPER } from '@/lib/constants'
import { getCurrentUser } from '@/lib/auth'
import { getUserAiQuota, reserveAiUsage, refundAiUsage } from '@/lib/db/ai-quota-service'
import { checkCreditAllowance, settleCredits, estimateTokens, getCreditsConfig } from '@/lib/db/credit-service'
import { getMCPToolDefinitions } from '@/lib/mcp/mcp-tool-definitions'
import { executeMCPToolCall } from '@/lib/mcp/mcp-tool-executor'
import { isMultimodal } from '@/lib/mcp/builtin-device-control'
import { initSessionTaskList, clearSessionTaskList, getSessionTaskList } from '@/lib/mcp/builtin-agent-tasks'
import { createOrchestrator, globalOrchestratorManager } from '@/lib/ai/agent-orchestrator'
import type { AgentContext } from '@/lib/ai/agent-orchestrator/types'
import { getRelevantSkillsContentCached } from '@/lib/ai/skill-router-cached'
import { executeToolCallsSmart } from '@/lib/ai/parallel-tool-executor'
import { waitForUserInput, cancelPendingUserInput } from '@/lib/ai/pending-user-input'
import { getCachedResponse, cacheResponse } from '@/lib/ai/response-cache'
import { IS_DESKTOP_APP } from '@/lib/desktop-mode'
import { generateCompactSystemPrompt, filterDisabledFeatures, type AIFeatureConfig } from '@/lib/ai/prompt-templates'
import fs from 'node:fs/promises'
import path from 'node:path'

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

// 响应过滤器与旧版设备指令清洗逻辑已抽至 lib/ai/agent-loop/response-filters.ts（可单测）
import { filterBareTaskListJson, extractDeviceActionsFromResponse, extractLegacyDeviceControlCalls, sanitizeLegacyDeviceControlMessages } from '@/lib/ai/agent-loop/response-filters'

export async function POST(req: Request) {
  // 这两个变量在 try 外声明，以便外层 catch 能访问并退还配额
  let quotaReserved = false
  let userId: number | null = null
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    userId = user.id as number

    await initDB()
    
    // 读取 AI 功能配置
    const aiFeatures = await getAIFeaturesConfig()
    console.log('[Chat API] AI Features Config:', aiFeatures ? 'Loaded' : 'Using defaults')
    
    const { messages, apiKey: rawApiKey, apiUrl: rawApiUrl, model, systemPrompt: rawSystemPrompt, enableSearch, enableReasoning, deviceData, weatherData, mcpConfigs, mandatorySkillsEnabled, deviceOnline, lockedCollectionId, persona, enablePlanning, voiceMode, customModels } =
      await req.json()

    // 语音助手模式：限制回复长度，避免 TTS 合成时间过长（不影响文字对话）
    const VOICE_MAX_TOKENS = 300
    const VOICE_BREVITY_SUFFIX = '\n\n【语音模式】请保持回复简洁，控制在2-3句话以内（约80字），直接回答核心问题，不要展开长篇解释。'
    const systemPrompt = voiceMode ? (rawSystemPrompt || '') + VOICE_BREVITY_SUFFIX : rawSystemPrompt

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

    // 当未指定模型时，从 providers 配置中解析实际默认模型（而非硬编码）
    if (effectiveModel === 'auto') {
      const providersConfig = await readProvidersConfig()
      const defaultModelId = resolveDefaultModelId(providersConfig)
      effectiveModel = defaultModelId || 'auto'
    }

    const resolved = await resolveProvider(effectiveModel, userApiKey, userApiUrl)

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
    // 🚨 只有"确实走平台 Key"才算系统用量：用户自带 key（user-custom）时，
    // 无论模型 id 是否与系统供应商重名，都不检查、不扣减平台积分 ——
    // 否则 Plus 用户配了自己的 key 仍被积分体系拦（历史上 resolved 恒为 truthy，
    // 把 user-custom 也算成了系统 key）。
    // 🚨 桌面端整体豁免（2026-09-14 用户实测 403 后定稿）：向导配的 Key 存本地
    //    providers 配置（服务端 resolveProvider 解析），前端请求不带 apiKey →
    //    !userApiKey=true 被误判成平台 Key → 403 会员墙。桌面端 = 本地运行 +
    //    BYOK，平台配额/会员/结算整个体系不适用（useSystemKey=false 同时跳过
    //    上方校验分支与流结束的 settleCredits 结算回调）。
    const useSystemKey = !IS_DESKTOP_APP && (!userApiKey || (!!resolved && resolved.providerId !== 'user-custom'))

    // ===== AI 助手积分制度（token 计费 × 模型倍率 × 全局倍率） =====
    // 开启时：请求前仅做额度检查，流结束后按真实 usage 结算并在 [DONE] 前推送 credit_usage 事件
    // 关闭时：回退旧的按次预扣逻辑（reserveAiUsage/refundAiUsage）
    const creditConfig = await getCreditsConfig()
    const creditsEnabled = creditConfig.enabled

    // token 用量追踪（上游流式响应的 usage 字段；agent 多轮会多次累计）
    const usageTracker = { input: 0, output: 0, hasReal: false }
    const trackUsage = (u: unknown) => {
      const usage = u as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined
      if (!usage) return
      const p = Number(usage.prompt_tokens) || 0
      const c = Number(usage.completion_tokens) || 0
      if (p || c) {
        usageTracker.input += p
        usageTracker.output += c
        usageTracker.hasReal = true
      }
    }

    // 流结束时结算积分并推送 credit_usage 事件（气泡下方显示消耗）
    // outputText：本分支累计的输出文本（上游未返回 usage 时本地估算）
    //
    // 🔥 估算关键：不 JSON.stringify 整个 messages 数组 —— 视觉巡检工具（take_camera_snapshot
    // 等）会把 base64 图片塞进 tool 消息的 content 里，JSON 化后单张图就能膨胀成几兆字符，
    // 按 estimateTokens 的 0.3/字符 算成数万 token，扣费失控（典型异常：13376.21）。
    // 改为只提取 messages 中"语言文本"字段（content 字符串 / content[].type=='text'）拼接，
    // 天然跳过 base64 image_url 等非语言结构。再叠加 estimateTokens 内部的 base64 剥离兜底。
    const emitCreditEvent = async (
      controller: ReadableStreamDefaultController<Uint8Array>,
      encoder: TextEncoder,
      outputText: string,
    ) => {
      try {
        if (!creditsEnabled || !useSystemKey || !user?.id) return
        let inputTokens = usageTracker.input
        let outputTokens = usageTracker.output
        let estimated = false
        if (!usageTracker.hasReal) {
          estimated = true
          let inputText = ''
          for (const m of (messages || []) as any[]) {
            if (!m || typeof m !== 'object') continue
            const c = m.content
            if (typeof c === 'string') {
              inputText += c + '\n'
            } else if (Array.isArray(c)) {
              for (const part of c) {
                if (part && part.type === 'text' && typeof part.text === 'string') {
                  inputText += part.text + '\n'
                }
              }
            }
            // assistant 的 tool_calls.arguments 也要计入（多轮结构化推理依赖）
            if (Array.isArray(m.tool_calls)) {
              for (const tc of m.tool_calls) {
                if (tc?.function?.arguments) inputText += String(tc.function.arguments) + '\n'
              }
            }
          }
          inputTokens = estimateTokens(inputText)
          outputTokens = estimateTokens(outputText || '')
        }
        const result = await settleCredits(user.id as number, inputTokens, outputTokens, effectiveModel || 'auto', estimated, customModels)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'credit_usage', credit: result })}\n\n`))
      } catch (e) {
        console.error('[Credits] emit event failed:', e)
      }
    }

    /**
     * 🔥 记忆提取与持久化（在所有流式路径结束时调用，让"AI 记住你"对任何消息都生效）
     *
     * 之前只挂在 Multi-Round Agent Loop 路径，导致简单对话（无工具关键词/提及/图片）的
     * 普通流式路径完全跳过记忆提取，用户感知不到"AI 记得我"。
     */
    const extractAndPersistMemory = async (
      controller: ReadableStreamDefaultController<Uint8Array>,
      encoder: TextEncoder,
      aiResponseText: string,
      deviceStatus?: any,
    ) => {
      const savedMemories: Array<{ key: string; value: string }> = []
      try {
        // 提取最近 5 条用户消息（按时间升序）
        const recentUserTexts = messages
          .filter((m: any) => m.role === 'user')
          .slice(-5)
          .map((m: any) =>
            typeof m.content === 'string'
              ? m.content
              : (Array.isArray(m.content) ? m.content.find((c: any) => c.type === 'text')?.text || '' : '')
          )
          .filter((t: string) => t && t.trim())

        // 从 AI 回复解析设备动作（普通路径可能没有此上下文，容错处理）
        let deviceActions: any[] = []
        try {
          deviceActions = extractDeviceActionsFromResponse(aiResponseText)
        } catch { /* ignore */ }

        // 环境数据
        const environmentData: { temperature?: number; humidity?: number; timeOfDay?: number } = {
          timeOfDay: new Date().getHours(),
        }
        if (deviceStatus && typeof deviceStatus === 'object') {
          if (typeof deviceStatus.temperature === 'number') environmentData.temperature = deviceStatus.temperature
          if (typeof deviceStatus.humidity === 'number') environmentData.humidity = deviceStatus.humidity
        }

        // 并行：LLM 提取 + 正则兜底 + 自动学习（设备模式）
        // 🎨 个性化开关：用户在「设置 → 记忆」中关闭「允许助手记住我」时不提取记忆
        const personalCfg = await getPersonalization(user.id as number).catch(() => null)
        const memoryEnabled = personalCfg ? personalCfg.memoryEnabled : true
        await Promise.all([
          (async () => {
            if (!memoryEnabled) return
            try {
              const extracted = await extractMemoriesFromConversation(recentUserTexts, aiResponseText)
              if (extracted.memories.length > 0) {
                const saved = await persistMemories(user.id as number, extracted)
                await writeUserMemory(user.id as number, extracted.memories.map(m => ({ key: m.key, value: m.value })))
                for (const m of extracted.memories) {
                  if (m.confidence >= 0.6 && !savedMemories.some(s => s.key === m.key)) {
                    savedMemories.push({ key: m.key, value: m.value })
                  }
                }
                if (saved > 0) {
                  console.log(`[MemoryExtraction] Learned ${saved} memory entries: ${extracted.summary}`)
                }
              }
              // 兜底：正则提取姓名
              const regexPrefs = extractPreferencesFromMessage(recentUserTexts.join('\n'), aiResponseText)
              const namePref = regexPrefs.find(p => p.key === 'user_name')
              if (namePref) {
                await writeUserMemory(user.id as number, [{ key: 'user_name', value: namePref.value }])
                if (!savedMemories.some(s => s.key === 'user_name')) {
                  savedMemories.push({ key: 'user_name', value: namePref.value })
                }
                console.log(`[MemoryExtraction] Regex captured user_name: ${namePref.value}`)
              }
            } catch (e) {
              console.error('[MemoryExtraction] Failed:', e)
            }
          })(),
          // 自动学习设备模式（容错）
          (async () => {
            try {
              await learnFromConversation({
                userId: user.id as number,
                userMessage: recentUserTexts.join('\n'),
                aiResponse: aiResponseText,
                deviceActions: deviceActions.length > 0 ? deviceActions : undefined,
                environmentData
              })
            } catch (e) {
              console.error('[AutoLearning] Failed:', e)
            }
          })()
        ])

        // 推送 memory_saved 事件给前端
        if (savedMemories.length > 0) {
          const memoriesWithLabel = savedMemories.map(m => ({ key: m.key, label: getMemoryKeyLabel(m.key), value: m.value }))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'memory_saved', memories: memoriesWithLabel })}\n\n`))
          console.log(`[MemoryExtraction] Pushed memory_saved event: ${savedMemories.map(m => m.key).join(', ')}`)
        }
      } catch (e) {
        console.error('[MemoryExtraction] Top-level failed:', e)
      }
    }

    // 请求前配额检查
    // 🔥 诊断日志：排查「额度耗尽仍能聊天」时，先确认检查是否被跳过（useSystemKey=false）
    //    以及积分制实际算出多少剩余。定位完成后可保留（量很小）。
    //    注：resolved 在此处被 TS 收窄为 never（上方 if/else 已穷尽分支），需断言取值。
    const _resolvedProviderId = (resolved as { providerId?: string } | null)?.providerId ?? 'null'
    console.log(
      `[Quota] check: userId=${user.id} useSystemKey=${useSystemKey} ` +
      `creditsEnabled=${creditsEnabled} userApiKey=${userApiKey ? 'PROVIDED' : 'NONE'} ` +
      `resolvedProvider=${_resolvedProviderId}`
    )
    if (useSystemKey) {
      if (creditsEnabled) {
        // 积分制：检查月度额度 + 充值余额（不预扣，流结束按实际结算）
        const denyReason = await checkCreditAllowance(user.id as number)
        if (denyReason) {
          console.log(`[Quota] DENIED (credits): ${denyReason}`)
          return Response.json({ error: `${denyReason}。` }, { status: 403 })
        }
        console.log(`[Quota] allowed (credits passed)`)
      } else {
        // 旧按次配额：原子预扣
        quotaReserved = await reserveAiUsage(user.id as number)
        if (!quotaReserved) {
          // 预扣失败 → 配额不足，读取详情用于构造友好提示
          const quota = await getUserAiQuota(user.id as number)
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
        console.log(`[Quota] allowed (legacy quota reserved)`)
      }
    } else {
      console.warn(
        `[Quota] SKIPPED: useSystemKey=false —— 本次请求不检查也不扣减平台额度 ` +
        `(userApiKey=${userApiKey ? 'PROVIDED' : 'NONE'}, resolved=${_resolvedProviderId})`
      )
    }



    // === MCP Function Calling 集成 ===
    // 根据用户启用的 MCP 服务，生成 AI 可调用的工具定义
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let mcpToolDefs = getMCPToolDefinitions(mcpConfigs || [])

    // 🔥 根据 AIFeatureConfig 过滤 agent 工具包中被禁用的工具
    if (aiFeatures) {
      // 设备控制工具分类：
      //   基础控制 (toggle_relay/set_led/control_camera/reset_camera) 受 enableDeviceControl 控制
      //   视觉巡检 (take_camera_snapshot/move_camera_and_look) 受 enableVisionInspection 控制
      //     —— enableVisionInspection===false 时禁用视觉类，enableDeviceControl===false 时一并禁用全部
      const basicDeviceTools = new Set(['toggle_relay', 'set_led', 'control_camera', 'reset_camera'])
      const visionDeviceTools = new Set(['take_camera_snapshot', 'move_camera_and_look'])
      const deviceControlDisabled = aiFeatures.enableDeviceControl === false
      const visionDisabled = aiFeatures.enableVisionInspection === false || deviceControlDisabled

      mcpToolDefs = mcpToolDefs.filter(tool => {
        const name = tool.function.name
        if (name === 'ask_user_question' && aiFeatures.enableClarify === false) return false
        if ((name === 'cron_create' || name === 'cron_list' || name === 'cron_delete') && aiFeatures.enableScheduleTask === false) return false
        if (basicDeviceTools.has(name) && deviceControlDisabled) return false
        if (visionDeviceTools.has(name) && visionDisabled) return false
        return true
      })
    }
    
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

    // 注入 Persona 专属 prompt（种植专家/新手向导/系统工程师）
    // 🔥 注入位置在 system prompt 开头，提高 AI 对角色身份的执行优先级
    if (persona) {
      const personaPrompt = getPersonaPrompt(persona)
      enhancedSystemPrompt = personaPrompt + '\n\n' + enhancedSystemPrompt
      console.log(`[Chat API] Persona activated (prepended): ${persona}`)
    }
    
    if (fromCache) {
      console.log('[Chat API] ✅ Skill routing cache hit - saved 300-500ms');
    } else {
      console.log('[Chat API] Skill routing cache miss - computed fresh');
    }

    // 知识库上下文注入策略（全部走 admin knowledgeConfig / 用户操作）：
    //   1. lockedCollectionId 非空（来自 KB 详情页）：强制锁定到该 collection
    //   2. 用户消息含 `/<collection name>` 指令：解析后锁定到该 collection
    //   3. 任意 query（>2 字）自动检索用户个人+已订阅市场 KB（去掉原 8-500 长度门限）
    //   4. 显式 `/<title>` 引用：把整个条目内容也拉取作为强上下文（兼容旧 @知识库:<title> 语法）
    const slugMatch = lastUserText.match(/\/([^\s/][^\n\r]{0,80}?)(?=\s+(?:请|帮|我要|帮我|麻烦|能不能|可以吗|怎么|如何|，|。|？|！|,|\.|\?)|[\s\n]|$)/)
    const explicitCollectionRef = slugMatch?.[1]?.trim()
    // 显式条目引用支持两种语法：
    //   1. /<title>          （新：通过 / 指令）
    //   2. @知识库:<title>   （旧：保留兼容）
    const refMatch = lastUserText.match(/\/([^\s/][^\n\r]{0,80}?)(?=\s+(?:请|帮|我要|帮我|麻烦|能不能|可以吗|怎么|如何|，|。|？|！|,|\.|\?)|[\s\n]|$)/)
      || lastUserText.match(/@知识库[:：]\s*([^\n]+?)(?=\s*(?:\n|$|，|。|；|？|！|请|帮|我要|帮我|麻烦|能不能|可以吗|？|!|,|\.|\?))/m)
      || lastUserText.match(/@知识库[:：]\s*([^\n]+?)(?:\s+(?:请|帮|我要|帮我|麻烦|能不能|可以吗|怎么|如何|，|。))/m)
      || lastUserText.match(/@知识库[:：]\s*([^\n]+)/)
    const explicitItemRef = refMatch?.[1]?.trim().replace(/[\s,，。；;！!？?]+$/, '').slice(0, 100)
    const hasExplicitRef = !!explicitItemRef
    // 触发条件：详情页强制锁定 OR 显式引用 OR 普通 query（>2 字就触发，去掉 8-500 门限）
    const enableKnowledge = lockedCollectionId != null
      || hasExplicitRef
      || (lastUserText.trim().length > 2)

    if (enableKnowledge && lastUserText) {
      try {
        const { getRelevantContext } = await import('@/lib/ai/knowledge-search')
        // 提取真正的查询（去掉 /<name> 和 @知识库:<title> 前缀）
        let cleanQuery = lastUserText
          .replace(/\/[^\s/][^\n\r]{0,80}?(?=\s+(?:请|帮|我要|帮我|麻烦|能不能|可以吗|怎么|如何|，|。|？|！|,|\.|\?)|[\s\n]|$)/, '')
          .replace(/@知识库[:：][^\n]+?(?=\s*(?:\n|$|，|。|；|？|！|请|帮|我要|帮我|麻烦|能不能|可以吗|？|!|,|\.|\?))/m, '')
          .replace(/@知识库[:：][^\n]+/g, '')
          .trim()
        // 解析 locked collectionId 优先级：body 显式 > 消息内 /<name> 引用
        let effectiveCollectionId: number | null = null
        // 标记 /<name> 是否已成功锁定到某个 collection —— 成功时跳过条目级 "未找到" 警告，
        // 否则同一段文本既是 collection 名又是 item title 的尝试，会注入自相矛盾的提示
        let collectionResolved = false
        if (typeof lockedCollectionId === "number" && Number.isFinite(lockedCollectionId)) {
          effectiveCollectionId = lockedCollectionId
          collectionResolved = true
        } else if (explicitCollectionRef) {
          // 只在「用户可访问」的 collection 范围内解析（个人 KB + 已订阅的市场 KB）。
          // 旧实现先查 listMarketCollections（返回所有市场 KB，includeSubscribed 形同虚设），
          // 一旦名称/描述模糊命中某个未订阅的市场 KB 就锁定到它，导致 getRelevantContext
          // 因访问权限被过滤为空 → AI 拿不到任何知识库内容。
          try {
            const { listAvailableCollectionsForAI } = await import('@/lib/db/knowledge-service')
            const available = await listAvailableCollectionsForAI(user.id, { limit: 200 })
            // 精确 → 前缀 → 包含
            const match = available.find(c => c.name === explicitCollectionRef)
              || available.find(c => c.name.startsWith(explicitCollectionRef))
              || available.find(c => c.name.includes(explicitCollectionRef))
            if (match) {
              effectiveCollectionId = match.id
              collectionResolved = true
            } else {
              console.warn(`[Chat API] /<name> collection "${explicitCollectionRef}" not in user's accessible collections`)
            }
          } catch (e) {
            console.warn('[Chat API] failed to resolve /<name> collection:', e)
          }
        }
        // 用户只输入了 /<name> 没有附带问题时，cleanQuery 会为空。
        // 用 collection 名作为兜底查询，至少能按标题/内容命中该 KB 内的条目，
        // 而不是把 "/<name>" 原样塞进检索（旧逻辑会走 lastUserText 兜底）。
        if (!cleanQuery) {
          cleanQuery = explicitCollectionRef || explicitItemRef || lastUserText
        }
        // 🔥 首字延迟优化：知识检索（含 embedding 调用 / rerank）在主 LLM 之前同步执行，
        // 一旦上游慢就会把首字延迟整体拖高。这里加一个硬上限保险丝：
        // 超时就放弃知识库上下文，让主流程立刻继续，不陪着一起卡。
        const KB_SEARCH_TIMEOUT_MS = 4000
        const kbStart = Date.now()
        const contexts = await Promise.race([
          getRelevantContext(user.id, cleanQuery, {
            maxChunks: 4,
            maxChunkLength: 600,
            collectionId: effectiveCollectionId
          }),
          new Promise<Array<any>>((resolve) =>
            setTimeout(() => {
              console.warn(`[Chat API] knowledge search exceeded ${KB_SEARCH_TIMEOUT_MS}ms, skipping context injection`)
              resolve([])
            }, KB_SEARCH_TIMEOUT_MS)
          ),
        ])
        if (Date.now() - kbStart > 1500) {
          console.warn(`[Chat API] knowledge search slow: ${Date.now() - kbStart}ms`)
        }
        if (contexts.length > 0) {
          const ctxText = contexts.map((c, i) =>
            `[${i + 1}] 《${c.itemTitle}》 (相关度 ${(c.score * 100).toFixed(0)}%)\n${c.content}`
          ).join('\n\n---\n\n')
          // 锁定到具体 KB 时，给 AI 更明确的指示：只回答与该 KB 相关的内容
          const lockedHint = effectiveCollectionId != null
            ? `\n**重要**：以上内容来自用户锁定的特定知识库，请仅基于该知识库的内容回答用户问题，不要混入其他来源。\n`
            : ''
          enhancedSystemPrompt += `\n\n## 知识库检索结果${effectiveCollectionId != null ? '（已锁定到用户指定的知识库）' : '（来自用户个人知识库与已订阅的市场知识库）'}\n\n${ctxText}\n${lockedHint}`
          console.log(`[Chat API] Injected ${contexts.length} knowledge contexts${effectiveCollectionId != null ? ` (locked to collection ${effectiveCollectionId})` : ''}`)
        }
        // 显式 /<title> 或 @知识库:<title> 引用：把整个条目内容也拉取作为强上下文。
        // 注意：当 /<name> 已成功锁定到 collection 时，不再注入条目级 "未找到" 警告 ——
        // 否则 AI 会同时看到 collection 检索结果和 "《xxx》未找到" 的矛盾提示。
        if (hasExplicitRef && explicitItemRef) {
          try {
            const { query } = await import('@/lib/db/database')
            // 多策略查询：先精确匹配，再模糊匹配（虚拟订阅：market items 也可命中）
            const rows = await query<any>(
              `SELECT i.id, i.title, i.content, i.summary, i.content_type, i.file_url, i.embedding_status, i.tags_cache, i.user_id
               FROM knowledge_items i
               WHERE i.is_archived = 0
                 AND (i.user_id = $1
                      OR EXISTS (SELECT 1 FROM knowledge_market_subscriptions s
                                 WHERE s.user_id = $1 AND s.collection_id = i.collection_id))
                 AND (i.title = $2 OR i.title ILIKE $3)
               ORDER BY
                 CASE WHEN i.user_id = $1 THEN 0 ELSE 1 END,
                 CASE WHEN i.title = $2 THEN 0 ELSE 1 END,
                 i.updated_at DESC
               LIMIT 3`,
              [user.id, explicitItemRef, `%${explicitItemRef}%`]
            )
            if (rows.length > 0) {
              const fullCtx = rows.map((r, i) => {
                const embStatus = r.embedding_status || 'pending'
                const content = (r.content || r.summary || '').slice(0, 2000)
                const isOwn = r.user_id === user.id ? '' : '（来自订阅的知识库市场）'
                return `[强引用 ${i + 1}] 《${r.title}》${isOwn} (${r.content_type}, embedding=${embStatus})\n${content}`
              }).join('\n\n---\n\n')
              enhancedSystemPrompt += `\n\n## 用户明确引用的知识条目\n\n${fullCtx}\n\n**重要**：用户明确引用了以上条目，回答时必须基于这些内容。`
              console.log(`[Chat API] Injected ${rows.length} explicit /<title> or @知识库 references for "${explicitItemRef}"`)
            } else if (!collectionResolved) {
              // 仅当 /<name> 不是已锁定的 collection 名时才提示 "未找到条目"，
              // 避免 collection 引用成功后还附加矛盾警告
              console.warn(`[Chat API] explicit reference not found for title: "${explicitItemRef}"`)
              enhancedSystemPrompt += `\n\n## 知识库引用\n\n用户尝试引用《${explicitItemRef}》但未在知识库中找到完全匹配的条目（已搜索用户自己的 + 已订阅的市场知识库）。请检查条目是否存在或名字是否正确。`
            }
          } catch (e) {
            console.warn('[Chat API] knowledge explicit lookup failed:', e)
          }
        }
      } catch (e) {
        console.warn('[Chat API] knowledge context injection failed:', e)
      }
    }

    // Heuristic: 仅当消息看起来需要工具时才进行 Preflight 检查
    // 这大大提高了普通聊天的响应速度 (避免了双重请求延迟)
    const toolKeywords = ["搜索", "查", "找", "天气", "设备", "任务", "监控", "search", "find", "weather", "device", "task", "monitor", "img", "image", "图片", "画", "draw", "analyse", "分析", "帮我", "怎么", "如何", "调", "计", "方案", "种植", "专家", "建议", "指标", "环境", "水", "肥", "温", "光", "湿度", "二氧化碳", "CO2", "标准", "作物", "草莓", "大棚", "温室", "NDVI", "光谱", "病", "害", "获取", "抓取", "bilibili", "视频", "链接", "网站", "网页", "历史", "趋势", "变化", "过去", "昨天", "最近", "一周", "几天", "几个小时", "土壤", "氮磷钾", "肥力", "检索", "查询", "查查", "说说", "告诉我", "学习", "研究", "诊断", "判断", "规范", "指南", "管理标准", "最新", "近期", "现在", "当前", "今天", "网上", "互联网", "资料", "信息", "调控", "参数", "巡检", "我叫", "我是", "你可以叫我", "喊我", "称呼我", "叫我", "记住", "记着", "别忘了", "别忘", "我改名", "你记错", "记错", "我姓", "我的名字"]
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
                     '调控', '分析', '种植', '专家', '建议', '标准', '参数', '巡检',
                     '检索', '查查', '说说', '告诉我', '学习一下', '研究', '诊断',
                     '最新指南', '管理标准', '规范', '指南', '最新', '近期', '今天'
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
    const searchKeywords = ["搜索", "查找", "找一下", "帮我查", "搜一下", "search", "find", "lookup", "最新", "现在", "当前", "今天", "最近", "网上", "互联网", "检索", "查询", "查查", "说说", "告诉我", "学习", "研究", "管理标准", "最新指南", "规范", "指南"]
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

    // 历史传感器数据查询提示
    contextInfo += `\n\n## 历史传感器数据查询\n当用户询问历史数据、趋势变化、过去某段时间的环境状况时（如"过去几小时温度变化""昨天的湿度""最近一周CO2趋势"），调用 \`get_sensor_history\` 工具查询本地传感器历史记录（保留最近 7 天）。\n- 参数 metrics：指标列表（temperature/humidity/light/co2/soilMoisture/nitrogen/phosphorus/potassium/fertility）\n- 参数 range：时间范围（10m/1h/7h/1d/7d）\n- 返回含统计摘要（min/max/avg/latest）+ 降采样数据点，需基于结果生成文字分析，禁止只返回原始数据\n- 当前实时数据已在上方"当前环境和设备状态"中提供，无需调用工具获取\n`

    contextInfo += `\n\n## 任务规划器与 MCP 工具调用
**任务规划器（必须严格执行）**：复杂多步骤任务时用 <TASK_LIST> 标签输出计划，**输出后必须严格按计划逐步执行，禁止跑偏**。SOP：1.按当前【${currentMonth}月/${currentSeason}】搜索农业标准 → 2.对比传感器数据分析差距 → 3.生成调控指令。
**执行约束**：
- 每次回复只推进当前 in_progress 任务，完成后再进入下一个
- 禁止跳过任务、禁止新增计划外任务、禁止改变任务顺序
- 若执行中发现计划有误，必须先更新 <TASK_LIST> 再继续
- **输出 <TASK_LIST> 后必须立即开始执行 task 1，不要只规划不行动**
**🛑 Checkpoint 检查点（强制）**：
- 关键决策点/不可逆操作/信息不足/复杂度超阈值时，**必须输出 <CHECKPOINT> 标签暂停并等待用户确认**
- ⚠️ **输出 <TASK_LIST> 本身不触发 checkpoint！规划阶段必须继续执行，只有执行到不可逆操作步骤时才触发**
- 不可逆操作示例：连续灌溉>5分钟、补光灯长时间开启、丝杆滑台移动>100mm、创建每天/每周循环任务、移动摄像头到边界位置
- 信息不足示例：用户说"浇水"但未指定时长、"调温度"但未指定目标值、"设置定时任务"但未指定时间/频率
- 复杂度超阈值示例：跨系统操作（设备控制+定时任务+视觉巡检）、多设备联动（≥2个设备同时操作）、长时间跨度（>1小时自动调控）
- **输出 <CHECKPOINT> 后必须立即停止，等待用户回复，严禁继续执行**
- 简单查询/单步可逆操作（如查看数据、单次开关设备）无需 checkpoint，避免过度打扰
**MCP 工具规则**：
1. 禁止搜索设备操作指令（开关灯/水泵/摄像头等是自带能力，**必须通过 Function Calling 调用对应工具**；严禁输出 JSON 代码块形式的控制指令，未实际调用工具前禁止声称设备已开启/已关闭）
2. 搜索农业知识（生长标准、温湿度范围、病害防治）
3. 搜索关键词须含【月份/季节】，如 \`${currentMonth}月 草莓大棚 通风策略\`
4. 基于搜索结果对比当前数据生成调控建议
5. **工具调用后必须输出最终回答**：获取到工具结果后，必须基于结果生成完整的文字回复给用户，禁止只调用工具不回答`


    // 直接注入基础设备状态和环境数据
    // 🔥 设备离线时跳过设备状态注入，并明确告知 AI 不可控制设备
    if (!isDeviceOnline) {
      contextInfo += `\n\n## ⚠️ 设备离线\n当前温室设备处于离线状态（未连接或通信超时），无法读取实时传感器数据，也无法执行任何设备控制指令。\n**严禁输出任何设备控制 JSON（toggle_relay, set_led, control_camera, reset_camera, move_camera_and_look 等）**，这些指令将无法执行。\n如果用户要求控制设备或查看实时数据，请直接告知设备已离线，建议检查设备连接后再试。\n`
    } else if (deviceStatus && mandatorySkillsEnabled !== false) {
      // 计算丝杆滑台位置信息
      const stepperPos = deviceStatus.stepper_position || 0
      const stepperPosMM = (stepperPos / STEPPER.PULSES_PER_MM).toFixed(1)
      const canMoveLeftMM = ((STEPPER.MAX_PULSES - stepperPos) / STEPPER.PULSES_PER_MM).toFixed(1)
      const canMoveRightMM = (stepperPos / STEPPER.PULSES_PER_MM).toFixed(1)
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

    // 🔥 首字延迟优化：定时任务列表（DB）与记忆增强（3 个 DB 查询，内部已并行）
    // 两组操作互不依赖，原本串行 await 要叠加等待，改 Promise.all 一次跑完。
    const _ctxStart = Date.now()
    const [tasksSection, memoryPrompt] = await Promise.all([
      // 注入当前定时任务列表
      (async () => {
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
          return `\n\n## 当前系统中的定时任务（这是真实的数据库记录，以此为准）\n\`\`\`json\n${JSON.stringify(tasksContext, null, 2)}\n\`\`\`\n`
        } catch (e) {
          console.error("Failed to fetch tasks for context:", e)
          return ''
        }
      })(),
      // === 记忆增强：注入用户画像（md 文件为唯一真相源）===
      (async () => {
        try {
          // 🔥 优先级最高：用户显式设置的个性化（回复风格/称呼/自定义指令/人格）
          const personalPrompt = await buildPersonalizationPrompt(user.id as number).catch(() => '')
          if (personalPrompt) {
            enhancedSystemPrompt = `${enhancedSystemPrompt}${personalPrompt}`
          }

          // 🔥 核心：直接读用户 md 记忆文件（data/user-memory/<userId>.md），
          // 这是最可靠、最直接的跨会话记忆来源，不受 db 排序/截断影响
          const memoryMd = await getUserMemoryForPrompt(user.id as number)
          if (memoryMd) {
            // md 文件里有记忆 → 直接注入，并明确要求 AI 用记住的信息（尤其姓名）自然称呼用户
            enhancedSystemPrompt = `${enhancedSystemPrompt}

## 👤 用户记忆档案（AI 已记住的关于用户的信息，务必在回答时自然体现）
${memoryMd}

💡 重要：以上是你在历史对话中记住的用户信息。请自然地使用它们——
- 若记住了用户称呼（如"小朱"），回复时偶尔自然地称呼用户（如"小朱，今天的温度…"），让用户感受到被记住
- 若记住了大棚/品种等信息，可在相关话题中自然提及（如"你1号棚的红颜草莓…"）`
          }

          // 🔥 记忆工具指令（无条件注入）：引导 AI 主动调用 remember_user_info 等工具管理记忆
          enhancedSystemPrompt = `${enhancedSystemPrompt}

## 🧠 记忆管理工具（主动记住/更新/删除用户信息）
你可以调用以下工具来管理关于当前用户的长期记忆（这些记忆会跨对话持久保留）：
- remember_user_info(key, value)：当用户在对话中透露出稳定个人信息时调用。例如用户说"我叫小朱"→ remember_user_info(key="user_name", value="小朱")；"我种红颜草莓"→ remember_user_info(key="strawberry_variety", value="红颜")；"我在1号棚"→ remember_user_info(key="greenhouse_info", value="1号棚")。
- 当用户在【纠正】之前记住的信息时，也用 remember_user_info 覆盖：如"你记错了，我叫小朱不叫小张"→ remember_user_info(key="user_name", value="小朱")（传纠正后的正确值即可，系统自动覆盖旧值）。
- list_user_memory()：用户问"你记得我什么/我叫什么"时先查再答。
- forget_user_info(key)：用户说"别记了/删掉/忘记我名字"时调用。

注意：只记"稳定、跨对话有价值"的信息，不要记临时指令（如"帮我开风扇"）。`
          // 仍用 db 记忆补充设备模式/成功策略（这些是动态统计，md 不存）
          const p = await generateMemoryEnhancedPrompt(enhancedSystemPrompt, {
            userId: user.id as number,
            includePreferences: true,
            includeDevicePatterns: true,
            includeStrategies: true,
            maxPreferences: 3,
            maxPatterns: 2,
            maxStrategies: 2
          })
          return p
        } catch (e) {
          console.error('[Memory] Failed to enhance prompt with memory:', e)
          return enhancedSystemPrompt
        }
      })(),
    ])
    contextInfo += tasksSection
    enhancedSystemPrompt = memoryPrompt
    const _ctxMs = Date.now() - _ctxStart
    if (_ctxMs > 500) console.warn(`[Chat API] tasks+memory context slow: ${_ctxMs}ms`)

    // 🔥 Token 优化：按需注入报告生成指令（仅在用户请求报告时加载完整模板）
    const reportKeywords = ['报告', '导出报告', '生成报告', '分析报告', 'report']
    const needsReportInstruction = reportKeywords.some(k => lastUserText.toLowerCase().includes(k))

    // 🔥 Token 优化：按需注入定时任务详细指令
    const scheduleKeywords = ['定时', '定时任务', '提醒', '分钟后', '小时后', '秒后', '每天', '每周', 'cron', 'schedule', '复查', '复查任务', '自动执行']
    const needsScheduleTaskDetail = scheduleKeywords.some(k => lastUserText.toLowerCase().includes(k))
    // 复杂场景才需要完整指令（含自动复查闭环/cron说明/多场景示例）；简单提醒用 SHORT 版
    const complexScheduleKeywords = ['自动执行', '复查', '复查任务', 'cron', '每天', '每周', '定时任务', '方案', '调控']
    const needsFullScheduleDetail = needsScheduleTaskDetail && complexScheduleKeywords.some(k => lastUserText.toLowerCase().includes(k))

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

    // 静态/动态分层（仿 Claude Code SystemPromptBuilder 设计）：
    // - 静态段（可被 Prompt Cache 命中）：身份+技能+记忆+知识库+报告指令+能力说明
    // - 动态段（每次请求变化，放末尾利用 Recency 效应增强 AI 注意力）：环境上下文+强制工具提示
    const staticBasePrompt = enhancedSystemPrompt + (needsReportInstruction ? reportInstructionFull : reportInstructionShort) + capabilitiesInstructionText
    // 🔥 用户手动启用计划模式时，附加引导：直接调研后 exit_plan_mode，无需先 enter_plan_mode
    const planModeHint = enablePlanning
      ? `\n\n【用户已手动启用计划模式】\n你已处于计划模式中（系统已自动屏蔽有副作用的工具）。请直接进行调研和信息收集，完成后调用 exit_plan_mode 工具提交计划，无需先调用 enter_plan_mode。`
      : ''
    const dynamicSuffix = contextInfo + forcedToolPrompt + planModeHint

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
           const summarizeConfig = getSummarizationConfig()
           const summarizeTargetUrl = summarizeConfig.url
           const summarizeKey = summarizeConfig.apiKey || process.env.SYSTEM_OPENAI_API_KEY || apiKey
           
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
                  model: summarizeConfig.model,
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
    effectiveModel = model || 'auto'

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
        // 优先使用视觉模型：从配置中找 supportsVision 的模型，找不到才回退硬编码
        try {
          const cfg = await readProvidersConfig()
          const visionModel = cfg.providers
            .filter(p => p.enabled)
            ?.flatMap(p => p.models.filter(m => m.enabled && m.supportsVision).map(m => ({ ...m, _providerPriority: p.priority ?? 999 })))
            ?.sort((a, b) => a._providerPriority - b._providerPriority)?.[0]
          effectiveModel = visionModel?.id || resolveDefaultModelId(cfg) || 'qwen3.6-plus'
        } catch {
          effectiveModel = 'qwen3.6-plus'
        }
      } else {
        // 默认：使用 admin 配置的默认模型，而非硬编码
        try {
          const cfg = await readProvidersConfig()
          effectiveModel = resolveDefaultModelId(cfg) || 'qwen3.6-plus'
        } catch {
          effectiveModel = 'qwen3.6-plus'
        }
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
        basePrompt: staticBasePrompt,
        enableDeviceControl: mandatorySkillsEnabled !== false && isDeviceOnline,
        enableReasoning: shouldEnableReasoning,
        mcpToolNames: mcpToolDefs.map(t => t.function.name),
        contextCompressed: contextCompressed,
        aiFeatures: aiFeatures,
        includeScheduleTaskDetail: needsFullScheduleDetail
      });

      fullMessages = [
        {
          role: "system",
          content: compactSystemPrompt + '\n\n' + dynamicSuffix + mcpInstallationHint,
        },
        ...finalMessages,
      ]

      const isAudioModel = effectiveModel?.includes('omni') || effectiveModel?.includes('audio');

      requestBody = {
        model: effectiveModel || "qwen-plus",
        messages: fullMessages,
        stream: true,
        temperature: 0.7,
        // 积分计费：让上游在流式最后一个 chunk 返回真实 token usage
        ...(creditsEnabled && !isAudioModel ? { stream_options: { include_usage: true } } : {}),
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
        basePrompt: staticBasePrompt,
        enableDeviceControl: mandatorySkillsEnabled !== false && isDeviceOnline,
        enableReasoning: shouldEnableReasoning,
        mcpToolNames: mcpToolDefs.map(t => t.function.name),
        contextCompressed: contextCompressed,
        aiFeatures: aiFeatures,
        includeScheduleTaskDetail: needsFullScheduleDetail
      }) + '\n\n' + dynamicSuffix + mcpInstallationHint;

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
        basePrompt: staticBasePrompt,
        enableDeviceControl: mandatorySkillsEnabled !== false && isDeviceOnline,
        enableReasoning: shouldEnableReasoning,
        mcpToolNames: mcpToolDefs.map(t => t.function.name),
        contextCompressed: contextCompressed,
        aiFeatures: aiFeatures,
        includeScheduleTaskDetail: needsFullScheduleDetail
      });

      fullMessages = [
        {
          role: "system",
          content: compactSystemPrompt + '\n\n' + dynamicSuffix + mcpInstallationHint,
        },
        ...userMessages,
      ]

      requestBody = {
        model: effectiveModel || "gpt-4o-mini",
        messages: fullMessages,
        stream: true,
        temperature: 0.7,
        // 积分计费：让上游在流式最后一个 chunk 返回真实 token usage
        ...(creditsEnabled ? { stream_options: { include_usage: true } } : {}),
      }
    }

    // 🔥 清洗历史消息中的旧版 JSON 设备控制指令样例，防止模型 few-shot 模仿旧格式"只说不做"
    fullMessages = sanitizeLegacyDeviceControlMessages(fullMessages)
    if (requestBody.messages) requestBody.messages = fullMessages
    if (requestBody.input?.messages) requestBody.input.messages = fullMessages

    // 语音助手模式：限制 max_tokens，避免回复过长导致 TTS 等待
    if (voiceMode) {
      if (requestBody.parameters) {
        // DashScope 原生 API
        requestBody.parameters.max_tokens = VOICE_MAX_TOKENS
      } else {
        // OpenAI 兼容格式
        requestBody.max_tokens = VOICE_MAX_TOKENS
      }
    }

    // === 响应缓存：对可缓存的只读/知识类查询直接返回缓存，跳过 AI 调用 ===
    // 仅缓存纯文本查询（排除控制指令、实时数据等），命中后以合成 SSE 流返回
    const cached = getCachedResponse(lastUserText, effectiveModel || 'auto', deviceStatus)
    if (cached) {
      console.log('[ResponseCache] ✅ Cache HIT, returning cached response as synthetic stream')
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          try {
            // 以 OpenAI 兼容的 chunk 格式下发缓存的完整内容
            const chunk = {
              id: `cache-${Date.now()}`,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: cached.model || effectiveModel || 'auto',
              choices: [{ index: 0, delta: { content: cached.content }, finish_reason: null }],
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            controller.close()
          } catch (e) { controller.error(e instanceof Error ? e : new Error(String(e))) }
        }
      })
      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no" }
      })
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
          // agent 整体输出文本（跨多轮累计，用于积分估算兜底）
          let agentOutputText = ""
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
            appUrl,
            // 对话式深度研究：deep_research 各阶段进度实时推到前端思维链
            onProgress: (stage: string, detail?: string) => {
              try {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  id: `research-progress-${Date.now()}`, object: "chat.completion.chunk",
                  created: Date.now(), model: effectiveModel,
                  research_progress: { stage, detail }
                })}\n\n`))
              } catch { /* 流已关闭，忽略 */ }
            }
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
            // 跟踪最后一轮是否有 tool_calls，用于判断是否需要强制生成最终回答
            let lastRoundHadToolCalls = false
            // 🔥 Bug 修复：记录循环是否因 LLM 调用异常而提前退出（非正常达到 max iterations）
            // 异常退出时若上一轮有 tool_calls，仍需走强制总结兜底，避免对话戛然而止
            let loopExitedAbnormally = false
            let abnormalExitReason = ''
            // 🔥 计划模式状态：
            // - 用户手动启用 enablePlanning → 初始即为 true（跳过 enter_plan_mode，直接调研后 exit_plan_mode）
            // - AI 自主调用 enter_plan_mode → 置为 true
            // - AI 调用 exit_plan_mode 提交计划 → 置为 false 并 break loop 等用户审批
            // 计划模式下屏蔽有副作用的工具（设备控制、cron_create、task_create 等）
            let planMode = !!enablePlanning
            if (planMode) {
              console.log(`[Agent Loop] Plan mode manually enabled by user (enablePlanning=true)`)
            }
            // 🔥 旧版 JSON 设备控制兜底：每次请求最多接管一次，避免模型反复输出旧格式导致循环执行
            let legacyJsonFallbackUsed = false

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

              // 🔥 计划模式下屏蔽有副作用的工具（只保留调研类工具）
              const PLAN_MODE_BLOCKED_TOOLS = new Set([
                'toggle_relay', 'set_led', 'control_camera', 'reset_camera',
                'cron_create', 'task_create', 'task_update',
              ])
              const effectiveTools = planMode
                ? mcpToolDefs.filter(t => !PLAN_MODE_BLOCKED_TOOLS.has(t.function.name))
                : mcpToolDefs

              const loopBody = {
                ...requestBody,
                messages: cleanMessages,
                stream: true, // 开启流式以支持打字机效果
                tools: effectiveTools,
              }

              console.log(`[Agent Loop] Calling LLM (streaming) with ${cleanMessages.length} messages...`)
              // 🔥 首字延迟观测：记录本轮 LLM 请求发出时刻，首个 chunk 到达时打 TTFT 日志，
              // 用来区分「服务端预处理慢」还是「模型本身首 token 慢」。
              const _llmReqStart = Date.now()
              // LLM 调用超时保护：90s 无响应则中止（流式场景需较长阈值）
              const llmTimeoutController = new AbortController()
              const llmTimeoutId = setTimeout(() => llmTimeoutController.abort(), 90000)

              let loopRes: Response
              try {
                loopRes = await fetch(targetUrl, {
                  method: "POST",
                  headers, // 使用原始 headers (含 SSE 指令)
                  body: JSON.stringify(loopBody),
                  signal: llmTimeoutController.signal,
                })
              } catch (fetchErr: any) {
                clearTimeout(llmTimeoutId)
                if (fetchErr?.name === 'AbortError') {
                  console.warn('[Agent Loop] LLM call timed out after 90s')
                  loopExitedAbnormally = true
                  abnormalExitReason = `LLM 推理超时（第 ${iteration} 轮，90s 无响应）`
                } else {
                  console.warn(`[Agent Loop] LLM call network error:`, fetchErr?.message)
                  loopExitedAbnormally = true
                  abnormalExitReason = `LLM 网络错误（第 ${iteration} 轮）：${fetchErr?.message || '未知'}`
                }
                // 🔥 Bug 修复：通知前端本轮失败，避免用户干等空白
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  id: `llm-error-${Date.now()}`,
                  object: "chat.completion.chunk",
                  created: Date.now(),
                  model: effectiveModel,
                  llm_error: { reason: abnormalExitReason, iteration }
                })}\n\n`))
                break
              }
              clearTimeout(llmTimeoutId)

              if (!loopRes.ok) {
                console.warn(`[Agent Loop] LLM call failed (status ${loopRes.status}), breaking loop`)
                loopExitedAbnormally = true
                abnormalExitReason = `LLM 返回错误状态 ${loopRes.status}（第 ${iteration} 轮）`
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  id: `llm-error-${Date.now()}`,
                  object: "chat.completion.chunk",
                  created: Date.now(),
                  model: effectiveModel,
                  llm_error: { reason: abnormalExitReason, iteration }
                })}\n\n`))
                break
              }

              const reader = loopRes.body?.getReader()
              if (!reader) {
                loopExitedAbnormally = true
                abnormalExitReason = `LLM 响应无 body 流（第 ${iteration} 轮）`
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  id: `llm-error-${Date.now()}`,
                  object: "chat.completion.chunk",
                  created: Date.now(),
                  model: effectiveModel,
                  llm_error: { reason: abnormalExitReason, iteration }
                })}\n\n`))
                break
              }

              const decoder = new TextDecoder()
              let buffer = ""
              let hasToolCalls = false
              let currentToolCalls: any[] = []
              let accumulatedContent = ""
              let agentRoundOutput = ""
              let _ttftLogged = false

              while (true) {
                // 超时保护：防止 LLM 返回 200 但 body 流卡住导致 Agent Loop 无限阻塞
                // 90s 无数据则中止读取（与 fetch 超时一致）
                const readResult = await Promise.race([
                  reader.read(),
                  new Promise<{ done: true; value: undefined }>((resolve) =>
                    setTimeout(() => resolve({ done: true, value: undefined }), 90000)
                  ),
                ])
                const { done, value } = readResult
                if (done) break

                // 🔥 首字延迟观测：只打一次本轮 LLM 的首个响应耗时（TTFT）
                if (!_ttftLogged) {
                  _ttftLogged = true
                  const _ttft = Date.now() - _llmReqStart
                  console.log(`[Chat API] TTFT ${_ttft}ms (model=${effectiveModel}, iteration=${iteration})`)
                }
                
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split("\n")
                buffer = lines.pop() || ""

                for (const line of lines) {
                  const trimmed = line.trim()
                  if (!trimmed || trimmed === "data: [DONE]") continue
                  if (trimmed.startsWith("data: ")) {
                    try {
                      const json = JSON.parse(trimmed.slice(6))
                      trackUsage(json.usage)
                      const delta = json.choices?.[0]?.delta
                      
                      // 检查 tool_calls
                      if (delta?.tool_calls) {
                        hasToolCalls = true
                        for (const tc of delta.tool_calls) {
                          if (tc.index === undefined) continue
                          if (!currentToolCalls[tc.index]) {
                            // 🔥 Bug 修复：必须初始化 type: "function"
                            // DashScope 兼容模式要求 assistant 消息的 tool_calls 每项含 type 字段，
                            // 缺失会导致下一轮 LLM 调用返回 400 MissingParameter: messages.tool_calls.type
                            currentToolCalls[tc.index] = { id: tc.id, type: tc.type || "function", function: { name: "", arguments: "" } }
                          }
                          if (tc.id) currentToolCalls[tc.index].id = tc.id
                          if (tc.type) currentToolCalls[tc.index].type = tc.type
                          if (tc.function?.name) currentToolCalls[tc.index].function.name += tc.function.name
                          if (tc.function?.arguments) currentToolCalls[tc.index].function.arguments += tc.function.arguments
                        }
                      }

                      if (delta?.content) {
                        accumulatedContent += delta.content
                        agentRoundOutput += delta.content
                        agentOutputText += delta.content

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
                    } catch (e) { console.warn('[Agent Loop] tool result SSE parse failed:', e) }
                  }
                }
              }

              // 📋 TASK_LIST 初始化：AI 首次输出 <TASK_LIST> 标签时，把任务列表存入 session 注册表
              // 后续 AI 调用 update_task 工具时会从注册表读取并增量更新，不再需要重复输出标签
              if (accumulatedContent.includes('<TASK_LIST>') && accumulatedContent.includes('</TASK_LIST>')) {
                try {
                  const tlMatch = accumulatedContent.match(/<TASK_LIST>\s*([\s\S]*?)\s*<\/TASK_LIST>/)
                  if (tlMatch) {
                    const tlJson = JSON.parse(tlMatch[1])
                    if (tlJson && Array.isArray(tlJson.tasks) && tlJson.tasks.length > 0) {
                      // 仅当 session 尚无 task list 时初始化（防止覆盖已增量更新的状态）
                      if (!getSessionTaskList(sessionId)) {
                        initSessionTaskList(sessionId, tlJson)
                        console.log(`[Agent Loop] Round ${iteration} - TASK_LIST initialized with ${tlJson.tasks.length} tasks`)
                      }
                    }
                  }
                } catch (e) {
                  console.warn(`[Agent Loop] TASK_LIST parse failed:`, e)
                }
              }

              // 🛑 CHECKPOINT 检测：AI 输出 <CHECKPOINT> 标签时挂起 Agent Loop 等待用户确认
              // 架构变更（重要）：原逻辑是 break 退出循环 + 前端发新对话触发下一轮，
              //   这会导致对话上下文被切断，AI 失去同一轮内的连续性。
              // 新逻辑：在同一个 SSE 连接内 await 挂起，前端渲染表单 → 用户填表 →
              //   POST /api/chat/respond 把回复发回后端 → resolve promise → Agent Loop 继续。
              // 用户体感：一次请求内完成「AI 问 → 用户答 → AI 继续执行」。
              if (accumulatedContent.includes('<CHECKPOINT>')) {
                // 提取 checkpoint id（如果 JSON 解析失败则用时间戳兜底）
                let checkpointId = `cp-${Date.now()}`
                let checkpointTitle = '用户确认检查点'
                try {
                  const cpMatch = accumulatedContent.match(/<CHECKPOINT>\s*([\s\S]*?)\s*<\/CHECKPOINT>/)
                  if (cpMatch) {
                    const cpJson = JSON.parse(cpMatch[1])
                    if (cpJson.id) checkpointId = cpJson.id
                    if (cpJson.title) checkpointTitle = cpJson.title
                  }
                } catch {}

                console.log(`[Agent Loop] Round ${iteration} - CHECKPOINT detected, suspending loop (id=${checkpointId})`)

                // 推送 user_input_required 事件：前端据此渲染表单 + 标记 SSE 流处于「等待用户输入」状态
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  id: `user-input-required-${Date.now()}`,
                  object: "chat.completion.chunk",
                  created: Date.now(),
                  model: effectiveModel,
                  user_input_required: {
                    type: 'checkpoint',
                    checkpoint_id: checkpointId,
                    title: checkpointTitle,
                    content: accumulatedContent,
                    timeout_ms: 5 * 60 * 1000,
                  },
                })}\n\n`))

                // 挂起等待用户回复（5 分钟超时）
                try {
                  const userReply = await waitForUserInput(
                    sessionId,
                    checkpointId,
                    'checkpoint',
                    checkpointTitle,
                    5 * 60 * 1000,
                  )
                  console.log(`[Agent Loop] CHECKPOINT resolved, continuing with user reply`)

                  // 把 AI 的 checkpoint 消息存入上下文（保留语义连贯性）
                  fullMessages.push({
                    role: "assistant",
                    content: accumulatedContent,
                  })
                  // 把用户回复作为 user 消息推入上下文，AI 下一轮迭代就能看到
                  fullMessages.push({
                    role: "user",
                    content: userReply,
                  })

                  // 推送 user_input_received 事件：前端据此切换 UI 到「AI 思考中」状态
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    id: `user-input-received-${Date.now()}`,
                    object: "chat.completion.chunk",
                    created: Date.now(),
                    model: effectiveModel,
                    user_input_received: {
                      checkpoint_id: checkpointId,
                      reply_preview: userReply.slice(0, 100),
                    },
                  })}\n\n`))

                  // 继续 Agent Loop 下一轮迭代（不要 break）
                } catch (err: any) {
                  // 超时或被新 checkpoint 取代
                  console.warn(`[Agent Loop] CHECKPOINT wait failed: ${err.message}`)
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    id: `user-input-timeout-${Date.now()}`,
                    object: "chat.completion.chunk",
                    created: Date.now(),
                    model: effectiveModel,
                    user_input_timeout: {
                      checkpoint_id: checkpointId,
                      reason: err.message || 'timeout',
                    },
                  })}\n\n`))
                  break
                }

                // 继续 Agent Loop（不 break，让下一轮迭代处理用户回复）
                continue
              }

              // 🔍 CLARIFY 检测：AI 输出 <CLARIFY> 标签时挂起 Agent Loop 等待用户澄清
              // 同 CHECKPOINT 机制：同一 SSE 连接内挂起，前端渲染表单 → 用户提交 → 回复到达 → 继续
              if (accumulatedContent.includes('<CLARIFY>')) {
                const clarifyId = `clarify-${Date.now()}`
                let clarifyTitle = '需要用户澄清'
                try {
                  const clMatch = accumulatedContent.match(/<CLARIFY>\s*([\s\S]*?)\s*<\/CLARIFY>/)
                  if (clMatch) {
                    const clJson = JSON.parse(clMatch[1])
                    if (clJson.title) clarifyTitle = clJson.title
                  }
                } catch {}

                console.log(`[Agent Loop] Round ${iteration} - CLARIFY detected, suspending loop (id=${clarifyId})`)

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  id: `user-input-required-${Date.now()}`,
                  object: "chat.completion.chunk",
                  created: Date.now(),
                  model: effectiveModel,
                  user_input_required: {
                    type: 'clarify',
                    checkpoint_id: clarifyId,
                    title: clarifyTitle,
                    content: accumulatedContent,
                    timeout_ms: 5 * 60 * 1000,
                  },
                })}\n\n`))

                try {
                  const userReply = await waitForUserInput(
                    sessionId,
                    clarifyId,
                    'clarify',
                    clarifyTitle,
                    5 * 60 * 1000,
                  )
                  console.log(`[Agent Loop] CLARIFY resolved, continuing with user reply`)

                  fullMessages.push({
                    role: "assistant",
                    content: accumulatedContent,
                  })
                  fullMessages.push({
                    role: "user",
                    content: userReply,
                  })

                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    id: `user-input-received-${Date.now()}`,
                    object: "chat.completion.chunk",
                    created: Date.now(),
                    model: effectiveModel,
                    user_input_received: {
                      checkpoint_id: clarifyId,
                      reply_preview: userReply.slice(0, 100),
                    },
                  })}\n\n`))
                } catch (err: any) {
                  console.warn(`[Agent Loop] CLARIFY wait failed: ${err.message}`)
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    id: `user-input-timeout-${Date.now()}`,
                    object: "chat.completion.chunk",
                    created: Date.now(),
                    model: effectiveModel,
                    user_input_timeout: {
                      checkpoint_id: clarifyId,
                      reason: err.message || 'timeout',
                    },
                  })}\n\n`))
                  break
                }

                continue
              }

              if (hasToolCalls) {
                const toolCalls = currentToolCalls.filter(Boolean)
                console.log(`[Agent Loop] Round ${iteration} - Tool calls:`, toolCalls.map((t: any) => t.function.name))
                
                // 将 AI 回复（含可能的 content 和 tool_calls）存入上下文
                // 🔥 Bug 修复：content 必须是字符串，不能用 null。
                // DashScope 兼容模式要求 assistant 消息带 tool_calls 时 content 为字符串，
                // null 会导致第 2 轮 LLM 调用返回 400
                fullMessages.push({
                  role: "assistant",
                  content: accumulatedContent || "",
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
                let hasClarifyAction = false
                let hasPlanSubmitAction = false
                for (const [toolCallId, result] of toolResults.entries()) {
                  const toolCall = toolCalls.find(tc => tc.id === toolCallId);
                  if (!toolCall) continue;

                  // 🔥 检测 ask_user_question 工具返回的 clarify 动作
                  // 转换为 <CLARIFY> 标签注入 content，触发前端渲染表单 + break loop
                  if (result.success && result.data?._agent_action === 'clarify') {
                    hasClarifyAction = true
                    const clarifyJson = JSON.stringify(result.data.clarify_data)
                    accumulatedContent += `\n<CLARIFY>${clarifyJson}</CLARIFY>`
                    console.log(`[Agent Loop] ask_user_question → CLARIFY tag injected`)
                    // tool 结果改为简短说明，避免 JSON 裸露
                    fullMessages.push({
                      role: 'tool',
                      tool_call_id: toolCallId,
                      content: JSON.stringify({ success: true, message: '已向用户展示澄清表单，等待用户回复。请基于用户回复继续处理。' })
                    });
                    continue
                  }

                  // 🔥 检测 enter_plan_mode：设置 planMode = true，不 break，继续调研
                  if (result.success && result.data?._agent_action === 'enter_plan_mode') {
                    planMode = true
                    console.log(`[Agent Loop] enter_plan_mode → planMode = true`)
                    fullMessages.push({
                      role: 'tool',
                      tool_call_id: toolCallId,
                      content: JSON.stringify({ success: true, message: result.data.message })
                    });
                    continue
                  }

                  // 🔥 检测 exit_plan_mode：转换为 <PLAN> 标签 + break loop，等用户审批
                  if (result.success && result.data?._agent_action === 'exit_plan_mode') {
                    hasPlanSubmitAction = true
                    planMode = false
                    const planJson = JSON.stringify(result.data.plan_data)
                    accumulatedContent += `\n<PLAN>${planJson}</PLAN>`
                    console.log(`[Agent Loop] exit_plan_mode → PLAN tag injected`)
                    fullMessages.push({
                      role: 'tool',
                      tool_call_id: toolCallId,
                      content: JSON.stringify({ success: true, message: result.data.message })
                    });
                    continue
                  }

                  // 🔥 多模态工具结果处理：摄像头截图等工具返回 _multimodal.images
                  // 将 tool 消息内容转为 OpenAI Vision 格式（content 数组含 text + image_url），
                  // 让模型在下一轮 Agent Loop 迭代中能"看到"图片并基于其内容推理。
                  // 🔥 Bug 修复：原写法 `result.success ? result.data : { error: result.error }`
                  // 当工具 success=false 但没设 error 时（如锻造自测未达标存草稿），
                  // 会变成 JSON.stringify({ error: undefined }) === "{}"，
                  // 模型只收到空对象，看不到任何失败原因与业务卡片。
                  // 现在：失败时保留 data（含 note / ui_card），并保证 error 一定有值。
                  const toolData = result.success
                    ? result.data
                    : {
                        ...(result.data ?? {}),
                        error: result.error || result.data?.error || '工具执行失败（未提供错误信息）',
                      }
                  const multimodal = result.success && isMultimodal(result.data)
                  const mmImages = multimodal ? result.data._multimodal.images : []
                  const mmSummary = multimodal ? result.data._multimodal.summary : ''

                  // 发送工具结果到前端
                  // 多模态结果时附带 images 数组（base64 data url），前端可内联展示给用户
                  const frontendResult: any = { ...toolData }
                  if (multimodal) {
                    delete frontendResult._multimodal
                    frontendResult.images = mmImages.map((img: any) => ({
                      url: `data:${img.mime_type};base64,${img.base64}`,
                      summary: mmSummary
                    }))
                  }
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    id: `tool-result-${Date.now()}`,
                    object: "chat.completion.chunk",
                    created: Date.now(),
                    model: effectiveModel,
                    tool_result: {
                      name: toolCall.function.name,
                      args: JSON.parse(toolCall.function.arguments || '{}'),
                      result: frontendResult
                    }
                  })}\n\n`));

                  // 添加到消息历史（供下一轮 LLM 推理）
                  // 多模态消息仅当当前模型支持视觉时才发送 image_url，否则降级为纯文本
                  // 避免非 VLM 模型（如 deepseek-v3）因不支持 image_url 报错中断 Agent Loop
                  if (multimodal && mmImages.length > 0 && isVLMModel) {
                    // OpenAI Vision 多模态 tool 消息格式：content 为数组，含 text + image_url
                    // 把元数据 JSON 作为 text 部分，便于模型检索结构化字段
                    const metaWithoutMm = { ...toolData }
                    delete metaWithoutMm._multimodal
                    const textPart = `${mmSummary}\n\n[metadata]\n${JSON.stringify(metaWithoutMm)}`
                    const contentParts: any[] = [
                      { type: 'text', text: textPart }
                    ]
                    for (const img of mmImages) {
                      contentParts.push({
                        type: 'image_url',
                        image_url: { url: `data:${img.mime_type};base64,${img.base64}` }
                      })
                    }
                    fullMessages.push({
                      role: 'tool',
                      tool_call_id: toolCallId,
                      content: contentParts
                    });
                  } else if (multimodal && mmImages.length > 0 && !isVLMModel) {
                    // 非 VLM 模型降级：只发文本摘要 + 提示模型无法看图
                    const metaWithoutMm = { ...toolData }
                    delete metaWithoutMm._multimodal
                    fullMessages.push({
                      role: 'tool',
                      tool_call_id: toolCallId,
                      content: JSON.stringify({
                        ...metaWithoutMm,
                        _note: `当前模型不支持视觉输入，已抓取 ${mmImages.length} 张图片但无法让模型查看。图片已转发给用户。请基于摘要 "${mmSummary}" 回答用户。`
                      })
                    });
                  } else {
                    fullMessages.push({
                      role: 'tool',
                      tool_call_id: toolCallId,
                      content: JSON.stringify(toolData)
                    });
                  }
                }

                // 🔥 ask_user_question 触发的 clarify：挂起 Agent Loop 等待用户回复
                // 架构变更：原逻辑是 break 退出 + 前端发新对话，现改为同一 SSE 连接内挂起
                if (hasClarifyAction) {
                  console.log(`[Agent Loop] CLARIFY via tool_call, suspending loop`)
                  // 分块流式推送 <CLARIFY> 标签内容，避免一次性推送导致长时间无反馈
                  if (accumulatedContent.trim()) {
                    const clarifyChunkSize = 40
                    for (let i = 0; i < accumulatedContent.length; i += clarifyChunkSize) {
                      const chunk = accumulatedContent.slice(i, i + clarifyChunkSize)
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        id: `clarify-tag-${Date.now()}-${i}`, object: "chat.completion.chunk",
                        created: Date.now(), model: effectiveModel,
                        choices: [{ delta: { content: chunk }, index: 0, finish_reason: null }],
                      })}\n\n`))
                      await new Promise(r => setTimeout(r, 8))
                    }
                  }

                  // 挂起等待用户回复（5 分钟超时）
                  const clarifyToolId = `clarify-tool-${Date.now()}`
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    id: `user-input-required-${Date.now()}`,
                    object: "chat.completion.chunk",
                    created: Date.now(),
                    model: effectiveModel,
                    user_input_required: {
                      type: 'clarify',
                      checkpoint_id: clarifyToolId,
                      title: '需要用户澄清',
                      content: accumulatedContent,
                      timeout_ms: 5 * 60 * 1000,
                    },
                  })}\n\n`))

                  try {
                    const userReply = await waitForUserInput(
                      sessionId,
                      clarifyToolId,
                      'clarify',
                      'ask_user_question 工具触发',
                      5 * 60 * 1000,
                    )
                    console.log(`[Agent Loop] CLARIFY (via tool_call) resolved, continuing`)

                    fullMessages.push({
                      role: "assistant",
                      content: accumulatedContent || "",
                    })
                    fullMessages.push({
                      role: "user",
                      content: userReply,
                    })

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      id: `user-input-received-${Date.now()}`,
                      object: "chat.completion.chunk",
                      created: Date.now(),
                      model: effectiveModel,
                      user_input_received: {
                        checkpoint_id: clarifyToolId,
                        reply_preview: userReply.slice(0, 100),
                      },
                    })}\n\n`))
                  } catch (err: any) {
                    console.warn(`[Agent Loop] CLARIFY (via tool_call) wait failed: ${err.message}`)
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      id: `user-input-timeout-${Date.now()}`,
                      object: "chat.completion.chunk",
                      created: Date.now(),
                      model: effectiveModel,
                      user_input_timeout: {
                        checkpoint_id: clarifyToolId,
                        reason: err.message || 'timeout',
                      },
                    })}\n\n`))
                    break
                  }
                  continue
                }

                // 🔥 exit_plan_mode 触发的计划提交：break loop，等用户审批
                if (hasPlanSubmitAction) {
                  console.log(`[Agent Loop] PLAN submitted via tool_call, halting loop for user approval`)
                  // 🔥 将注入的 <PLAN> 标签内容分块流式推送给前端
                  // 之前一次性 enqueue 整个 accumulatedContent，导致用户等待很久才看到计划
                  // 现在按 ~40 字符分块推送，前端可渐进式渲染打字机效果
                  if (accumulatedContent.trim()) {
                    const planChunkSize = 40
                    for (let i = 0; i < accumulatedContent.length; i += planChunkSize) {
                      const chunk = accumulatedContent.slice(i, i + planChunkSize)
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        id: `plan-tag-${Date.now()}-${i}`, object: "chat.completion.chunk",
                        created: Date.now(), model: effectiveModel,
                        choices: [{ delta: { content: chunk }, index: 0, finish_reason: null }],
                      })}\n\n`))
                      // 微小延迟让前端有时间渲染（不阻塞事件循环）
                      await new Promise(r => setTimeout(r, 8))
                    }
                  }
                  break
                }

                requestBody = { ...requestBody, messages: fullMessages }
                lastRoundHadToolCalls = true
                continue
              } else {
                // 🔥 兜底执行：模型输出了旧版 JSON 设备控制指令而非原生 tool_call
                // （常见于历史会话污染或模型 function calling 依从性差）。
                // 旧的"前端解析 JSON 执行"链路已移除，若服务端不接管，指令将无人执行，
                // AI 只是"声称"控制了设备。这里将 JSON 转换为真实工具调用并阻塞执行。
                if (!legacyJsonFallbackUsed && !planMode && isDeviceOnline && mandatorySkillsEnabled !== false) {
                  const legacyCalls = extractLegacyDeviceControlCalls(accumulatedContent)
                  if (legacyCalls.length > 0 && iteration < MAX_AGENT_ITERATIONS) {
                    legacyJsonFallbackUsed = true
                    console.log(`[Agent Loop] Round ${iteration} - Legacy JSON device control detected, executing ${legacyCalls.length} calls as fallback:`,
                      legacyCalls.map(c => `${c.name}(${JSON.stringify(c.arguments)})`))

                    // 合成与原生 tool_call 格式一致的调用
                    const syntheticToolCalls = legacyCalls.map((c, i) => ({
                      id: `legacy-fallback-${Date.now()}-${i}`,
                      type: 'function',
                      function: { name: c.name, arguments: JSON.stringify(c.arguments) }
                    }))

                    fullMessages.push({
                      role: 'assistant',
                      content: accumulatedContent || '',
                      tool_calls: syntheticToolCalls
                    })

                    // 通知前端（与原生 tool_call 一致的事件格式）
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      id: `tool-status-${Date.now()}`, object: 'chat.completion.chunk',
                      created: Date.now(), model: effectiveModel,
                      tool_calls: syntheticToolCalls,
                      agent_iteration: iteration
                    })}\n\n`))

                    const toolCallObjects = syntheticToolCalls.map(tc => ({
                      id: tc.id,
                      name: tc.function.name,
                      arguments: JSON.parse(tc.function.arguments),
                      timestamp: Date.now()
                    }))

                    const toolResults = await executeToolCallsSmart(
                      toolCallObjects,
                      orchestrator,
                      agentContext,
                      (completed, total, currentTool) => {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          id: `tool-progress-${Date.now()}`,
                          object: 'chat.completion.chunk',
                          created: Date.now(),
                          model: effectiveModel,
                          tool_progress: { completed, total, current: currentTool }
                        })}\n\n`))
                      }
                    )

                    for (const [toolCallId, result] of toolResults.entries()) {
                      const toolCall = syntheticToolCalls.find(tc => tc.id === toolCallId)
                      if (!toolCall) continue
                      // 同上：保留 data 并保证 error 非空，避免模型收到 "{}"
                      const toolData = result.success
                        ? result.data
                        : {
                            ...(result.data ?? {}),
                            error: result.error || result.data?.error || '工具执行失败（未提供错误信息）',
                          }
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        id: `tool-result-${Date.now()}`,
                        object: 'chat.completion.chunk',
                        created: Date.now(),
                        model: effectiveModel,
                        tool_result: {
                          name: toolCall.function.name,
                          args: JSON.parse(toolCall.function.arguments),
                          result: toolData
                        }
                      })}\n\n`))
                      fullMessages.push({
                        role: 'tool',
                        tool_call_id: toolCallId,
                        content: JSON.stringify(toolData)
                      })
                    }

                    // 提醒模型：指令已真实执行，基于 tool 结果汇报，禁止再输出 JSON 代码块
                    fullMessages.push({
                      role: 'system',
                      content: '设备控制指令已通过原生工具调用真实执行完毕，上方 tool 消息是真实执行结果（confirmed 字段表示设备是否真实达到目标状态）。请基于该结果向用户如实汇报。严禁再输出 JSON 代码块形式的设备控制指令。'
                    })

                    requestBody = { ...requestBody, messages: fullMessages }
                    lastRoundHadToolCalls = true
                    continue
                  }
                }

                // 无工具调用，但需要判断这是"已完成最终回答"还是"工具后只输出了过渡文本"
                // 🔥 关键修复：累积内容过短（如"我来帮您查询..."）且历史中有 tool 结果时，
                // 说明 LLM 还没真正基于工具结果回答 → 标记继续下一轮（让 LLM 真正输出最终答案）
                const hasToolResultsInHistory = fullMessages.some(m => m.role === 'tool')
                const trimmedContent = accumulatedContent.trim()
                const isShortTransition = trimmedContent.length < 50
                // 🔥 Bug 修复：识别"前导语"——以冒号结尾或含"先拉取/让我调用/准备调用"等
                // 明显未展开的引导句，即使 ≥50 字也应视为未完成（原逻辑只看字数会漏判）
                const endsWithColon = /[:：]\s*$/.test(trimmedContent)
                const hasLeadInPhrase = /(先拉取|先获取|让我调用|让我先|我现在来|我现在|准备调用|接下来|我来帮|帮您查询|帮您拉取|帮您获取|正在拉取|正在获取|正在查询)/.test(trimmedContent)
                const isLikelyIncomplete = hasToolResultsInHistory && (isShortTransition || endsWithColon || hasLeadInPhrase)

                if (isLikelyIncomplete) {
                  console.warn(`[Agent Loop] Round ${iteration} - Incomplete text after tool call (${trimmedContent.length} chars, short=${isShortTransition}, colon=${endsWithColon}, leadIn=${hasLeadInPhrase}), treating as transition.`)
                  // 🔥 Bug 修复：注入 system nudge 强制模型基于工具结果生成完整回答，
                  // 而不是再次输出"我来查询/先拉取"之类的引导语
                  fullMessages.push({ role: "assistant", content: accumulatedContent || "" })
                  fullMessages.push({
                    role: 'system',
                    content: '你刚才说了引导性话语但没有给出实质回答。请立即基于已获取的工具结果，为用户生成完整、具体的最终回答，不要再输出"我来查询/先拉取"之类的引导语，也不要再次调用工具。'
                  })
                  lastRoundHadToolCalls = true
                  if (iteration < MAX_AGENT_ITERATIONS) {
                    requestBody = { ...requestBody, messages: fullMessages }
                    continue
                  }
                  // 已达最大迭代：fall through 到循环外的强制最终回答
                }

                // 正常情况：无工具调用 + 累积内容是真正的最终回答
                fullMessages.push({ role: "assistant", content: accumulatedContent })
                lastRoundHadToolCalls = false

                // 边缘情况：AI 调用完工具后返回空内容（既无 tool_calls 也无文本）
                if (!accumulatedContent.trim() && hasToolResultsInHistory) {
                  console.warn(`[Agent Loop] Round ${iteration} - Empty final answer after tool calls, will force summary`)
                  lastRoundHadToolCalls = true
                  if (iteration < MAX_AGENT_ITERATIONS) {
                    requestBody = { ...requestBody, messages: fullMessages }
                    continue
                  }
                }
                console.log(`[Agent Loop] Round ${iteration} - Final answer finished streaming`)

                // 缓存可缓存的最终回答（仅知识/查询类，控制指令与实时数据已被 shouldCacheQuery 排除）
                if (accumulatedContent) {
                  try {
                    cacheResponse(lastUserText, effectiveModel || 'auto', { content: accumulatedContent, model: effectiveModel }, deviceStatus)
                  } catch (e) {
                    console.error('[ResponseCache] Failed to cache response:', e)
                  }
                }

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

            // === 强制最终回答：循环因达到最大迭代次数 或 LLM 异常提前退出，
            // 且最后一轮有 tool_calls（或被判为未完成的前导语），AI 没有机会生成最终总结
            // → 强制做一次不带 tools 的 LLM 调用，让 AI 基于工具结果输出最终回答
            // 🔥 Bug 修复：原来只在 iteration >= MAX_AGENT_ITERATIONS 时兜底，
            // 导致 LLM 中途失败 break 时对话戛然而止；现在异常退出也走兜底
            const needForceFinal = lastRoundHadToolCalls && (iteration >= MAX_AGENT_ITERATIONS || loopExitedAbnormally)
            if (needForceFinal) {
              const triggerReason = loopExitedAbnormally
                ? `abnormal exit (${abnormalExitReason})`
                : `max iterations (${MAX_AGENT_ITERATIONS})`
              console.log(`[Agent Loop] ⚠️ Forcing final summary due to ${triggerReason}, lastRoundHadToolCalls=${lastRoundHadToolCalls}`)

              // 构造最终回答请求：不带 tools，强制 AI 生成文本总结
              const finalMessages = (fullMessages as any[]).map((m: any) => {
                const { role, content, name, tool_calls, tool_call_id } = m
                const clean: any = { role, content }
                if (name) clean.name = name
                if (tool_calls) clean.tool_calls = tool_calls
                if (tool_call_id) clean.tool_call_id = tool_call_id
                return clean
              })

              // 在消息末尾添加系统提示，要求 AI 基于已有工具结果生成最终回答
              finalMessages.push({
                role: 'system',
                content: '你已经完成了所有工具调用。请基于已获取的工具结果，为用户生成完整、友好的最终回答。不要再次调用工具，直接给出总结性回复。'
              })

              const finalBody = {
                ...requestBody,
                messages: finalMessages,
                stream: true,
                // 不传 tools，强制 AI 只输出文本
              }
              delete (finalBody as any).tools

              try {
                const finalTimeoutController = new AbortController()
                const finalTimeoutId = setTimeout(() => finalTimeoutController.abort(), 60000)
                const finalRes = await fetch(targetUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                  body: JSON.stringify(finalBody),
                  signal: finalTimeoutController.signal
                })
                clearTimeout(finalTimeoutId)

                if (finalRes.ok && finalRes.body) {
                  const finalReader = finalRes.body.getReader()
                  const finalDecoder = new TextDecoder()
                  let finalBuffer = ""
                  let finalAccumulated = ""

                  while (true) {
                    const { done, value } = await finalReader.read()
                    if (done) break

                    finalBuffer += finalDecoder.decode(value, { stream: true })
                    const lines = finalBuffer.split("\n")
                    finalBuffer = lines.pop() || ""

                    for (const line of lines) {
                      const trimmed = line.trim()
                      if (!trimmed || trimmed === "data: [DONE]") continue
                      if (trimmed.startsWith("data: ")) {
                        try {
                          const json = JSON.parse(trimmed.slice(6))
                          trackUsage(json.usage)
                          const delta = json.choices?.[0]?.delta
                          if (delta?.content) {
                            finalAccumulated += delta.content
                            agentOutputText += delta.content
                            // 推送给前端
                            const filteredContent = filterBareTaskListJson(delta.content, finalAccumulated)
                            const filteredFinal = filterDisabledFeatures(filteredContent, aiFeatures)
                            if (filteredFinal) {
                              const cleanJson = JSON.parse(JSON.stringify(json))
                              if (cleanJson.choices?.[0]?.delta) {
                                cleanJson.choices[0].delta.content = filteredFinal
                              }
                              controller.enqueue(encoder.encode(`data: ${JSON.stringify(cleanJson)}\n\n`))
                            }
                          }
                        } catch (e) { console.warn('[Agent Loop] final summary filter parse failed:', e) }
                      }
                    }
                  }

                  fullMessages.push({ role: "assistant", content: finalAccumulated })
                  console.log(`[Agent Loop] ✅ Forced final summary generated (${finalAccumulated.length} chars)`)
                } else {
                  console.warn(`[Agent Loop] Forced final summary failed (status ${finalRes.status})`)
                }
              } catch (finalErr: any) {
                console.warn(`[Agent Loop] Forced final summary error:`, finalErr?.message || finalErr)
              }
            }

            // 🔥 Bug 修复：第一轮就异常退出且无 tool 结果可总结时，给用户明确错误提示
            // （此时 needForceFinal=false 因为 lastRoundHadToolCalls=false，强制总结不会触发）
            if (loopExitedAbnormally && !lastRoundHadToolCalls) {
              console.warn(`[Agent Loop] Fatal exit without any tool results: ${abnormalExitReason}`)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                id: `agent-fatal-${Date.now()}`,
                object: "chat.completion.chunk",
                created: Date.now(),
                model: effectiveModel,
                choices: [{ index: 0, delta: { content: `\n\n⚠️ Agent 推理失败：${abnormalExitReason}。请检查网络或 AI 服务状态后重试。` }, finish_reason: null }]
              })}\n\n`))
            }

            clearInterval(keepAlive)
            // 积分结算：按本轮真实 usage（或估算）扣积分并推送 credit_usage 事件
            await emitCreditEvent(controller, encoder, agentOutputText)
            // 记忆提取：在 [DONE] 之前执行并推送 memory_saved 事件（前端收到 [DONE] 后仍会 continue 读取）
            await extractAndPersistMemory(controller, encoder, agentOutputText, deviceStatus)
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))

            // 生成性能报告并记录
            const metrics = orchestrator.getMetrics();
            const toolStats = orchestrator.getToolStats();
            console.log(`[Orchestrator] Session ${sessionId} completed:`, {
              metrics,
              toolStats
            });

            // 记忆提取已在 [DONE] 之前通过 extractAndPersistMemory 完成

            // 清理编排器
            globalOrchestratorManager.unregister(sessionId);
            orchestrator.cleanup();

            // 🔥 清理挂起的用户输入（若用户在 CHECKPOINT/CLARIFY 挂起期间停止了对话）
            // 防止悬挂的 promise 阻塞下一次对话
            cancelPendingUserInput(sessionId, 'stream_closed')

            // 🔥 清理 session 的 task list（防止下一次对话复用旧任务列表）
            clearSessionTaskList(sessionId)

            // 配额已在请求开始时通过 reserveAiUsage 原子预扣，成功路径无需再次扣减

            controller.close()
          } catch (err: any) {
            clearInterval(keepAlive)
            console.error('[Agent Loop Error]', err)

            // 清理编排器
            globalOrchestratorManager.unregister(sessionId);
            orchestrator.cleanup();

            // 🔥 异常路径也要清理挂起的用户输入
            cancelPendingUserInput(sessionId, 'stream_error')

            // 🔥 异常路径也要清理 task list
            clearSessionTaskList(sessionId)

            // 请求失败 → 退还预扣配额
            if (quotaReserved) {
              refundAiUsage(user.id as number).catch(e => console.error('[Quota] refund failed:', e))
            }

            // 与 chat API 非流式错误的格式保持一致：`AI API Error: <code> - <details>`，
            // 避免在 SSE 里塞一个仅前端可见的 "Agent loop error: ..." 私有字段名。
            const errMsg = err instanceof Error ? err.message : String(err)
            controller.enqueue(encoder.encode(`data: {"error": ${JSON.stringify(`AI API Error: ${errMsg}`)}}\n\n`))
            controller.close()
          }
        }
      })

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no" }
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
      // 与项目里其它上游 AI 路由（automation/generate、ai/generate-schedule、citations 等）
      // 的错误风格保持一致：`AI API Error: <code> - <details>`，避免单独发明 `API Error: <code>` 这种格式。
      const upstreamBody = await response.text().catch(() => '')
      const errPayload = { error: `AI API Error: ${response.status}${upstreamBody ? ` - ${upstreamBody}` : ''}` }
      console.error(`[Chat API] Error from AI provider: ${response.status}`, upstreamBody)
      return new Response(
        JSON.stringify(errPayload),
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
                      trackUsage(json.usage)
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
                    } catch (e) { console.warn('[Chat Stream] DashScope App SSE inner parse failed:', e) }
                  }
                }
              }
              await emitCreditEvent(controller, encoder, acc)
              await extractAndPersistMemory(controller, encoder, acc, deviceStatus)
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
            // 积分结算（非 SSE 完整响应：usage 在顶层 JSON）
            trackUsage(data?.usage)
            await emitCreditEvent(controller, encoder, content)
            await extractAndPersistMemory(controller, encoder, content, deviceStatus)
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
                    trackUsage(json.usage)
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
                  } catch (e) { console.warn('[Chat Stream] dashscope chunk parse failed:', e) }
                }
              }
            }
            await emitCreditEvent(controller, encoder, acc)
            await extractAndPersistMemory(controller, encoder, acc, deviceStatus)
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
      if (!directStream) {
        if (quotaReserved) {
          refundAiUsage(user.id as number).catch(e => console.error('[Quota] refund failed:', e))
        }
        return new Response('No response body', { status: 500 })
      }

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const reader = directStream.getReader()
            const decoder = new TextDecoder()
            let buffer = ""
            let accumulatedContent = ""
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              buffer += decoder.decode(value, { stream: true })
              // 按行分割，保留最后未完整的行到 buffer
              const lines = buffer.split("\n")
              buffer = lines.pop() || ""
              const filteredLines: string[] = []
              for (const line of lines) {
                const trimmed = line.trim()
                if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
                  try {
                    const json = JSON.parse(trimmed.slice(6))
                    trackUsage(json.usage)
                    const delta = json.choices?.[0]?.delta
                    if (delta?.content) {
                      accumulatedContent += delta.content
                      let filtered = filterBareTaskListJson(delta.content, accumulatedContent)
                      filtered = filterDisabledFeatures(filtered, aiFeatures)
                      if (filtered) {
                        json.choices[0].delta.content = filtered
                        filteredLines.push(`data: ${JSON.stringify(json)}`)
                      }
                      continue
                    }
                  } catch {
                    // 非 JSON 行原样保留
                  }
                }
                filteredLines.push(line)
              }
              if (filteredLines.length > 0) {
                controller.enqueue(encoder.encode(filteredLines.join("\n") + "\n"))
              }
            }
            // flush 残留 buffer
            if (buffer.trim()) {
              controller.enqueue(encoder.encode(buffer + "\n"))
            }
            // 积分结算：直通转发分支（usage 已在行解析时追踪）
            await emitCreditEvent(controller, encoder, accumulatedContent)
            await extractAndPersistMemory(controller, encoder, accumulatedContent, deviceStatus)
            controller.close()
          } catch (e) {
            // 流传输失败 → 退还预扣配额
            if (quotaReserved) {
              refundAiUsage(user.id as number).catch(err => console.error('[Quota] refund failed:', err))
            }
            controller.error(e)
          }
        }
      })
      // 配额已在请求开始时通过 reserveAiUsage 原子预扣，成功路径无需再次扣减
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
          ...(response.headers.get("Transfer-Encoding") ? { "Transfer-Encoding": response.headers.get("Transfer-Encoding")! } : {})
        },
        status: response.status
      })
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Chat API Error:", error)
    // 请求异常 → 退还预扣配额
    if (quotaReserved && userId !== null) {
      await refundAiUsage(userId).catch(e => console.error('[Quota] refund failed:', e))
    }
    return Response.json(
      { error: `AI API Error: 500 - ${msg || "Internal server error"}` },
      { status: 500 }
    )
  }
}
