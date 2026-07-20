import { describe, expect, it } from "vitest";

import proof from "../../proofs/odd-sum-square/proof.json";
import pages from "../../proofs/odd-sum-square/paper.pages.json";
import verification from "../../proofs/odd-sum-square/verification.json";
import { PaperPagesSchema } from "../../lib/proof-packages/paper-pages-schema";
import { ProofPackageSchema } from "../../lib/proof-packages/schema";
import { VerificationRecordSchema } from "../../lib/verification/schema";

describe("proof-package schemas", () => {
  it("accepts the authored odd-sum-square data", () => {
    expect(ProofPackageSchema.parse(proof).id).toBe("odd-sum-square");
    expect(PaperPagesSchema.parse(pages).pages).toHaveLength(1);
    expect(VerificationRecordSchema.parse(verification).build).toBe("passed");
  });

  it("rejects parent-directory asset paths", () => {
    expect(() =>
      ProofPackageSchema.parse({
        ...proof,
        paper: { ...proof.paper, pdf: "../outside.pdf" },
      }),
    ).toThrow();
  });

  it("rejects a passed build without a zero exit code", () => {
    expect(() => VerificationRecordSchema.parse({ ...verification, build: "passed", exitCode: null })).toThrow();
  });

  it("accepts a policy failure when the Lean command itself exited zero", () => {
    expect(
      VerificationRecordSchema.parse({ ...verification, build: "failed", exitCode: 0 }).build,
    ).toBe("failed");
  });
});
