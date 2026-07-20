export function parsePublicProofIds(
  rawValue: string | undefined,
  registeredIds: readonly string[],
): string[] {
  const knownIds = new Set(registeredIds);

  if (rawValue === undefined) return [...registeredIds];

  const ids = rawValue.split(",").map((id) => id.trim());
  if (ids.length === 0 || ids.some((id) => id.length === 0)) {
    throw new Error("PUBLIC_PROOF_IDS must contain at least one proof id");
  }

  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate) {
    throw new Error(`PUBLIC_PROOF_IDS contains duplicate id: ${duplicate}`);
  }

  const unknown = ids.find((id) => !knownIds.has(id));
  if (unknown) {
    throw new Error(`PUBLIC_PROOF_IDS contains unknown id: ${unknown}`);
  }

  return ids;
}
