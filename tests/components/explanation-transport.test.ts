import { describe, expect, it, vi } from "vitest"

import { createFetchExplanationTransport } from "../../components/explanation-panel/explanation-transport"
import type {
  ExplanationRequest,
  PublicContext,
  PublicError,
} from "../../components/explanation-panel/explanation-state"

const request: ExplanationRequest = {
  selection: {
    proofId: "cycle-double-cover",
    source: "paper",
    selectedText: "A target vector lies in the image of L.",
    location: { source: "paper", page: 2, blockIds: ["p2-b4"] },
    clientRect: { top: 10, right: 180, bottom: 34, left: 20 },
  },
  mode: "details",
  history: [],
}

function chunkedResponse(chunks: string[]) {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)))
        controller.close()
      },
    }),
    { status: 200, headers: { "Content-Type": "text/event-stream" } },
  )
}

function callbacks() {
  return {
    onContext: vi.fn<(context: PublicContext) => void>(),
    onDelta: vi.fn<(text: string) => void>(),
    onComplete: vi.fn<() => void>(),
    onError: vi.fn<(error: PublicError) => void>(),
  }
}

describe("fetch explanation transport", () => {
  it("posts the bounded request and parses SSE frames split across chunks", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        void input
        void init
        return chunkedResponse([
          'event: context\ndata: {"type":"context","context":{"sources":[{"id":"paper:p2","type":"paper",',
          '"label":"Paper p. 2","page":2}],"verification":{"status":"verified","revision":"abc"}}}\n\n',
          'event: delta\ndata: {"type":"delta","text":"This step "}\n\nevent: delta\ndata: {"type":"delta","text":"checks compatibility."}\n\n',
          'event: completed\ndata: {"type":"completed","responseId":"response-1"}\n\n',
        ])
      },
    )
    const handlers = callbacks()
    const transport = createFetchExplanationTransport(fetchMock)

    await transport.run(request, handlers, new AbortController().signal)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/explain")
    expect(init?.method).toBe("POST")
    expect(new Headers(init?.headers).get("Accept")).toBe("text/event-stream")
    expect(JSON.parse(String(init?.body))).toEqual({
      proofId: "cycle-double-cover",
      source: "paper",
      location: { source: "paper", page: 2, blockIds: ["p2-b4"] },
      selectedText: "A target vector lies in the image of L.",
      mode: "details",
      history: [],
    })
    expect(handlers.onContext).toHaveBeenCalledWith(
      expect.objectContaining({
        verification: expect.objectContaining({ build: "passed", revision: "abc" }),
      }),
    )
    expect(handlers.onDelta.mock.calls.flat()).toEqual([
      "This step ",
      "checks compatibility.",
    ])
    expect(handlers.onComplete).toHaveBeenCalledOnce()
    expect(handlers.onError).not.toHaveBeenCalled()
  })

  it("surfaces HTTP errors with retry guidance", async () => {
    const handlers = callbacks()
    const transport = createFetchExplanationTransport(
      vi.fn(async () =>
        Response.json(
          { code: "RATE_LIMITED", message: "Try again soon.", requestId: "req-7" },
          { status: 429 },
        ),
      ),
    )

    await transport.run(request, handlers, new AbortController().signal)

    expect(handlers.onError).toHaveBeenCalledWith({
      code: "RATE_LIMITED",
      message: "Try again soon.",
      requestId: "req-7",
      isRetryable: true,
    })
  })

  it("honors a non-retryable server error", async () => {
    const handlers = callbacks()
    const transport = createFetchExplanationTransport(
      vi.fn(async () =>
        Response.json(
          {
            code: "MODEL_ERROR",
            message: "AI explanations are not configured.",
            isRetryable: false,
          },
          { status: 503 },
        ),
      ),
    )

    await transport.run(request, handlers, new AbortController().signal)

    expect(handlers.onError).toHaveBeenCalledWith(
      expect.objectContaining({ isRetryable: false }),
    )
  })

  it("rejects a stream that ends without a terminal event", async () => {
    const handlers = callbacks()
    const transport = createFetchExplanationTransport(
      vi.fn(async () =>
        chunkedResponse(['event: delta\ndata: {"type":"delta","text":"partial"}\n\n']),
      ),
    )

    await transport.run(request, handlers, new AbortController().signal)

    expect(handlers.onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_STREAM", isRetryable: true }),
    )
  })

  it("does not report an error when the caller aborts", async () => {
    const handlers = callbacks()
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"))
          })
        }),
    )
    const transport = createFetchExplanationTransport(fetchMock)
    const controller = new AbortController()

    const running = transport.run(request, handlers, controller.signal)
    controller.abort()
    await running

    expect(handlers.onError).not.toHaveBeenCalled()
    expect(handlers.onComplete).not.toHaveBeenCalled()
  })
})
