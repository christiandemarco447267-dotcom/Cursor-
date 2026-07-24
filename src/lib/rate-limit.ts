/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Note: this is per-process only. On serverless/multi-instance deployments each
 * instance keeps its own counter and cold starts reset it. It's a courtesy
 * guard for the demo, not a security boundary — front it with a shared store
 * (e.g. Redis) or an edge rate limiter for production hardening.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

export function rateLimit(key: string, limit = 90, windowMs = 60_000, now = Date.now()): RateLimitResult {
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "local";
}
