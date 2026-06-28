import { SignJWT, jwtVerify } from "jose";

/**
 * JWT Payload Interface
 */
export interface JWTPayload {
  id: number;
  email: string;
  username: string;
  [key: string]: unknown; // Allow other properties for Jose compatibility
}

/**
 * Get JWT Secret
 *
 * 安全要求：JWT_SECRET 必须由环境变量提供，缺失时一律拒绝启动，
 * 避免在 NODE_ENV 未正确设置或部署配置错误时静默使用已知弱密钥导致 token 伪造。
 */
export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("FATAL: JWT_SECRET environment variable is not defined. Refusing to start to prevent JWT forgery via known weak default secret.");
  }

  if (secret.length < 32) {
    throw new Error("FATAL: JWT_SECRET must be at least 32 characters long to ensure HS256 security.");
  }

  return new TextEncoder().encode(secret);
}

/**
 * Generate JWT Token (Edge compatible)
 */
export async function signToken(payload: Omit<JWTPayload, "exp" | "iat">): Promise<string> {
  const secret = getJwtSecret();
  const alg = "HS256";

  return new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(secret);
}

/**
 * Verify JWT Token (Edge compatible)
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}
