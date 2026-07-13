import { describe, expect, it } from "vitest";

import { explainRequestSchema } from "../../lib/explanation/request-schema";

const validRequest = {
  proofId: "cycle-double-cover",
  source: "paper" as const,
  location: { source: "paper" as const, page: 2, blockIds: ["p2-b3"] },
  selectedText: "a target vector lies in the image of L",
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
        question: "Why is duality useful here?",
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
});
