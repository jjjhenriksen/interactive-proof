import { describe, expect, it } from "vitest";

import { buildUploadedExplanationContext } from "../../lib/uploads/context.server";

describe("uploaded explanation context", () => {
  it("labels reader-provided Lean as unverified and keeps mapped sources bounded", () => {
    const result = buildUploadedExplanationContext({
      paperTitle: "Reader paper",
      selection: { source: "paper", page: 1, selectedText: "main claim", surroundingText: "The main claim follows." },
      mappedLean: { file: "Main.lean", text: "theorem main_claim : True := by trivial" },
      mappingNote: "The names appear to correspond.",
      mode: "lean",
      depth: "standard",
      history: [],
      rightsConfirmed: true,
    });

    expect(result.context.verification.status).toBe("not-run");
    expect(result.context.proof.id).toBe("uploaded-session");
    expect(result.context.mappedSources).toHaveLength(1);
    expect(result.publicContext.sources).toContainEqual(expect.objectContaining({
      type: "lean",
      revision: "unverified-upload",
    }));
    expect(result.context.prerequisites[0]).toContain("provisional mapping note");
  });
});
