import { beforeEach, describe, expect, it } from "vitest";

import {
  checkRateLimit,
  resetRateLimitBuckets,
} from "../../lib/explanation/rate-limit.server";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  it("allows requests through the configured limit, then reports a retry delay", () => {
    const options = { limit: 2, windowMs: 5_000, now: 10_000 };

    expect(checkRateLimit("192.0.2.1", options)).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
    expect(checkRateLimit("192.0.2.1", options)).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
    expect(checkRateLimit("192.0.2.1", { ...options, now: 11_001 })).toEqual({
      allowed: false,
      retryAfterSeconds: 4,
    });
  });

  it("starts a fresh bucket at the exact window boundary", () => {
    expect(
      checkRateLimit("192.0.2.2", { limit: 1, windowMs: 1_000, now: 2_000 }),
    ).toMatchObject({ allowed: true });
    expect(
      checkRateLimit("192.0.2.2", { limit: 1, windowMs: 1_000, now: 2_999 }),
    ).toEqual({ allowed: false, retryAfterSeconds: 1 });
    expect(
      checkRateLimit("192.0.2.2", { limit: 1, windowMs: 1_000, now: 3_000 }),
    ).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("tracks different client keys independently", () => {
    const options = { limit: 1, windowMs: 10_000, now: 1_000 };

    expect(checkRateLimit("198.51.100.1", options).allowed).toBe(true);
    expect(checkRateLimit("198.51.100.1", options).allowed).toBe(false);
    expect(checkRateLimit("198.51.100.2", options).allowed).toBe(true);
  });

  it("removes stale buckets while checking later requests", () => {
    expect(
      checkRateLimit("203.0.113.1", { limit: 1, windowMs: 100, now: 0 }),
    ).toMatchObject({ allowed: true });

    // Checking another client after expiry performs global stale-bucket cleanup.
    expect(
      checkRateLimit("203.0.113.2", { limit: 1, windowMs: 100, now: 100 }),
    ).toMatchObject({ allowed: true });
    expect(
      checkRateLimit("203.0.113.1", { limit: 1, windowMs: 100, now: 100 }),
    ).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("rejects invalid configuration instead of silently disabling the limit", () => {
    expect(() => checkRateLimit("", { now: 0 })).toThrow(TypeError);
    expect(() => checkRateLimit("client", { limit: 0, now: 0 })).toThrow(
      RangeError,
    );
    expect(() => checkRateLimit("client", { windowMs: 0, now: 0 })).toThrow(
      RangeError,
    );
  });
});
