import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadProofPackageFromDirectory } from "../../lib/proof-packages/load-package.server";
import { listProofIds, loadProofPackage } from "../../lib/proof-packages/registry.server";
import { verificationStatus } from "../../lib/verification/audit";

describe("proof package", () => {
  it("is discoverable through the shared registry and loader", async () => {
    expect(listProofIds()).toEqual(["odd-sum-square"]);

    const loaded = await loadProofPackage("odd-sum-square");
    expect(loaded?.manifest.shortTitle).toBe("Odd Numbers Build Squares");
    expect(loaded && verificationStatus(loaded.manifest, loaded.verification)).toBe("verified");
  });

  it("keeps authored headings separate from their body blocks", async () => {
    const loaded = await loadProofPackageFromDirectory(path.resolve("proofs/odd-sum-square"));
    const blocks = loaded.paperPages.pages[0].blocks;

    expect(blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "heading", text: "PROOF BY INDUCTION" }),
        expect.objectContaining({
          kind: "body",
          text: expect.stringContaining("The next odd number is 2n + 1"),
        }),
      ]),
    );
    expect(blocks.find(({ kind }) => kind === "heading")?.text).not.toContain("Write Sn");
  });

  it("records an explicit CC BY 4.0 license", async () => {
    const loaded = await loadProofPackage("odd-sum-square");
    expect(loaded?.manifest.paper.license).toMatchObject({
      status: "cleared",
      name: "Creative Commons Attribution 4.0 International",
      url: "https://creativecommons.org/licenses/by/4.0/",
    });
  });
});
