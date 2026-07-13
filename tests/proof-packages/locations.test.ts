import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolvePackagePath, UnsafePackagePathError } from "../../lib/proof-packages/locations";

describe("resolvePackagePath", () => {
  const root = path.resolve("proofs/cycle-double-cover");

  it("resolves a normal package-relative path", () => {
    expect(resolvePackagePath(root, "lean/Main.lean")).toBe(path.join(root, "lean/Main.lean"));
  });

  it.each(["../secret", "lean/../../secret", "/etc/passwd", "lean\\Main.lean", "lean//Main.lean"])(
    "rejects unsafe path %s",
    (unsafe) => expect(() => resolvePackagePath(root, unsafe)).toThrow(UnsafePackagePathError),
  );
});
