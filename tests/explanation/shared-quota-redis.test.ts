// Optional real-Redis contract test; see docs/SETUP.md. No hosted credentials.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SHARED_QUOTA_SCRIPT } from "../../lib/explanation/rate-limit.server";

const container = process.env.REDIS_TEST_CONTAINER;
const exec = promisify(execFile);
async function redis(...args: string[]) {
  const { stdout } = await exec("docker", ["exec", container!, "redis-cli", "--json", ...args]);
  return JSON.parse(stdout);
}

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe.skipIf(!container)("atomic quota against real Redis", () => {
  it("shares admission across independent modules under concurrency and preserves expiry", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EXPLAIN_RATE_LIMIT_PER_HOUR", "3");
    vi.stubEnv("EXPLAIN_QUOTA_REDIS_REST_URL", "https://redis.test");
    vi.stubEnv("EXPLAIN_QUOTA_REDIS_REST_TOKEN", "test");
    const keys = new Set<string>();
    vi.stubGlobal("fetch", async (_url: unknown, init: RequestInit) => {
      const command: string[] = JSON.parse(String(init.body));
      keys.add(command[3]);
      return Response.json({ result: await redis(...command) });
    });
    vi.resetModules();
    const first = await import("../../lib/explanation/rate-limit.server");
    vi.resetModules();
    const second = await import("../../lib/explanation/rate-limit.server");
    const request = new Request("https://example.test", { headers: { "cf-connecting-ip": crypto.randomUUID() } });
    try {
      const results = await Promise.all(Array.from({ length: 25 }, (_, index) =>
        (index % 2 ? first : second).checkExplanationQuota(request)));
      expect(results.filter((result) => result.allowed)).toHaveLength(3);
      expect(results.filter((result) => !result.allowed).every((result) => result.retryAfterSeconds > 0)).toBe(true);
      expect(keys.size).toBe(1);
      const [key] = keys;
      expect(await redis("GET", key)).toBe("3");
      // Shorten the window in the test, then prove denial cannot renew it.
      await redis("PEXPIRE", key, "10000");
      const ttlBefore = await redis("PTTL", key);
      expect(await first.checkExplanationQuota(request)).toMatchObject({ allowed: false });
      expect(await redis("PTTL", key)).toBeLessThanOrEqual(ttlBefore);
      // Simulate expiry without a wall-clock sleep; a new window must be admitted.
      await redis("PEXPIREAT", key, "1");
      expect(await second.checkExplanationQuota(request)).toMatchObject({ allowed: true });
      expect(await redis("GET", key)).toBe("1");
      expect(await redis("PTTL", key)).toBeGreaterThan(3_590_000);
      // Repair an accidentally persistent counter without granting extra quota.
      await redis("SET", key, "3");
      expect(await redis("EVAL", SHARED_QUOTA_SCRIPT, "1", key, "3", "3600000")).toEqual([0, 3600000]);
      expect(await redis("PTTL", key)).toBeGreaterThan(3_590_000);
    } finally {
      for (const key of keys) await redis("DEL", key);
    }
  });
});
