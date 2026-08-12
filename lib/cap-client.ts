/**
 * Cap 人机验证 - 客户端环境判断
 *
 * 与服务端 lib/cap.ts 的 isCapRequired() 对应，但读取 NEXT_PUBLIC_* 前缀变量
 * （Next.js 客户端 bundle 只能访问 NEXT_PUBLIC_ 前缀的环境变量）。
 *
 * 默认行为（未配置 NEXT_PUBLIC_CAP_ENABLED 时）：
 * - 生产环境（NODE_ENV=production）：需要人机验证（渲染 CapWidget + 强制校验）
 * - 测试/开发环境（NODE_ENV≠production）：跳过人机验证（不渲染 + 跳过校验）
 *
 * 覆盖：
 * - NEXT_PUBLIC_CAP_ENABLED='true'  → 强制启用
 * - NEXT_PUBLIC_CAP_ENABLED='false' → 强制禁用
 */

export function isCapRequiredClient(): boolean {
  // Next.js 在客户端 bundle 中会内联 process.env.NODE_ENV 为字面量
  if (typeof process === 'undefined') return true
  const override = process.env.NEXT_PUBLIC_CAP_ENABLED?.toLowerCase().trim()
  if (override === 'true') return true
  if (override === 'false') return false
  return process.env.NODE_ENV === 'production'
}
