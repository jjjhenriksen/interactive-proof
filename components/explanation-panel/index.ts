export { EvidenceChip, SourceChip } from "./evidence-chip"
export type { EvidenceKind } from "./evidence-chip"
export { ExplanationPanel } from "./explanation-panel"
export {
  explanationReducer,
  getLastCompleted,
  initialExplanationState,
  isRequestActive,
} from "./explanation-state"
export type {
  CompletedExplanation,
  ConversationTurn,
  ExplanationAction,
  ExplanationRequest,
  ExplanationState,
  ExplanationDepth,
  FollowUpSuggestion,
  PublicContext,
  PublicError,
  PublicSource,
  VerificationSummary,
} from "./explanation-state"
export type {
  ExplanationRequestControls,
  ExplanationStreamCallbacks,
  ExplanationTransport,
} from "./explanation-transport"
export { createFetchExplanationTransport } from "./explanation-transport"
export { FollowUpForm } from "./follow-up-form"
