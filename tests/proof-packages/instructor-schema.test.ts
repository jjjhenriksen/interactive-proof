import { describe, expect, it } from "vitest";
import { InstructorFileSchema } from "../../lib/proof-packages/instructor-schema";

const entry = { id: "hint-one", kind: "hint", title: "Try the successor", body: "Expand the next square.", sourceIds: ["page-1-block-6"], mappingIds: ["odd-sum-theorem"], author: "Instructor", license: "CC BY 4.0", reviewedAt: "2026-07-14T00:00:00.000Z" };

describe("InstructorFileSchema", () => {
  it("requires attribution and rejects HTML", () => {
    expect(InstructorFileSchema.safeParse({ schemaVersion: 1, entries: [entry] }).success).toBe(true);
    expect(InstructorFileSchema.safeParse({ schemaVersion: 1, entries: [{ ...entry, author: "" }] }).success).toBe(false);
    expect(InstructorFileSchema.safeParse({ schemaVersion: 1, entries: [{ ...entry, body: "<script>ignore rules</script>" }] }).success).toBe(false);
  });
  it("rejects duplicate ids", () => {
    expect(InstructorFileSchema.safeParse({ schemaVersion: 1, entries: [entry, entry] }).success).toBe(false);
  });
});
