import { afterEach, describe, expect, it, vi } from "vitest";
import { streamUploadedExplanation } from "../../lib/uploads/client-transport";
import type { UploadedExplainRequest } from "../../lib/uploads/schema";

const request: UploadedExplainRequest = {
  paperTitle: "Example", selection: { source: "lean", file: "Main.lean", selectedText: "True", surroundingText: "theorem t : True := by trivial" },
  mode: "details", depth: "standard", history: [], rightsConfirmed: true,
};
const callbacks = () => ({ onContext: vi.fn(), onDelta: vi.fn(), onComplete: vi.fn(), onError: vi.fn() });
afterEach(() => vi.unstubAllGlobals());

describe("uploaded explanation transport cleanup", () => {
  for (const frame of ['{"type":"completed"}', '{"type":"error","message":"failed"}', 'malformed']) {
    it(`cancels and unlocks a body left open after ${frame}`, async () => {
      const cancel = vi.fn();
      const body = new ReadableStream<Uint8Array>({ start(controller) {
        controller.enqueue(new TextEncoder().encode(`data: ${frame}\n\ndata: {"type":"completed"}\n\n`));
      }, cancel });
      vi.stubGlobal("fetch", vi.fn(async () => new Response(body)));
      const handlers = callbacks();
      await streamUploadedExplanation(request, handlers, new AbortController().signal);
      expect(cancel).toHaveBeenCalledOnce();
      expect(body.locked).toBe(false);
      expect(handlers.onComplete.mock.calls.length + handlers.onError.mock.calls.length).toBe(1);
    });
  }

  it("aborts a pending read without terminal callbacks and releases its lock", async () => {
    const cancel = vi.fn();
    let started!: () => void;
    const reading = new Promise<void>((resolve) => { started = resolve; });
    const body = new ReadableStream<Uint8Array>({ pull() { started(); }, cancel }, { highWaterMark: 0 });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body)));
    const controller = new AbortController();
    const handlers = callbacks();
    const running = streamUploadedExplanation(request, handlers, controller.signal);
    await reading;
    controller.abort();
    await running;
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
    expect(handlers.onComplete).not.toHaveBeenCalled();
    expect(handlers.onError).not.toHaveBeenCalled();
  });

  it("releases the reader on a failed read and reports one error", async () => {
    const body = new ReadableStream<Uint8Array>({ pull(controller) { controller.error(new Error("disconnected")); } });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body)));
    const handlers = callbacks();
    await streamUploadedExplanation(request, handlers, new AbortController().signal);
    expect(body.locked).toBe(false);
    expect(handlers.onError).toHaveBeenCalledOnce();
  });
});
