import { NextRequest } from "next/server";

interface RateLimitConfig {
  limit: number;
  windowMs: number;
  autoBan?: boolean;
}

const trackers = new Map<string, { count: number; expiresAt: number; violationCount: number }>();
const bannedIPs = new Map<string, number>(); // IP -> ban expires at

// Simple in-memory banned cache to avoid hitting DB on every request in middleware
// In a real production app, this should be synced with Redis/DB
const BAN_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

/**
 * Get Client IP from request headers (Cloudflare/CDN compatible)
 */
export function getClientIp(req: NextRequest): string {
  // Cloudflare
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  // Standard X-Forwarded-For
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  // Nginx Real IP
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown-ip";
}

export function resetIp(ip: string) {
  bannedIPs.delete(ip);
  trackers.delete(ip);
}

export function unbanIp(ip: string) {
  bannedIPs.delete(ip);
}

/**
 * Basic in-memory rate limiter with Auto-Ban support
 */
export interface ExtendedRateLimitConfig extends RateLimitConfig {
  violationLimit?: number;
  banDuration?: number;
}

export function rateLimit(req: NextRequest, config: ExtendedRateLimitConfig = { limit: 300, windowMs: 60 * 1000, autoBan: false }) {
  const now = Date.now();
  
  // Lazy Cleanup: Run cleanup periodically to prevent memory leaks
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    lastCleanup = now;
    // Cleanup expired trackers
    for (const [key, record] of trackers.entries()) {
      if (now > record.expiresAt) {
        trackers.delete(key);
      }
    }
    // Cleanup expired bans
    for (const [key, expiresAt] of bannedIPs.entries()) {
      if (now > expiresAt) {
        bannedIPs.delete(key);
      }
    }
  }

  const ip = getClientIp(req);
  
  // 1. Check if already banned locally
  const banExpires = bannedIPs.get(ip);
  if (banExpires && now < banExpires) {
    return { success: false, banned: true, newBan: false };
  } else if (banExpires) {
    bannedIPs.delete(ip); // Ban expired
  }

  // 2. Get tracking record
  let record = trackers.get(ip);

  // 3. Initialize or Reset if window expired
  if (!record || now > record.expiresAt) {
    record = { count: 1, expiresAt: now + config.windowMs, violationCount: record?.violationCount || 0 };
    trackers.set(ip, record);
    return { success: true };
  }

  // 4. Increment count
  record.count++;

  // 5. Check limit
  if (record.count > config.limit) {
    // Increment violation count
    record.violationCount++;
    
    // Auto-ban logic
    const violationLimit = config.violationLimit || 5;
    const banDuration = config.banDuration || BAN_DURATION;

    if (config.autoBan && record.violationCount >= violationLimit) {
      bannedIPs.set(ip, now + banDuration);
      return { success: false, banned: true, newBan: true };
    }

    return { success: false };
  }

  return { success: true };
}
