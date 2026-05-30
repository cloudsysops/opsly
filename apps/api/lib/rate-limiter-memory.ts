export const RATE_LIMIT_WINDOW_SECONDS = 60;
export const RATE_LIMIT_MAX_REQUESTS = 100;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

const memoryBuckets = new Map<string, { count: number; resetAtMs: number }>();

function rateLimitKey(tenantSlug: string): string {
  return `ratelimit:${tenantSlug}`;
}

function normalizeTenantSlug(tenantSlug: string): string {
  const slug = tenantSlug.trim();
  if (slug.length === 0) {
    throw new Error('tenantSlug is required');
  }
  return slug;
}

function memoryResult(tenantSlug: string, nowMs: number): RateLimitResult {
  const key = rateLimitKey(tenantSlug);
  const current = memoryBuckets.get(key);

  if (!current || current.resetAtMs <= nowMs) {
    const resetAtMs = nowMs + RATE_LIMIT_WINDOW_SECONDS * 1000;
    memoryBuckets.set(key, { count: 1, resetAtMs });
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: new Date(resetAtMs),
    };
  }

  const nextCount = current.count + 1;
  memoryBuckets.set(key, { count: nextCount, resetAtMs: current.resetAtMs });

  return {
    allowed: nextCount <= RATE_LIMIT_MAX_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - nextCount),
    resetAt: new Date(current.resetAtMs),
  };
}

/** Edge-safe in-memory rate limit (middleware). */
export async function checkRateLimit(tenantSlug: string): Promise<RateLimitResult> {
  const normalizedTenantSlug = normalizeTenantSlug(tenantSlug);
  return memoryResult(normalizedTenantSlug, Date.now());
}

export function resetRateLimiterMemoryStateForTests(): void {
  memoryBuckets.clear();
}
