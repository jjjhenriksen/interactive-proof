import { describe, expect, it } from "vitest";

import { buildExplanationInstructions } from "../../lib/explanation/build-instructions.server";

describe("buildExplanationInstructions", () => {
  it("keeps the evidence and prompt-injection contract in every mode", () => {
    for (const mode of [
      "details",
      "simpler",
      "lean",
      "usage",
      "question",
    ] as const) {
      const instructions = buildExplanationInstructions(mode);

      expect(instructions).toContain("quoted data");
      expect(instructions).toContain("ALLOWED SOURCE IDS");
      expect(instructions).toContain("does not by itself prove");
    }
  });

  it("distinguishes concise and foundational depth", () => {
    expect(buildExplanationInstructions("details", "concise")).toContain(
      "at most three short paragraphs",
    );
    expect(buildExplanationInstructions("details", "foundational")).toContain(
      "make implicit intermediate steps explicit",
    );
  });
});
