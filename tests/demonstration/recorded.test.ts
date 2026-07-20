import { describe, expect, it } from "vitest";
import fixtureFile from "../../proofs/odd-sum-square/recorded-explanations.json";
import manifest from "../../proofs/odd-sum-square/proof.json";
import { RecordedFileSchema, recordedFingerprint } from "../../lib/demonstration/schema";

describe("recorded explanations", () => {
  it("validates and has stable current fingerprints", () => {
    const parsed = RecordedFileSchema.parse(fixtureFile);
    expect(parsed.fixtures).toHaveLength(2);
    for (const fixture of parsed.fixtures) expect(recordedFingerprint(fixture, manifest.lean.revision)).toBe(fixture.requestFingerprint);
  });
  it("marks changed selections and revisions stale", () => {
    const fixture = RecordedFileSchema.parse(fixtureFile).fixtures[0];
    expect(recordedFingerprint({ ...fixture, selection: { ...fixture.selection, selectedText: `${fixture.selection.selectedText} changed` } }, manifest.lean.revision)).not.toBe(fixture.requestFingerprint);
    expect(recordedFingerprint(fixture, "different-revision")).not.toBe(fixture.requestFingerprint);
  });
});
