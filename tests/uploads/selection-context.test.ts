import { describe, expect, it } from "vitest";
import { selectionContext } from "../../lib/uploads/selection-context";
import { uploadedExplainRequestSchema } from "../../lib/uploads/schema";

describe("uploaded selection context", () => {
  it("includes a passage beyond the old prefix cutoff with neighboring definitions", () => {
    const source = "opening context. ".repeat(1_000) + "nearby definition\ntheorem late_claim : True := by trivial\nfollowing lemma" + "later material. ".repeat(1_000);
    const surroundingText = selectionContext(source, "theorem late_claim : True");
    expect(surroundingText).toContain("nearby definition\ntheorem late_claim : True := by trivial\nfollowing lemma");
    expect(surroundingText!.length).toBeLessThanOrEqual(12_000);
    expect(uploadedExplainRequestSchema.safeParse({ paperTitle: "Paper", selection: { source: "lean", file: "Main.lean", selectedText: "theorem late_claim : True", surroundingText }, mode: "details", rightsConfirmed: true }).success).toBe(true);
  });

  it("preserves formatting while matching normalized browser selection whitespace", () => {
    expect(selectionContext("before\ntheorem\n\tclaim (n : Nat) : n = n := by rfl\nafter", "theorem claim (n : Nat) : n = n")).toContain("theorem\n\tclaim");
  });

  it("uses source offsets to disambiguate a repeated passage", () => {
    const source = "first region\ntheorem same\n" + "padding. ".repeat(2_000) + "second region\ntheorem same\nend";
    const selectedOffset = source.lastIndexOf("theorem same");
    expect(selectionContext(source, "theorem same", selectedOffset)).toContain("second region");
    expect(selectionContext(source, "theorem same", selectedOffset)).not.toContain("first region");
    expect(selectionContext(source, "theorem same", selectedOffset - 1)).toContain("second region");
    expect(selectionContext(source, "theorem same")).toContain("first region");
    expect(selectionContext(source, "theorem same", 3)).toContain("first region");
  });

  it("fills the available context budget at either end", () => {
    const source = "start passage\n" + "padding. ".repeat(2_000) + "\nend passage";
    expect(selectionContext(source, "start passage")).toBe(source.slice(0, 12_000));
    expect(selectionContext(source, "end passage")).toBe(source.slice(-12_000));
  });

  it("does not make up context for a foreign or empty selection", () => {
    expect(selectionContext("theorem actual", "something else")).toBeNull();
    expect(selectionContext("theorem actual", "  ")).toBeNull();
  });

  it("bounds pathological whitespace without truncating the normalized selection", () => {
    expect(selectionContext("theorem" + " ".repeat(15_000) + "claim", "theorem claim")).toBe("theorem claim");
  });
});
