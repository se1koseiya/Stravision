export function getInternalApiSecret(): string {
  // In production, this MUST be set in environment variables
  return process.env.INTERNAL_API_SECRET || "stravision-internal-secret-fallback";
}
