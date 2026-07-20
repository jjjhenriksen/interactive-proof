import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST } from "../../app/api/explain-upload/route";
import { resetRateLimitBuckets } from "../../lib/explanation/rate-limit.server";

const valid = {
  paperTitle: "Example",
  selection: { source: "paper", page: 1, selectedText: "main result", surroundingText: "Our main result follows." },
  mode: "details",
  depth: "standard",
  history: [],
  rightsConfirmed: true,
};

function post(body: string, headers: Record<string, string> = {}) {
  return POST(new Request("http://localhost/api/explain-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-real-ip": "upload-route-test", ...headers },
    body,
  }));
}

describe("POST /api/explain-upload", () => {
  beforeEach(() => {
    resetRateLimitBuckets();
    delete process.env.OPENAI_API_KEY;
  });
  afterEach(() => delete process.env.OPENAI_API_KEY);

  it("rejects requests without rights confirmation", async () => {
    const response = await post(JSON.stringify({ ...valid, rightsConfirmed: false }));
    expect(response.status).toBe(400);
  });

  it("reports missing model configuration after validating context", async () => {
    const response = await post(JSON.stringify(valid));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "MODEL_ERROR", isRetryable: false });
  });

  it("rejects oversized declared bodies before reading them", async () => {
    const response = await post("{}", { "Content-Length": "48001" });
    expect(response.status).toBe(413);
  });
});
