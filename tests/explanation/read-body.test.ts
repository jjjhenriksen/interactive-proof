import { describe, expect, it, vi } from "vitest";
import { POST as explain } from "../../app/api/explain/route";
import { POST as upload } from "../../app/api/explain-upload/route";
import { readBoundedRequestText, RequestBodyTooLargeError } from "../../lib/explanation/read-body.server";

function chunked(chunks: Uint8Array[], headers = {}) {
  let read = 0;
  const cancel = vi.fn();
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (read < chunks.length) controller.enqueue(chunks[read++]);
      else controller.close();
    },
    cancel,
  }, { highWaterMark: 0 });
  const request = new Request("http://localhost/api/explain", { method: "POST", body: stream, headers, duplex: "half" } as RequestInit);
  return { request, stream, cancel, read: () => read };
}

describe("bounded explanation bodies", () => {
  for (const [name, handler, limit] of [["explain", explain, 32_000], ["upload", upload, 48_000]] as const) {
    for (const headers of [{}, { "Content-Length": "2" }]) {
      it(`${name} cancels an oversized chunked body with ${JSON.stringify(headers)}`, async () => {
        const body = chunked([new Uint8Array(limit), new Uint8Array(1), new Uint8Array(limit)], headers);
        const response = await handler(body.request);
        expect(response.status).toBe(413);
        expect(body.read()).toBe(2);
        expect(body.cancel).toHaveBeenCalledOnce();
        expect(body.stream.locked).toBe(false);
      });
    }
  }

  it("decodes multi-byte UTF-8 split across chunks at the exact byte limit", async () => {
    const bytes = new TextEncoder().encode("aé🖤");
    const body = chunked([bytes.slice(0, 2), bytes.slice(2, 4), bytes.slice(4)]);
    await expect(readBoundedRequestText(body.request, bytes.length)).resolves.toBe("aé🖤");
    expect(body.cancel).not.toHaveBeenCalled();
    expect(body.stream.locked).toBe(false);
  });

  it("cancels an oversized declared body without pulling any chunks", async () => {
    const body = chunked([new Uint8Array(1)], { "Content-Length": "11" });
    await expect(readBoundedRequestText(body.request, 10)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
    expect(body.read()).toBe(0);
    expect(body.cancel).toHaveBeenCalledOnce();
  });
});
