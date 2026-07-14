import { describe, expect, it } from "vitest";

import { uploadedExplainRequestSchema } from "../../lib/uploads/schema";

const valid = {
  paperTitle: "Example paper",
  selection: {
    source: "paper" as const,
    page: 2,
    selectedText: "a useful lemma",
    surroundingText: "Here is a useful lemma in its surrounding paragraph.",
  },
  mode: "details" as const,
  depth: "standard" as const,
  history: [],
  rightsConfirmed: true as const,
};

describe("uploaded explanation request", () => {
  it("accepts a bounded paper selection with explicit rights confirmation", () => {
    expect(uploadedExplainRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("requires rights confirmation", () => {
    expect(uploadedExplainRequestSchema.safeParse({ ...valid, rightsConfirmed: false }).success).toBe(false);
  });

  it("requires the selection to occur in its surrounding source", () => {
    expect(uploadedExplainRequestSchema.safeParse({
      ...valid,
      selection: { ...valid.selection, selectedText: "invented text" },
    }).success).toBe(false);
  });

  it("rejects unsafe Lean paths", () => {
    expect(uploadedExplainRequestSchema.safeParse({
      ...valid,
      selection: { source: "lean", file: "..\\secret.lean", selectedText: "theorem x", surroundingText: "theorem x : True := by trivial" },
    }).success).toBe(false);
  });

  it("requires a question only in question mode", () => {
    expect(uploadedExplainRequestSchema.safeParse({ ...valid, mode: "question" }).success).toBe(false);
    expect(uploadedExplainRequestSchema.safeParse({ ...valid, question: "Why?" }).success).toBe(false);
  });
});
