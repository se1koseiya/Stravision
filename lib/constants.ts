export function getInternalApiSecret(): string {
  // 安全要求：INTERNAL_API_SECRET 必须由环境变量提供，缺失时一律抛错，
  // 避免攻击者使用源码中已知的回退值调用 /api/internal/* 端点
  // （可解封任意 IP 绕过限流、查询维护配置、读取安全配置等）。
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error("FATAL: INTERNAL_API_SECRET environment variable is not defined. Refusing to start to prevent internal API bypass via known fallback secret.");
  }
  return secret;
}
