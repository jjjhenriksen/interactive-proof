import type { ExplanationStreamEvent, PublicContext } from "../explanation/types";
import type { UploadedExplainRequest } from "./schema";

export type UploadStreamCallbacks = {
  onContext: (context: PublicContext) => void;
  onDelta: (text: string) => void;
  onComplete: () => void;
  onError: (message: string) => void;
};

export async function streamUploadedExplanation(
  body: UploadedExplainRequest,
  callbacks: UploadStreamCallbacks,
  signal: AbortSignal,
): Promise<void> {
  try {
    const response = await fetch("/api/explain-upload", {
      method: "POST",
      headers: { Accept: "text/event-stream", "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      callbacks.onError(payload?.message ?? "The explanation request could not be started.");
      return;
    }
    if (!response.body) {
      callbacks.onError("The explanation service returned an empty response.");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let ended = false;
    const consume = (frame: string) => {
      const data = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data || ended) return;
      let event: ExplanationStreamEvent;
      try {
        event = JSON.parse(data) as ExplanationStreamEvent;
      } catch {
        ended = true;
        callbacks.onError("The explanation stream returned malformed data.");
        return;
      }
      if (event.type === "context") callbacks.onContext(event.context);
      else if (event.type === "delta") callbacks.onDelta(event.text);
      else if (event.type === "completed") {
        ended = true;
        callbacks.onComplete();
      } else if (event.type === "error") {
        ended = true;
        callbacks.onError(event.message);
      }
    };

    while (!ended) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";
      frames.forEach(consume);
    }
    buffer += decoder.decode();
    if (!ended && buffer.trim()) consume(buffer);
    if (!ended && !signal.aborted) callbacks.onError("The explanation stream ended unexpectedly.");
  } catch (error) {
    if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
    callbacks.onError("The explanation service could not be reached.");
  }
}
