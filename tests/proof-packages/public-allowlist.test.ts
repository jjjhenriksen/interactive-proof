import { describe, expect, it } from "vitest";

import { parsePublicProofIds } from "../../lib/proof-packages/public-allowlist";

const KNOWN_IDS = ["cycle-double-cover", "odd-sum-square"] as const;

describe("parsePublicProofIds", () => {
  it("includes every package when no local allowlist is set", () => {
    expect(parsePublicProofIds(undefined, KNOWN_IDS)).toEqual(KNOWN_IDS);
  });

  it("accepts an explicit subset and preserves its order", () => {
    expect(parsePublicProofIds(" odd-sum-square ", KNOWN_IDS)).toEqual([
      "odd-sum-square",
    ]);
  });

  it("rejects unknown ids", () => {
    expect(() => parsePublicProofIds("unknown-proof", KNOWN_IDS)).toThrow(
      "unknown id: unknown-proof",
    );
  });

  it("rejects duplicate ids", () => {
    expect(() =>
      parsePublicProofIds("odd-sum-square,odd-sum-square", KNOWN_IDS),
    ).toThrow("duplicate id: odd-sum-square");
  });

  it.each(["", "   ", "odd-sum-square,"])("rejects empty public sets: %j", (value) => {
    expect(() => parsePublicProofIds(value, KNOWN_IDS)).toThrow(
      "must contain at least one proof id",
    );
  });
});
