import { lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { ProofPackageSchema } from "./schema";

export const PROOF_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type AuthoringFinding = { code: string; message: string };
export type AuthoringReport = {
  proofId: string;
  schemaValid: boolean;
  releaseReady: boolean;
  errors: AuthoringFinding[];
  warnings: AuthoringFinding[];
  verificationStatus: "verified" | "failed" | "stale" | "not-run";
  rightsStatus: "cleared" | "review-required";
};

export function assertProofId(id: string) {
  if (!PROOF_ID_PATTERN.test(id) || id.length > 80) {
    throw new Error("Proof id must be a lowercase kebab-case identifier of at most 80 characters");
  }
}

export async function scaffoldProofPackage(root: string, id: string, title = "Untitled proof") {
  assertProofId(id);
  const proofsRoot = path.resolve(root, "proofs");
  const destination = path.resolve(proofsRoot, id);
  if (path.dirname(destination) !== proofsRoot) throw new Error("Proof path escaped the proofs directory");
  try {
    await lstat(destination);
    throw new Error(`Proof package already exists: ${id}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  await mkdir(proofsRoot, { recursive: true });
  const temporary = path.join(proofsRoot, `.new-${id}-${crypto.randomUUID()}`);
  await mkdir(path.join(temporary, "lean"), { recursive: true });
  try {
    await writeFile(path.join(temporary, "proof.json"), JSON.stringify({
      schemaVersion: 1,
      id,
      title,
      shortTitle: title.slice(0, 100),
      summary: "Replace with a reader-facing summary before validation.",
      audience: "Describe the intended mathematical audience.",
      paper: { title, authors: ["Replace with paper author"], pdf: "paper.pdf", pages: "paper.pages.json", license: { status: "review-required" } },
      lean: { repository: "https://example.com/replace-with-lean-repository", revision: "not-recorded", toolchain: "not-recorded", sourceDirectory: "lean", displayMode: "excerpts" },
      glossary: [],
      mappings: [],
    }, null, 2) + "\n");
    await writeFile(path.join(temporary, "paper.pages.json"), JSON.stringify({ schemaVersion: 1, pdfSha256: "0".repeat(64), pages: [] }, null, 2) + "\n");
    await writeFile(path.join(temporary, "verification.json"), JSON.stringify({ schemaVersion: 1, proofId: id, build: "not-run", revision: "not-recorded", toolchain: "not-recorded", command: "not run", checkedAt: new Date(0).toISOString(), exitCode: null, sorryCount: null, axioms: [], outputDigest: null }, null, 2) + "\n");
    await writeFile(path.join(temporary, "AUTHORING.md"), `# ${title}\n\nGenerator schema: 1\n\n1. Supply \`paper.pdf\`; it is never generated or downloaded.\n2. Record attribution and a cleared license only after checking the source.\n3. Add Lean files and exact mapped declaration ranges.\n4. Run \`npm run proof:extract -- ${id}\` and \`npm run proof:check -- ${id}\`.\n5. Review every paper-to-Lean correspondence claim manually.\n`);
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
  return destination;
}

export async function buildAuthoringReport(root: string, id: string): Promise<AuthoringReport> {
  assertProofId(id);
  const packageDirectory = path.resolve(root, "proofs", id);
  const errors: AuthoringFinding[] = [];
  const warnings: AuthoringFinding[] = [];
  let raw: unknown;
  try { raw = JSON.parse(await readFile(path.join(packageDirectory, "proof.json"), "utf8")); }
  catch { raw = null; errors.push({ code: "MANIFEST", message: "proof.json is missing or invalid JSON" }); }
  const parsed = ProofPackageSchema.safeParse(raw);
  if (!parsed.success) errors.push(...parsed.error.issues.map((issue) => ({ code: "SCHEMA", message: `${issue.path.join(".")}: ${issue.message}` })));
  const rightsStatus = parsed.success && parsed.data.paper.license.status === "cleared" ? "cleared" : "review-required";
  if (rightsStatus !== "cleared") errors.push({ code: "RIGHTS", message: "Paper redistribution rights are not cleared" });
  for (const file of ["paper.pdf", "paper.pages.json", "verification.json"]) {
    try { await lstat(path.join(packageDirectory, file)); }
    catch { errors.push({ code: "ASSET", message: `Missing ${file}` }); }
  }
  let verificationStatus: AuthoringReport["verificationStatus"] = "not-run";
  try {
    const verification = JSON.parse(await readFile(path.join(packageDirectory, "verification.json"), "utf8")) as { build?: string };
    verificationStatus = verification.build === "passed" ? "verified" : verification.build === "failed" ? "failed" : "not-run";
  } catch { /* asset error already reported */ }
  if (verificationStatus !== "verified") warnings.push({ code: "VERIFICATION", message: `Lean verification is ${verificationStatus}` });
  return { proofId: id, schemaValid: parsed.success, releaseReady: parsed.success && rightsStatus === "cleared" && verificationStatus === "verified" && errors.length === 0, errors, warnings, verificationStatus, rightsStatus };
}
