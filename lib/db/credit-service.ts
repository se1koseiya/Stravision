import { queryOne, execute, initDB } from "./database"
import { readProvidersConfig } from "@/lib/ai/provider-resolver"
import { IS_DESKTOP_APP } from "@/lib/desktop-mode"

/**
 * AI 助手积分制度（按 token 计费，倍率由 admin 在每个模型管理里单独配）
 *
 * 计算公式：
 *   积分 = (input_tokens + output_tokens × outputWeight) / tokensPerCredit × modelRate
 *
 * - outputWeight：输出 token 权重（默认 3，贴近主流 LLM API 输出/输入定价比例）
 * - tokensPerCredit：每积分对应的基准 token 数（默认 1000，即 1 积分 = 1000 基准 token）
 * - modelRate：每模型倍率（admin 在「提供商 → 模型」里配；未配置时按模型名启发式）
 *
 * 会员额度：
 * - plus（ProPlus）：月度积分额度（默认 2000 积分/月），不再"无限"
 * - pro：月度积分额度（默认 300 积分/月）
 * - 用完月度额度后自动扣积分余额（credit_balance，充值获得）
 */

export interface CreditConfig {
  /** 积分制开关（关闭时回退旧的按次配额逻辑） */
  enabled: boolean
  /** 输出 token 权重（默认 3：输出 token 计 3 倍输入 token） */
  outputWeight: number
  /** 每积分对应的基准 token 数（默认 1000） */
  tokensPerCredit: number
  /** ProPlus 月度积分额度（默认 2000） */
  plusMonthlyQuota: number
  /** Pro 月度积分额度（默认 300） */
  proMonthlyQuota: number
  /**
   * 全局积分倍率（审计用；admin 配置在 ai-providers-config.json 的 creditConfig 下）。
   * 只写入 ai_credit_logs.global_multiplier 作为对账依据 —— 模型倍率已并入 modelRate。
   */
  globalMultiplier?: number
}

export const DEFAULT_CREDIT_CONFIG: CreditConfig = {
  enabled: true,
  outputWeight: 3,
  tokensPerCredit: 1000,
  plusMonthlyQuota: 2000,
  proMonthlyQuota: 300,
}

export interface CreditUsageResult {
  credits: number
  inputTokens: number
  outputTokens: number
  modelRate: number
  /** 上游是否返回了真实 usage（false = 本地估算） */
  estimated: boolean
}

export interface UserCreditStatus {
  membership: string
  /** 月度积分额度（当前周期内有效；免费用户为 0） */
  monthlyQuota: number
  /** 本月已用积分 */
  monthlyUsed: number
  /** 月度剩余（不小于 0） */
  monthlyRemaining: number
  /** 充值积分余额 */
  balance: number
  /** 总剩余可用积分（月度剩余 + 充值余额） */
  totalRemaining: number
  canUse: boolean
  reason?: 'membership_required' | 'no_credits'
}

/** 读取 admin 配置的积分参数（未配置时使用默认值） */
export async function getCreditsConfig(): Promise<CreditConfig> {
  try {
    const config = await readProvidersConfig()
    const raw = (config as any).creditConfig || {}
    return {
      enabled: raw.enabled !== false,
      outputWeight: numOr(raw.outputWeight, DEFAULT_CREDIT_CONFIG.outputWeight),
      tokensPerCredit: numOr(raw.tokensPerCredit, DEFAULT_CREDIT_CONFIG.tokensPerCredit),
      plusMonthlyQuota: numOr(raw.plusMonthlyQuota, DEFAULT_CREDIT_CONFIG.plusMonthlyQuota),
      proMonthlyQuota: numOr(raw.proMonthlyQuota, DEFAULT_CREDIT_CONFIG.proMonthlyQuota),
      // 全局倍率回传（写 ai_credit_logs.global_multiplier 用）；未配置时按 1
      globalMultiplier: raw.globalMultiplier === undefined ? 1 : numOr(raw.globalMultiplier, 1),
    }
  } catch {
    return { ...DEFAULT_CREDIT_CONFIG }
  }
}

function numOr(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** 模型默认倍率（admin 未配置 rateMultiplier 时的启发式） */
export function defaultModelRate(modelId: string): number {
  const id = (modelId || '').toLowerCase()
  if (/(flash|air|free|turbo|lite|mini)/.test(id)) return 0.2
  if (/(max|ultra|flagship|o1|opus)/.test(id)) return 3
  if (/(deepseek-v4|deepseek-v3\.2|glm-4\.6|glm-5)/.test(id)) return 1.5
  return 1
}

/** 获取某模型的积分倍率（用户自定义 > admin 配置 > 启发式默认） */
export async function getModelRate(
  modelId: string,
  customModels?: Array<{ id: string; rateMultiplier?: number }>,
): Promise<{ modelRate: number; config: CreditConfig }> {
  const config = await getCreditsConfig()
  let modelRate: number | undefined
  try {
    // 1) 用户自配模型（前端从 localStorage 传入）
    if (customModels) {
      const m = customModels.find(c => c.id === modelId)
      if (m && typeof m.rateMultiplier === 'number' && m.rateMultiplier > 0) {
        modelRate = m.rateMultiplier
      }
    }
    // 2) admin 配置的提供商模型
    if (modelRate === undefined) {
      const providersConfig = await readProvidersConfig()
      for (const p of providersConfig.providers) {
        const m = (p.models as any[]).find(m => m.id === modelId)
        if (m && typeof m.rateMultiplier === 'number' && m.rateMultiplier > 0) {
          modelRate = m.rateMultiplier
          break
        }
      }
    }
  } catch { /* ignore */ }
  return { modelRate: modelRate ?? defaultModelRate(modelId), config }
}

/**
 * 计算一次调用消耗的积分（保留 2 位小数，向上取整到 0.01）
 *
 * 🔥 硬性上限：单次输入/输出 token 截断到 MAX_*_PER_TURN。防止上游 usage 异常
 * 或消息 JSON 化失控（含 base64 图片等）导致单次扣费破表（典型：13376.21 误扣事件）。
 * 上限按"农业单轮对话现实上限"设的：input 30 万 ≈ 60 万汉字，output 6 万 ≈ 12 万汉字，
 * 已远超任何正常单轮。
 */
export function calculateCredits(
  inputTokens: number,
  outputTokens: number,
  modelRate: number,
  config: Pick<CreditConfig, 'outputWeight' | 'tokensPerCredit'>,
): number {
  const tpc = config.tokensPerCredit > 0 ? config.tokensPerCredit : 1000
  const safeIn = Math.max(0, Math.min(inputTokens, MAX_INPUT_TOKENS_PER_TURN))
  const safeOut = Math.max(0, Math.min(outputTokens, MAX_OUTPUT_TOKENS_PER_TURN))
  const weighted = safeIn + safeOut * config.outputWeight
  const raw = (weighted / tpc) * modelRate
  return Math.max(0.01, Math.ceil(raw * 100) / 100)
}

/**
 * 无上游 usage 时的本地 token 估算（中英混排近似）。
 * 规则：CJK 字符 ≈ 1 token；连续非 CJK 字符 ≈ 0.3 token/char（≈4 chars/token）
 *
 * 🔥 关键：剥离 dataURL/base64 块（视觉巡检工具 take_camera_snapshot 等会把 base64 图片
 * 塞进 tool 消息的 content 里）。如果不剥离，一张图可导致数万"字符×0.3"被算成 token，
 * 一次普通巡检对话就可能扣掉数千积分（典型异常：13376 积分）。
 * 用 `<base64:N>` 占位（N 为原始 base64 长度），保留"这里有过图片"的存在感但不计入 token。
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  // 1) 剥离 data URL（data:image/png;base64,XXXXXX → <base64:XXXXXX长度>）
  //    注意：必须先做，否则后面 replace 还会把 XXXXXX 里奇怪的字符数错
  // 2) 剥离纯 base64 长串（≥64 字符的连续 A-Za-z0-9+/= 块）—— 兜底捕获非 dataURL 形式的 base64
  const stripped = text
    .replace(/data:[a-zA-Z0-9+\-./]+;base64,([A-Za-z0-9+/=]+)/g, (_m, b64) => `<base64:${b64.length}>`)
    .replace(/[A-Za-z0-9+/=]{64,}/g, (m) => `<base64:${m.length}>`)
  let cjk = 0, other = 0
  for (const ch of stripped) {
    if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch)) cjk++
    else other++
  }
  return Math.ceil(cjk + other * 0.3)
}

/** 估算文本中的 token 数（同上规则，但接受任意输入并在调用前安全归一） */
export function estimateTokensSafe(input: unknown): number {
  return estimateTokens(typeof input === 'string' ? input : input ? JSON.stringify(input) : '')
}

/** 单次结算的硬性上限：超过即截断。防止上游 usage 异常或 JSON 序列化失控导致扣费失控 */
export const MAX_INPUT_TOKENS_PER_TURN = 300_000
export const MAX_OUTPUT_TOKENS_PER_TURN = 60_000

/** 当前月周期标识（yyyy-mm） */
function currentCycle(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 获取用户积分状态（自动跨月重置月度用量）
 */
export async function getUserCreditStatus(userId: number): Promise<UserCreditStatus> {
  await initDB()
  const user = await queryOne<any>(
    `SELECT membership, credit_balance,
            monthly_credit_quota, monthly_credit_used, credit_cycle_date
     FROM users WHERE id = $1`,
    [userId]
  )
  if (!user) {
    return {
      membership: 'none', monthlyQuota: 0, monthlyUsed: 0, monthlyRemaining: 0,
      balance: 0, totalRemaining: 0, canUse: false, reason: 'membership_required',
    }
  }

  // 免费用户：禁止（与旧行为一致）
  if (user.membership === 'free' || !user.membership) {
    return {
      membership: user.membership || 'free',
      monthlyQuota: 0, monthlyUsed: 0, monthlyRemaining: 0,
      balance: Number(user.credit_balance) || 0,
      totalRemaining: Number(user.credit_balance) || 0,
      canUse: (Number(user.credit_balance) || 0) > 0,
      reason: 'membership_required',
    }
  }

  const config = await getCreditsConfig()

  // 月度额度：用户个性化额度优先，否则按会员等级取配置默认值
  let quota = Number(user.monthly_credit_quota) || 0
  if (quota <= 0) {
    quota = user.membership === 'plus' ? config.plusMonthlyQuota : config.proMonthlyQuota
  }

  // 跨月重置（惰性：读到旧周期时视为 0 已用）
  const cycle = currentCycle()
  const used = user.credit_cycle_date === cycle ? (Number(user.monthly_credit_used) || 0) : 0

  const monthlyRemaining = Math.max(0, quota - used)
  const balance = Number(user.credit_balance) || 0
  const totalRemaining = monthlyRemaining + balance

  return {
    membership: user.membership,
    monthlyQuota: quota,
    monthlyUsed: used,
    monthlyRemaining,
    balance,
    totalRemaining,
    canUse: totalRemaining > 0,
    reason: totalRemaining <= 0 ? 'no_credits' : undefined,
  }
}

/**
 * 发起新对话的最低积分门槛。
 *
 * 🔥 漏洞修复：原判定是 `totalRemaining > 0`——只看「还有没有」不看「够不够」。
 * 实测单轮重对话（长文档 + agent 多轮工具调用）可消耗 50+ 积分，剩 0.45 的用户
 * 每次都能通过 `> 0` 检查发起一轮大额消耗（结算时 GREATEST(0,...) 又不允许余额为负），
 * 等于永远拦不住。低于该门槛一律拒绝发起新对话，需充值。
 */
export const MIN_CREDITS_TO_START = 2

/**
 * 请求前的额度检查（不预扣，流结束后按实际 usage 结算）
 * @returns null = 允许；string = 拒绝原因（友好提示）
 */
export async function checkCreditAllowance(userId: number): Promise<string | null> {
  // 🚨 桌面端（BYOK）豁免：本地运行 + 用户自带 Key，无平台积分/会员校验
  //    （2026-09-14 用户实测：桌面端发消息被 403 membership_required 拦截）
  if (IS_DESKTOP_APP) return null
  const status = await getUserCreditStatus(userId)
  // 🔥 诊断日志：排查「积分耗尽仍能聊天」时，直接看后端算出的真实数字
  console.log(
    `[Credits] check user=${userId}: membership=${status.membership} ` +
    `quota=${status.monthlyQuota} used=${status.monthlyUsed} monthlyRemaining=${status.monthlyRemaining} ` +
    `balance=${status.balance} totalRemaining=${status.totalRemaining} canUse=${status.canUse} reason=${status.reason ?? '-'}`
  )
  if (status.reason === 'membership_required') {
    return 'AI 功能仅限 Pro/Plus 会员使用，请升级会员后继续使用'
  }
  // 总剩余不足以发起一轮对话：拒绝（含 canUse=false 与「剩一点但不够一轮」两种情况）
  if (status.totalRemaining < MIN_CREDITS_TO_START) {
    return `积分余额不足（剩余 ${status.totalRemaining.toFixed(2)}，发起对话至少需要 ${MIN_CREDITS_TO_START} 积分，单轮对话实际消耗可能更高），请等待月度刷新或充值积分`
  }
  return null
}

/**
 * 流结束后按实际消耗结算积分（先扣月度额度，不够再扣充值余额）
 * 写入消耗日志，返回结算结果（供前端气泡展示）
 */
export async function settleCredits(
  userId: number,
  inputTokens: number,
  outputTokens: number,
  modelId: string,
  estimated = false,
  customModels?: Array<{ id: string; rateMultiplier?: number }>,
): Promise<CreditUsageResult> {
  // 桌面端不结算平台积分（未检查也未扣减），返回零消耗占位
  if (IS_DESKTOP_APP) {
    return { credits: 0, inputTokens, outputTokens, modelRate: 1, estimated }
  }
  const { modelRate, config } = await getModelRate(modelId, customModels)
  const credits = calculateCredits(inputTokens, outputTokens, modelRate, config)

  try {
    await initDB()
    const cycle = currentCycle()
    const user = await queryOne<any>(
      `SELECT membership, credit_balance, monthly_credit_quota, monthly_credit_used, credit_cycle_date
       FROM users WHERE id = $1`,
      [userId]
    )
    if (!user) throw new Error('user not found')

    // 月度额度（个性化 > 按等级默认）
    let quota = Number(user.monthly_credit_quota) || 0
    if (quota <= 0) {
      quota = user.membership === 'plus' ? config.plusMonthlyQuota : config.proMonthlyQuota
    }
    const used = user.credit_cycle_date === cycle ? (Number(user.monthly_credit_used) || 0) : 0
    const monthlyRemaining = Math.max(0, quota - used)

    // 先扣月度，再扣余额
    const fromMonthly = Math.min(monthlyRemaining, credits)
    const fromBalance = Math.max(0, credits - fromMonthly)

    // 原子更新（CAS 防并发双扣错乱：余额分支带条件）
    // 注意：不回写 monthly_credit_quota，否则会把"按等级默认算出的额度"固化成用户个性化额度，
    // 破坏"0 = 跟随等级默认"语义（admin 后续调整全局默认额度时该用户将不再跟随）。
    await execute(
      `UPDATE users
       SET monthly_credit_used = $2,
           credit_cycle_date = $3,
           credit_balance = CASE WHEN $4 > 0 THEN GREATEST(0, credit_balance - $4) ELSE credit_balance END
       WHERE id = $1`,
      [userId, used + fromMonthly, cycle, fromBalance]
    )

    // 消耗日志
    // 🚨 这里原先叠了**两个**缺陷，导致 ai_credit_logs 从未成功写入过任何一行
    //    （实测线上表 count(*) = 0，而 UPDATE users 那半截已经执行了 —— 月度额度照扣、
    //     扣费明细全丢，出问题根本没法对账）：
    //      ① INSERT 列了 8 列（…model_rate, global_multiplier, estimated）但只传 7 个值，
    //         漏了 global_multiplier → Postgres 08P01
    //         `绑定消息提供了7个参数，但是已准备好语句"" 要求8个参数`；
    //      ② created_at 建表时是 `BIGINT NOT NULL` **且没有 DEFAULT**，
    //         而 INSERT 里压根没给它 —— 补上参数后会变成 23502 not-null 违约。
    //    两个错误都被下方 catch 吞成一行 "[Credits] settle failed" 日志。
    await execute(
      `INSERT INTO ai_credit_logs (user_id, model_id, input_tokens, output_tokens, credits, model_rate, global_multiplier, estimated, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        modelId,
        inputTokens,
        outputTokens,
        credits,
        modelRate,
        config.globalMultiplier ?? 1,
        estimated ? 1 : 0,
        Date.now(),
      ]
    )
  } catch (e) {
    // 结算失败不阻塞响应，但要留痕
    console.error('[Credits] settle failed:', e)
  }

  return {
    credits,
    inputTokens,
    outputTokens,
    modelRate,
    estimated,
  }
}

/** 为用户充值积分（admin / 支付回调） */
export async function addCreditBalance(userId: number, amount: number) {
  await initDB()
  await execute(
    `UPDATE users SET credit_balance = credit_balance + $1, updated_at = $3 WHERE id = $2`,
    [amount, userId, Date.now()]
  )
}

/**
 * 退还单次 credit log：把 ai_credit_logs 一行记录的 credits 退回到对应用户。
 *
 * 🔥 用途：计费异常时（典型：JSON 化含 base64 图片导致 estimateTokens 失控 → 单次扣 13376），
 * admin 可按 log id 退还，避免用户投诉。退还时**优先恢复月度额度**，月度已用部分扣到 0 时
 * 再退到 credit_balance，保留 credit_cycle_date 不变（不破坏跨月语义）。
 *
 * 行为：
 * - 已退还（refunded=1）的 log 再次调用直接抛错，拒绝重复退款
 * - 月度额度不够全退时，差额退到充值余额
 * - 退还后写 ai_credit_logs.refunded=1 + 退还时间戳，保留审计证据
 */
export async function refundCreditLog(logId: number): Promise<{ userId: number; credits: number; fromMonthly: number; fromBalance: number }> {
  await initDB()
  const log = await queryOne<any>(
    `SELECT id, user_id, credits, model_id, refunded, refunded_at, created_at
     FROM ai_credit_logs WHERE id = $1`,
    [logId]
  )
  if (!log) throw new Error(`credit log ${logId} 不存在`)
  if (log.refunded === 1) throw new Error(`credit log ${logId} 已于 ${log.refunded_at} 退还过，禁止重复退款`)

  const credits = Number(log.credits) || 0
  if (credits <= 0) throw new Error(`credit log ${logId} 金额为 0，无需退还`)

  const userId = log.user_id
  const user = await queryOne<any>(
    `SELECT monthly_credit_used, credit_cycle_date FROM users WHERE id = $1`,
    [userId]
  )
  if (!user) throw new Error(`user ${userId} 不存在`)

  // 优先退月度额度（同周期内）；若月度已用 < credits，差额退到 balance
  const cycle = currentCycle()
  const monthlyUsed = user.credit_cycle_date === cycle ? (Number(user.monthly_credit_used) || 0) : 0
  const fromMonthly = Math.min(monthlyUsed, credits)
  const fromBalance = credits - fromMonthly

  const newMonthlyUsed = monthlyUsed - fromMonthly
  // 月度使用未变化时也要把 cycle_date 写回，保证后续查询不"丢周期"
  const cycleDate = user.credit_cycle_date || cycle

  await execute(
    `UPDATE users
     SET monthly_credit_used = $2,
         credit_cycle_date = $3,
         credit_balance = credit_balance + $4
     WHERE id = $1`,
    [userId, newMonthlyUsed, cycleDate, fromBalance]
  )

  await execute(
    `UPDATE ai_credit_logs
     SET refunded = 1, refunded_at = $2
     WHERE id = $1`,
    [logId, Date.now()]
  )

  return { userId, credits, fromMonthly, fromBalance }
}

/** 设置用户个性化月度积分额度（admin；0 = 跟随等级默认） */
export async function setMonthlyCreditQuota(userId: number, quota: number) {
  await initDB()
  await execute(
    `UPDATE users SET monthly_credit_quota = $1, updated_at = $3 WHERE id = $2`,
    [quota, userId, Date.now()]
  )
}
