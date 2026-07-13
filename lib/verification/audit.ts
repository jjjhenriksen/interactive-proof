import type { ProofPackage } from "../proof-packages/schema";
import type { VerificationRecord } from "./schema";

export type VerificationStatus = "verified" | "failed" | "stale" | "not-run";

export function verificationStatus(
  manifest: ProofPackage,
  verification: VerificationRecord,
): VerificationStatus {
  if (
    verification.repository !== manifest.lean.repository ||
    verification.revision !== manifest.lean.revision ||
    verification.toolchain !== manifest.lean.toolchain
  ) {
    return "stale";
  }
  if (verification.build === "not-run") return "not-run";
  return verification.build === "passed" ? "verified" : "failed";
}
