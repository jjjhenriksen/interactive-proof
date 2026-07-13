import type {
  ExplanationRequest,
  PublicContext,
  PublicError,
  PublicSource,
  VerificationSummary,
} from "./explanation-state"

export type ExplanationStreamCallbacks = {
  onContext: (context: PublicContext) => void
  onDelta: (text: string) => void
  onComplete: () => void
  onError: (error: PublicError) => void
}

export interface ExplanationTransport {
  run: (
    request: ExplanationRequest,
    callbacks: ExplanationStreamCallbacks,
    signal: AbortSignal,
  ) => Promise<void>
}

export type ExplanationRequestControls = {
  abort: () => void
  retry: () => void
}

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

type ServerVerification = {
  status?: "verified" | "failed" | "not-run" | "stale"
  build?: "passed" | "failed" | "not-run"
  revision?: string | null
  checkedAt?: string | null
  sorryCount?: number | null
}

type ServerContext = {
  sources: PublicSource[]
  verification?: ServerVerification
  hasPrerequisiteContext?: boolean
}

type StreamEvent =
  | { type: "context"; context: ServerContext }
  | { type: "delta"; text: string }
  | { type: "completed" }
  | {
      type: "error"
      code?: string
      message?: string
      requestId?: string
      isRetryable?: boolean
    }

function normalizeVerification(
  verification: ServerVerification | undefined,
): VerificationSummary | undefined {
  if (!verification) return undefined

  const build =
    verification.build ??
    (verification.status === "verified"
      ? "passed"
      : verification.status === "failed"
        ? "failed"
        : "not-run")

  return {
    build,
    revision: verification.revision ?? undefined,
    checkedAt: verification.checkedAt ?? undefined,
    sorryCount: verification.sorryCount,
  }
}

function normalizeContext(context: ServerContext): PublicContext {
  return {
    sources: Array.isArray(context.sources) ? context.sources : [],
    verification: normalizeVerification(context.verification),
    hasPrerequisiteContext: context.hasPrerequisiteContext,
  }
}

function isStreamEvent(value: unknown): value is StreamEvent {
  if (!value || typeof value !== "object" || !("type" in value)) return false
  const type = (value as { type?: unknown }).type
  if (type === "completed") return true
  if (type === "delta") return typeof (value as { text?: unknown }).text === "string"
  if (type === "context") {
    const context = (value as { context?: unknown }).context
    return Boolean(
      context &&
        typeof context === "object" &&
        Array.isArray((context as { sources?: unknown }).sources),
    )
  }
  return type === "error"
}

function protocolError(message: string): PublicError {
  return {
    code: "INVALID_STREAM",
    message,
    isRetryable: true,
  }
}

function requestBody(request: ExplanationRequest) {
  return {
    proofId: request.selection.proofId,
    source: request.selection.source,
    location: request.selection.location,
    selectedText: request.selection.selectedText,
    mode: request.mode,
    question: request.question,
    history: request.history.slice(-6),
  }
}

async function responseError(response: Response): Promise<PublicError> {
  let payload: {
    code?: string
    message?: string
    requestId?: string
    isRetryable?: boolean
  } = {}
  try {
    payload = (await response.json()) as typeof payload
  } catch {
    // A proxy or framework may return a non-JSON error page.
  }

  return {
    code: payload.code ?? `HTTP_${response.status}`,
    message: payload.message ?? "The explanation request could not be started.",
    requestId: payload.requestId,
    isRetryable:
      payload.isRetryable ?? (response.status === 429 || response.status >= 500),
  }
}

export function createFetchExplanationTransport(
  fetchImplementation: FetchLike = fetch,
  endpoint = "/api/explain",
): ExplanationTransport {
  return {
    async run(request, callbacks, signal) {
      let didTerminate = false
      let didReceiveContext = false

      try {
        const response = await fetchImplementation(endpoint, {
          method: "POST",
          headers: {
            Accept: "text/event-stream",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody(request)),
          signal,
        })

        if (!response.ok) {
          callbacks.onError(await responseError(response))
          return
        }
        if (!response.body) {
          callbacks.onError(protocolError("The server returned an empty response stream."))
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        const consumeFrame = (frame: string) => {
          if (!frame.trim() || didTerminate) return

          const lines = frame.split(/\r?\n/)
          const declaredType = lines
            .find((line) => line.startsWith("event:"))
            ?.slice("event:".length)
            .trim()
          const data = lines
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice("data:".length).replace(/^ /, ""))
            .join("\n")

          if (!data) {
            didTerminate = true
            callbacks.onError(protocolError("The server returned an event without data."))
            return
          }

          let parsed: unknown
          try {
            parsed = JSON.parse(data)
          } catch {
            didTerminate = true
            callbacks.onError(protocolError("The server returned malformed stream data."))
            return
          }

          if (!isStreamEvent(parsed)) {
            didTerminate = true
            callbacks.onError(protocolError("The server returned an unknown stream event."))
            return
          }

          if (declaredType && declaredType !== parsed.type) {
            didTerminate = true
            callbacks.onError(protocolError("The stream event name did not match its data."))
            return
          }

          if (parsed.type === "context") {
            didReceiveContext = true
            callbacks.onContext(normalizeContext(parsed.context))
          } else if (parsed.type === "delta") {
            if (!didReceiveContext) {
              didTerminate = true
              callbacks.onError(protocolError("The stream sent text before its context."))
              return
            }
            callbacks.onDelta(parsed.text)
          } else if (parsed.type === "completed") {
            if (!didReceiveContext) {
              didTerminate = true
              callbacks.onError(protocolError("The stream completed before sending context."))
              return
            }
            didTerminate = true
            callbacks.onComplete()
          } else if (parsed.type === "error") {
            didTerminate = true
            callbacks.onError({
              code: parsed.code ?? "MODEL_ERROR",
              message: parsed.message ?? "The explanation could not be completed.",
              requestId: parsed.requestId,
              isRetryable: parsed.isRetryable ?? true,
            })
          }
        }

        while (!didTerminate) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const frames = buffer.split(/\r?\n\r?\n/)
          buffer = frames.pop() ?? ""
          frames.forEach(consumeFrame)
        }

        buffer += decoder.decode()
        if (!didTerminate && buffer.trim()) consumeFrame(buffer)
        if (!didTerminate && !signal.aborted) {
          callbacks.onError(protocolError("The explanation stream ended unexpectedly."))
        }
      } catch (error) {
        if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
          return
        }
        callbacks.onError({
          code: "NETWORK_ERROR",
          message: "The explanation service could not be reached.",
          isRetryable: true,
        })
      }
    },
  }
}
