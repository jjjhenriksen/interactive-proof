import { zipSync, strToU8 } from "fflate";
import { describe, expect, it } from "vitest";

import { readLeanUploads } from "../../lib/uploads/lean-files";

describe("Lean upload reader", () => {
  it("reads direct Lean files", async () => {
    const result = await readLeanUploads([new File(["theorem ok : True := by trivial"], "Main.lean")]);
    expect(result).toEqual([expect.objectContaining({ path: "Main.lean" })]);
  });

  it("extracts only Lean sources from ZIP archives", async () => {
    const archive = zipSync({
      "Proof/Main.lean": strToU8("theorem ok : True := by trivial"),
      "README.md": strToU8("notes"),
    });
    const result = await readLeanUploads([new File([archive], "proof.zip")]);
    expect(result.map((file) => file.path)).toEqual(["Proof/Main.lean"]);
  });

  it("rejects traversal paths in ZIP archives", async () => {
    const archive = zipSync({ "../Escape.lean": strToU8("theorem x : True := by trivial") });
    await expect(readLeanUploads([new File([archive], "bad.zip")])).rejects.toThrow("Unsafe Lean file path");
  });

  it("rejects oversized ZIP entries before expanding them", async () => {
    const archive = zipSync({ "Huge.lean": strToU8("x".repeat(256 * 1024 + 1)) });
    await expect(readLeanUploads([new File([archive], "huge.zip")])).rejects.toThrow("larger than 256 KiB");
  });

  it("rejects oversized individual sources", async () => {
    const content = "x".repeat(256 * 1024 + 1);
    await expect(readLeanUploads([new File([content], "Huge.lean")])).rejects.toThrow("larger than 256 KiB");
  });
});
