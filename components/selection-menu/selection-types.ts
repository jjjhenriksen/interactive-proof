export type PaperSelectionLocation = {
  source: "paper"
  page: number
  blockIds: string[]
}

export type LeanSelectionLocation = {
  source: "lean"
  file: string
  declaration: string
  startLine: number
  endLine: number
}

export type GuideSelectionLocation = {
  source: "guide"
  section: string
}

export type SelectionLocation =
  | PaperSelectionLocation
  | LeanSelectionLocation
  | GuideSelectionLocation

/** A serializable snapshot of a selection supported by the proof reader. */
export type SupportedSelection = {
  proofId: string
  source: "paper" | "lean" | "guide"
  selectedText: string
  location: SelectionLocation
  clientRect: {
    top: number
    left: number
    right: number
    bottom: number
  }
}

export const EXPLANATION_ACTIONS = [
  { mode: "details", label: "More details", shortLabel: "Details" },
  { mode: "simpler", label: "Explain more simply", shortLabel: "Simpler" },
  { mode: "lean", label: "Connect to Lean", shortLabel: "Lean" },
  { mode: "usage", label: "Where is this used?", shortLabel: "Usage" },
  { mode: "question", label: "Ask in side chat", shortLabel: "Ask" },
] as const

export type ExplanationMode = (typeof EXPLANATION_ACTIONS)[number]["mode"]

export const MIN_SELECTION_LENGTH = 2
export const MAX_SELECTION_LENGTH = 1_200

export type SelectionValidation =
  | { isValid: true; selectedText: string }
  | { isValid: false; reason: "empty" | "too-short" | "too-long" }

export function validateSelectedText(value: string): SelectionValidation {
  const selectedText = value.trim()

  if (selectedText.length === 0) return { isValid: false, reason: "empty" }
  if (selectedText.length < MIN_SELECTION_LENGTH) {
    return { isValid: false, reason: "too-short" }
  }
  if (selectedText.length > MAX_SELECTION_LENGTH) {
    return { isValid: false, reason: "too-long" }
  }

  return { isValid: true, selectedText }
}
