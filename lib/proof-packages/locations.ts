import { realpath } from "node:fs/promises";
import path from "node:path";

export class UnsafePackagePathError extends Error {
  constructor(value: string) {
    super(`Unsafe proof-package path: ${JSON.stringify(value)}`);
    this.name = "UnsafePackagePathError";
  }
}

export function resolvePackagePath(packageDirectory: string, relativePath: string): string {
  if (
    relativePath.length === 0 ||
    relativePath.includes("\0") ||
    relativePath.includes("\\") ||
    path.posix.isAbsolute(relativePath) ||
    relativePath.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new UnsafePackagePathError(relativePath);
  }

  const root = path.resolve(packageDirectory);
  const candidate = path.resolve(root, ...relativePath.split("/"));
  const relation = path.relative(root, candidate);
  if (relation === "" || relation.startsWith(`..${path.sep}`) || relation === ".." || path.isAbsolute(relation)) {
    throw new UnsafePackagePathError(relativePath);
  }
  return candidate;
}

export async function resolveExistingPackagePath(
  packageDirectory: string,
  relativePath: string,
): Promise<string> {
  const candidate = resolvePackagePath(packageDirectory, relativePath);
  const [realRoot, realCandidate] = await Promise.all([realpath(packageDirectory), realpath(candidate)]);
  const relation = path.relative(realRoot, realCandidate);
  if (relation.startsWith(`..${path.sep}`) || relation === ".." || path.isAbsolute(relation)) {
    throw new UnsafePackagePathError(relativePath);
  }
  return realCandidate;
}
