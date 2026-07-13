import type {
  ExplanationRequest,
  PublicContext,
  PublicError,
} from "./explanation-state"

export type ExplanationStreamCallbacks = {
  onContext: (context: PublicContext) => void
  onDelta: (text: string) => void
  onComplete: () => void
  onError: (error: PublicError) => void
}

/**
 * Injectable boundary for the eventual SSE client. Components never depend on
 * a fetch implementation, which also makes captured demo responses trivial.
 */
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
