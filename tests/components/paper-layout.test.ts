import { describe, expect, it } from "vitest"

import {
  fitPageToWidth,
  normalizePaperText,
  resolvePageBlockIds,
} from "../../components/paper-reader/paper-layout"

describe("paper page layout", () => {
  it("fits a page to its container without changing its aspect ratio", () => {
    expect(fitPageToWidth(612, 792, 306)).toEqual({
      width: 306,
      height: 396,
      scale: 0.5,
    })
  })

  it("caps large pages at the reader maximum width", () => {
    const fitted = fitPageToWidth(612, 792, 1_400)
    expect(fitted.width).toBe(896)
    expect(fitted.height / fitted.width).toBeCloseTo(792 / 612)
  })

  it("keeps mobile paper text readable inside a narrower scroll viewport", () => {
    const fitted = fitPageToWidth(612, 792, 304, 896, 560)
    expect(fitted.width).toBe(560)
    expect(fitted.height / fitted.width).toBeCloseTo(792 / 612)
  })
})

describe("paper selection mapping", () => {
  const blocks = [
    { id: "heading", text: "1. Introduction" },
    { id: "paragraph", text: "A cycle double cover uses every edge exactly twice." },
    { id: "next", text: "Theorem 1.1. Every bridgeless graph has such a cover." },
  ]

  it("normalizes PDF whitespace while preserving mathematical content", () => {
    expect(normalizePaperText("  Every\n edge\u00ad  exactly twice. ")).toBe(
      "Every edge exactly twice.",
    )
  })

  it("keeps a section heading independently mapped from its body", () => {
    expect(resolvePageBlockIds("1. Introduction", blocks)).toEqual(["heading"])
  })

  it("returns every committed block crossed by a selection", () => {
    expect(
      resolvePageBlockIds(
        "edge exactly twice. Theorem 1.1. Every bridgeless graph",
        blocks,
      ),
    ).toEqual(["paragraph", "next"])
  })

  it("returns no invented block when extracted PDF text cannot be matched", () => {
    expect(resolvePageBlockIds("unrelated source text", blocks)).toEqual([])
  })
})
