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
 */
export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
       throw new Error("FATAL: JWT_SECRET is not defined in production environment!");
    }
    // console.warn("Warning: JWT_SECRET not set, using default dev secret");
  }
  
  const secretStr = secret || "dev-secret-change-in-production";
  return new TextEncoder().encode(secretStr);
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
