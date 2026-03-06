type LimiterEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, LimiterEntry>();

type CheckInput = {
  key: string;
  max: number;
  windowMs: number;
};

type CheckResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

function checkRateLimitInMemory(input: CheckInput): CheckResult {
  const now = Date.now();
  const max = Math.max(1, input.max);
  const windowMs = Math.max(1000, input.windowMs);

  const current = store.get(input.key);
  if (!current || current.resetAt <= now) {
    store.set(input.key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
  }

  if (current.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, current.resetAt - now),
    };
  }

  current.count += 1;
  store.set(input.key, current);
  return { allowed: true, remaining: max - current.count, retryAfterMs: 0 };
}

type UpstashLimiter = {
  limit: (key: string) => Promise<{
    success: boolean;
    remaining: number;
    reset: number;
  }>;
};

let upstashLimiterCache:
  | Map<string, UpstashLimiter>
  | null
  | undefined;

async function getUpstashLimiter(input: CheckInput) {
  if (upstashLimiterCache === null) return null;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    upstashLimiterCache = null;
    return null;
  }

  try {
    const max = Math.max(1, input.max);
    const windowMs = Math.max(1, input.windowMs);
    const policyKey = `${max}:${windowMs}`;
    const existing = upstashLimiterCache?.get(policyKey);
    if (existing) return existing;

    const [{ Redis }, { Ratelimit }] = await Promise.all([
      import("@upstash/redis"),
      import("@upstash/ratelimit"),
    ]);
    const redis = new Redis({ url, token });
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(max, `${windowMs} ms`),
      analytics: false,
      prefix: "reviewpurge:ratelimit",
    });
    if (upstashLimiterCache === undefined) {
      upstashLimiterCache = new Map<string, UpstashLimiter>();
    }
    upstashLimiterCache.set(policyKey, limiter);
    return limiter;
  } catch {
    upstashLimiterCache = null;
    return null;
  }
}

export async function checkRateLimit(input: CheckInput): Promise<CheckResult> {
  const limiter = await getUpstashLimiter(input);
  if (!limiter) return checkRateLimitInMemory(input);

  try {
    const result = await limiter.limit(input.key);
    const retryAfterMs = Math.max(0, result.reset - Date.now());
    return {
      allowed: result.success,
      remaining: result.remaining,
      retryAfterMs,
    };
  } catch {
    return checkRateLimitInMemory(input);
  }
}
