import { zipSync, strToU8 } from "fflate";
import { describe, expect, it, vi } from "vitest";

import { readLeanUploads } from "../../lib/uploads/lean-files";
import { UPLOAD_LIMITS } from "../../lib/uploads/schema";

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
    const file = new File([content], "Huge.lean");
    const read = vi.spyOn(file, "arrayBuffer");
    await expect(readLeanUploads([file])).rejects.toThrow("larger than 256 KiB");
    expect(read).not.toHaveBeenCalled();
  });

  it("does not read the direct file that would exceed the aggregate byte limit", async () => {
    const files = Array.from({ length: 5 }, (_, index) => new File(["x".repeat(256 * 1024)], `${index}.lean`));
    const read = vi.spyOn(files[4], "arrayBuffer");
    await expect(readLeanUploads(files)).rejects.toThrow("larger than 1 MiB");
    expect(read).not.toHaveBeenCalled();
  });

  it("does not read the direct file that would exceed the file count", async () => {
    const files = Array.from({ length: UPLOAD_LIMITS.leanFiles + 1 }, (_, index) => new File(["theorem x : True := by trivial"], `${index}.lean`));
    const read = vi.spyOn(files.at(-1)!, "arrayBuffer");
    await expect(readLeanUploads(files)).rejects.toThrow("Choose at most");
    expect(read).not.toHaveBeenCalled();
  });

  it("counts extracted archive bytes before reading a subsequent direct file", async () => {
    const archive = zipSync(Object.fromEntries(Array.from({ length: 4 }, (_, index) => [`${index}.lean`, strToU8("x".repeat(256 * 1024))])));
    const direct = new File(["theorem ok : True := by trivial"], "Main.lean");
    const read = vi.spyOn(direct, "arrayBuffer");
    await expect(readLeanUploads([new File([archive], "proof.zip"), direct])).rejects.toThrow("larger than 1 MiB");
    expect(read).not.toHaveBeenCalled();
  });

  it("accepts reversed central-directory order without changing local-file order", async () => {
    const archive = zipSync({ "First.lean": strToU8("theorem first : True := by trivial"), "Second.lean": strToU8("theorem second : True := by trivial") });
    const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
    const end = archive.byteLength - 22;
    const start = view.getUint32(end + 16, true);
    const firstLength = 46 + view.getUint16(start + 28, true) + view.getUint16(start + 30, true) + view.getUint16(start + 32, true);
    const first = archive.slice(start, start + firstLength);
    const second = archive.slice(start + firstLength, end);
    archive.set(second, start);
    archive.set(first, start + second.length);
    const result = await readLeanUploads([new File([archive], "reordered.zip")]);
    expect(result.map(({ path, text }) => ({ path, text }))).toEqual([
      { path: "First.lean", text: "theorem first : True := by trivial" },
      { path: "Second.lean", text: "theorem second : True := by trivial" },
    ]);
  });

  it("rejects duplicate local offsets in the central directory", async () => {
    const archive = zipSync({ "First.lean": strToU8("one"), "Second.lean": strToU8("two") });
    const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
    const start = view.getUint32(archive.byteLength - 22 + 16, true);
    const second = start + 46 + view.getUint16(start + 28, true) + view.getUint16(start + 30, true);
    view.setUint32(second + 42, view.getUint32(start + 42, true), true);
    await expect(readLeanUploads([new File([archive], "mismatched.zip")])).rejects.toThrow("could not be safely extracted");
  });
});
