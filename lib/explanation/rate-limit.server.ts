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

/**
 * Cloudflare overwrites this header on direct visitor requests. Do not fall
 * back to client-controlled forwarding headers; deployments without the
 * trusted edge header share one conservative anonymous bucket.
 */
export function trustedRateLimitIdentity(request: Request): string {
  return request.headers.get("cf-connecting-ip")?.trim() || "shared-anonymous";
}

// Used only by the explicit development/test fallback below.
const buckets = new Map<string, RateLimitBucket>();

export class QuotaUnavailableError extends Error {
  constructor() {
    super("The shared explanation quota is unavailable");
    this.name = "QuotaUnavailableError";
  }
}

// One atomic operation owns both admission and expiry. Redis supplies the clock;
// isolates cannot reset the window with different local timestamps.
export const SHARED_QUOTA_SCRIPT = `
local count = tonumber(redis.call('GET', KEYS[1]) or '0')
local ttl = redis.call('PTTL', KEYS[1])
if count >= tonumber(ARGV[1]) then
  if ttl < 0 then
    redis.call('PEXPIRE', KEYS[1], ARGV[2])
    ttl = tonumber(ARGV[2])
  end
  return {0, ttl}
end
redis.call('INCR', KEYS[1])
if ttl < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[2]) end
return {1, 0}
`;

/** Both explanation routes consume the same per-identity hourly allowance. */
export async function checkExplanationQuota(request: Request): Promise<RateLimitResult> {
  const configured = Number(process.env.EXPLAIN_RATE_LIMIT_PER_HOUR ?? 30);
  const limit = Number.isSafeInteger(configured) && configured > 0 ? configured : 30;
  const windowMs = 60 * 60 * 1_000;
  const identity = trustedRateLimitIdentity(request);
  const url = process.env.EXPLAIN_QUOTA_REDIS_REST_URL;
  const token = process.env.EXPLAIN_QUOTA_REDIS_REST_TOKEN;

  if (!url && !token && (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test")) {
    return checkRateLimit(identity, { limit, windowMs });
  }

  // Never silently fall back to isolate-local quotas in production, on partial
  // configuration, or when a configured backend fails (even in development).
  try {
    if (!url || !token) throw new QuotaUnavailableError();
    const endpoint = new URL(url);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) {
      throw new QuotaUnavailableError();
    }
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
    const key = `interactive-proof:explain:v1:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["EVAL", SHARED_QUOTA_SCRIPT, "1", key, String(limit), String(windowMs)]),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) throw new QuotaUnavailableError();
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || "error" in payload || !("result" in payload)) {
      throw new QuotaUnavailableError();
    }
    const result = payload.result;
    if (!Array.isArray(result) || result.length !== 2 ||
        (result[0] !== 0 && result[0] !== 1) ||
        !Number.isSafeInteger(result[1]) || result[1] < 0 || result[1] > windowMs ||
        (result[0] === 1 && result[1] !== 0)) {
      throw new QuotaUnavailableError();
    }
    return {
      allowed: result[0] === 1,
      retryAfterSeconds: result[0] === 1 ? 0 : Math.max(1, Math.ceil(result[1] / 1_000)),
    };
  } catch {
    // Do not expose credentials, backend bodies, or client identities in errors.
    throw new QuotaUnavailableError();
  }
}

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
