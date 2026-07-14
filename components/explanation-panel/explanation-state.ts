import type {
  ExplanationMode,
  SupportedSelection,
} from "../selection-menu/selection-types"

export type PublicSource =
  | { id: string; type: "paper"; label: string; page: number }
  | {
      id: string
      type: "lean"
      label: string
      file: string
      declaration: string
      revision: string
    }
  | { id: string; type: "guide"; label: string; section: string }

export type VerificationSummary = {
  build: "passed" | "failed" | "not-run"
  revision?: string
  checkedAt?: string
  sorryCount?: number | null
}

export type PublicContext = {
  sources: PublicSource[]
  verification?: VerificationSummary
  hasPrerequisiteContext?: boolean
  curated?: Array<{ kind: "glossary" | "prerequisite"; label: string; explanation: string }>
}

export type ExplanationDepth = "concise" | "standard" | "foundational"
export type FollowUpSuggestion = { id: string; label: string; question: string; sourceIds: string[] }

export type ConversationTurn = {
  role: "user" | "assistant"
  text: string
}

export type ExplanationRequest = {
  selection: SupportedSelection
  mode: ExplanationMode
  question?: string
  history: ConversationTurn[]
  depth?: ExplanationDepth
  instructorEntryIds?: string[]
}

export type PublicError = {
  code: string
  message: string
  requestId?: string
  isRetryable: boolean
}

export type CompletedExplanation = {
  selection: SupportedSelection
  request: ExplanationRequest
  context: PublicContext
  text: string
  history: ConversationTurn[]
  suggestions?: FollowUpSuggestion[]
}

type ActiveRequestState = {
  selection: SupportedSelection
  request: ExplanationRequest
  previous?: CompletedExplanation
}

export type ExplanationState =
  | { status: "closed" }
  | { status: "ready"; selection: SupportedSelection }
  | ({ status: "connecting" } & ActiveRequestState)
  | ({ status: "streaming"; context: PublicContext; text: string } & ActiveRequestState)
  | ({ status: "complete" } & CompletedExplanation)
  | {
      status: "error"
      selection: SupportedSelection
      request: ExplanationRequest
      previous?: CompletedExplanation
      error: PublicError
    }

export type ExplanationAction =
  | { type: "open"; selection: SupportedSelection }
  | { type: "close" }
  | { type: "start"; request: ExplanationRequest }
  | { type: "context"; context: PublicContext }
  | { type: "delta"; text: string }
  | { type: "complete"; history?: ConversationTurn[]; suggestions?: FollowUpSuggestion[] }
  | { type: "fail"; error: PublicError }
  | { type: "cancel" }
  | { type: "retry" }

export const initialExplanationState: ExplanationState = { status: "closed" }

export function getLastCompleted(
  state: ExplanationState,
): CompletedExplanation | undefined {
  if (state.status === "complete") return state
  if (
    state.status === "connecting" ||
    state.status === "streaming" ||
    state.status === "error"
  ) {
    return state.previous
  }
  return undefined
}

export function explanationReducer(
  state: ExplanationState,
  action: ExplanationAction,
): ExplanationState {
  switch (action.type) {
    case "open":
      return { status: "ready", selection: action.selection }
    case "close":
      return initialExplanationState
    case "start": {
      if (state.status === "connecting" || state.status === "streaming") return state
      return {
        status: "connecting",
        selection: action.request.selection,
        request: action.request,
        previous: getLastCompleted(state),
      }
    }
    case "context":
      if (state.status !== "connecting") return state
      return { ...state, status: "streaming", context: action.context, text: "" }
    case "delta":
      if (state.status !== "streaming") return state
      return { ...state, text: state.text + action.text }
    case "complete":
      if (state.status !== "streaming") return state
      const completedHistory =
        action.history ??
        [
          ...state.request.history,
          ...(state.request.question
            ? ([{ role: "user", text: state.request.question }] as const)
            : []),
          { role: "assistant", text: state.text } as const,
        ].slice(-6)
      return {
        status: "complete",
        selection: state.selection,
        request: state.request,
        context: state.context,
        text: state.text,
        history: completedHistory,
        suggestions: action.suggestions ?? [],
      }
    case "fail":
      if (state.status !== "connecting" && state.status !== "streaming") return state
      return {
        status: "error",
        selection: state.selection,
        request: state.request,
        previous: state.previous,
        error: action.error,
      }
    case "cancel":
      if (state.status !== "connecting" && state.status !== "streaming") return state
      return state.previous
        ? { status: "complete", ...state.previous }
        : { status: "ready", selection: state.selection }
    case "retry":
      if (state.status !== "error" || !state.error.isRetryable) return state
      return {
        status: "connecting",
        selection: state.selection,
        request: state.request,
        previous: state.previous,
      }
  }
}

export function isRequestActive(state: ExplanationState): boolean {
  return state.status === "connecting" || state.status === "streaming"
}
