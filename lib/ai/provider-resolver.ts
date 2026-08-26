/**
 * AI 提供商解析器
 * 供 /api/chat/route.ts 等后端使用
 * 根据模型 ID 或提供商 ID 解析出对应的 baseUrl、apiKey 等信息
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import type { AIProvider, ProviderModel } from '@/app/api/admin/ai-providers/route'

const CONFIG_PATH = path.join(process.cwd(), 'data', 'ai-providers-config.json')

// ====== 内部类型 ======

export interface ResolvedProvider {
  providerId: string
  providerName: string
  type: AIProvider['type']
  baseUrl: string        // 已处理过的完整 URL（含 /v1/chat/completions）
  apiKey: string         // 完整 apiKey（仅服务端使用）
  model: string          // 最终使用的 model ID
  modelInfo: ProviderModel | undefined
}

// ====== 读取配置（内部使用，返回完整信息含 apiKey）======

// 扩展配置：包含 admin 设置的默认模型 ID 与 embedding 配置
export interface EmbeddingConfig {
  providerId: string
  model: string
  dimension?: number
  enabled: boolean
}

/**
 * 知识库全局配置
 * 所有魔数 / 开关 / 行为阈值都集中在这里，admin 后台可改
 */
export interface KnowledgeConfig {
  /** 上传文件大小上限（按 content_type 分类，字节） */
  uploadLimits: {
    text: number
    image: number
    document: number     // PDF/DOCX/XLSX/PPTX
    audio: number
    video: number
    other: number
  }
  /** 文本提取后保留的最大字符数 */
  maxExtractedChars: number
  /** Embedding 分块默认大小（字符） */
  chunking: {
    chunkSize: number
    chunkOverlap: number
    minChunkSize: number
    /** 每模型允许的最大 token 数（GLM 等 API 强限制） */
    maxTokensByModel: Record<string, number>
  }
  /** 智谱 GLM 集成开关 */
  glm: {
    /** 上传 PDF/图片时是否默认走 GLM-OCR 解析 */
    autoOcr: boolean
    /** 是否启用 GLM 文本重排序以提升检索精度 */
    enableRerank: boolean
    /** GLM-OCR 文档最大页数 */
    ocrMaxPages: number
    /** GLM-OCR 时返回的 markdown 最大字符数（截断保护） */
    ocrMaxChars: number
    /** Rerank 候选上限（GLM 限制 128） */
    rerankTopN: number
    /** Rerank 与原 hybrid 分数的混合权重（0-1） */
    rerankBlend: number
    /** GLM-OCR 单文件大小上限（图片/文档），字节 */
    fileSizeLimits: {
      image: number
      document: number
    }
  }
  /** 自动触发行为 */
  auto: {
    /** 上传后是否自动向量化 */
    autoEmbed: boolean
    /** 嵌入状态检查间隔（秒），仅用于定时任务 */
    embedTimeout: number
  }
  /** 检索行为（混合/语义/关键词） */
  search: {
    /** hybrid 检索时关键词的权重（0-1），语义权重 = 1 - keywordWeight */
    hybridKeywordWeight: number
    /** 单次查询每个子检索的默认 limit */
    defaultLimit: number
    /** 推荐查询时拉取的最近点击条目数 */
    recommendHistoryLimit: number
    /** 推荐查询返回上限 */
    recommendMaxResults: number
    /** 关键词搜索 tsvector 权重倍数（叠加在 ILIKE 上） */
    tsVectorWeight: number
    /** 关键词搜索每条结果前高亮窗口（字符） */
    highlightPadding: number
    /** 高亮窗口在 token 命中点后追加的尾部长度（字符），保证不会切到单词中 */
    highlightTailLength: number
    /** 关键词搜索每条结果前后片段长度（字符） */
    snippetPadding: { before: number; after: number }
    /** 关键词搜索 fallback 摘要最大长度 */
    snippetMaxLen: number
    /** 抽取 highlight 时对 item 内容的前置窗口乘数（= snippetMaxLen × 该值） */
    snippetWindowMultiplier: number
    /** ILIKE 结果数量限制 */
    maxCandidate: number
    /** query 字符串最大长度（API 层保护） */
    queryMaxLength: number
    /** 单条搜索结果保留的最大高亮片段数 */
    maxHighlights: number
    /** recommendSimilar（基于内容相似度）的默认 limit */
    similarDefaultLimit: number
    /** 关键词搜索 token 最小长度（短于此长度的 token 视为噪音） */
    minTokenLength: number
    /** recommendFromHistory 候选条目数 = maxResults × 该倍数（取半过滤后裁剪） */
    recommendCandidateMultiplier: number
    /** API 请求 limit 的防御性放大倍数（实际查询 limit × 该值，避免过滤后剩余不足） */
    requestOvershootMultiplier: number
  }
  /** 列表分页 */
  list: {
    /** items 列表默认 limit */
    defaultLimit: number
    /** items 列表最大 limit（防止过载） */
    maxLimit: number
    /** 备份列表默认 limit */
    backupDefaultLimit: number
    /** 推荐缓存列表默认 limit */
    recommendationDefaultLimit: number
  }
  /** 字段长度上限（API 校验） */
  limits: {
    /** 知识条目 title 最大长度 */
    itemTitleMax: number
    /** 集合 name 最大长度 */
    collectionNameMax: number
    /** 标签 name 最大长度 */
    tagNameMax: number
    /** 单条记录最大 tag 数 */
    maxTagsPerItem: number
    /** 摘要最大长度（UI 输入框） */
    summaryMax: number
  }
  /** UI 行为 */
  ui: {
    /** 列表分页大小 */
    listPageSize: number
    /** 搜索防抖（毫秒） */
    searchDebounceMs: number
    /** 侧边栏标签展示上限 */
    maxTagBadges: number
    /** 推荐卡片展示上限 */
    maxRecommendationCards: number
    /** AI 上下文注入：每个 query 注入的最大 chunk 数 */
    contextMaxChunks: number
    /** AI 上下文注入：每个 chunk 文本最大长度 */
    contextMaxChunkLength: number
    /** AI 上下文注入：context API 单次请求 maxChunks 的硬下限（即使 defaultChunks 很小也至少允许这么多） */
    contextMaxChunksCeilingMin: number
    /** 列表行内容预览最大字符数（list view） */
    listPreviewChars: number
    /** 推荐卡片内容预览最大字符数 */
    recommendationPreviewChars: number
    /** 新建条目对话框：内容 TextArea 最小/最大行数 */
    createItemTextareaMinRows: number
    createItemTextareaMaxRows: number
    /** 详情编辑：内容 TextArea 最小/最大行数 */
    detailEditorTextareaMinRows: number
    detailEditorTextareaMaxRows: number
    /** 备份列表最大滚动高度（px） */
    backupListMaxHeight: number
    /** 备份创建后两次轮询刷新间隔（ms） */
    backupPollingIntervals: number[]
  }
  /** 上传时解析行为 */
  upload: {
    /** XLSX 解析每个 sheet 的最大行数（防止超大表格 OOM） */
    xlsxMaxRows: number
  }
  /** 备份行为 */
  backup: {
    /** 备份时单次拉取条目的 batch 大小 */
    batchSize: number
  }
  /** Embedding 测试（embedding-config 端点） */
  embeddingTest: {
    /** 测试文本最大字符数 */
    maxTestTextChars: number
    /** 测试预览返回的向量维度数 */
    vectorPreviewCount: number
    /** 测试响应里 text 字段的预览字符数 */
    previewTextChars: number
  }
}

export const DEFAULT_KNOWLEDGE_CONFIG: KnowledgeConfig = {
  uploadLimits: {
    text: 5 * 1024 * 1024,         // 5MB
    image: 10 * 1024 * 1024,       // 10MB
    document: 50 * 1024 * 1024,    // 50MB
    audio: 50 * 1024 * 1024,       // 50MB
    video: 100 * 1024 * 1024,      // 100MB
    other: 20 * 1024 * 1024,       // 20MB
  },
  maxExtractedChars: 500_000,
  chunking: {
    chunkSize: 500,
    chunkOverlap: 50,
    minChunkSize: 50,
    maxTokensByModel: {
      "embedding-2": 500,
      "embedding-3": 3000,
      "text-embedding-3-small": 7000,
      "text-embedding-3-large": 7000,
      "text-embedding-v3": 7000,
      "text-embedding-v2": 2000,
    },
  },
  glm: {
    autoOcr: true,
    enableRerank: true,
    ocrMaxPages: 100,
    ocrMaxChars: 500_000,
    rerankTopN: 32,
    rerankBlend: 0.7,
    fileSizeLimits: {
      image: 10 * 1024 * 1024,       // 10MB
      document: 50 * 1024 * 1024,    // 50MB
    },
  },
  auto: {
    autoEmbed: true,
    embedTimeout: 15,
  },
  search: {
    hybridKeywordWeight: 0.4,        // 0.4 关键词 + 0.6 语义
    defaultLimit: 20,                 // 单次查询默认 limit
    recommendHistoryLimit: 20,        // 推荐：拉取最近点击条目数
    recommendMaxResults: 5,           // 推荐：最大返回数
    tsVectorWeight: 2.0,              // tsvector 权重倍数
    highlightPadding: 30,             // 高亮窗口前缀长度
    highlightTailLength: 20,          // 高亮窗口命中点后追加尾部
    snippetPadding: { before: 60, after: 140 }, // 摘要前后窗口
    snippetMaxLen: 200,               // 摘要最大长度
    snippetWindowMultiplier: 10,      // 抽取 highlight 时内容前置窗口 = snippetMaxLen × 该值
    maxCandidate: 30,                 // 关键词搜索返回上限
    queryMaxLength: 500,              // query 字符串最大长度
    maxHighlights: 2,                 // 单条结果保留的高亮片段数
    similarDefaultLimit: 5,           // recommendSimilar 默认 limit
    minTokenLength: 2,                // 关键词搜索 token 最小长度
    recommendCandidateMultiplier: 2,  // recommendFromHistory 候选条目倍数
    requestOvershootMultiplier: 2,    // API 请求 limit 的防御性放大倍数
  },
  list: {
    defaultLimit: 50,                 // items 列表默认 limit
    maxLimit: 200,                    // items 列表最大 limit
    backupDefaultLimit: 50,           // 备份列表默认 limit
    recommendationDefaultLimit: 10,   // 推荐缓存默认 limit
  },
  limits: {
    itemTitleMax: 500,                // 知识条目 title 最大长度
    collectionNameMax: 100,           // 集合 name 最大长度
    tagNameMax: 50,                   // 标签 name 最大长度
    maxTagsPerItem: 20,               // 单条记录最大 tag 数
    summaryMax: 200,                  // 摘要输入框 maxLength
  },
  ui: {
    listPageSize: 100,                // 列表分页
    searchDebounceMs: 300,            // 搜索防抖
    maxTagBadges: 12,                 // 标签云上限
    maxRecommendationCards: 4,        // 推荐卡片上限
    contextMaxChunks: 5,              // AI 上下文注入 chunk 数
    contextMaxChunkLength: 800,       // AI 上下文注入每 chunk 长度
    contextMaxChunksCeilingMin: 20,   // context API 单次 maxChunks 硬下限
    listPreviewChars: 100,            // 列表行内容预览字符数
    recommendationPreviewChars: 60,   // 推荐卡片内容预览字符数
    createItemTextareaMinRows: 6,
    createItemTextareaMaxRows: 20,
    detailEditorTextareaMinRows: 12,
    detailEditorTextareaMaxRows: 30,
    backupListMaxHeight: 280,         // 备份列表最大滚动高度
    backupPollingIntervals: [1000, 4000], // 备份后两次轮询刷新间隔
  },
  upload: {
    xlsxMaxRows: 2000,                // XLSX 每个 sheet 解析最大行数
  },
  backup: {
    batchSize: 200,                   // 备份单次拉取大小
  },
  embeddingTest: {
    maxTestTextChars: 1000,           // embedding 测试文本最大字符数
    vectorPreviewCount: 8,            // embedding 测试返回的向量维度数
    previewTextChars: 100,            // embedding 测试响应里 text 字段预览字符数
  },
}

export interface ProvidersConfig {
  providers: AIProvider[]
  /** admin 后台配置的默认/自动选择模型 ID（可选） */
  defaultModelId?: string
  /** 知识库 embedding 配置（可选） */
  embeddingConfig?: EmbeddingConfig
  /** 知识库全局配置（可选，未设置时使用 DEFAULT_KNOWLEDGE_CONFIG） */
  knowledgeConfig?: KnowledgeConfig
  /** AI 助手积分制度配置（admin 可选；token 计费 × 模型倍率 × 全局倍率） */
  creditConfig?: {
    enabled?: boolean
    globalMultiplier?: number
    outputWeight?: number
    tokensPerCredit?: number
    plusMonthlyQuota?: number
    proMonthlyQuota?: number
  }
}

/**
 * 进程内缓存：基于文件 mtime 失效，避免每次 AI 调用都读磁盘。
 * readProvidersConfig 被 embedding-service / knowledge-search / chat route 高频调用。
 */
let providersConfigCache: { data: ProvidersConfig; mtime: number } | null = null

export async function readProvidersConfig(): Promise<ProvidersConfig> {
  try {
    const stat = await fs.stat(CONFIG_PATH)
    const mtime = stat.mtimeMs
    if (providersConfigCache && providersConfigCache.mtime === mtime) {
      return providersConfigCache.data
    }
    const data = await fs.readFile(CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(data) as ProvidersConfig
    providersConfigCache = { data: parsed, mtime }
    return parsed
  } catch {
    // 文件不存在或解析失败：清空缓存，返回空配置
    providersConfigCache = null
    return { providers: [] }
  }
}

/**
 * 获取合并后的知识库配置
 * 深合并 admin 配置和 DEFAULT_KNOWLEDGE_CONFIG，确保任何字段都有默认值
 */
export async function getKnowledgeConfig(): Promise<KnowledgeConfig> {
  const config = await readProvidersConfig()
  const admin = config.knowledgeConfig || {}
  return deepMerge(DEFAULT_KNOWLEDGE_CONFIG, admin) as KnowledgeConfig
}

function isPlainObject(x: any): x is Record<string, any> {
  return !!x && typeof x === "object" && !Array.isArray(x)
}

function deepMerge(base: any, override: any): any {
  if (!isPlainObject(override)) return base
  const result: Record<string, any> = { ...base }
  for (const k of Object.keys(override)) {
    const v = override[k]
    if (isPlainObject(v) && isPlainObject(base[k])) {
      result[k] = deepMerge(base[k], v)
    } else if (v !== undefined && v !== null) {
      result[k] = v
    }
  }
  return result
}

/**
 * 解析默认/自动选择的模型 ID
 * 优先级：admin 配置 > 默认 provider 的第一个 enabled 模型 > 第一个 enabled 模型的 ID
 * 若配置无效（model 不存在或被禁用）则回退到下一级
 */
export function resolveDefaultModelId(config: ProvidersConfig): string | null {
  // 1) admin 配置的 defaultModelId
  if (config.defaultModelId) {
    for (const p of config.providers) {
      if (!p.enabled) continue
      for (const m of p.models) {
        if (m.id === config.defaultModelId && m.enabled) {
          return m.id
        }
      }
    }
  }

  // 2) 默认 provider 的第一个 enabled 模型
  const sorted = [...config.providers].sort((a, b) => a.priority - b.priority)
  for (const p of sorted) {
    if (!p.enabled) continue
    for (const m of p.models) {
      if (m.enabled) return m.id
    }
  }
  return null
}

/**
 * 根据模型 ID 查找所属提供商并解析连接信息
 *
 * @param modelId - 用户选择的模型 ID（如 "qwen3.6-plus", "gpt-4o"）
 * @param userApiKey - 用户自定义的 API Key（可选）
 * @param userApiUrl - 用户自定义的 API URL（可选）
 */
export async function resolveProvider(
  modelId: string,
  userApiKey?: string,
  userApiUrl?: string,
): Promise<ResolvedProvider | null> {
  const config = await readProvidersConfig()

  // 1. 如果用户提供了自定义 apiKey/apiUrl，直接使用（原有逻辑）
  if (userApiKey || userApiUrl) {
    return resolveFromUserConfig(modelId, userApiKey, userApiUrl)
  }

  // 2. 从已配置的提供商中查找该模型
  for (const provider of config.providers.sort((a, b) => a.priority - b.priority)) {
    if (!provider.enabled || !provider.apiKey) continue

    const foundModel = provider.models.find(m => m.id === modelId && m.enabled)
    if (foundModel) {
      const baseUrl = normalizeBaseUrl(provider.baseUrl, provider.type)
      return {
        providerId: provider.id,
        providerName: provider.name,
        type: provider.type,
        baseUrl,
        apiKey: provider.apiKey,
        model: modelId,
        modelInfo: foundModel,
      }
    }
  }

  // 3. 未找到匹配 → 回退到系统环境变量（SYSTEM_OPENAI_* / SYSTEM_GLM_*）
  // GLM 环境变量优先
  const glmKey = process.env.SYSTEM_GLM_API_KEY || ''
  const glmBase = process.env.SYSTEM_GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'
  if (glmKey) {
    return {
      providerId: 'system-glm',
      providerName: '系统默认 (智谱 GLM)',
      type: 'glm',
      baseUrl: normalizeBaseUrl(glmBase, 'glm'),
      apiKey: glmKey,
      model: modelId,
      modelInfo: undefined,
    }
  }
  const systemKey = process.env.SYSTEM_OPENAI_API_KEY || ''
  const systemBase = process.env.SYSTEM_OPENAI_BASE_URL || ''
  if (systemKey && systemBase) {
    return {
      providerId: 'system',
      providerName: '系统默认',
      type: 'openai',
      baseUrl: normalizeBaseUrl(systemBase, 'openai'),
      apiKey: systemKey,
      model: modelId,
      modelInfo: undefined,
    }
  }

  return null
}

/**
 * 使用用户自配置的 apiKey/apiUrl 解析
 */
function resolveFromUserConfig(
  modelId: string,
  userApiKey?: string,
  userApiUrl?: string,
): ResolvedProvider | null {
  if (!userApiKey) return null

  let url = normalizeOpenAIChatCompletionsUrl(userApiUrl)

  // 如果用户只给了 key 没 url，尝试用系统默认
  if (!url) {
    const systemBase = process.env.SYSTEM_OPENAI_BASE_URL || ''
    url = normalizeBaseUrl(systemBase, 'openai')
  }

  if (!url) return null

  return {
    providerId: 'user-custom',
    providerName: '用户自定义',
    type: detectTypeFromUrl(url),
    baseUrl: url,
    apiKey: userApiKey,
    model: modelId,
    modelInfo: undefined,
  }
}

/**
 * 规范化 URL：确保以 /chat/completions 结尾
 * - GLM (智谱 BigModel) 端点格式：https://open.bigmodel.cn/api/paas/v4  →  拼接为 /api/paas/v4/chat/completions
 *   不带 /v1 段；也不带 /compatible-mode
 * - DashScope 类型默认用 compatible-mode
 * - 其他 OpenAI 兼容格式：自动补 /v1
 */
export function normalizeBaseUrl(rawUrl: string, type: AIProvider['type']): string {
  let s = (rawUrl || '').trim()
  if (!s) return s

  // 去除尾部斜杠
  s = s.replace(/\/+$/, '')

  // GLM / 智谱 BigModel：端点形如 https://open.bigmodel.cn/api/paas/v4，直接拼 /chat/completions
  if (type === 'glm') {
    if (/\/chat\/completions$/.test(s)) return s
    return `${s}/chat/completions`
  }

  // DashScope 类型默认用 compatible-mode
  if (type === 'dashscope' && !s.includes('compatible-mode')) {
    if (/\/v1$/.test(s)) {
      return `${s}/chat/completions`
    }
    return `${s}/v1/chat/completions`
  }

  // OpenAI 兼容格式
  if (/\/chat\/completions$/.test(s)) return s
  if (/\/v1$/.test(s)) return `${s}/chat/completions`
  if (/^https?:\/\/[\w.-]+(?::\d+)?$/.test(s)) return `${s}/v1/chat/completions`
  return s
}

/** 兼容旧版 stripWrappingQuotes + normalize */
export function normalizeOpenAIChatCompletionsUrl(value: unknown): string {
  let s = String(value ?? '').trim()
  if (!s) return ''

  // 去除首尾引号/反引号
  s = s.replace(/^[`"']+/, '').replace(/[`"']+$/, '').trim()
  if (!s) return ''

  // 分离 query/hash
  const qIdx = s.indexOf('?')
  const hIdx = s.indexOf('#')
  const cut = qIdx === -1 ? hIdx : (hIdx === -1 ? qIdx : Math.min(qIdx, hIdx))
  const suffix = cut === -1 ? '' : s.slice(cut)
  s = cut === -1 ? s : s.slice(0, cut)

  s = s.replace(/\/+$/, '')
  // GLM (智谱 BigModel) 端点：open.bigmodel.cn/api/paas/v4  不带 /v1 段
  if (/\/open\.bigmodel\.cn\/api\/(?:paas|coding\/paas)\/v\d+/.test(s)) {
    if (/\/chat\/completions$/.test(s)) return s + suffix
    return `${s}/chat/completions${suffix}`
  }
  if (/\/chat\/completions$/.test(s)) return s + suffix
  if (/\/v1$/.test(s)) return `${s}/chat/completions${suffix}`
  if (/^https?:\/\/[\w.-]+(?::\d+)?$/.test(s)) return `${s}/v1/chat/completions${suffix}`
  return s + suffix
}

/**
 * 从 URL 推断提供商类型
 */
function detectTypeFromUrl(url: string): AIProvider['type'] {
  if (url.includes('dashscope.aliyuncs.com')) return 'dashscope'
  if (/open\.bigmodel\.cn\/api\/(?:paas|coding\/paas)/.test(url)) return 'glm'
  return 'openai'
}

/**
 * 模型默认倍率（admin 未配置 rateMultiplier 时的启发式，与 credit-service 保持一致）
 */
export function heuristicModelRate(modelId: string): number {
  const id = (modelId || '').toLowerCase()
  if (/(flash|air|free|turbo|lite|mini)/.test(id)) return 0.2
  if (/(max|ultra|flagship|o1|opus)/.test(id)) return 3
  if (/(deepseek-v4|deepseek-v3\.2|glm-4\.6|glm-5)/.test(id)) return 1.5
  return 1
}

/**
 * 获取所有可用提供商的公开信息（不含 apiKey），用于前端展示
 * 附带积分倍率：每模型 rateMultiplier（admin 配置或启发式默认）+ 全局 creditMultiplier
 */
export async function getPublicProviders() {
  const config = await readProvidersConfig()
  const defaultModelId = resolveDefaultModelId(config)
  const globalMultiplier = config.creditConfig?.globalMultiplier ?? 1

  return {
    providers: config.providers
      .filter(p => p.enabled)
      .map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        isDefault: p.isDefault || false,
        models: p.models.filter(m => m.enabled).map(m => ({
          id: m.id,
          name: m.name,
          description: m.description,
          icon: m.icon,
          supportsVision: m.supportsVision,
          supportsReasoning: m.supportsReasoning,
          // 积分倍率（模型倍率 × 全局倍率 = 生效倍率）
          rateMultiplier: typeof (m as any).rateMultiplier === 'number' && (m as any).rateMultiplier > 0
            ? (m as any).rateMultiplier
            : heuristicModelRate(m.id),
        })),
      })),
    // admin 配置的默认模型 ID（如果配置无效则自动回退到第一个 enabled 模型）
    defaultModelId,
    // 积分全局倍率（前端展示 ×N 用）
    creditMultiplier: globalMultiplier,
  }
}
