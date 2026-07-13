import { describe, expect, it } from "vitest"

import {
  EXPLANATION_ACTIONS,
  validateSelectedText,
} from "../../components/selection-menu/selection-types"

describe("selection action contract", () => {
  it("exposes the five PRD explanation modes in order", () => {
    expect(EXPLANATION_ACTIONS.map((action) => action.mode)).toEqual([
      "details",
      "simpler",
      "lean",
      "usage",
      "question",
    ])
  })

  it("trims valid selections", () => {
    expect(validateSelectedText("  a local proof step  ")).toEqual({
      isValid: true,
      selectedText: "a local proof step",
    })
  })

  it("rejects empty, one-character, and oversized selections", () => {
    expect(validateSelectedText(" \n ")).toEqual({ isValid: false, reason: "empty" })
    expect(validateSelectedText("x")).toEqual({
      isValid: false,
      reason: "too-short",
    })
    expect(validateSelectedText("x".repeat(1_201))).toEqual({
      isValid: false,
      reason: "too-long",
    })
  })
})
