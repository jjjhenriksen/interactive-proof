const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_MS = 60_000;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitOptions = {
  limit?: number;
  windowMs?: number;
  now?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

// This store is intentionally process-local. It protects a single server instance
// from bursts, but it is not a substitute for a shared limiter in a multi-instance
// deployment.
const buckets = new Map<string, RateLimitBucket>();

export function checkRateLimit(
  key: string,
  options: RateLimitOptions = {},
): RateLimitResult {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const now = options.now ?? Date.now();

  validateInputs(key, limit, windowMs, now);
  removeStaleBuckets(now);

  const bucketKey = `${limit}:${windowMs}:${key}`;
  const bucket = buckets.get(bucketKey);

  if (!bucket) {
    buckets.set(bucketKey, {
      count: 1,
      resetAt: now + windowMs,
    });

    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimitBuckets(): void {
  buckets.clear();
}

function removeStaleBuckets(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function validateInputs(
  key: string,
  limit: number,
  windowMs: number,
  now: number,
): void {
  if (key.trim().length === 0) {
    throw new TypeError("Rate-limit key must not be empty");
  }

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new RangeError("Rate-limit limit must be a positive integer");
  }

  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new RangeError("Rate-limit windowMs must be a positive number");
  }

  if (!Number.isFinite(now)) {
    throw new RangeError("Rate-limit now must be a finite timestamp");
  }
}
