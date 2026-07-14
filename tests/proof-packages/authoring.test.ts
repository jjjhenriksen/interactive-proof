import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { assertProofId, buildAuthoringReport, scaffoldProofPackage } from "../../lib/proof-packages/authoring";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("proof package authoring", () => {
  it("rejects traversal and invalid ids", () => {
    expect(() => assertProofId("../escape")).toThrow(/kebab-case/);
    expect(() => assertProofId("Uppercase")).toThrow(/kebab-case/);
  });

  it("scaffolds atomically and never overwrites", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "proof-authoring-")); roots.push(root);
    const destination = await scaffoldProofPackage(root, "sample-proof", "Sample Proof");
    expect(await readFile(path.join(destination, "AUTHORING.md"), "utf8")).toContain("never generated");
    await expect(scaffoldProofPackage(root, "sample-proof")).rejects.toThrow("already exists");
  });

  it("never calls review-required material release ready", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "proof-authoring-")); roots.push(root);
    await scaffoldProofPackage(root, "sample-proof");
    const report = await buildAuthoringReport(root, "sample-proof");
    expect(report.rightsStatus).toBe("review-required");
    expect(report.releaseReady).toBe(false);
    expect(report.errors.map((item) => item.code)).toContain("RIGHTS");
  });
});
