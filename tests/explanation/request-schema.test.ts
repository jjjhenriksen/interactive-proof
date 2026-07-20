import { describe, expect, it } from "vitest";

import { explainRequestSchema } from "../../lib/explanation/request-schema";

const validRequest = {
  proofId: "odd-sum-square",
  source: "paper" as const,
  location: { source: "paper" as const, page: 1, blockIds: ["page-1-block-6"] },
  selectedText: "The next odd number is 2n + 1",
  mode: "details" as const,
  history: [],
};

describe("explainRequestSchema", () => {
  it("accepts a bounded paper selection", () => {
    expect(explainRequestSchema.parse(validRequest)).toMatchObject(validRequest);
  });

  it("rejects a source and location mismatch", () => {
    const result = explainRequestSchema.safeParse({
      ...validRequest,
      source: "lean",
    });

    expect(result.success).toBe(false);
  });

  it("requires a question only in question mode", () => {
    expect(
      explainRequestSchema.safeParse({ ...validRequest, mode: "question" }).success,
    ).toBe(false);
    expect(
      explainRequestSchema.safeParse({
        ...validRequest,
        mode: "question",
        question: "Why is induction useful here?",
      }).success,
    ).toBe(true);
  });

  it("rejects an inverted Lean line range", () => {
    const result = explainRequestSchema.safeParse({
      ...validRequest,
      source: "lean",
      location: {
        source: "lean",
        file: "Main.lean",
        declaration: "main_theorem",
        startLine: 20,
        endLine: 10,
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects conversation history above the combined character budget", () => {
    const result = explainRequestSchema.safeParse({
      ...validRequest,
      history: [
        { role: "user", text: "a".repeat(4_000) },
        { role: "assistant", text: "b".repeat(4_000) },
        { role: "user", text: "c".repeat(4_000) },
        { role: "assistant", text: "d" },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ["history"] })]),
      );
    }
  });
});
