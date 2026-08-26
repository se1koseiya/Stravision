import { queryOne, execute, initDB } from "./database"
import { readProvidersConfig } from "@/lib/ai/provider-resolver"

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
 */
export function calculateCredits(
  inputTokens: number,
  outputTokens: number,
  modelRate: number,
  config: Pick<CreditConfig, 'outputWeight' | 'tokensPerCredit'>,
): number {
  const tpc = config.tokensPerCredit > 0 ? config.tokensPerCredit : 1000
  const weighted = inputTokens + outputTokens * config.outputWeight
  const raw = (weighted / tpc) * modelRate
  return Math.max(0.01, Math.ceil(raw * 100) / 100)
}

/**
 * 无上游 usage 时的本地 token 估算（中英混排近似）。
 * 规则：CJK 字符 ≈ 1 token；连续非 CJK 字符 ≈ 0.3 token/char（≈4 chars/token）
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  let cjk = 0, other = 0
  for (const ch of text) {
    if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch)) cjk++
    else other++
  }
  return Math.ceil(cjk + other * 0.3)
}

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
 * 请求前的额度检查（不预扣，流结束后按实际 usage 结算）
 * @returns null = 允许；string = 拒绝原因（友好提示）
 */
export async function checkCreditAllowance(userId: number): Promise<string | null> {
  const status = await getUserCreditStatus(userId)
  if (status.canUse) return null
  if (status.reason === 'membership_required') {
    return 'AI 功能仅限 Pro/Plus 会员使用，请升级会员后继续使用'
  }
  return '积分额度已用完：本月积分已耗尽且充值余额为 0，请等待月度刷新或充值积分'
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
    await execute(
      `UPDATE users
       SET monthly_credit_used = $2,
           monthly_credit_quota = $3,
           credit_cycle_date = $4,
           credit_balance = CASE WHEN $5 > 0 THEN GREATEST(0, credit_balance - $5) ELSE credit_balance END
       WHERE id = $1`,
      [userId, used + fromMonthly, quota, cycle, fromBalance]
    )

    // 消耗日志
    await execute(
      `INSERT INTO ai_credit_logs (user_id, model_id, input_tokens, output_tokens, credits, model_rate, global_multiplier, estimated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, modelId, inputTokens, outputTokens, credits, modelRate, estimated ? 1 : 0]
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

/** 设置用户个性化月度积分额度（admin；0 = 跟随等级默认） */
export async function setMonthlyCreditQuota(userId: number, quota: number) {
  await initDB()
  await execute(
    `UPDATE users SET monthly_credit_quota = $1, updated_at = $3 WHERE id = $2`,
    [quota, userId, Date.now()]
  )
}
