import { strFromU8, Unzip, UnzipInflate } from "fflate";

import { UPLOAD_LIMITS } from "./schema";

export type UploadedLeanFile = {
  path: string;
  text: string;
  bytes: number;
};

const ARCHIVE_INPUT_CHUNK_BYTES = 4 * 1024;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_FILE_HEADER = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const MAX_ZIP_COMMENT_BYTES = 65_535;

function invalidZip(): never {
  throw new Error("The ZIP archive could not be safely extracted.");
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

function validateZipContainer(data: Uint8Array): string[] {
  if (data.byteLength < 22) invalidZip();
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const searchStart = Math.max(0, data.byteLength - 22 - MAX_ZIP_COMMENT_BYTES);
  let endOffset = -1;
  for (let offset = data.byteLength - 22; offset >= searchStart; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) {
      const commentLength = view.getUint16(offset + 20, true);
      if (offset + 22 + commentLength === data.byteLength) {
        endOffset = offset;
        break;
      }
    }
  }
  if (endOffset < 0) invalidZip();

  const disk = view.getUint16(endOffset + 4, true);
  const centralDisk = view.getUint16(endOffset + 6, true);
  const diskEntries = view.getUint16(endOffset + 8, true);
  const totalEntries = view.getUint16(endOffset + 10, true);
  const centralSize = view.getUint32(endOffset + 12, true);
  const centralOffset = view.getUint32(endOffset + 16, true);
  if (
    disk !== 0 ||
    centralDisk !== 0 ||
    diskEntries !== totalEntries ||
    totalEntries === 0xffff ||
    centralSize === 0xffffffff ||
    centralOffset === 0xffffffff ||
    centralOffset + centralSize !== endOffset
  ) invalidZip();

  let cursor = centralOffset;
  const entryNames: string[] = [];
  for (let entry = 0; entry < totalEntries; entry += 1) {
    if (cursor + 46 > endOffset || view.getUint32(cursor, true) !== CENTRAL_DIRECTORY_FILE_HEADER) {
      invalidZip();
    }
    const flags = view.getUint16(cursor + 8, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const originalSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const startDisk = view.getUint16(cursor + 34, true);
    const localOffset = view.getUint32(cursor + 42, true);
    if (
      (flags & 1) !== 0 ||
      startDisk !== 0 ||
      compressedSize === 0xffffffff ||
      originalSize === 0xffffffff ||
      localOffset === 0xffffffff ||
      localOffset + 30 > centralOffset ||
      view.getUint32(localOffset, true) !== LOCAL_FILE_HEADER
    ) invalidZip();
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const centralName = data.subarray(cursor + 46, cursor + 46 + nameLength);
    const localName = data.subarray(localOffset + 30, localOffset + 30 + localNameLength);
    if (
      dataOffset + compressedSize > centralOffset ||
      localNameLength !== nameLength ||
      !equalBytes(localName, centralName)
    ) invalidZip();
    entryNames.push(strFromU8(centralName, (flags & 0x0800) === 0));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (cursor !== endOffset) invalidZip();
  return entryNames;
}

function safeLeanPath(path: string): boolean {
  return (
    path.endsWith(".lean") &&
    !path.startsWith("/") &&
    !path.startsWith("\\") &&
    !path.includes("\\") &&
    !path.split("/").includes("..")
  );
}

function decodeLean(path: string, data: Uint8Array): UploadedLeanFile {
  if (!safeLeanPath(path)) throw new Error(`Unsafe Lean file path: ${path}`);
  if (data.byteLength > UPLOAD_LIMITS.leanFileBytes) {
    throw new Error(`${path} is larger than 256 KiB.`);
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    throw new Error(`${path} is not valid UTF-8 text.`);
  }
  if (!text.trim()) throw new Error(`${path} is empty.`);
  return { path, text, bytes: data.byteLength };
}

function validateCollection(files: UploadedLeanFile[]): UploadedLeanFile[] {
  if (files.length === 0) throw new Error("No .lean files were found.");
  if (files.length > UPLOAD_LIMITS.leanFiles) {
    throw new Error(`Choose at most ${UPLOAD_LIMITS.leanFiles} Lean files.`);
  }
  const total = files.reduce((sum, file) => sum + file.bytes, 0);
  if (total > UPLOAD_LIMITS.leanTotalBytes) {
    throw new Error("The extracted Lean sources are larger than 1 MiB in total.");
  }
  const paths = new Set<string>();
  for (const file of files) {
    if (paths.has(file.path)) throw new Error(`Duplicate Lean file path: ${file.path}`);
    paths.add(file.path);
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function joinChunks(chunks: Uint8Array[], byteLength: number): Uint8Array {
  const joined = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return joined;
}

function readLeanArchive(data: Uint8Array, existing: UploadedLeanFile[]): UploadedLeanFile[] {
  const validatedEntryNames = validateZipContainer(data);
  const extracted: UploadedLeanFile[] = [];
  const existingBytes = existing.reduce((sum, source) => sum + source.bytes, 0);
  let archiveBytes = 0;
  let archiveFiles = 0;
  let streamedEntries = 0;
  let failure: Error | null = null;

  const unzip = new Unzip((file) => {
    if (file.name !== validatedEntryNames[streamedEntries]) {
      failure = new Error("The ZIP archive could not be safely extracted.");
      return;
    }
    streamedEntries += 1;
    if (failure || !file.name.toLowerCase().endsWith(".lean")) return;
    if (!safeLeanPath(file.name)) {
      failure = new Error(`Unsafe Lean file path: ${file.name}`);
      return;
    }
    archiveFiles += 1;
    if (existing.length + archiveFiles > UPLOAD_LIMITS.leanFiles) {
      failure = new Error(`Choose at most ${UPLOAD_LIMITS.leanFiles} Lean files.`);
      return;
    }

    const chunks: Uint8Array[] = [];
    let fileBytes = 0;
    file.ondata = (error, chunk, final) => {
      if (failure) return;
      if (error) {
        failure = error;
        return;
      }
      fileBytes += chunk.byteLength;
      archiveBytes += chunk.byteLength;
      if (fileBytes > UPLOAD_LIMITS.leanFileBytes) {
        failure = new Error(`${file.name} is larger than 256 KiB.`);
        file.terminate();
        return;
      }
      if (existingBytes + archiveBytes > UPLOAD_LIMITS.leanTotalBytes) {
        failure = new Error("The extracted Lean sources are larger than 1 MiB in total.");
        file.terminate();
        return;
      }
      chunks.push(chunk);
      if (final) extracted.push(decodeLean(file.name, joinChunks(chunks, fileBytes)));
    };
    try {
      file.start();
    } catch (error) {
      failure = error instanceof Error ? error : new Error(`Could not extract ${file.name}.`);
    }
  });
  unzip.register(UnzipInflate);

  try {
    if (data.byteLength === 0) unzip.push(data, true);
    for (let offset = 0; offset < data.byteLength; offset += ARCHIVE_INPUT_CHUNK_BYTES) {
      if (failure) throw failure;
      const end = Math.min(data.byteLength, offset + ARCHIVE_INPUT_CHUNK_BYTES);
      unzip.push(data.subarray(offset, end), end === data.byteLength);
    }
    if (failure) throw failure;
    if (streamedEntries !== validatedEntryNames.length) invalidZip();
  } catch (error) {
    if (error instanceof Error && /Unsafe Lean file path|larger than|Choose at most|extracted Lean sources/.test(error.message)) throw error;
    throw new Error("The ZIP archive could not be safely extracted.");
  }
  return extracted;
}

export async function readLeanUploads(input: FileList | File[]): Promise<UploadedLeanFile[]> {
  const sourceFiles = Array.from(input);
  const result: UploadedLeanFile[] = [];

  for (const file of sourceFiles) {
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".lean")) {
      result.push(decodeLean(file.name, new Uint8Array(await file.arrayBuffer())));
      continue;
    }
    if (!lowerName.endsWith(".zip")) {
      throw new Error(`${file.name} is not a .lean file or ZIP archive.`);
    }
    if (file.size > UPLOAD_LIMITS.leanArchiveBytes) {
      throw new Error(`${file.name} is larger than 5 MiB.`);
    }
    result.push(...readLeanArchive(new Uint8Array(await file.arrayBuffer()), result));
  }

  return validateCollection(result);
}
