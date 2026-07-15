import { describe, expect, it } from "vitest";

import {
  countSorryTokens,
  declaredAxiomAudits,
  parseAxiomOutput,
  runCommand,
} from "../../scripts/verify-proof-packages";

describe("proof verification helpers", () => {
  it("ignores sorry-like words in comments and counts proof placeholders", () => {
    expect(countSorryTokens("-- sorry in prose\ntheorem t : True := by\n  sorry\n")).toBe(1);
    expect(countSorryTokens("/- admit in a block comment -/\ntheorem t : True := by trivial")).toBe(0);
  });

  it("discovers explicit axiom audit directives", () => {
    expect(declaredAxiomAudits("#print axioms first\n #print axioms Namespace.second\n")).toEqual([
      "first",
      "Namespace.second",
    ]);
  });

  it("parses positive and empty Lean axiom reports", () => {
    expect(
      parseAxiomOutput(
        "'one' depends on axioms: [propext, Classical.choice]\n" +
          "'two' does not depend on any axioms\n",
      ),
    ).toEqual([
      { declaration: "one", axioms: ["propext", "Classical.choice"] },
      { declaration: "two", axioms: [] },
    ]);
  });

  it("terminates a verification command that exceeds its deadline", async () => {
    const result = await runCommand(
      process.execPath,
      ["-e", "setInterval(() => {}, 1000)"],
      process.cwd(),
      25,
    );

    expect(result.exitCode).toBe(124);
    expect(result.output).toContain("Verification command exceeded 25 ms");
  });

  it.runIf(process.platform !== "win32")("terminates descendants that inherit command output", async () => {
    const result = await runCommand(
      process.execPath,
      [
        "-e",
        "require('node:child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: ['ignore', 'inherit', 'inherit'] }); setInterval(() => {}, 1000)",
      ],
      process.cwd(),
      25,
    );

    expect(result.exitCode).toBe(124);
    expect(result.output).toContain("Verification command exceeded 25 ms");
  });
});
