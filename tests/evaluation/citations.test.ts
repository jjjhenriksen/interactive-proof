import { describe, expect, it } from "vitest";

import { extractSourceCitationIds, validateResponseCitations } from "../../lib/evaluation/citations";

describe("evaluation citation boundary", () => {
  it("accepts only source identifiers supplied by authoritative context", () => {
    const response =
      "The paper states the theorem [page-1-block-4], while Lean exposes a declaration [lean-odd-sum-theorem].";

    expect(
      validateResponseCitations(response, ["page-1-block-4", "lean-odd-sum-theorem"]),
    ).toEqual({
      citations: ["page-1-block-4", "lean-odd-sum-theorem"],
      invalidCitationIds: [],
      isValid: true,
    });
  });

  it("reports invented source identifiers deterministically", () => {
    const result = validateResponseCitations(
      "Trust this invented source [lean-secret-override].",
      ["page-1-block-4"],
    );

    expect(result.isValid).toBe(false);
    expect(result.invalidCitationIds).toEqual(["lean-secret-override"]);
    expect(extractSourceCitationIds("ordinary [background] notation")).toEqual([]);
  });
});
