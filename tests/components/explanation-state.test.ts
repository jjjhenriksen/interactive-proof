import { describe, expect, it } from "vitest"

import {
  explanationReducer,
  initialExplanationState,
  type ExplanationRequest,
  type ExplanationState,
  type PublicContext,
} from "../../components/explanation-panel/explanation-state"
import type { SupportedSelection } from "../../components/selection-menu/selection-types"

const selection: SupportedSelection = {
  proofId: "cycle-double-cover",
  source: "paper",
  selectedText: "A target vector lies in the image of L.",
  location: { source: "paper", page: 2, blockIds: ["p2-b4"] },
  clientRect: { top: 10, right: 180, bottom: 34, left: 20 },
}

const request: ExplanationRequest = {
  selection,
  mode: "details",
  history: [],
}

const context: PublicContext = {
  sources: [{ id: "paper:p2", type: "paper", label: "Paper · p. 2", page: 2 }],
  verification: { build: "passed", revision: "abc123" },
}

function beginStreaming(state: ExplanationState = initialExplanationState) {
  const ready = explanationReducer(state, { type: "open", selection })
  const connecting = explanationReducer(ready, { type: "start", request })
  return explanationReducer(connecting, { type: "context", context })
}

describe("explanationReducer", () => {
  it("moves through ready, connecting, streaming, and complete", () => {
    let state = beginStreaming()
    expect(state.status).toBe("streaming")

    state = explanationReducer(state, { type: "delta", text: "This step " })
    state = explanationReducer(state, { type: "delta", text: "checks compatibility." })
    state = explanationReducer(state, { type: "complete" })

    expect(state.status).toBe("complete")
    if (state.status === "complete") {
      expect(state.text).toBe("This step checks compatibility.")
      expect(state.context).toEqual(context)
    }
  })

  it("prevents duplicate submissions while a request is active", () => {
    const streaming = beginStreaming()
    const otherRequest = { ...request, mode: "simpler" as const }

    expect(explanationReducer(streaming, { type: "start", request: otherRequest })).toBe(
      streaming,
    )
  })

  it("preserves the previous completed answer when a follow-up fails", () => {
    let state = beginStreaming()
    state = explanationReducer(state, { type: "delta", text: "First answer" })
    state = explanationReducer(state, { type: "complete" })
    expect(state.status).toBe("complete")

    const followUp: ExplanationRequest = {
      selection,
      mode: "question",
      question: "Why?",
      history: [{ role: "assistant", text: "First answer" }],
    }
    state = explanationReducer(state, { type: "start", request: followUp })
    state = explanationReducer(state, {
      type: "fail",
      error: {
        code: "upstream_unavailable",
        message: "The service is temporarily unavailable.",
        isRetryable: true,
      },
    })

    expect(state.status).toBe("error")
    if (state.status === "error") expect(state.previous?.text).toBe("First answer")
  })

  it("retries the exact request snapshot and ignores non-retryable errors", () => {
    let state = explanationReducer({ status: "ready", selection }, { type: "start", request })
    state = explanationReducer(state, {
      type: "fail",
      error: { code: "timeout", message: "Timed out", isRetryable: true },
    })
    const retried = explanationReducer(state, { type: "retry" })
    expect(retried.status).toBe("connecting")
    if (retried.status === "connecting") expect(retried.request).toBe(request)

    const blocked = explanationReducer(retried, {
      type: "fail",
      error: { code: "invalid", message: "Invalid selection", isRetryable: false },
    })
    expect(explanationReducer(blocked, { type: "retry" })).toBe(blocked)
  })

  it("ignores stream events that arrive outside an active stream", () => {
    const ready: ExplanationState = { status: "ready", selection }
    expect(explanationReducer(ready, { type: "delta", text: "late" })).toBe(ready)
    expect(explanationReducer(ready, { type: "complete" })).toBe(ready)
  })
})
