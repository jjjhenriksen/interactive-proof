import type { ResponseStreamEvent } from "openai/resources/responses/responses";
import { describe, expect, it, vi } from "vitest";

import {
  buildOpenAIResponseRequest,
  createExplanationStream,
} from "../../lib/explanation/openai-response.server";
import type { ExplainRequest } from "../../lib/explanation/request-schema";
import type { ContextBundle, PublicContext } from "../../lib/explanation/types";

const request: ExplainRequest = {
  proofId: "cycle-double-cover",
  source: "paper",
  location: { source: "paper", page: 1, blockIds: ["page-1-block-4"] },
  selectedText: "Every finite bridgeless undirected graph",
  mode: "details",
  history: [],
};

const context: ContextBundle = {
  proof: { id: request.proofId, title: "Cycle Double Cover", audience: "Readers" },
  selection: {
    text: request.selectedText,
    sourceId: "page-1-block-4",
    sourceType: "paper",
    locationLabel: "Paper, page 1",
  },
  surroundingSource: {
    id: "page-1-block-4",
    type: "paper",
    label: "Theorem 1.1",
    text: request.selectedText,
  },
  mappedSources: [],
  glossary: [],
  prerequisites: [],
  dependencies: [],
  usedBy: [],
  verification: {
    status: "not-run",
    revision: "prototype",
    toolchain: null,
    checkedAt: null,
    sorryCount: null,
    axiomCount: null,
  },
  allowedSourceIds: ["page-1-block-4"],
};

const publicContext: PublicContext = {
  selection: {
    text: request.selectedText,
    sourceType: "paper",
    locationLabel: "Paper, page 1",
  },
  sources: [{ id: "page-1-block-4", type: "paper", label: "Theorem 1.1", page: 1 }],
  verification: context.verification,
};

async function* providerEvents(events: ResponseStreamEvent[]) {
  yield* events;
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text;
    text += decoder.decode(value, { stream: true });
  }
}

describe("createExplanationStream", () => {
  it("keeps the model call ephemeral, bounded, and tool-free", () => {
    const body = buildOpenAIResponseRequest(request, context, "gpt-test");

    expect(body).toMatchObject({
      model: "gpt-test",
      stream: true,
      store: false,
      max_output_tokens: 1_600,
      tools: [],
    });
    expect(JSON.stringify(body.input)).toContain("ALLOWED SOURCE IDS");
    expect(JSON.stringify(body.instructions)).toContain("quoted data");
  });

  it("translates provider deltas and completion into the application SSE protocol", async () => {
    const events = [
      { type: "response.output_text.delta", delta: "This step" },
      { type: "response.output_text.delta", delta: " works." },
      {
        type: "response.completed",
        response: {
          id: "resp_test",
          usage: { input_tokens: 20, output_tokens: 4 },
        },
      },
    ] as ResponseStreamEvent[];

    const output = await readAll(
      createExplanationStream({
        request,
        context,
        publicContext,
        apiKey: "test-key",
        model: "test-model",
        requestId: "request-test",
        signal: new AbortController().signal,
        createProviderStream: async () => providerEvents(events),
      }),
    );

    expect(output).toContain("event: context");
    expect(output).toContain('"type":"delta","text":"This step"');
    expect(output).toContain('"type":"delta","text":" works."');
    expect(output).toContain('"type":"completed","responseId":"resp_test"');
    expect(output).toContain('"inputTokens":20,"outputTokens":4');
  });

  it("emits a generic model error without leaking provider details", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const output = await readAll(
      createExplanationStream({
        request,
        context,
        publicContext,
        apiKey: "test-key",
        model: "test-model",
        requestId: "request-test",
        signal: new AbortController().signal,
        createProviderStream: async () => {
          throw new Error("secret upstream detail");
        },
      }),
    );

    expect(output).toContain('"type":"error","code":"MODEL_ERROR"');
    expect(output).not.toContain("secret upstream detail");
    consoleError.mockRestore();
  });
});
