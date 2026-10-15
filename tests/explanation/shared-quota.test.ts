import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkExplanationQuota, resetRateLimitBuckets, SHARED_QUOTA_SCRIPT } from "../../lib/explanation/rate-limit.server";

vi.mock("../../lib/explanation/build-context.server", () => ({
  buildExplanationContext: vi.fn(async () => ({})),
  ExplanationContextError: class extends Error {},
}));
vi.mock("../../lib/uploads/context.server", () => ({
  buildUploadedExplanationContext: vi.fn(() => ({})),
}));
const { createStream } = vi.hoisted(() => ({ createStream: vi.fn(() => new ReadableStream({ start(controller) { controller.close(); } })) }));
vi.mock("../../lib/explanation/openai-response.server", () => ({ createExplanationStream: createStream }));

const registered = {
  proofId: "odd-sum-square", source: "paper",
  location: { source: "paper", page: 1, blockIds: ["page-1-block-4"] },
  selectedText: "The sum of the first n odd numbers is n².", mode: "details", history: [],
};
const uploaded = {
  paperTitle: "Example",
  selection: { source: "paper", page: 1, selectedText: "main result", surroundingText: "Our main result follows." },
  mode: "details", depth: "standard", history: [], rightsConfirmed: true,
};
function request(body: unknown = registered, identity = "203.0.113.8") {
  return new Request("https://example.test/api/explain", {
    method: "POST", headers: { "Content-Type": "application/json", "cf-connecting-ip": identity }, body: JSON.stringify(body),
  });
}
function configure() {
  vi.stubEnv("EXPLAIN_QUOTA_REDIS_REST_URL", "https://quota.example.test");
  vi.stubEnv("EXPLAIN_QUOTA_REDIS_REST_TOKEN", "test-secret");
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("EXPLAIN_QUOTA_REDIS_REST_URL", "");
  vi.stubEnv("EXPLAIN_QUOTA_REDIS_REST_TOKEN", "");
  vi.stubEnv("EXPLAIN_RATE_LIMIT_PER_HOUR", "3");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  resetRateLimitBuckets();
  createStream.mockClear();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("shared explanation quota", () => {
  it("enforces combined concurrent allowance across independently loaded handlers and both routes", async () => {
    configure();
    const counters = new Map<string, number>();
    const backend = vi.fn(async (_url: unknown, init: RequestInit) => {
      const [command, script, keys, key, limit, window] = JSON.parse(String(init.body));
      expect([command, script, keys, window]).toEqual(["EVAL", SHARED_QUOTA_SCRIPT, "1", "3600000"]);
      expect(key).toMatch(/^interactive-proof:explain:v1:[a-f0-9]{64}$/);
      expect(key).not.toContain("203.0.113.8");
      expect(init.headers).toMatchObject({ Authorization: "Bearer test-secret" });
      expect(init.cache).toBe("no-store");
      expect(init.redirect).toBe("error");
      expect(init.signal).toBeInstanceOf(AbortSignal);
      const count = counters.get(key) ?? 0;
      const allowed = count < Number(limit);
      if (allowed) counters.set(key, count + 1);
      return Response.json({ result: [allowed ? 1 : 0, allowed ? 0 : 3_599_001] });
    });
    vi.stubGlobal("fetch", backend);
    vi.resetModules();
    const first = await import("../../app/api/explain/route");
    vi.resetModules();
    const second = await import("../../app/api/explain/route");
    const upload = await import("../../app/api/explain-upload/route");
    const responses = await Promise.all([
      first.POST(request()), second.POST(request()),
      upload.POST(request(uploaded)),
      second.POST(request()), first.POST(request()),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 200, 200, 429, 429]);
    expect(createStream).toHaveBeenCalledTimes(3);
    expect(counters.size).toBe(1);
    for (const response of responses.filter((response) => response.status === 429)) {
      expect(response.headers.get("Retry-After")).toBe("3600");
    }
    expect((await first.POST(request(registered, "203.0.113.9"))).status).toBe(200);
  });

  it("only falls back locally in development/test when both settings are absent", async () => {
    for (const environment of ["development", "test"]) {
      vi.stubEnv("NODE_ENV", environment);
      resetRateLimitBuckets();
      const results = await Promise.all(Array.from({ length: 4 }, () => checkExplanationQuota(request())));
      expect(results.filter((result) => result.allowed)).toHaveLength(3);
    }
    vi.stubEnv("EXPLAIN_QUOTA_REDIS_REST_URL", "https://quota.example.test");
    await expect(checkExplanationQuota(request())).rejects.toThrow("shared explanation quota is unavailable");
  });

  it.each([
    ["missing configuration", undefined],
    ["HTTP error", () => new Response("private details", { status: 503 })],
    ["Redis error", () => Response.json({ error: "private details" })],
    ["invalid JSON", () => new Response("invalid")],
    ["invalid result", () => Response.json({ result: [1, -1] })],
    ["invalid admission", () => Response.json({ result: [2, 0] })],
    ["invalid TTL", () => Response.json({ result: [0, 9_000_000] })],
    ["network failure", () => { throw new Error("private details"); }],
    ["timeout", () => { throw new DOMException("private details", "TimeoutError"); }],
  ])("fails closed before model calls on %s in both routes", async (_label, response) => {
    if (response) configure();
    const backend = vi.fn(response);
    vi.stubGlobal("fetch", backend);
    const { POST } = await import("../../app/api/explain/route");
    const { POST: upload } = await import("../../app/api/explain-upload/route");
    for (const result of [await POST(request()), await upload(request(uploaded))]) {
      expect(result.status).toBe(503);
      expect(result.headers.get("Retry-After")).toBe("30");
      expect(result.headers.get("Cache-Control")).toBe("no-store");
      const body = await result.text();
      expect(body).toContain("RATE_LIMIT_UNAVAILABLE");
      expect(body).not.toMatch(/private details|test-secret|203\.0\.113/);
    }
    expect(createStream).not.toHaveBeenCalled();
    if (!response) expect(backend).not.toHaveBeenCalled();
  });

  it("rejects non-HTTPS endpoints without sending the token", async () => {
    configure();
    vi.stubEnv("EXPLAIN_QUOTA_REDIS_REST_URL", "http://quota.example.test");
    const backend = vi.fn();
    vi.stubGlobal("fetch", backend);
    await expect(checkExplanationQuota(request())).rejects.toThrow();
    expect(backend).not.toHaveBeenCalled();
  });
});
