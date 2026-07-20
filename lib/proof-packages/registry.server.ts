import { proofRegistry, type RegisteredProofId } from "./registry.generated";
import type { RuntimeProofPackage } from "./types";

export function listProofIds(): RegisteredProofId[] {
  return Object.keys(proofRegistry) as RegisteredProofId[];
}

export function isRegisteredProofId(value: string): value is RegisteredProofId {
  return Object.hasOwn(proofRegistry, value);
}

export async function loadProofPackage(
  id: string,
): Promise<RuntimeProofPackage | null> {
  if (!isRegisteredProofId(id)) return null;
  return proofRegistry[id];
}
