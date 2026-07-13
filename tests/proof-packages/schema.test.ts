import { describe, expect, it } from "vitest";

import proof from "../../proofs/cycle-double-cover/proof.json";
import pages from "../../proofs/cycle-double-cover/paper.pages.json";
import verification from "../../proofs/cycle-double-cover/verification.json";
import { PaperPagesSchema } from "../../lib/proof-packages/paper-pages-schema";
import { ProofPackageSchema } from "../../lib/proof-packages/schema";
import { VerificationRecordSchema } from "../../lib/verification/schema";

describe("proof-package schemas", () => {
  it("accepts the cycle double cover data", () => {
    expect(ProofPackageSchema.parse(proof).id).toBe("cycle-double-cover");
    expect(PaperPagesSchema.parse(pages).pages).toHaveLength(3);
    expect(VerificationRecordSchema.parse(verification).build).toBe("not-run");
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
});
