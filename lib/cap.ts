/**
 * Cap 人机行为验证 - 服务端令牌校验
 *
 * Cap 是自托管的 proof-of-work CAPTCHA（https://trycap.dev/）。
 * 前端表单提交时携带 cap-token 字段，后端用本模块向自托管的 Cap 实例
 * 的 /siteverify 接口校验令牌合法性。
 *
 * 配置环境变量：
 * - CAP_VERIFY_URL：自托管 Cap 实例的 siteverify 完整地址
 *   （含 site-key 路径，例如 http://cap:3000/<site-key>/siteverify）
 * - CAP_SECRET_KEY：Cap 控制台中该 site key 对应的 secret key（仅服务端）
 * - CAP_ENABLED：可选，强制启用/禁用人机验证（'true' / 'false'）
 *
 * 默认行为（未配置 CAP_ENABLED 时）：
 * - 生产环境（NODE_ENV=production）：需要人机验证
 * - 测试/开发环境（NODE_ENV≠production）：跳过人机验证
 */

export interface CapVerifyResult {
  success: boolean
  error?: string
}

/**
 * 判断当前环境是否需要 Cap 人机验证。
 *
 * 优先级：CAP_ENABLED 环境变量覆盖 > NODE_ENV 默认判断
 * - CAP_ENABLED='true'  → 强制启用
 * - CAP_ENABLED='false' → 强制禁用
 * - 未设置              → 按 NODE_ENV 判断（production 启用，其他禁用）
 */
export function isCapRequired(): boolean {
  const override = process.env.CAP_ENABLED?.toLowerCase().trim()
  if (override === 'true') return true
  if (override === 'false') return false
  return process.env.NODE_ENV === 'production'
}

/**
 * 向自托管 Cap 实例校验令牌。
 *
 * - 测试环境（isCapRequired()===false）：直接放行，方便联调
 * - 生产环境（isCapRequired()===true）：
 *   - 若 CAP_SECRET_KEY 或 CAP_VERIFY_URL 未配置：返回失败（防止误配导致绕过）
 *   - 若令牌缺失或校验失败：返回 success=false
 *
 * Cap 的 /siteverify 兼容 reCAPTCHA API，返回 { success: boolean, "error-codes"?: string[] }
 */
export async function verifyCapToken(token: string | undefined | null): Promise<CapVerifyResult> {
  // 测试环境直接放行
  if (!isCapRequired()) {
    return { success: true, error: "cap-disabled-in-non-production" }
  }

  const verifyUrl = process.env.CAP_VERIFY_URL
  const secret = process.env.CAP_SECRET_KEY

  // 生产环境配置缺失：拒绝（防止误配导致人机验证被绕过）
  if (!verifyUrl || !secret) {
    console.error(
      "[CAP] 生产环境未配置 CAP_VERIFY_URL 或 CAP_SECRET_KEY，人机验证拒绝放行。" +
        "请在环境变量中设置：CAP_VERIFY_URL（含 site-key 的 /siteverify 地址）和 CAP_SECRET_KEY。"
    )
    return { success: false, error: "人机验证服务未配置" }
  }

  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return { success: false, error: "缺少人机验证令牌" }
  }

  try {
    const res = await fetch(verifyUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
    })

    if (!res.ok) {
      console.error("[CAP] siteverify 接口返回非 2xx:", res.status, res.statusText)
      return { success: false, error: "人机验证服务异常" }
    }

    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[]; error?: string }

    if (data.success === true) {
      return { success: true }
    }

    return {
      success: false,
      error: data.error || (data["error-codes"] && data["error-codes"].join(", ")) || "人机验证失败",
    }
  } catch (e) {
    console.error("[CAP] 校验请求异常:", e)
    return { success: false, error: "人机验证请求失败" }
  }
}
