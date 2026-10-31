import { dayKey, hashIp } from "./http";

/**
 * Fast in-memory limiter (per Worker instance). Cloudflare runs several instances,
 * so this is a "basic" guard against bursts, not an exact global limit.
 */
export class MemoryRateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string, now: number = Date.now()): { ok: boolean; retryAfterSeconds: number } {
    if (this.hits.size > 5000) {
      for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
    }
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return { ok: true, retryAfterSeconds: 0 };
    }
    entry.count += 1;
    if (entry.count > this.limit) return { ok: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
    return { ok: true, retryAfterSeconds: 0 };
  }
}

/**
 * Durable counter in KV (used for the low-volume, costly endpoints: coach and feedback).
 * Read-then-write is not atomic, so under heavy concurrency it can undercount slightly;
 * that's acceptable for a pilot-sized cost guard.
 */
export async function kvCounter(
  kv: KVNamespace,
  key: string,
  limit: number,
  ttlSeconds: number,
): Promise<{ ok: boolean; count: number }> {
  const current = Number.parseInt((await kv.get(key)) ?? "0", 10) || 0;
  if (current >= limit) return { ok: false, count: current };
  await kv.put(key, String(current + 1), { expirationTtl: Math.max(60, ttlSeconds) });
  return { ok: true, count: current + 1 };
}

export async function ipBucket(ip: string, scope: string, now: number = Date.now()): Promise<string> {
  const day = dayKey(now);
  // Salted with the day so the stored hash can't be linked across days.
  return `rl:${scope}:${day}:${await hashIp(ip, day)}`;
}
