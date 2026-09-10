/**
 * AI 接口统一额度守卫
 *
 * 🔥 背景：/api/chat 有完整的额度检查（checkCreditAllowance）+ 结算（settleCredits），
 * 但 /api/ai/* 下十几个直接调用 LLM 的接口（设备控制、每日简报、巡检、tts、
 * suggest-followups 等）此前完全没有额度检查——token 在烧、积分不扣，
 * 构成「积分耗尽仍能继续使用 AI」的旁路。
 *
 * 用法（在需要鉴权 + 额度的 AI 接口开头）：
 *   const guard = await guardAiQuota()
 *   if (!guard.ok) return guard.response
 *   const user = guard.user
 *
 * 说明：
 * - 只做「检查」不做「结算」：这些接口多为短调用（几百 token），单次成本远小于
 *   chat 的一轮，统一按 checkCreditAllowance 的最低余额门槛拦截即可；
 *   精确按 token 结算后续可按需接入 settleCredits。
 * - admin/super_admin 不豁免：平台管理员同样走积分体系（如需豁免请在调用方自行处理）。
 */

import { getCurrentUser } from "@/lib/auth"
import { checkCreditAllowance } from "@/lib/db/credit-service"

export type AiQuotaGuardResult =
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }
  | { ok: false; response: Response }

export async function guardAiQuota(
  opts?: { skipCreditCheck?: boolean }
): Promise<AiQuotaGuardResult> {
  const user = await getCurrentUser()
  if (!user) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  // 用户自带 API Key（不烧平台 key）时跳过积分检查，只要求登录——与 /api/chat 的
  // useSystemKey=false 分支口径一致
  if (opts?.skipCreditCheck) {
    return { ok: true, user }
  }

  // 未登录用户拿不到 membership/额度信息，直接按积分检查处理（内部会给出友好提示）
  const denyReason = await checkCreditAllowance(user.id as number)
  if (denyReason) {
    return {
      ok: false,
      response: Response.json({ error: `${denyReason}。` }, { status: 403 }),
    }
  }

  return { ok: true, user }
}
