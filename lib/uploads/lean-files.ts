import { unzipSync } from "fflate";

import { UPLOAD_LIMITS } from "./schema";

export type UploadedLeanFile = {
  path: string;
  text: string;
  bytes: number;
};

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
    let archive: ReturnType<typeof unzipSync>;
    try {
      let archiveLeanFiles = 0;
      let archiveLeanBytes = 0;
      archive = unzipSync(new Uint8Array(await file.arrayBuffer()), {
        filter: (entry) => {
          if (!entry.name.toLowerCase().endsWith(".lean")) return false;
          if (!safeLeanPath(entry.name)) throw new Error(`Unsafe Lean file path: ${entry.name}`);
          if (entry.originalSize > UPLOAD_LIMITS.leanFileBytes) throw new Error(`${entry.name} is larger than 256 KiB.`);
          archiveLeanFiles += 1;
          archiveLeanBytes += entry.originalSize;
          if (result.length + archiveLeanFiles > UPLOAD_LIMITS.leanFiles) throw new Error(`Choose at most ${UPLOAD_LIMITS.leanFiles} Lean files.`);
          if (result.reduce((sum, source) => sum + source.bytes, 0) + archiveLeanBytes > UPLOAD_LIMITS.leanTotalBytes) {
            throw new Error("The extracted Lean sources are larger than 1 MiB in total.");
          }
          return true;
        },
      });
    } catch (error) {
      if (error instanceof Error && /Unsafe Lean file path|larger than|Choose at most|extracted Lean sources/.test(error.message)) throw error;
      throw new Error(`${file.name} is not a readable ZIP archive.`);
    }
    for (const [path, data] of Object.entries(archive)) {
      if (path.endsWith("/")) continue;
      if (!safeLeanPath(path)) {
        if (path.toLowerCase().endsWith(".lean")) throw new Error(`Unsafe Lean file path: ${path}`);
        continue;
      }
      result.push(decodeLean(path, data));
    }
  }

  return validateCollection(result);
}
