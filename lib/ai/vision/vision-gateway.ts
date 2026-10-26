/**
 * 视觉诊断网关（Vision Gateway）
 *
 * 这是「病虫害图像诊断」的唯一入口。任何视觉诊断需求（对话内、独立页面、自动巡检）
 * 都必须经过这里，不允许各调用方自己拼模型、自己写 apiKey 解析。
 *
 * ── 为什么要有这一层 ──
 * 改造前 `app/api/vlm/analyze-frame/route.ts` 自己从前端接收 apiKey/apiUrl，
 * 兜底到环境变量、硬编码默认模型 —— 这直接违反了项目铁律：
 * 「AI 辅助接口必须复用主对话模型链路（readProvidersConfig → resolveDefaultModelId
 *   → resolveProvider），禁止自写默认模型名」。
 * 结果是：用户在设置里换的视觉模型不生效、用户自带 Key 不被识别、额度统计脱节。
 *
 * 本模块把这四件事收敛到一处：
 *   1. 模型选择 —— 复用与 `/api/chat` **完全相同**的策略（supportsVision + provider 优先级）
 *   2. 凭据解析 —— 复用 resolveProvider（用户 Key 优先 → 平台配置 → 环境变量）
 *   3. 请求体适配 —— 复用 adaptChatRequestBody（Kimi 等厂商参数硬约束）
 *   4. 响应解析 —— 结构化 JSON 提取 + 归一化 + 校验，失败即降级而非抛错
 */

import {
    readProvidersConfig,
    resolveDefaultModelId,
    resolveProvider,
    type ResolvedProvider,
} from '@/lib/ai/provider-resolver'
import { adaptChatRequestBody } from '@/lib/ai/provider-body-adapter'
import { DISEASE_DIAGNOSIS_SYSTEM_PROMPT, buildDiagnosisPrompt } from './prompts'
import {
    normalizeBBox,
    type AnalysisRow,
    type DiagnosisResult,
    type Detection,
    type Differential,
    type DiseaseCandidate,
    type DiagnosisSeverity,
    type DiseaseCategory,
    type TreatmentLevel,
    type TreatmentLevelKey,
} from '@/lib/types/vision-diagnosis'
// 视觉超时的唯一来源：tool-manager 里 diagnose_plant_image 的工具级超时
// 以此为基准取更大值，保证"内层先兜底、外层后判超时"（见 agent-budget.test.ts）
import {
    VISION_DIAGNOSE_DEFAULT_TIMEOUT_MS,
    VISION_CANDIDATE_MIN_TIMEOUT_MS,
} from '@/lib/ai/agent-budget'

// ---------------------------------------------------------------------------
// 公开类型
// ---------------------------------------------------------------------------

export interface DiagnoseInput {
    /** 图片列表：dataURL（data:image/...;base64,...）或 http(s) URL。支持多张（全株 + 特写） */
    images: string[]
    /** 用户补充的场景信息（部位、环境、用药史等），可选 */
    context?: string
    /** 指定模型 id（可选）。不传则按 supportsVision 自动挑选 */
    model?: string
    /** 用户自定义密钥（可选）。传了就走 user-custom，不消耗平台额度 */
    apiKey?: string
    /** 用户自定义端点（可选） */
    apiUrl?: string
    /** 是否要求模型给出 bbox 定位，默认 true */
    withBoundingBoxes?: boolean
    /** 请求超时，默认 60s（视觉推理比文本慢） */
    timeoutMs?: number
}

export interface DiagnoseOutput {
    ok: boolean
    result?: DiagnosisResult
    /** 失败原因（面向用户或日志） */
    error?: string
    /** 错误分类，便于前端给出不同的引导文案 */
    errorKind?: 'no_vision_model' | 'no_credentials' | 'upstream' | 'timeout' | 'bad_output' | 'internal'
    /** 是否走了降级路径 */
    degraded?: boolean
    /** 实际生效的模型 id（可能与入参 model 不同：首选不可用时回退了候选） */
    model?: string
    /** 上游 finish_reason（'length' = 输出被 max_tokens 截断，结果经修复后可用但不完整） */
    finishReason?: string
    /** 每个候选模型的失败原因，便于定位「哪个模型没买 / 没额度」 */
    attempted?: Array<{ model: string; status?: number; error: string }>
}

// ---------------------------------------------------------------------------
// 模型选择（与 /api/chat 保持同一策略）
// ---------------------------------------------------------------------------

/**
 * 列出视觉模型候选（按 provider priority 升序）。
 *
 * 策略与 `app/api/chat/route.ts` 的 auto 分支一致：
 * 在所有 enabled provider 的 enabled 且 supportsVision 的模型里按优先级排序。
 * 这样「管理后台把某个视觉模型设为高优先级」会在对话与诊断两侧同时生效。
 */
export async function pickVisionModelIds(): Promise<string[]> {
    const cfg = await readProvidersConfig()
    return cfg.providers
        .filter((p) => p.enabled)
        .flatMap((p) =>
            p.models
                .filter((m) => m.enabled && m.supportsVision)
                .map((m) => ({ id: m.id, _providerPriority: p.priority ?? 999 })),
        )
        .sort((a, b) => a._providerPriority - b._providerPriority)
        .map((m) => m.id)
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
}

/**
 * 挑选视觉模型（取优先级最高的那个）。
 *
 * ⚠️ 只在「用户没有显式选模型」时用作兜底。用户一旦在界面里选了模型，
 * 视觉调用必须**优先用用户选的那个**（见 callVisionModel 的候选构造），
 * 不允许用这里挑出来的模型覆盖用户选择 —— 否则会出现
 * 「设置里换的模型不生效、诊断还在跑另一个模型」的割裂。
 */
export async function pickVisionModelId(): Promise<string | null> {
    try {
        return (await pickVisionModelIds())[0] || null
    } catch {
        return null
    }
}

/** 模型名启发式判断视觉能力（与 route.ts:1278-1284 同源，作为 admin 未标注时的兜底） */
export function heuristicSupportsVision(modelId: string): boolean {
    const m = (modelId || '').toLowerCase()
    return (
        m.includes('vision') ||
        m.includes('-vl-') ||
        /qwen\d*-vl/.test(m) ||
        m.includes('qvq') ||
        m.includes('qwen3.6') ||
        m.includes('gpt-4o') ||
        m.includes('gpt-5') ||
        m.includes('glm-4v') ||
        m.includes('gemini')
    )
}

// ---------------------------------------------------------------------------
// 底层视觉调用（诊断 / 巡检 / 后续的工具化调用共用同一条链路）
// ---------------------------------------------------------------------------

export interface CallVisionModelInput {
    /** 图片列表：dataURL 或 http(s) URL */
    images: string[]
    /** 系统提示词（角色与硬约束） */
    systemPrompt: string
    /** 用户提示词（任务说明与输出契约） */
    userPrompt: string
    /** 指定模型 id；不传则按 supportsVision 自动挑选 */
    model?: string
    /**
     * 响应校验器：模型返回 200 但内容不合格时（例如纯文本模型根本没看图、
     * 只回了一段散文），据此判定为「这个模型干不了这活」，继续尝试下一个候选。
     * 返回 null/undefined 表示不校验。
     */
    validate?: (text: string) => { ok: true } | { ok: false; reason: string }
    /** 用户自定义密钥（走 user-custom，不计平台额度） */
    apiKey?: string
    /** 用户自定义端点 */
    apiUrl?: string
    /** 采样温度，默认 0.2（诊断类任务应偏低） */
    temperature?: number
    /** 最大输出 token，默认 2000 */
    maxTokens?: number
    /** 超时（毫秒），默认 60s */
    timeoutMs?: number
}

export interface CallVisionModelOutput {
    ok: boolean
    /** 模型返回的原始文本（未做结构化解析） */
    text?: string
    /** 实际生效的模型 id */
    model?: string
    /** 供应商类型 */
    provider?: string
    /** token 用量 */
    usage?: { input: number; output: number; total: number }
    error?: string
    errorKind?: DiagnoseOutput['errorKind']
    /** 上游 finish_reason（'length' 表示被 max_tokens 截断） */
    finishReason?: string
    /**
     * 本次实际生效的模型 id。
     * 可能与传入的 `model` 不同（候选回退时），调用方据此如实告知用户。
     */
    attempted?: Array<{ model: string; status?: number; error: string }>
}

/** 单次尝试的结果（内部用） */
interface VisionAttempt {
    ok: boolean
    status?: number
    text?: string
    model: string
    provider?: string
    finishReason?: string
    usage?: { input: number; output: number; total: number }
    error?: string
    errorKind?: DiagnoseOutput['errorKind']
    /** 该错误是否值得换下一个候选再试 */
    retryable: boolean
}

/**
 * 对**一个**模型发起一次视觉请求。不抛异常。
 */
async function attemptVisionCall(
    modelId: string,
    params: {
        images: string[]
        systemPrompt: string
        userPrompt: string
        apiKey?: string
        apiUrl?: string
        temperature: number
        maxTokens: number
        timeoutMs: number
        validate?: (text: string) => { ok: true } | { ok: false; reason: string }
    },
): Promise<VisionAttempt> {
    const { images, systemPrompt, userPrompt, apiKey, apiUrl, temperature, maxTokens, timeoutMs, validate } = params

    // ── 解析凭据 ──
    let resolved: ResolvedProvider | null = null
    try {
        resolved = await resolveProvider(modelId, apiKey, apiUrl)
    } catch {
        resolved = null
    }

    if (!resolved || !resolved.apiKey) {
        return {
            ok: false,
            model: modelId,
            errorKind: 'no_credentials',
            error: `模型「${modelId}」没有可用的 API 凭据`,
            // 换下一个候选可能就有 key 了
            retryable: true,
        }
    }

    // ── 统一到 OpenAI 兼容形状 ──
    // DashScope 若配置为原生端点（/api/v1），请求体与响应结构与 OpenAI 形状不同。
    // 统一改走官方 compatible-mode，避免网关内维护两套 body / 响应解析分支。
    let targetUrl = resolved.baseUrl
    if (/dashscope\.aliyuncs\.com/i.test(targetUrl) && !/compatible-mode/i.test(targetUrl)) {
        targetUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
    }

    // ── 组装请求 ──
    const userContent: Array<Record<string, unknown>> = [
        ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
        { type: 'text', text: userPrompt },
    ]

    const rawBody: Record<string, unknown> = {
        model: modelId,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
        ],
        temperature,
        max_tokens: maxTokens,
    }

    const requestBody = adaptChatRequestBody(rawBody, { baseUrl: targetUrl, model: modelId })

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${resolved.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        })

        if (!response.ok) {
            const errText = await response.text().catch(() => '')
            const status = response.status
            // 401/402/403/404/429 与 5xx = 这个模型当前用不了（没买 / 没额度 / 限流 / 服务端炸），
            // 换下一个候选是合理的；400 多半是请求体不被该模型接受（例如它根本不支持图片），
            // 换模型只会把用户的真实选择悄悄换掉，所以不重试。
            const retryable = status >= 500 || [401, 402, 403, 404, 429].includes(status)
            return {
                ok: false,
                status,
                model: modelId,
                errorKind: 'upstream',
                error: `上游模型返回 ${status}：${errText.slice(0, 300) || '无错误详情'}`,
                retryable,
            }
        }

        const data = await response.json().catch(() => null)
        const text = extractMessageText(data)

        // 上游 200 但内容不合格（典型：用户选的是纯文本模型，图片被忽略，回了一段散文）。
        // 这不算"上游故障"，但说明**这个模型干不了视觉任务** → 同样换下一个候选。
        if (validate) {
            const verdict = validate(text || '')
            if (!verdict.ok) {
                return {
                    ok: false,
                    status: response.status,
                    model: modelId,
                    errorKind: 'bad_output',
                    error: `模型「${modelId}」返回了无法使用的内容：${verdict.reason}`,
                    // 200 但内容不合格：可能是该模型没有视觉能力（散文），
                    // 也可能是输出被 max_tokens 截断（JSON 缺右括号）。两种情况都值得换候选再试。
                    retryable: true,
                }
            }
        }

        return {
            ok: true,
            model: modelId,
            text,
            finishReason: data?.choices?.[0]?.finish_reason,
            provider: resolved.type,
            usage: data?.usage
                ? {
                      input: data.usage.prompt_tokens || 0,
                      output: data.usage.completion_tokens || 0,
                      total: data.usage.total_tokens || 0,
                  }
                : undefined,
            retryable: false,
        }
    } catch (err: any) {
        const isAbort = err?.name === 'AbortError'
        return {
            ok: false,
            model: modelId,
            errorKind: isAbort ? 'timeout' : 'upstream',
            error: isAbort
                ? `视觉模型响应超时（${Math.round(timeoutMs / 1000)}s）`
                : `调用视觉模型失败：${err?.message || '未知错误'}`,
            // 超时/网络抖动换一个模型可能就通了
            retryable: true,
        }
    } finally {
        clearTimeout(timer)
    }
}

/**
 * 构造本次视觉调用的模型候选序列。
 *
 * 顺序铁律：
 *   1. **用户当前选择的模型永远排第一**（`model` 非空时）—— 视觉不能绕过用户的选择
 *      去挑网关自己认为"更合适"的模型，否则设置里换的模型在诊断侧不生效。
 *   2. 其后才是 admin 配置的 supportsVision 模型，按 provider priority 升序，
 *      仅作为「首选模型用不了」时的回退。
 *   3. 最后兜底 admin 默认模型。
 */
async function buildVisionCandidates(model?: string): Promise<string[]> {
    const candidates: string[] = []
    const push = (id?: string | null) => {
        const v = String(id || '').trim()
        if (v && v !== 'auto' && !candidates.includes(v)) candidates.push(v)
    }

    push(model)

    try {
        for (const id of await pickVisionModelIds()) push(id)
    } catch {
        /* 配置读取失败不影响用户显式指定的模型 */
    }

    if (candidates.length === 0) {
        try {
            const cfg = await readProvidersConfig()
            push(resolveDefaultModelId(cfg))
        } catch {
            /* 全部失败时返回空数组，由调用方报 no_vision_model */
        }
    }

    return candidates
}

/**
 * 通用视觉调用：负责「选模型 → 解析凭据 → 适配请求体 → 发请求 → 抽文本」这一段。
 *
 * 抽出来的意义：`/api/vlm/analyze-frame`（生长巡检）与
 * `/api/vision/diagnose`（病虫害诊断）在**这一段完全相同**，
 * 差异只在提示词与结果归一化。共用后，项目里不再存在第二处模型名硬编码。
 *
 * 失败语义：按候选序列依次尝试；只有「可重试」的错误（没额度 / 没权限 / 限流 /
 * 5xx / 超时）才换下一个模型，400 类错误直接返回，避免悄悄换掉用户选的模型。
 *
 * 同样不抛异常。
 */
export async function callVisionModel(input: CallVisionModelInput): Promise<CallVisionModelOutput> {
    const {
        images,
        systemPrompt,
        userPrompt,
        model,
        apiKey,
        apiUrl,
        temperature = 0.2,
        maxTokens = 2000,
        timeoutMs = VISION_DIAGNOSE_DEFAULT_TIMEOUT_MS,
        validate,
    } = input

    if (!images || images.length === 0) {
        return { ok: false, error: '缺少图片', errorKind: 'internal' }
    }

    // ── 1. 解析候选模型序列 ──
    const candidates = await buildVisionCandidates(model)

    if (candidates.length === 0) {
        return {
            ok: false,
            errorKind: 'no_vision_model',
            error: '尚未配置可用的视觉模型。请在「设置 → 模型」中启用一个支持视觉的模型。',
        }
    }

    const attempted: Array<{ model: string; status?: number; error: string }> = []
    let last: VisionAttempt | null = null

    for (const candidate of candidates) {
        const res = await attemptVisionCall(candidate, {
            images,
            systemPrompt,
            userPrompt,
            apiKey,
            apiUrl,
            temperature,
            maxTokens,
            // 多个候选均分超时预算：单个候选至少 20s，避免第一个就把预算耗光
            timeoutMs: Math.max(VISION_CANDIDATE_MIN_TIMEOUT_MS, Math.floor(timeoutMs / candidates.length)),
            validate,
        })

        if (res.ok) {
            return {
                ok: true,
                text: res.text,
                model: res.model,
                provider: res.provider,
                usage: res.usage,
                finishReason: res.finishReason,
                attempted,
            }
        }

        attempted.push({ model: candidate, status: res.status, error: res.error || '未知错误' })
        last = res
        console.warn(
            `[vision-gateway] model "${candidate}" failed (${res.errorKind || 'upstream'}), ` +
                `retryable=${res.retryable}: ${(res.error || '').slice(0, 160)}`,
        )

        if (!res.retryable) break
    }

    // 全部候选都失败：把每个模型的失败原因都带上，
    // 否则用户只看到一句"上游 403"，根本不知道是哪个模型没买/没额度。
    const detail = attempted.map((a, i) => `${i + 1}. ${a.model} → ${a.error.slice(0, 160)}`).join('\n')
    return {
        ok: false,
        errorKind: last?.errorKind || 'upstream',
        error: `视觉模型调用失败（已尝试 ${attempted.length} 个模型）：\n${detail}`,
        attempted,
    }
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

/**
 * 执行一次病虫害图像诊断。
 *
 * 本函数**不抛异常**：所有失败都收敛为 `{ ok: false, error, errorKind }`，
 * 让调用方（API 路由 / 工具执行器）能给出稳定的降级体验。
 */
export async function diagnose(input: DiagnoseInput): Promise<DiagnoseOutput> {
    const startedAt = Date.now()
    const { images, context, model, apiKey, apiUrl, withBoundingBoxes = true, timeoutMs = VISION_DIAGNOSE_DEFAULT_TIMEOUT_MS } = input

    if (!images || images.length === 0) {
        return { ok: false, error: '缺少图片', errorKind: 'internal' }
    }

    // ── 模型解析、凭据、请求体适配、超时、上游调用 —— 全部收敛在 callVisionModel ──
    const call = await callVisionModel({
        images,
        systemPrompt: DISEASE_DIAGNOSIS_SYSTEM_PROMPT,
        userPrompt: buildDiagnosisPrompt({ imageCount: images.length, context, withBoundingBoxes }),
        model,
        apiKey,
        apiUrl,
        temperature: 0.1,
        // 5000 而非 2000：诊断契约字段多（analysis / candidates / differentials /
        // treatments / followUp / detections），模型（尤其 deepseek 系列）容易写超，
        // 实测 2000 会把 JSON 截断在 evidence 中途 → 整份结果作废；
        // 新增 candidates + analysis 两个字段后预算再抬一档。
        maxTokens: 5000,
        timeoutMs,
        // 用户选的模型若是纯文本模型，它会返回 200 + 一段散文（图片被直接忽略）。
        // 这里把"能不能抠出结构化 JSON"作为验收标准：不合格就换下一个候选，
        // 避免"用户选了不支持视觉的模型 → 诊断永远拿不到结果"。
        // ⚠️ 判定必须与下面的解析口径一致：截断的 JSON 经过修复仍算合格，
        //    否则模型明明看到了图、只是被 max_tokens 切了一刀，也会被误判为"没有视觉能力"。
        validate: (text) =>
            extractJsonObject(text) || repairTruncatedJson(text)
                ? { ok: true }
                : { ok: false, reason: '未返回结构化 JSON（该模型可能不支持图片输入）' },
    })

    if (!call.ok || !call.text) {
        return {
            ok: false,
            error: call.error || '调用视觉模型失败',
            errorKind: call.errorKind,
            degraded: call.errorKind === 'no_vision_model' || call.errorKind === 'no_credentials',
            attempted: call.attempted,
        }
    }

    const rawText = call.text

    // ── 5. 解析结构化结果 ──
    // 先按完整 JSON 解析；失败则尝试修复「被 max_tokens 截断的 JSON」，
    // 而不是直接判死 —— 截断只损失最后几个字段，结论通常已经写出来了。
    let parsed = extractJsonObject(rawText)
    if (!parsed) {
        parsed = repairTruncatedJson(rawText)
        if (parsed) {
            console.warn(
                `[vision-gateway] model "${call.model}" output was truncated (finish_reason=${call.finishReason || 'unknown'}); repaired partial JSON`,
            )
        }
    }
    if (!parsed) {
        console.warn(
            `[vision-gateway] model "${call.model}" returned non-JSON output: ${rawText.slice(0, 400)}`,
        )
        return {
            ok: false,
            errorKind: 'bad_output',
            error: `模型「${call.model}」未返回可解析的结构化诊断结果（通常是该模型不支持图片输入）。`,
            model: call.model,
            attempted: call.attempted,
        }
    }

    const result = normalizeDiagnosis(parsed, {
        model: call.model || '',
        provider: call.provider,
        images: images.length,
        elapsedMs: Date.now() - startedAt,
    })

    if (!result) {
        console.warn(
            `[vision-gateway] normalizeDiagnosis rejected model "${call.model}" output: ${rawText.slice(0, 400)}`,
        )
        return {
            ok: false,
            errorKind: 'bad_output',
            error: `模型「${call.model}」返回的诊断结构不完整，无法呈现。`,
            model: call.model,
            attempted: call.attempted,
        }
    }

    return { ok: true, result, model: call.model, attempted: call.attempted, finishReason: call.finishReason }
}

// ---------------------------------------------------------------------------
// 响应提取与归一化（内部工具）
// ---------------------------------------------------------------------------

/** 从各家响应形状里抽出 assistant 文本 */
function extractMessageText(data: any): string {
    if (!data) return ''

    // OpenAI 兼容形状（含 DashScope compatible-mode、GLM、Moonshot）
    const openAiContent = data?.choices?.[0]?.message?.content
    if (typeof openAiContent === 'string' && openAiContent.trim()) return openAiContent
    // 少数模型返回 content 数组
    if (Array.isArray(openAiContent)) {
        const joined = openAiContent
            .map((c: any) => (typeof c === 'string' ? c : c?.text || ''))
            .join('')
            .trim()
        if (joined) return joined
    }

    // DashScope 原生形状（兼容老配置，作为兜底）
    const nativeContent = data?.output?.choices?.[0]?.message?.content
    if (typeof nativeContent === 'string' && nativeContent.trim()) return nativeContent
    if (Array.isArray(nativeContent)) {
        const joined = nativeContent
            .map((c: any) => (typeof c === 'string' ? c : c?.text || ''))
            .join('')
            .trim()
        if (joined) return joined
    }
    if (typeof data?.output?.text === 'string') return data.output.text

    return ''
}

/**
 * 从自由文本中抠出第一个 JSON 对象。
 *
 * 视觉模型常把 JSON 包在 ```json 代码块里，或在前后加一句解释。
 * 这里用**括号平衡扫描**（而非贪婪正则），避免嵌套对象被截断。
 * 字符串字面量内的括号会被跳过，防止误判平衡点。
 */
export function extractJsonObject(text: string): Record<string, any> | null {
    if (!text) return null

    // 优先剥掉 markdown 代码块围栏
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const candidates = [fenced?.[1], text].filter(Boolean) as string[]

    for (const candidate of candidates) {
        const start = candidate.indexOf('{')
        if (start === -1) continue

        let depth = 0
        let inString = false
        let escaped = false

        for (let i = start; i < candidate.length; i++) {
            const ch = candidate[i]

            if (inString) {
                if (escaped) {
                    escaped = false
                } else if (ch === '\\') {
                    escaped = true
                } else if (ch === '"') {
                    inString = false
                }
                continue
            }

            if (ch === '"') {
                inString = true
            } else if (ch === '{') {
                depth++
            } else if (ch === '}') {
                depth--
                if (depth === 0) {
                    const slice = candidate.slice(start, i + 1)
                    const parsed = safeParseJson(slice)
                    if (parsed && typeof parsed === 'object') return parsed
                    break
                }
            }
        }
    }

    return null
}

/** 宽松 JSON 解析：先直接 parse，失败再去尾逗号 / 单引号重试 */
function safeParseJson(slice: string): Record<string, any> | null {
    try {
        return JSON.parse(slice)
    } catch {
        // 常见瑕疵：对象/数组尾部的多余逗号
        const repaired = slice
            .replace(/,\s*([}\]])/g, '$1')
            .replace(/([{,]\s*)'([^']*)'(\s*:)/g, '$1"$2"$3')
        try {
            return JSON.parse(repaired)
        } catch {
            return null
        }
    }
}

/**
 * 修复「被 max_tokens 截断的 JSON」。
 *
 * ── 为什么必须有 ──
 * 诊断契约字段多（evidence / differentials / treatments / followUp / detections），
 * 视觉模型很容易写超预算，输出在 JSON 中途被截断 → 括号不闭合 → `extractJsonObject`
 * 返回 null → 整份诊断作废。实测 `deepseek-flash` 就是这样：它**真的看到了图**
 * （甚至识别出"这是示意图不是实拍"），却因为输出被切掉而拿不到任何结论。
 *
 * ── 策略 ──
 * 1. 扫描一遍，记录「不在字符串里 + 处于容器内 + 字符是逗号」的位置（= 安全的截断点）
 *    以及该位置对应的容器栈快照；
 * 2. 若结尾停在字符串中间，先补一个引号；
 * 3. 若结尾是 `:`（键写了值没写）或 `,`（多余逗号），回退到最后一个安全截断点；
 * 4. 用栈快照补全所有未闭合的 `}` / `]`；
 * 5. 清掉残留的尾逗号与"只有键没有值"的成员后再 parse。
 *
 * 这是**降级容错**：宁可少几条 evidence，也不要让用户什么都看不到。
 */
export function repairTruncatedJson(text: string): Record<string, any> | null {
    if (!text) return null

    // 容忍 markdown 代码块围栏（可能只有开头没有结尾）
    const fenced = text.match(/```(?:json)?\s*([\s\S]*)$/i)
    const src = fenced?.[1] ?? text

    const start = src.indexOf('{')
    if (start === -1) return null
    const body = src.slice(start)

    const stack: string[] = []
    let inString = false
    let escaped = false
    let cutIndex = -1
    let cutStack: string[] = []

    for (let i = 0; i < body.length; i++) {
        const ch = body[i]
        if (inString) {
            if (escaped) escaped = false
            else if (ch === '\\') escaped = true
            else if (ch === '"') inString = false
            continue
        }
        if (ch === '"') {
            inString = true
            continue
        }
        if (ch === '{' || ch === '[') {
            stack.push(ch)
            continue
        }
        if (ch === '}' || ch === ']') {
            stack.pop()
            continue
        }
        // 容器内的逗号 = 元素/成员之间的安全边界
        if (ch === ',' && stack.length > 0) {
            cutIndex = i
            cutStack = stack.slice()
        }
    }

    const build = (prefix: string, closing: string[]): Record<string, any> | null => {
        let fixed = prefix
        // 去掉尾部残留：`"key":` / `"key": ` / 尾逗号
        fixed = fixed.replace(/,?\s*"[^"]*"\s*:\s*$/, '')
        fixed = fixed.replace(/,\s*$/, '')
        for (let i = closing.length - 1; i >= 0; i--) fixed += closing[i] === '{' ? '}' : ']'
        fixed = fixed.replace(/,\s*([}\]])/g, '$1')
        const parsed = safeParseJson(fixed)
        return parsed ?? null
    }

    const tail = body.trimEnd()

    // 结尾不在字符串里且不是 `:` / `,` → 直接补全括号即可（最常见）
    if (!inString && !/[,:]$/.test(tail)) {
        const direct = build(body, stack)
        if (direct) return direct
    }

    // 否则回退到最后一个安全截断点
    if (cutIndex > 0) {
        const atCut = build(body.slice(0, cutIndex), cutStack)
        if (atCut) return atCut
    }

    // 最后再试一次：补引号 + 补括号
    const withQuote = inString ? body + '"' : body
    return build(withQuote, stack)
}

const VALID_CATEGORIES: DiseaseCategory[] = ['fungal', 'bacterial', 'viral', 'pest', 'physiological', 'nutrient', 'unknown']
const VALID_SEVERITIES: DiagnosisSeverity[] = ['none', 'mild', 'moderate', 'severe']
const TREATMENT_ORDER: TreatmentLevelKey[] = ['environment', 'physical', 'biological', 'chemical']
const DEFAULT_TREATMENT_LABEL: Record<TreatmentLevelKey, string> = {
    environment: '环境调控',
    physical: '物理防治',
    biological: '生物防治',
    chemical: '化学防治',
}

/** 把模型输出收敛为可信的 DiagnosisResult；结构不可用则返回 null */
function normalizeDiagnosis(
    raw: Record<string, any>,
    meta: DiagnosisResult['meta'],
): DiagnosisResult | null {
    if (!raw || typeof raw !== 'object') return null

    const diseaseName =
        typeof raw.diseaseName === 'string' && raw.diseaseName.trim()
            ? raw.diseaseName.trim()
            : '信息不足'

    const category: DiseaseCategory = VALID_CATEGORIES.includes(raw.category)
        ? raw.category
        : 'unknown'

    const confidence =
        typeof raw.confidence === 'number' && Number.isFinite(raw.confidence)
            ? Math.min(Math.max(raw.confidence, 0), 1)
            : 0.4

    const severity: DiagnosisSeverity = VALID_SEVERITIES.includes(raw.severity)
        ? raw.severity
        : 'none'

    const affectedParts = toStringArray(raw.affectedParts)
    const evidence = toStringArray(raw.evidence)

    /* 一句话结论（卡片头部展示）。模型可能不给 —— 缺失时由卡片端用
       「部位 + 类别 + 严重度提示」兜底，所以这里只做长度裁剪，不做强制校验。 */
    const summary =
        typeof raw.summary === 'string' && raw.summary.trim()
            ? raw.summary.trim().slice(0, 120)
            : ''

    const differentials: Differential[] = Array.isArray(raw.differentials)
        ? raw.differentials
              .filter((d: any) => d && typeof d.name === 'string')
              .slice(0, 6)
              .map((d: any) => ({
                  name: String(d.name).trim(),
                  excluded: d.excluded !== false,
                  reason: typeof d.reason === 'string' ? d.reason.trim() : '',
              }))
        : []

    /* 可能原因（由高到低）—— 参考稿的「可能原因」面板要进度条，所以模型要给概率。
       ⚠️ 概率只在模型**真的给了合法数字**时才保留：宁可不画进度条，
       也不要拿序号臆造一个百分比（那是在编造置信度）。 */
    const candidates: DiseaseCandidate[] = Array.isArray(raw.candidates)
        ? raw.candidates
              .filter((c: any) => c && typeof c.name === 'string' && String(c.name).trim())
              .slice(0, 4)
              .map((c: any) => ({
                  name: String(c.name).trim(),
                  probability:
                      typeof c.probability === 'number' && Number.isFinite(c.probability)
                          ? Math.min(Math.max(c.probability, 0), 1)
                          : undefined,
                  note: typeof c.note === 'string' ? c.note.trim().slice(0, 80) : undefined,
                  excluded: c.excluded === true,
              }))
        : []

    /* 病斑分析的分维度观察（叶片表现 / 病斑特征 / 颜色与边界…） */
    const analysis: AnalysisRow[] = Array.isArray(raw.analysis)
        ? raw.analysis
              .filter((a: any) => a && typeof a.label === 'string' && a.label.trim())
              .slice(0, 5)
              .map((a: any) => ({
                  label: String(a.label).trim().slice(0, 12),
                  value: typeof a.value === 'string' ? a.value.trim().slice(0, 120) : '',
              }))
              .filter((a) => a.value)
        : []

    const treatments: TreatmentLevel[] = Array.isArray(raw.treatments)
        ? raw.treatments
              .filter((t: any) => t && typeof t.level === 'string' && TREATMENT_ORDER.includes(t.level))
              .map((t: any) => ({
                  level: t.level as TreatmentLevelKey,
                  label:
                      typeof t.label === 'string' && t.label.trim()
                          ? t.label.trim()
                          : DEFAULT_TREATMENT_LABEL[t.level as TreatmentLevelKey],
                  actions: toStringArray(t.actions),
                  safetyIntervalDays:
                      typeof t.safetyIntervalDays === 'number' && Number.isFinite(t.safetyIntervalDays)
                          ? t.safetyIntervalDays
                          : undefined,
              }))
              .filter((t) => t.actions.length > 0)
              .sort((a, b) => TREATMENT_ORDER.indexOf(a.level) - TREATMENT_ORDER.indexOf(b.level))
        : []

    const detections: Detection[] = Array.isArray(raw.detections)
        ? (raw.detections as any[])
              .slice(0, 8)
              // 显式标注返回类型 `Detection | null`：若用 `satisfies` + `as const`，
              // 元素类型会窄化成 { source: "vlm" }，导致下面 filter 的
              // 类型保护重载（S extends T）失配，收窄不生效。
              .map((d: any, i: number): Detection | null => {
                  const bbox = normalizeBBox(d?.bbox)
                  if (!bbox) return null
                  return {
                      id: `det-${i}`,
                      label: typeof d?.label === 'string' && d.label.trim() ? d.label.trim() : '异常区域',
                      labelKey: typeof d?.labelKey === 'string' ? d.labelKey : undefined,
                      confidence:
                          typeof d?.confidence === 'number' && Number.isFinite(d.confidence)
                              ? Math.min(Math.max(d.confidence, 0), 1)
                              : confidence,
                      bbox,
                      source: 'vlm',
                  }
              })
              .filter((d): d is Detection => d !== null)
        : []

    const followUp = toStringArray(raw.followUp)

    // 最低完整性门槛：既没有诊断名也没有依据，视为无效输出
    if (diseaseName === '信息不足' && evidence.length === 0 && followUp.length === 0) {
        return null
    }

    return {
        diseaseName,
        summary: summary || undefined,
        category,
        confidence,
        severity,
        affectedParts,
        evidence,
        differentials,
        candidates: candidates.length > 0 ? candidates : undefined,
        analysis: analysis.length > 0 ? analysis : undefined,
        treatments,
        followUp: followUp.length > 0 ? followUp : undefined,
        detections,
        meta,
        timestamp: Date.now(),
    }
}

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    return value
        .filter((v) => typeof v === 'string' && v.trim())
        .map((v) => String(v).trim())
        .slice(0, 8)
}
