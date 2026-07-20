import { describe, expect, it } from "vitest"

import { normalizeMathDelimiters } from "../../lib/explanation/markdown"

describe("normalizeMathDelimiters", () => {
  it("converts bracket and parenthesis math emitted by models to remark-math delimiters", () => {
    expect(normalizeMathDelimiters(String.raw`Inline \((n+1)^2\) and display \[n^2 + 2n + 1\]`)).toBe(
      "Inline $(n+1)^2$ and display $$n^2 + 2n + 1$$",
    )
  })

  it("leaves ordinary Markdown untouched", () => {
    expect(normalizeMathDelimiters("### Heading\n\n- one\n- two")).toBe("### Heading\n\n- one\n- two")
  })
})
