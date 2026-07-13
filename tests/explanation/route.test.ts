import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST } from "../../app/api/explain/route";
import { resetRateLimitBuckets } from "../../lib/explanation/rate-limit.server";

const validRequest = {
  proofId: "cycle-double-cover",
  source: "paper",
  location: { source: "paper", page: 1, blockIds: ["page-1-block-4"] },
  selectedText: "Every finite bridgeless undirected graph has a cycle double cover.",
  mode: "details",
  history: [],
};

function post(body: string) {
  return POST(
    new Request("http://localhost/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": "route-test" },
      body,
    }),
  );
}

describe("POST /api/explain", () => {
  beforeEach(() => {
    resetRateLimitBuckets();
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("rejects malformed JSON", async () => {
    const response = await post("{");
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_REQUEST" });
  });

  it("reports an explicit configuration error when the API key is absent", async () => {
    const response = await post(JSON.stringify(validRequest));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      code: "MODEL_ERROR",
      message: "AI explanations are not configured on this deployment.",
      isRetryable: false,
    });
  });

  it("rejects selected text that is not present in the authoritative source", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const response = await post(
      JSON.stringify({ ...validRequest, selectedText: "This text was injected by the browser." }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "SELECTION_MISMATCH" });
  });
});
