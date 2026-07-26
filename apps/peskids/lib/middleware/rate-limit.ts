interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  keyGenerator?: (req: Request) => string;
}) {
  const { limit, windowMs, keyGenerator } = options;

  return (request: Request) => {
    const key = keyGenerator ? keyGenerator(request) : request.headers.get('x-forwarded-for') || 'anonymous';
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = { count: 1, resetTime: now + windowMs };
      return { allowed: true, remaining: limit - 1 };
    }

    store[key].count++;

    if (store[key].count > limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
      };
    }

    return { allowed: true, remaining: limit - store[key].count };
  };
}

export const apiRateLimiter = createRateLimiter({
  limit: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

export const authRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000, // 5 attempts per 15 minutes
  keyGenerator: (req) => req.headers.get('x-forwarded-for') || 'anonymous',
});
