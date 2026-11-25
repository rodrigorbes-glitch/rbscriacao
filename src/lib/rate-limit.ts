import { NextRequest } from 'next/server';

// Rate limiting map in memory: IP -> timestamp[]
export const quoteRateLimits = new Map<string, number[]>();

export function resetRateLimitsForTesting() {
  quoteRateLimits.clear();
}

/**
 * Extracts true client IP behind reverse proxies safely.
 * Only trusts the rightmost proxy or direct remote address, preventing spoofing via client-crafted X-Forwarded-For headers!
 */
export function getClientIpSafely(req: NextRequest): string {
  // 1. Cloudflare authoritative header (overwritten at edge, cannot be spoofed by client)
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  // 2. Nginx / Hostinger authoritative upstream header
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  // 3. X-Forwarded-For: Take the rightmost IP (closest to trusted reverse proxy) to prevent client prefix spoofing
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
    if (ips.length > 0) {
      return ips[ips.length - 1];
    }
  }

  return '127.0.0.1';
}

export function checkRateLimit(ip: string, maxRequests = 5, windowMs = 60 * 1000): boolean {
  const now = Date.now();

  const timestamps = quoteRateLimits.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= maxRequests) {
    return false;
  }

  recent.push(now);
  quoteRateLimits.set(ip, recent);
  return true;
}
