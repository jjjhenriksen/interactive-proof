import { describe, expect, it } from "vitest";

import { parseRequestedCase } from "../../scripts/run-live-evaluations";

describe("live evaluation arguments", () => {
  it("returns an explicitly selected case", () => {
    expect(parseRequestedCase(["--confirm-live", "--case", "simpler-example"])).toBe("simpler-example");
  });

  it("rejects a missing or flag-like case value", () => {
    expect(() => parseRequestedCase(["--confirm-live", "--case"])).toThrow("requires");
    expect(() => parseRequestedCase(["--case", "--confirm-live"])).toThrow("requires");
  });

  it("rejects duplicate case flags", () => {
    expect(() => parseRequestedCase(["--case", "one", "--case", "two"])).toThrow("only once");
  });
});
