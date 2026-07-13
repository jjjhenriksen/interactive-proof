import path from "node:path";

import { loadProofPackageFromDirectory, type LoadedProofPackage } from "./load-package.server";
import { proofRegistry, type RegisteredProofId } from "./registry.generated";

export function listProofIds(): RegisteredProofId[] {
  return Object.keys(proofRegistry) as RegisteredProofId[];
}

export function isRegisteredProofId(value: string): value is RegisteredProofId {
  return Object.hasOwn(proofRegistry, value);
}

export async function loadProofPackage(
  id: string,
  repositoryRoot = process.cwd(),
): Promise<LoadedProofPackage | null> {
  if (!isRegisteredProofId(id)) return null;
  return loadProofPackageFromDirectory(path.join(repositoryRoot, proofRegistry[id]));
}
