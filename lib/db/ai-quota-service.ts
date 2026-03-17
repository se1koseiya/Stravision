import { queryOne, execute, initDB } from "./database"

// 确保 DB 已初始化（在调用此服务前，上层逻辑通常已经调用了 initDB，但为了安全起见，这里可以检查）
// 但由于 initDB 是异步的，而 db 变量是同步导出的，所以这里假设上层已经 await initDB()

export interface UserAiQuota {
  daily_limit: number
  daily_usage: number
  balance: number
  can_use: boolean
  reason?: 'limit_reached' | 'no_balance'
}

/**
 * 获取用户当前的 AI 配额状态
 * 会自动处理日限额重置逻辑
 */
export async function getUserAiQuota(userId: number): Promise<UserAiQuota> {
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
  
  // Enforce membership limits
  // Free users have 0 daily limit unless they have balance
  // Pro/Plus limits are handled by daily_ai_limit in DB, but we can enforce defaults here too
  let effectiveLimit = user.daily_ai_limit;
  if (user.membership === 'free' || !user.membership) {
    effectiveLimit = 0;
  } else if (user.membership === 'plus') {
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
  await initDB()
  const user = await queryOne<any>(
    `SELECT daily_ai_limit, daily_ai_usage, last_ai_usage_date, ai_balance, membership
     FROM users WHERE id = $1`,
    [userId]
  )

  if (!user) return false

  const today = new Date().toISOString().split('T')[0]
  let newUsage = user.daily_ai_usage
  
  // Enforce membership limits
  let effectiveLimit = user.daily_ai_limit;
  if (user.membership === 'free' || !user.membership) {
    effectiveLimit = 0;
  } else if (user.membership === 'plus') {
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
