import { describe, expect, it } from "vitest"

import { formatDate } from "../lib/format-date"

describe("formatDate", () => {
  it("formats persisted timestamps in UTC for stable hydration", () => {
    expect(formatDate("2026-07-14T00:00:00.000Z")).toBe("7/14/2026")
  })
})
