type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Simple in-memory rate limiter for API routes (per-process). */
export function rateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (existing.count >= limit) {
    return { ok: false, remaining: 0 };
  }
  existing.count += 1;
  return { ok: true, remaining: limit - existing.count };
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}
