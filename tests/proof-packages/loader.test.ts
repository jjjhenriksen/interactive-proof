import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadProofPackageFromDirectory } from "../../lib/proof-packages/load-package.server";
import { loadProofPackage } from "../../lib/proof-packages/registry.server";
import { verificationStatus } from "../../lib/verification/audit";

describe("proof-package loader", () => {
  it("validates assets, mappings, lines, and the PDF digest", async () => {
    const loaded = await loadProofPackageFromDirectory(path.resolve("proofs/cycle-double-cover"));
    expect(loaded.paperPages.pdfSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(loaded.manifest.mappings).toHaveLength(7);
    expect(verificationStatus(loaded.manifest, loaded.verification)).toBe("not-run");
  });

  it("does not turn unknown ids into filesystem paths", async () => {
    await expect(loadProofPackage("../../cycle-double-cover")).resolves.toBeNull();
  });
});
