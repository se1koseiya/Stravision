import { queryOne, execute, initDB } from "./database"
import { IS_DESKTOP_APP } from "@/lib/desktop-mode"

// 确保 DB 已初始化（在调用此服务前，上层逻辑通常已经调用了 initDB，但为了安全起见，这里可以检查）
// 但由于 initDB 是异步的，而 db 变量是同步导出的，所以这里假设上层已经 await initDB()

// 🚨 桌面端（BYOK）豁免总说明（2026-09-14 用户实测 403 后定稿）：
// 桌面端 = 本地运行 + 用户自带 Key（设置向导写入本地 providers 配置），
// 平台配额/会员/积分体系整体不适用。IS_DESKTOP_APP 是构建期内联常量，
// 桌面构建恒 true、Web 构建恒 false，Web 端计费行为不受任何影响。
// 校验调用方：chat / automation / daily-insight / generate-schedule /
// guardian-alerts / memory-report / prompt-demo / voice-deduct / user-settings。

export interface UserAiQuota {
  daily_limit: number
  daily_usage: number
  balance: number
  can_use: boolean
  reason?: 'limit_reached' | 'no_balance' | 'membership_required'
}

/**
 * 预扣减配额（原子操作）
 * 在请求开始前调用，确保检查与扣减原子化，避免并发请求绕过配额
 * @returns boolean 是否扣费成功（失败表示配额不足）
 */
export async function reserveAiUsage(userId: number): Promise<boolean> {
  // 桌面端不预扣（本地 BYOK 无配额概念，预扣会把本地普通用户拦在会员墙外）
  if (IS_DESKTOP_APP) return true
  await initDB()
  const today = new Date().toISOString().split('T')[0]

  // 尝试 1：扣除每日免费额度（原子 CAS）
  // 仅当 last_ai_usage_date = today 且 daily_ai_usage < limit 时成功
  // 或当 last_ai_usage_date != today 时重置并扣除
  //
  // 🔥 漏洞修复：原 WHERE 末尾有 `OR membership = 'plus'`，
  // 这会让 plus 会员无条件命中、彻底绕开 daily_ai_limit 与 daily_ai_usage，
  // 表现为「额度已耗尽仍能无限聊天」。plus 的更高额度应当体现在
  // daily_ai_limit 字段上（数据层），而不是在 SQL 里硬编码放行。
  const freeResult = await execute(
    `UPDATE users
     SET daily_ai_usage = CASE
           WHEN last_ai_usage_date = $2 THEN daily_ai_usage + 1
           ELSE 1
         END,
         last_ai_usage_date = $2
     WHERE id = $1
       AND membership IN ('pro', 'plus')
       AND (
         (last_ai_usage_date = $2 AND daily_ai_usage < daily_ai_limit)
         OR (last_ai_usage_date != $2 AND daily_ai_limit > 0)
       )`,
    [userId, today]
  )
  if (freeResult.rowCount > 0) return true

  // 尝试 2：扣除余额（原子 CAS）
  const balanceResult = await execute(
    `UPDATE users
     SET ai_balance = ai_balance - 1,
         daily_ai_usage = CASE WHEN last_ai_usage_date != $2 THEN 0 ELSE daily_ai_usage END,
         last_ai_usage_date = $2
     WHERE id = $1 AND ai_balance > 0`,
    [userId, today]
  )
  return balanceResult.rowCount > 0
}

/**
 * 退还预扣减的配额（请求失败时调用）
 */
export async function refundAiUsage(userId: number): Promise<void> {
  // 桌面端从未预扣，无需退还
  if (IS_DESKTOP_APP) return
  await initDB()
  const today = new Date().toISOString().split('T')[0]
  // 优先退还每日额度，若今日已扣则减 1（不低于 0）
  const result = await execute(
    `UPDATE users
     SET daily_ai_usage = CASE
           WHEN last_ai_usage_date = $2 AND daily_ai_usage > 0 THEN daily_ai_usage - 1
           ELSE daily_ai_usage
         END
     WHERE id = $1 AND last_ai_usage_date = $2`,
    [userId, today]
  )
  // 如果今日额度退还失败（可能扣的是余额），退还余额
  if (result.rowCount === 0) {
    await execute(
      `UPDATE users SET ai_balance = ai_balance + 1 WHERE id = $1`,
      [userId]
    )
  }
}

/**
 * 获取用户当前的 AI 配额状态
 * 会自动处理日限额重置逻辑
 */
export async function getUserAiQuota(userId: number): Promise<UserAiQuota> {
  // 桌面端：无配额概念，返回"无限制"（quotaInfo 消费方按 can_use 渲染）
  if (IS_DESKTOP_APP) {
    return { daily_limit: 999999, daily_usage: 0, balance: 0, can_use: true }
  }
  await initDB()
  const user = await queryOne<any>(
    `SELECT daily_ai_limit, daily_ai_usage, last_ai_usage_date, ai_balance, membership
     FROM users WHERE id = $1`,
    [userId]
  )

  if (!user) {
    throw new Error("User not found")
  }

  const today = new Date().toISOString().split('T')[0]
  let currentUsage = user.daily_ai_usage

  // 会员等级限制：免费用户完全禁止使用 AI 功能
  if (user.membership === 'free' || !user.membership) {
    return {
      daily_limit: 0,
      daily_usage: 0,
      balance: user.ai_balance,
      can_use: false,
      reason: 'membership_required'
    }
  }

  // Pro/Plus 会员：按等级设置每日限额
  let effectiveLimit = user.daily_ai_limit;
  if (user.membership === 'plus') {
    effectiveLimit = 999999;
  }

  // 检查是否需要重置每日配额
  if (user.last_ai_usage_date !== today) {
    currentUsage = 0
  }

  const hasDailyQuota = currentUsage < effectiveLimit
  const hasBalance = user.ai_balance > 0

  return {
    daily_limit: effectiveLimit,
    daily_usage: currentUsage,
    balance: user.ai_balance,
    can_use: hasDailyQuota || hasBalance,
    reason: !hasDailyQuota && !hasBalance ? (currentUsage >= effectiveLimit ? 'limit_reached' : 'no_balance') : undefined
  }
}

/**
 * 扣减用户的 AI 配额
 * 优先扣除每日免费额度，如果用完则扣除余额
 * @returns boolean 是否扣费成功
 */
export async function incrementAiUsage(userId: number): Promise<boolean> {
  // 桌面端不扣平台配额
  if (IS_DESKTOP_APP) return true
  await initDB()
  const user = await queryOne<any>(
    `SELECT daily_ai_limit, daily_ai_usage, last_ai_usage_date, ai_balance, membership
     FROM users WHERE id = $1`,
    [userId]
  )

  if (!user) return false

  // 免费用户完全禁止扣减 AI 配额
  if (user.membership === 'free' || !user.membership) {
    return false
  }

  const today = new Date().toISOString().split('T')[0]
  let newUsage = user.daily_ai_usage

  // Pro/Plus 会员：按等级设置每日限额
  let effectiveLimit = user.daily_ai_limit;
  if (user.membership === 'plus') {
    effectiveLimit = 999999;
  }
  
  // 如果日期变更，重置今日用量
  if (user.last_ai_usage_date !== today) {
    newUsage = 0
  }

  // 1. 尝试扣除每日免费额度
  if (newUsage < effectiveLimit) {
    await execute(
      `UPDATE users
       SET daily_ai_usage = $1, last_ai_usage_date = $2
       WHERE id = $3`,
      [newUsage + 1, today, userId]
    )
    return true
  }

  // 2. 尝试扣除余额
  if (user.ai_balance > 0) {
    // 即使日期不同，因为只扣余额没扣今日限额，所以也要更新日期吗？
    // 为了保持 last_ai_usage_date 准确，还是更新一下比较好，同时顺便重置 daily_ai_usage
    // 注意：如果之前 last_ai_usage_date 不是今天，这里 daily_ai_usage 重置为 0（虽然没扣它）
    // 如果是今天，保持满额状态
    const usageToSet = user.last_ai_usage_date !== today ? 0 : user.daily_ai_usage

    const result = await execute(
      `UPDATE users
       SET ai_balance = ai_balance - 1,
           daily_ai_usage = $1,
           last_ai_usage_date = $2
       WHERE id = $3 AND ai_balance > 0`,
      [usageToSet, today, userId]
    )
    return result.rowCount > 0
  }

  return false
}

/**
 * 为用户增加余额
 */
export async function addAiBalance(userId: number, amount: number) {
  await initDB()
  return execute("UPDATE users SET ai_balance = ai_balance + $1 WHERE id = $2", [amount, userId])
}

/**
 * 设置用户每日限额
 */
export async function setDailyAiLimit(userId: number, limit: number) {
  await initDB()
  return execute("UPDATE users SET daily_ai_limit = $1 WHERE id = $2", [limit, userId])
}
