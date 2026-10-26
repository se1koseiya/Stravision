/**
 * 上下文偏好 · 服务端读写（用户级持久化）
 *
 * 存储：`user_preferences` 表，key 前缀 `personal.context_*`（见 CONTEXT_PREFS_KEYS）。
 * 与 `personalization-service` 共用同一张表、同一套读写函数，但 key 独立 ——
 * 「个性化」的「恢复默认」只删自己那批 key，不会误清这里的上下文偏好。
 *
 * 放在 `lib/db/` 而不是 `lib/ai/context/`：后者是纯函数层（客户端也会 import），
 * 一旦在那里 import pg，就会把数据库驱动拖进浏览器 bundle。
 *
 * 读取路径：`/api/chat` 每轮对话都会读一次（与个性化配置同层），
 * 因此用户改完设置后**下一轮对话立即生效**，无需重启或重新登录。
 */

import {
  getAllUserPreferences,
  setUserPreference,
  deleteUserPreference,
} from './agent-memory-service'
import {
  CONTEXT_PREFS_KEYS,
  DEFAULT_USER_CONTEXT_PREFS,
  MAX_TRIGGER_RATIO,
  MAX_WINDOW_TOKENS,
  MIN_TRIGGER_RATIO,
  MIN_WINDOW_TOKENS,
  normalizeUserContextPrefs,
  type UserContextPrefs,
} from '@/lib/ai/context/context-prefs'

/** 读取用户上下文偏好（缺失 / 异常一律回落默认，不抛错） */
export async function getUserContextPrefs(userId: number): Promise<UserContextPrefs> {
  const rows = await getAllUserPreferences(userId).catch(() => [])
  const map = new Map(rows.map((r) => [r.preference_key, r.preference_value]))
  return normalizeUserContextPrefs({
    windowTokens: map.get(CONTEXT_PREFS_KEYS.window) ?? null,
    compressionTriggerRatio: map.get(CONTEXT_PREFS_KEYS.trigger) ?? null,
  })
}

/**
 * 写入用户上下文偏好（只写传入的字段，未传保持不变）。
 *
 * - `windowTokens: null` → 删除该记录，回到「跟随模型」
 * - 越界值在此**静默钳制**（与 normalize 同规则），保证落库数据永远合法
 */
export async function saveUserContextPrefs(
  userId: number,
  patch: Partial<UserContextPrefs>,
): Promise<UserContextPrefs> {
  if ('windowTokens' in patch) {
    const w = patch.windowTokens
    if (w == null) {
      await deleteUserPreference(userId, CONTEXT_PREFS_KEYS.window).catch(() => {})
    } else {
      const clamped = Math.min(MAX_WINDOW_TOKENS, Math.max(MIN_WINDOW_TOKENS, Math.round(Number(w))))
      await setUserPreference({
        user_id: userId,
        preference_key: CONTEXT_PREFS_KEYS.window,
        preference_value: String(clamped),
        confidence: 1, // 用户显式设置 = 最高置信度
      })
    }
  }

  if ('compressionTriggerRatio' in patch) {
    const raw = Number(patch.compressionTriggerRatio)
    const ratio = Number.isFinite(raw)
      ? Math.min(MAX_TRIGGER_RATIO, Math.max(MIN_TRIGGER_RATIO, Math.round(raw * 100) / 100))
      : DEFAULT_USER_CONTEXT_PREFS.compressionTriggerRatio
    await setUserPreference({
      user_id: userId,
      preference_key: CONTEXT_PREFS_KEYS.trigger,
      preference_value: String(ratio),
      confidence: 1,
    })
  }

  return getUserContextPrefs(userId)
}

/** 恢复默认（删除本模块写入的所有 key） */
export async function resetUserContextPrefs(userId: number): Promise<UserContextPrefs> {
  for (const key of Object.values(CONTEXT_PREFS_KEYS)) {
    await deleteUserPreference(userId, key).catch(() => {})
  }
  return getUserContextPrefs(userId)
}
