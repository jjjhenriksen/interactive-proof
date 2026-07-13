export type { LeanSource, ProofMapping, ProofPackage } from "./schema";
export type { PaperBlock, PaperPages } from "./paper-pages-schema";
export type { VerificationRecord } from "../verification/schema";

import type { PaperPages } from "./paper-pages-schema";
import type { ProofPackage } from "./schema";
import type { VerificationRecord } from "../verification/schema";

export type RuntimeProofPackage = {
  manifest: ProofPackage;
  paperPages: PaperPages;
  verification: VerificationRecord;
  leanExcerpts: Record<string, string>;
  paperAssetUrl: string;
};
