import { cookies } from "next/headers"
import { getUserById, type UserPublic, toPublicUser } from "./db/user-service"
import { signToken, verifyToken as verifyTokenJose, type JWTPayload } from "./token"

export type { JWTPayload };

/**
 * Get JWT Secret (Re-export for compatibility if needed, though mostly internal)
 */
export function getJwtSecret(): string {
   const secret = process.env.JWT_SECRET;
   return secret || "dev-secret-change-in-production";
}

/**
 * Generate JWT Token
 */
export async function generateToken(payload: Omit<JWTPayload, "exp" | "iat">): Promise<string> {
  return signToken(payload);
}

/**
 * Verify JWT Token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  return verifyTokenJose(token);
}

/**
 * Set Auth Cookie
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  const isProduction = process.env.NODE_ENV === "production"
  
  cookieStore.set("auth", token, {
    httpOnly: true, // 防止 XSS 攻击
    sameSite: "lax", // 防止 CSRF 攻击
    secure: isProduction, // 生产环境仅允许 HTTPS
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 天(秒)
  })
}

/**
 * Clear Auth Cookie
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  const isProduction = process.env.NODE_ENV === "production"
  
  // 使用与设置时完全相同的参数进行覆盖删除
  cookieStore.set("auth", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 0, // 立即过期
    expires: new Date(0)
  })
  
  // 同时尝试直接删除，作为双重保险
  cookieStore.delete("auth")
}

/**
 * Get Current User
 */
export async function getCurrentUser(): Promise<UserPublic | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth")?.value

    if (!token) {
      return null
    }

    // Verify token (async now)
    const payload = await verifyToken(token)
    if (!payload) {
      return null
    }

    // Get user from DB
    const user = await getUserById(payload.id)
    if (!user) {
      return null
    }

    return toPublicUser(user)
  } catch (error) {
    console.error("获取当前用户失败:", error)
    return null
  }
}
