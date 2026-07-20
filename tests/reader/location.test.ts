import { describe, expect, it } from "vitest";

import { parseReaderLocation, serializeReaderLocation } from "../../lib/reader/location";

const index = {
  pages: [1, 2],
  mappings: [
    { id: "first-step", paperSourceId: "page-1-block-2", declarations: ["first_step"] },
  ],
};

describe("reader locations", () => {
  it("round trips paper locations", () => {
    const serialized = serializeReaderLocation({
      source: "paper", page: 1, mappingId: "first-step", blockId: "page-1-block-2",
    });
    expect(parseReaderLocation(serialized.search, serialized.hash, index)).toEqual({
      location: { source: "paper", page: 1, mappingId: "first-step", blockId: "page-1-block-2" },
      hadInvalidParameters: false,
    });
  });

  it("round trips Lean locations without source text", () => {
    const serialized = serializeReaderLocation({ source: "lean", declaration: "first_step", mappingId: "first-step" });
    expect(serialized.search).toBe("?source=lean&declaration=first_step&mapping=first-step");
    expect(parseReaderLocation(serialized.search, serialized.hash, index).location).toEqual({
      source: "lean", declaration: "first_step", mappingId: "first-step",
    });
  });

  it("rejects stale and mixed parameters", () => {
    expect(parseReaderLocation("?source=lean&declaration=missing&mapping=first-step", "", index)).toEqual({
      location: null, hadInvalidParameters: true,
    });
    expect(parseReaderLocation("?source=paper&page=99&question=private", "", index)).toEqual({
      location: null, hadInvalidParameters: true,
    });
    expect(parseReaderLocation("?question=private", "", index).hadInvalidParameters).toBe(true);
  });
});
