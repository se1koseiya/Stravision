/**
 * 技能工坊（Skill Forge）核心服务
 *
 * 对标"内置 AI 读懂技术文档 → 自动生成接入技能 → 自测复用 → 平台全域可用"的完整链路：
 *   1. analyze   分析技术文档：提取设备/产品能力、属性字段、数据规则、文档缺失项、自测问题
 *   2. generate  生成技能草稿：按平台 SKILL 规范产出可被 load_skill 加载的完整技能
 *   3. validate  结构校验：字段完整性 / slug 合法性 / 关键词 / 内容章节
 *   4. selfTest  自测复用：
 *      a. 匹配测试——用技能的 examples 走 KeywordMatcher，验证能被正确路由
 *      b. 彩排测试——LLM 仅凭技能内容回答自测问题，再由评分器对照原文档判分，
 *         确保技能内容自洽、无幻觉、可独立复用
 *   5. revise    自动修订：校验/自测失败时把失败原因回灌生成器，最多 maxRevisionRounds 轮
 *   6. register  注册：写入 store_skills（已存在则更新）、自动安装给发起用户、清技能缓存，
 *      之后 chat agent / automation AI 等平台所有 AI 入口都能通过技能清单路由到它
 *
 * LLM 调用遵循 admin 后台配置的默认模型（provider-resolver），与 automation/generate 同一模式。
 */

import { readProvidersConfig, resolveDefaultModelId, resolveProvider } from './provider-resolver'
import {
  createSkill,
  updateSkill,
  getSkillById,
  getAllSkills,
  installSkill,
  initSkillStoreTables,
} from '@/lib/db/skill-store-service'
import { execute, queryOne } from '@/lib/db/database'
import { KeywordMatcher } from './skill-system/matchers'
import type { Skill } from './skill-system/types'
import { skillManager } from './skill-system/skill-manager'
// 管线预算的唯一来源：与 tool-manager 的工具级超时共用同一变量，
// 使「外层超时 > 内层预算」从注释里的约定变成同一根线（由 agent-budget.test.ts 守护）
import { SKILL_FORGE_LLM_TIMEOUT_MS, SKILL_FORGE_PIPELINE_BUDGET_MS } from './agent-budget'

// ============ 类型定义 ============

export type ForgeStage = 'analyze' | 'generate' | 'validate' | 'self-test' | 'revise' | 'register'

export interface ForgeProgress {
  stage: ForgeStage
  detail: string
  round?: number
}

export interface DocumentAnalysis {
  subject_name: string
  summary: string
  capabilities: Array<{ name: string; description: string }>
  properties: Array<{ name: string; type: string; unit?: string; range?: string; access?: string }>
  rules: string[]
  missing_info: string[]
  test_questions: string[]
}

export interface SkillDraft {
  skill_id: string
  name: string
  description: string
  icon: string
  category: string
  keywords: string[]
  examples: string[]
  effects: string
  content: string
}

export interface ValidationIssue {
  field: string
  message: string
  level: 'error' | 'warning'
}

export interface ValidationResult {
  passed: boolean
  issues: ValidationIssue[]
}

export interface MatchTestCase {
  query: string
  score: number
  passed: boolean
  reason: string
}

export interface RehearsalTestCase {
  question: string
  answer: string
  passed: boolean
  reason: string
}

export interface SelfTestReport {
  matchTests: MatchTestCase[]
  rehearsalTests: RehearsalTestCase[]
  overallPassed: boolean
  score: number
}

export interface ForgeResult {
  success: boolean
  analysis: DocumentAnalysis | null
  skill: SkillDraft | null
  validation: ValidationResult | null
  selfTest: SelfTestReport | null
  registered: boolean
  skillId: string | null
  alreadyExisted: boolean
  rounds: number
  /** 信息不足：关键信息缺失，需要用户补充后重试（此时不生成/不注册） */
  needsInput?: boolean
  /** 待向用户确认/补充的问题清单（needsInput=true 时必有） */
  questions?: string[]
  error?: string
}

export interface ForgeOptions {
  document: string
  documentName?: string
  userId?: number
  /** 是否发布到技能商店（默认 true；false 时存为草稿） */
  publish?: boolean
  /** 是否自动为发起用户安装（默认 true） */
  autoInstall?: boolean
  /** 自动修订最大轮数（默认 2，即最多生成 3 次） */
  maxRevisionRounds?: number
  /** 阶段进度回调（chat 链路会转成 SSE 思维链） */
  onProgress?: (progress: ForgeProgress) => void
  /** 修订模式：带上已有技能 + 用户反馈重新生成 */
  refineContext?: {
    existingSkillId: string
    feedback: string
    extraDocument?: string
  }
}

// ============ 常量 ============

/** 文档最大长度（字符），超出截断 */
const MAX_DOC_CHARS = 60_000
/** LLM 调用超时（ms） —— 唯一来源 lib/ai/agent-budget.ts */
const LLM_TIMEOUT_MS = SKILL_FORGE_LLM_TIMEOUT_MS
/** 彩排测试问题数（并行执行，不增加墙钟时间） */
const REHEARSAL_QUESTION_COUNT = 3
/** 整条锻造管线的总时间预算（ms）：到点即停止修订并输出当前最好结果，
 *  避免外层工具超时直接把结果丢掉（用户什么都看不到）。
 *  唯一来源 = agent-budget 的 SKILL_FORGE_PIPELINE_BUDGET_MS —— tool-manager 里
 *  create_skill_from_doc / refine_skill 的工具级超时基于同一个常量取更大值 */
const PIPELINE_BUDGET_MS = SKILL_FORGE_PIPELINE_BUDGET_MS
/** 匹配测试通过阈值（与 matchers MIN_MATCH_SCORE 一致） */
const MATCH_PASS_THRESHOLD = 60
/** 彩排通过率阈值：3 题中答对 2 题（0.667）即算通过。
 *  定 0.7 会退化成"必须全对"，极易触发无谓的自动修订轮，拖慢整条管线 */
const REHEARSAL_PASS_RATIO = 0.6

const VALID_CATEGORIES = ['设备', '农业', '工具', '系统', '商业', '生活']

// ============ Forge 报告持久化 ============

interface ForgeReportRow {
  id: number
  user_id: number
  skill_id: string
  document_name: string
  document_text: string
  analysis_json: string
  report_json: string
  created_at: number
}

async function initForgeTable(): Promise<void> {
  await initSkillStoreTables()
  await execute(`
    CREATE TABLE IF NOT EXISTS skill_forge_reports (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      skill_id TEXT NOT NULL,
      document_name TEXT NOT NULL DEFAULT '',
      document_text TEXT NOT NULL DEFAULT '',
      analysis_json TEXT NOT NULL DEFAULT '{}',
      report_json TEXT NOT NULL DEFAULT '{}',
      created_at BIGINT NOT NULL
    )
  `)
  try {
    await execute(`CREATE INDEX IF NOT EXISTS idx_forge_reports_skill ON skill_forge_reports(skill_id)`)
    await execute(`CREATE INDEX IF NOT EXISTS idx_forge_reports_user ON skill_forge_reports(user_id)`)
  } catch { /* 索引已存在 */ }
}

async function saveForgeReport(params: {
  userId: number
  skillId: string
  documentName: string
  documentText: string
  analysis: DocumentAnalysis
  report: Omit<ForgeResult, 'analysis'>
}): Promise<void> {
  await initForgeTable()
  await execute(
    `INSERT INTO skill_forge_reports (user_id, skill_id, document_name, document_text, analysis_json, report_json, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      params.userId,
      params.skillId,
      params.documentName,
      params.documentText.slice(0, MAX_DOC_CHARS),
      JSON.stringify(params.analysis),
      JSON.stringify(params.report),
      Date.now(),
    ]
  )
}

/** 取某技能最近一次锻造时使用的源文档（供 refine 不重新上传文档时使用） */
async function getLatestForgeDocument(skillId: string): Promise<{ document: string; documentName: string } | null> {
  await initForgeTable()
  const row = await queryOne<ForgeReportRow>(
    'SELECT * FROM skill_forge_reports WHERE skill_id = $1 ORDER BY created_at DESC LIMIT 1',
    [skillId]
  )
  if (!row) return null
  return { document: row.document_text, documentName: row.document_name }
}

// ============ LLM 调用 ============

interface LLMCallOptions {
  system: string
  user: string
  temperature?: number
  jsonMode?: boolean
  maxTokens?: number
}

async function resolveLLM(): Promise<{ url: string; apiKey: string; model: string } | null> {
  const config = await readProvidersConfig()
  const modelId = resolveDefaultModelId(config)
  if (!modelId) {
    // 回退环境变量
    const key = process.env.SYSTEM_OPENAI_API_KEY || process.env.SYSTEM_GLM_API_KEY || ''
    const base = process.env.SYSTEM_OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'
    if (!key) return null
    return {
      url: /\/chat\/completions$/.test(base) ? base : `${base.replace(/\/+$/, '')}/chat/completions`,
      apiKey: key,
      model: process.env.SYSTEM_OPENAI_MODEL || 'qwen-plus',
    }
  }
  const provider = await resolveProvider(modelId)
  if (!provider) return null
  return { url: provider.baseUrl, apiKey: provider.apiKey, model: provider.model }
}

async function callLLM(opts: LLMCallOptions): Promise<string> {
  const llm = await resolveLLM()
  if (!llm) {
    throw new Error('AI 服务未配置：请先在管理后台「AI 提供商」中配置模型')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)
  try {
    const body: Record<string, any> = {
      model: llm.model,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
      temperature: opts.temperature ?? 0.3,
    }
    if (opts.jsonMode !== false) body.response_format = { type: 'json_object' }
    if (opts.maxTokens) body.max_tokens = opts.maxTokens

    const res = await fetch(llm.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${llm.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`AI API 错误 (${res.status}): ${text.slice(0, 300)}`)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? ''
  } finally {
    clearTimeout(timer)
  }
}

/** 从 LLM 输出中稳健提取 JSON（容忍 ```json 围栏 / 前后杂文字） */
export function extractJson<T>(raw: string): T | null {
  if (!raw) return null
  let text = raw.trim()
  // 去除围栏
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) text = fence[1].trim()
  try {
    return JSON.parse(text) as T
  } catch { /* 继续 */ }
  // 截取首个 { 到最后一个 }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1)) as T
    } catch { /* 继续 */ }
  }
  return null
}

// ============ Stage 1: 分析文档 ============

const ANALYZE_SYSTEM = `你是物联网/智能硬件领域的技术文档解析专家。你的任务是阅读一份技术文档（设备协议、产品说明、接口文档等），提取出平台接入所需的全部关键信息。

请输出严格的 JSON，结构如下：
{
  "subject_name": "文档描述的对象名称（设备/产品/系统名）",
  "summary": "一段话概括文档内容与用途（80-150字）",
  "capabilities": [{ "name": "功能名", "description": "该功能做什么、何时触发" }],
  "properties": [{ "name": "属性/字段名", "type": "数据类型", "unit": "单位（可省略）", "range": "取值范围（可省略）", "access": "读写权限（可省略）" }],
  "rules": ["数据规则、报文结构、缩放/换算规则、交互时序等关键规则，每条一句话"],
  "missing_info": ["文档中缺失或含糊、需要人工补充的信息；没有则空数组"],
  "test_questions": ["3个仅凭此文档就能明确回答的自测问题，用于验证生成的技能是否忠实于文档。问题应是用户视角的真实提问，例如'XX设备的温度上报单位是什么？'"]
}

要求：
- capabilities/properties 尽量覆盖文档中的全部条目
- test_questions 必须恰好 ${REHEARSAL_QUESTION_COUNT} 个，且答案必须能从文档中直接找到
- 只输出 JSON，不要任何解释文字`

async function analyzeDocument(document: string): Promise<DocumentAnalysis> {
  const raw = await callLLM({
    system: ANALYZE_SYSTEM,
    user: `请分析以下技术文档：\n\n${document}`,
    temperature: 0.1,
    maxTokens: 4000,
  })
  const parsed = extractJson<Partial<DocumentAnalysis>>(raw)
  if (!parsed || !parsed.subject_name) {
    throw new Error('文档分析失败：AI 未返回有效的结构化结果')
  }
  return {
    subject_name: parsed.subject_name || '未命名对象',
    summary: parsed.summary || '',
    capabilities: Array.isArray(parsed.capabilities) ? parsed.capabilities : [],
    properties: Array.isArray(parsed.properties) ? parsed.properties : [],
    rules: Array.isArray(parsed.rules) ? parsed.rules : [],
    missing_info: Array.isArray(parsed.missing_info) ? parsed.missing_info : [],
    test_questions: (Array.isArray(parsed.test_questions) ? parsed.test_questions : []).slice(0, REHEARSAL_QUESTION_COUNT),
  }
}

// ============ Stage 1.5: 信息充分性判断 ============

/**
 * 判断分析结果是否信息不足（无法生成可用技能）
 *
 * 判据：既识别不出功能，又几乎识别不出属性字段——说明文档没有可提炼的内容，
 * 继续生成只会产出空泛/编造的技能，必须中止并向用户追问。
 * 仅 missing_info 非空不阻断（多数文档都有小缺口，卡片中提示即可）。
 */
export function isAnalysisInsufficient(analysis: DocumentAnalysis): boolean {
  return analysis.capabilities.length === 0 && analysis.properties.length < 2
}

/** 根据分析结果构造向用户追问的问题清单 */
export function buildFollowUpQuestions(analysis: DocumentAnalysis): string[] {
  const questions: string[] = []
  if (analysis.missing_info.length > 0) {
    questions.push(...analysis.missing_info.slice(0, 5))
  }
  if (analysis.capabilities.length === 0) {
    questions.push('请补充该设备/产品的功能说明（它能做什么：上报数据、可控制的动作、告警等）')
  }
  if (analysis.properties.length < 2) {
    questions.push('请补充属性/字段定义（至少包含：字段名称、数据类型、单位，最好还有取值范围与读写权限）')
  }
  if (analysis.rules.length === 0) {
    questions.push('请补充数据交互规则或报文示例（如寄存器表、JSON 上报样例、缩放/换算规则）')
  }
  return questions.slice(0, 6)
}

// ============ Stage 2: 生成技能草稿 ============

const GENERATE_SYSTEM = `你是智能体平台的"技能工程师"。平台 AI 助手通过"技能系统"工作：系统把技能清单（id/名称/描述/关键词）注入助手提示词，助手按需调用 load_skill 加载技能全文，再依据全文回答用户或执行操作。

现在给你一份技术文档的分析结果和原文，请把它锻造成一个平台技能。技能全文会被注入 AI 助手的上下文（助手看不到原始文档），所以**技能内容必须自包含**——把助手回答用户、执行操作所需的全部关键事实（设备编号/字段表/单位/换算规则/指令格式/注意事项等）完整写进技能内容，不得出现"参见原文档"之类的引用。

输出严格的 JSON：
{
  "skill_id": "英文小写短横线 slug，如 'soil-sensor-npk'，全局唯一，不超过40字符",
  "name": "技能中文名（不超过20字）",
  "description": "一句话描述该技能赋予助手什么能力（不超过60字）",
  "icon": "一个贴切的 emoji",
  "category": "设备 | 农业 | 工具 | 系统 | 商业 | 生活 之一",
  "keywords": ["5-15个中文关键词：用户提到这些词时助手应想到加载此技能"],
  "examples": ["2-3条用户真实问法示例"],
  "effects": "一句话说明启用后助手能做什么",
  "content": "技能正文（Markdown，SKILL.md body 格式，不含 frontmatter）"
}

content 的推荐结构（用 Markdown 标题组织，总长度 400-3000 字）：
# 标题
## 适用场景（什么问题该参考本技能）
## 对象信息（设备/产品名、型号、定位）
## 关键参数与字段表（Markdown 表格：字段/类型/单位/范围/权限）
## 操作与回答指南（告诉助手：用户问 X 时应如何回答/操作；涉及指令时给出精确格式）
## 注意事项（安全限制、禁止事项、易错点）

要求：
- keywords 要覆盖用户的自然口语表达，不要只有书面术语
- content 面向 AI 助手阅读（第二人称"你"），是操作指南不是文档摘抄
- 严禁编造文档中不存在的参数、字段或规则
- 只输出 JSON`

async function generateSkillDraft(params: {
  document: string
  analysis: DocumentAnalysis
  failureFeedback?: string[]
  refineContext?: ForgeOptions['refineContext']
  existingContent?: string
}): Promise<SkillDraft> {
  let user = `技术文档分析结果：\n${JSON.stringify(params.analysis, null, 2)}\n\n技术文档原文：\n${params.document}`

  if (params.refineContext) {
    user += `\n\n## 修订任务\n当前已有技能（id: ${params.refineContext.existingSkillId}），用户反馈如下，请基于原文档重新生成改进版技能：\n${params.refineContext.feedback}`
    if (params.refineContext.extraDocument) {
      user += `\n\n用户补充的新资料：\n${params.refineContext.extraDocument}`
    }
    if (params.existingContent) {
      user += `\n\n当前技能全文（供参考改进）：\n${params.existingContent}`
    }
  }

  if (params.failureFeedback && params.failureFeedback.length > 0) {
    user += `\n\n## 上一轮自测失败原因（必须修复）\n${params.failureFeedback.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
  }

  const raw = await callLLM({
    system: GENERATE_SYSTEM,
    user,
    temperature: 0.4,
    maxTokens: 8000,
  })
  const parsed = extractJson<Partial<SkillDraft>>(raw)
  if (!parsed || !parsed.skill_id || !parsed.content) {
    throw new Error('技能生成失败：AI 未返回有效的技能 JSON')
  }
  return {
    skill_id: String(parsed.skill_id),
    name: String(parsed.name || parsed.skill_id),
    description: String(parsed.description || ''),
    icon: String(parsed.icon || '🧩'),
    category: VALID_CATEGORIES.includes(parsed.category || '') ? String(parsed.category) : '工具',
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String) : [],
    examples: Array.isArray(parsed.examples) ? parsed.examples.map(String) : [],
    effects: String(parsed.effects || ''),
    content: String(parsed.content),
  }
}

// ============ Stage 3: 结构校验 ============

export function validateSkillDraft(draft: SkillDraft, existingIds: Set<string>): ValidationResult {
  const issues: ValidationIssue[] = []

  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(draft.skill_id)) {
    issues.push({ field: 'skill_id', message: `skill_id "${draft.skill_id}" 不合法：需为小写字母/数字/短横线，2-40 字符`, level: 'error' })
  }
  if (existingIds.has(draft.skill_id)) {
    issues.push({ field: 'skill_id', message: `skill_id "${draft.skill_id}" 已存在于技能商店`, level: 'error' })
  }
  if (!draft.name || draft.name.length > 20) {
    issues.push({ field: 'name', message: '技能名称不能为空且不超过 20 字', level: 'error' })
  }
  if (!draft.description || draft.description.length > 60) {
    issues.push({ field: 'description', message: '描述不能为空且不超过 60 字', level: 'error' })
  }
  if (draft.keywords.length < 3 || draft.keywords.length > 15) {
    issues.push({ field: 'keywords', message: `关键词数量 ${draft.keywords.length} 不在 3-15 范围`, level: 'error' })
  }
  if (draft.keywords.some(k => !k || k.length > 12)) {
    issues.push({ field: 'keywords', message: '存在空或超过 12 字的关键词', level: 'error' })
  }
  if (draft.examples.length < 1) {
    issues.push({ field: 'examples', message: '至少需要 1 条用户问法示例', level: 'error' })
  }
  if (draft.content.length < 200) {
    issues.push({ field: 'content', message: `技能正文仅 ${draft.content.length} 字，至少 200 字（需自包含关键事实）`, level: 'error' })
  }
  if (draft.content.length > 12000) {
    issues.push({ field: 'content', message: `技能正文 ${draft.content.length} 字超长（上限 12000），请精简`, level: 'error' })
  }
  const headingCount = (draft.content.match(/^##\s/gm) || []).length
  if (headingCount < 2) {
    issues.push({ field: 'content', message: '正文缺少结构化章节（需至少 2 个 ## 标题）', level: 'error' })
  }
  if (/^---\s*\n/.test(draft.content)) {
    issues.push({ field: 'content', message: '正文不应包含 frontmatter（--- 块）', level: 'error' })
  }
  if (/参见原文|参考原文档|见文档/.test(draft.content)) {
    issues.push({ field: 'content', message: '正文包含"参见原文档"类引用，技能必须自包含', level: 'error' })
  }

  // 警告级
  if (draft.effects.length === 0) {
    issues.push({ field: 'effects', message: 'effects 为空，建议补充一句话能力说明', level: 'warning' })
  }
  if (!VALID_CATEGORIES.includes(draft.category)) {
    issues.push({ field: 'category', message: `分类 "${draft.category}" 不在可选范围`, level: 'warning' })
  }

  return { passed: !issues.some(i => i.level === 'error'), issues }
}

// ============ Stage 4: 自测 ============

/** 匹配测试：验证技能能被关键词路由命中 */
export function runMatchTests(draft: SkillDraft): MatchTestCase[] {
  const matcher = new KeywordMatcher()
  const skill: Skill = {
    id: draft.skill_id,
    name: draft.name,
    description: draft.description,
    keywords: draft.keywords,
    content: draft.content,
    source: 'database',
  }
  const queries = draft.examples.length > 0 ? draft.examples : [draft.name, draft.description]
  return queries.map(query => {
    const m = matcher.match(skill, { userMessage: query })
    return {
      query,
      score: m?.matchScore ?? 0,
      passed: (m?.matchScore ?? 0) >= MATCH_PASS_THRESHOLD,
      reason: m?.matchReason || '未命中任何关键词',
    }
  })
}

/** 彩排测试：LLM 仅凭技能内容回答问题（多个问题并行，缩短管线耗时） */
async function runRehearsalAnswers(draft: SkillDraft, questions: string[]): Promise<string[]> {
  const results = await Promise.all(questions.map(async q => {
    try {
      const raw = await callLLM({
        system: `你是智能体平台的 AI 助手。你已加载了以下技能内容，请**只依据技能内容**回答用户问题；技能内容未覆盖的部分，明确回答"技能内容中未提及"。简洁回答，不超过 200 字。\n\n<技能内容>\n${draft.content}\n</技能内容>`,
        user: q,
        temperature: 0.1,
        jsonMode: false,
        maxTokens: 1000,
      })
      return raw.trim()
    } catch (err: any) {
      console.error('[SkillForge] Rehearsal answer failed:', err?.message)
      return '(彩排回答生成失败)'
    }
  }))
  return results
}

/** 评分：对照源文档验证彩排答案的忠实度 */
const GRADER_SYSTEM = `你是技能质检员。助手仅凭一份"技能内容"回答了若干问题，你需要对照"源文档"判断每个回答是否忠实准确：
- passed=true：答案与源文档一致，无编造
- passed=false：答案错误、编造了文档中不存在的信息、或本应能答出却回答"未提及"（技能内容缺失关键事实）

输出严格 JSON：
{ "verdicts": [{ "question": "...", "passed": true/false, "reason": "一句话判定依据" }] }
只输出 JSON。`

async function gradeRehearsal(params: {
  document: string
  draft: SkillDraft
  questions: string[]
  answers: string[]
}): Promise<RehearsalTestCase[]> {
  const qa = params.questions.map((q, i) => `问题${i + 1}: ${q}\n助手回答${i + 1}: ${params.answers[i]}`).join('\n\n')
  const raw = await callLLM({
    system: GRADER_SYSTEM,
    // 评分器只需比对要点，截断源文档可显著降低 token 与延迟
    user: `源文档：\n${params.document.slice(0, 12000)}\n\n技能内容：\n${params.draft.content}\n\n${qa}`,
    temperature: 0,
    maxTokens: 2000,
  })
  const parsed = extractJson<{ verdicts?: Array<{ question?: string; passed?: boolean; reason?: string }> }>(raw)
  const verdicts = parsed?.verdicts
  if (!Array.isArray(verdicts) || verdicts.length === 0) {
    // 评分器失效：视为不通过，触发修订
    return params.questions.map((q, i) => ({
      question: q,
      answer: params.answers[i],
      passed: false,
      reason: '评分器未返回有效判定，按不通过处理',
    }))
  }
  return params.questions.map((q, i) => {
    const v = verdicts.find(v => v.question === q) || verdicts[i] || {}
    return {
      question: q,
      answer: params.answers[i],
      passed: v.passed === true,
      reason: v.reason || '无判定依据',
    }
  })
}

async function runSelfTest(params: {
  document: string
  draft: SkillDraft
  analysis: DocumentAnalysis
}): Promise<SelfTestReport> {
  const matchTests = runMatchTests(params.draft)

  const questions = (params.analysis.test_questions.length > 0
    ? params.analysis.test_questions
    : params.draft.examples
  ).slice(0, REHEARSAL_QUESTION_COUNT)

  const answers = await runRehearsalAnswers(params.draft, questions)
  const rehearsalTests = await gradeRehearsal({
    document: params.document,
    draft: params.draft,
    questions,
    answers,
  })

  const matchPassed = matchTests.length > 0 && matchTests.every(t => t.passed)
  const rehearsalPassedCount = rehearsalTests.filter(t => t.passed).length
  const rehearsalRatio = rehearsalTests.length > 0 ? rehearsalPassedCount / rehearsalTests.length : 0
  const overallPassed = matchPassed && rehearsalRatio >= REHEARSAL_PASS_RATIO

  const score = Math.round(
    (matchTests.reduce((s, t) => s + t.score, 0) / Math.max(matchTests.length, 1)) * 0.4 +
    rehearsalRatio * 100 * 0.6
  )

  return { matchTests, rehearsalTests, overallPassed, score }
}

// ============ Stage 5: 注册 ============

async function registerSkill(params: {
  draft: SkillDraft
  userId?: number
  publish: boolean
  autoInstall: boolean
}): Promise<{ skillId: string; alreadyExisted: boolean }> {
  const existing = await getSkillById(params.draft.skill_id)
  const payload = {
    name: params.draft.name,
    description: params.draft.description,
    icon: params.draft.icon,
    category: params.draft.category,
    author: 'AI 技能工坊',
    version: '1.0.0',
    keywords: params.draft.keywords.join(','),
    examples: params.draft.examples.join(','),
    effects: params.draft.effects,
    content: params.draft.content,
  }

  let alreadyExisted = false
  if (existing) {
    // 已存在（含 refine 场景 / 上一轮已注册）：更新而非报错
    await updateSkill(params.draft.skill_id, {
      ...payload,
      is_published: params.publish ? 1 : 0,
    })
    alreadyExisted = true
  } else {
    await createSkill({
      skill_id: params.draft.skill_id,
      ...payload,
      priority: 0,
      is_published: params.publish ? 1 : 0,
      is_builtin: 0,
    })
  }

  if (params.autoInstall && params.userId) {
    await installSkill(params.userId, params.draft.skill_id)
  }

  // 清技能缓存，让平台所有 AI 入口立即看到新技能
  skillManager.clearCache()

  return { skillId: params.draft.skill_id, alreadyExisted }
}

// ============ 主流程 ============

export async function forgeSkillFromDocument(options: ForgeOptions): Promise<ForgeResult> {
  const {
    document,
    documentName,
    userId,
    publish = true,
    autoInstall = true,
    maxRevisionRounds = 1,
    onProgress,
    refineContext,
  } = options

  // 管线总预算：到点就不再开新的 LLM 阶段，直接输出当前最好结果
  const startedAt = Date.now()
  const remainingBudget = () => PIPELINE_BUDGET_MS - (Date.now() - startedAt)

  let doc = (document || '').trim()
  if (refineContext && doc.length === 0) {
    const cached = await getLatestForgeDocument(refineContext.existingSkillId)
    if (cached) {
      doc = cached.document
      if (!documentName) options.documentName = cached.documentName
    }
  }
  if (doc.length === 0) {
    return {
      success: false, analysis: null, skill: null, validation: null, selfTest: null,
      registered: false, skillId: null, alreadyExisted: false, rounds: 0,
      error: '文档内容为空',
    }
  }
  if (doc.length > MAX_DOC_CHARS) {
    doc = doc.slice(0, MAX_DOC_CHARS) + '\n\n[文档过长，已截断]'
  }

  try {
    // ---- Stage 1: 分析 ----
    onProgress?.({ stage: 'analyze', detail: '正在阅读技术文档，提取能力、字段与规则…' })
    const analysis = await analyzeDocument(doc)
    onProgress?.({
      stage: 'analyze',
      detail: `文档分析完成：识别对象「${analysis.subject_name}」，${analysis.capabilities.length} 项功能、${analysis.properties.length} 个属性字段${analysis.missing_info.length > 0 ? `，${analysis.missing_info.length} 处文档缺失` : ''}`,
    })

    // ---- Stage 1.5: 信息充分性检查 ----
    // 关键信息缺失时不盲目生成（避免编造技能），而是中止并向用户追问
    if (!refineContext && isAnalysisInsufficient(analysis)) {
      const questions = buildFollowUpQuestions(analysis)
      onProgress?.({
        stage: 'analyze',
        detail: `关键信息不足（${analysis.capabilities.length} 项功能 / ${analysis.properties.length} 个字段），已中止生成，等待用户补充 ${questions.length} 项信息`,
      })
      return {
        success: false, analysis, skill: null, validation: null, selfTest: null,
        registered: false, skillId: null, alreadyExisted: false, rounds: 0,
        needsInput: true, questions,
        error: '文档关键信息不足，需要用户补充后才能生成技能',
      }
    }

    // ---- Stage 2-4: 生成 → 校验 → 自测（带自动修订循环）----
    let draft: SkillDraft | null = null
    let validation: ValidationResult | null = null
    let selfTest: SelfTestReport | null = null
    let round = 0
    const maxRounds = maxRevisionRounds + 1

    // 已有技能 ID 集合（校验唯一性；refine 目标技能除外）
    const existingSkills = await getAllSkills()
    const existingIds = new Set(existingSkills.map(s => s.skill_id))
    if (refineContext) existingIds.delete(refineContext.existingSkillId)

    let existingContent: string | undefined
    if (refineContext) {
      const existing = await getSkillById(refineContext.existingSkillId)
      existingContent = existing?.content
      if (!existing) {
        return {
          success: false, analysis, skill: null, validation: null, selfTest: null,
          registered: false, skillId: null, alreadyExisted: false, rounds: 0,
          error: `技能 ${refineContext.existingSkillId} 不存在，无法修订`,
        }
      }
    }

    while (round < maxRounds) {
      round++
      onProgress?.({
        stage: round === 1 ? 'generate' : 'revise',
        detail: round === 1
          ? '正在依据文档分析结果生成平台技能…'
          : `第 ${round - 1} 轮自测未通过，正在根据失败原因自动修订技能…`,
        round,
      })

      const failureFeedback: string[] = []
      if (validation) {
        validation.issues.filter(i => i.level === 'error').forEach(i => failureFeedback.push(`[校验] ${i.field}: ${i.message}`))
      }
      if (selfTest) {
        selfTest.matchTests.filter(t => !t.passed).forEach(t => failureFeedback.push(`[匹配测试] 示例"${t.query}"未命中关键词（得分 ${t.score}）`))
        selfTest.rehearsalTests.filter(t => !t.passed).forEach(t => failureFeedback.push(`[彩排测试] 问题"${t.question}"回答不忠实：${t.reason}`))
      }

      draft = await generateSkillDraft({
        document: doc,
        analysis,
        failureFeedback: round > 1 ? failureFeedback : undefined,
        refineContext,
        existingContent,
      })

      onProgress?.({ stage: 'validate', detail: '正在校验技能结构（字段/关键词/章节）…', round })
      validation = validateSkillDraft(draft, existingIds)
      if (!validation.passed) {
        onProgress?.({ stage: 'validate', detail: `校验发现 ${validation.issues.filter(i => i.level === 'error').length} 个错误，${round < maxRounds ? '进入自动修订' : '已达最大轮数'}`, round })
        if (round < maxRounds) continue
        break
      }

      onProgress?.({ stage: 'self-test', detail: '正在自测：关键词路由测试 + AI 彩排回答测试…', round })
      selfTest = await runSelfTest({ document: doc, draft, analysis })
      const failedCount = selfTest.rehearsalTests.filter(t => !t.passed).length
      onProgress?.({
        stage: 'self-test',
        detail: selfTest.overallPassed
          ? `自测通过（综合得分 ${selfTest.score}）`
          : `自测未通过（${failedCount} 个彩排问题不忠实），${round < maxRounds ? '进入自动修订' : '已达最大轮数'}`,
        round,
      })
      if (selfTest.overallPassed) break
      if (round >= maxRounds) break

      // 时间预算保护：剩余时间不足以再跑一轮（生成+自测）时，停止修订，
      // 用当前结果收尾，而不是让外层工具超时把整条结果丢掉
      if (remainingBudget() < 60_000) {
        onProgress?.({
          stage: 'self-test',
          detail: `本轮自测未通过，但已达到时间预算上限（${Math.round(PIPELINE_BUDGET_MS / 1000)}s），将以当前版本收尾（保存为草稿），可反馈后继续修订`,
          round,
        })
        break
      }
    }

    if (!draft || !validation || !selfTest) {
      return {
        success: false, analysis, skill: draft, validation, selfTest,
        registered: false, skillId: null, alreadyExisted: false, rounds: round,
        error: '技能生成流程异常中断',
      }
    }

    // ---- Stage 5: 注册 ----
    const finalPassed = validation.passed && selfTest.overallPassed
    let registered = false
    let skillId: string | null = null
    let alreadyExisted = false

    // 自测未通过时不强制上线：仍保存为草稿（不发布），人工可在技能商店二次修改
    onProgress?.({
      stage: 'register',
      detail: finalPassed
        ? `正在注册技能「${draft.name}」并发布到技能商店…`
        : `自测未达标，技能「${draft.name}」将保存为草稿（不发布），可反馈后让 AI 修订`,
    })
    const reg = await registerSkill({
      draft,
      userId,
      publish: finalPassed ? publish : false,
      autoInstall: finalPassed ? autoInstall : false,
    })
    registered = true
    skillId = reg.skillId
    alreadyExisted = reg.alreadyExisted

    onProgress?.({
      stage: 'register',
      detail: finalPassed
        ? `技能「${draft.name}」已${alreadyExisted ? '更新' : '注册'}${publish ? '并发布' : '（草稿）'}，平台 AI 助手现在可以路由加载它`
        : `技能「${draft.name}」已保存为草稿，等待修订达标后发布`,
    })

    // 持久化锻造报告（供 refine 免重传文档 + 历史追溯）
    if (userId) {
      await saveForgeReport({
        userId,
        skillId: draft.skill_id,
        documentName: documentName || analysis.subject_name,
        documentText: doc,
        analysis,
        report: {
          success: finalPassed,
          skill: draft,
          validation,
          selfTest,
          registered,
          skillId,
          alreadyExisted,
          rounds: round,
        },
      }).catch(err => console.error('[SkillForge] Failed to save forge report:', err))
    }

    return {
      success: finalPassed,
      analysis,
      skill: draft,
      validation,
      selfTest,
      registered,
      skillId,
      alreadyExisted,
      rounds: round,
    }
  } catch (error: any) {
    console.error('[SkillForge] Pipeline error:', error)
    return {
      success: false, analysis: null, skill: null, validation: null, selfTest: null,
      registered: false, skillId: null, alreadyExisted: false, rounds: 0,
      error: error.message || '技能锻造失败',
    }
  }
}

/** 多轮修订：按 skill_id + 用户反馈重新锻造（对应"结果不满意可反复提醒修改"） */
export async function refineRegisteredSkill(params: {
  skillId: string
  feedback: string
  extraDocument?: string
  userId?: number
  publish?: boolean
  onProgress?: (progress: ForgeProgress) => void
}): Promise<ForgeResult> {
  return forgeSkillFromDocument({
    document: params.extraDocument || '',
    userId: params.userId,
    publish: params.publish ?? true,
    autoInstall: true,
    onProgress: params.onProgress,
    refineContext: {
      existingSkillId: params.skillId,
      feedback: params.feedback,
      extraDocument: params.extraDocument,
    },
  })
}
