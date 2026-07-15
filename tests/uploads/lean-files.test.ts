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

  it("rejects oversized ZIP entries while streaming them", async () => {
    const archive = zipSync({ "Huge.lean": strToU8("x".repeat(256 * 1024 + 1)) });
    await expect(readLeanUploads([new File([archive], "huge.zip")])).rejects.toThrow("larger than 256 KiB");
  });

  it("enforces actual output size when ZIP metadata under-reports it", async () => {
    const archive = zipSync({ "Huge.lean": strToU8("x".repeat(256 * 1024 + 1)) });
    const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
    for (let index = 0; index <= archive.byteLength - 4; index += 1) {
      const signature = view.getUint32(index, true);
      if (signature === 0x04034b50) view.setUint32(index + 22, 1, true);
      if (signature === 0x02014b50) view.setUint32(index + 24, 1, true);
    }

    await expect(readLeanUploads([new File([archive], "dishonest.zip")])).rejects.toThrow("larger than 256 KiB");
  });

  it("rejects truncated ZIP containers even when a local entry is complete", async () => {
    const archive = zipSync({ "Main.lean": strToU8("theorem ok : True := by trivial") });
    const centralSignature = archive.findIndex((_, index) =>
      index <= archive.byteLength - 4 &&
      new DataView(archive.buffer, archive.byteOffset, archive.byteLength).getUint32(index, true) === 0x02014b50,
    );
    const truncated = archive.subarray(0, centralSignature);

    await expect(readLeanUploads([new File([truncated], "truncated.zip")])).rejects.toThrow(
      "could not be safely extracted",
    );
  });

  it("rejects data that is not a ZIP container", async () => {
    await expect(readLeanUploads([new File(["not a zip"], "invalid.zip")])).rejects.toThrow(
      "could not be safely extracted",
    );
  });

  it("rejects local entries omitted from the central directory", async () => {
    const archive = zipSync({ "Main.lean": strToU8("theorem ok : True := by trivial") });
    const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
    let endOffset = archive.byteLength - 22;
    while (view.getUint32(endOffset, true) !== 0x06054b50) endOffset -= 1;
    const tampered = new Uint8Array(endOffset + 22);
    tampered.set(archive.subarray(0, endOffset));
    tampered.set(archive.subarray(endOffset), endOffset);
    const tamperedView = new DataView(tampered.buffer);
    tamperedView.setUint16(endOffset + 8, 0, true);
    tamperedView.setUint16(endOffset + 10, 0, true);
    tamperedView.setUint32(endOffset + 12, 0, true);
    tamperedView.setUint32(endOffset + 16, endOffset, true);

    await expect(readLeanUploads([new File([tampered], "omitted.zip")])).rejects.toThrow(
      "could not be safely extracted",
    );
  });

  it("rejects oversized individual sources", async () => {
    const content = "x".repeat(256 * 1024 + 1);
    await expect(readLeanUploads([new File([content], "Huge.lean")])).rejects.toThrow("larger than 256 KiB");
  });
});
