import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { PaperPagesSchema, type PaperPages } from "./paper-pages-schema";
import { resolveExistingPackagePath } from "./locations";
import { ProofPackageSchema, type ProofPackage } from "./schema";
import { VerificationRecordSchema, type VerificationRecord } from "../verification/schema";
import { InstructorFileSchema, type InstructorEntry } from "./instructor-schema";

export type LoadedProofPackage = {
  directory: string;
  manifest: ProofPackage;
  paperPages: PaperPages;
  verification: VerificationRecord;
  instructorEntries: InstructorEntry[];
};

export class InvalidProofPackageError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "InvalidProofPackageError";
  }
}

async function readJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new InvalidProofPackageError(`Could not read JSON file ${path.basename(file)}`, error);
  }
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertManifestReferences(
  manifest: ProofPackage,
  paperPages: PaperPages,
  packageDirectory: string,
): Promise<void> {
  const pages = new Map(paperPages.pages.map((page) => [page.number, page]));
  const blockIds = new Set(paperPages.pages.flatMap((page) => page.blocks.map((block) => block.id)));

  for (const mapping of manifest.mappings) {
    if (!blockIds.has(mapping.paper.sourceId)) {
      throw new InvalidProofPackageError(
        `Mapping ${mapping.id} references unknown paper block ${mapping.paper.sourceId}`,
      );
    }
    for (const page of mapping.paper.pages) {
      if (!pages.has(page)) {
        throw new InvalidProofPackageError(`Mapping ${mapping.id} references unknown paper page ${page}`);
      }
    }
  }

  return Promise.all(
    manifest.mappings.flatMap((mapping) =>
      mapping.lean.map(async (source) => {
        const file = await resolveExistingPackagePath(packageDirectory, source.file);
        const info = await stat(file);
        if (!info.isFile()) {
          throw new InvalidProofPackageError(`Lean source is not a file: ${source.file}`);
        }
        const lines = (await readFile(file, "utf8")).split(/\r?\n/).length;
        if (source.endLine > lines) {
          throw new InvalidProofPackageError(
            `Mapping ${mapping.id} line range ${source.startLine}-${source.endLine} exceeds ${source.file} (${lines} lines)`,
          );
        }
      }),
    ),
  ).then(() => undefined);
}

export async function loadProofPackageFromDirectory(packageDirectory: string): Promise<LoadedProofPackage> {
  try {
    const manifestPath = await resolveExistingPackagePath(packageDirectory, "proof.json");
    const manifest = ProofPackageSchema.parse(await readJson(manifestPath));

    if (path.basename(packageDirectory) !== manifest.id) {
      throw new InvalidProofPackageError(
        `Manifest id ${manifest.id} does not match package directory ${path.basename(packageDirectory)}`,
      );
    }

    const [pdfPath, pagesPath, verificationPath, leanDirectory] = await Promise.all([
      resolveExistingPackagePath(packageDirectory, manifest.paper.pdf),
      resolveExistingPackagePath(packageDirectory, manifest.paper.pages),
      resolveExistingPackagePath(packageDirectory, "verification.json"),
      resolveExistingPackagePath(packageDirectory, manifest.lean.sourceDirectory),
    ]);
    if (!(await stat(leanDirectory)).isDirectory()) {
      throw new InvalidProofPackageError(`Lean sourceDirectory is not a directory: ${manifest.lean.sourceDirectory}`);
    }

    const [pdf, paperPages, verification, instructorEntries] = await Promise.all([
      readFile(pdfPath),
      readJson(pagesPath).then((value) => PaperPagesSchema.parse(value)),
      readJson(verificationPath).then((value) => VerificationRecordSchema.parse(value)),
      manifest.instructor
        ? resolveExistingPackagePath(packageDirectory, manifest.instructor.file).then(async (file) => {
            const bytes = await readFile(file);
            if (sha256(bytes) !== manifest.instructor?.sha256) throw new InvalidProofPackageError("Instructor file digest mismatch");
            return InstructorFileSchema.parse(JSON.parse(bytes.toString("utf8"))).entries;
          })
        : Promise.resolve([]),
    ]);

    const digest = sha256(pdf);
    if (digest !== paperPages.pdfSha256) {
      throw new InvalidProofPackageError(
        `PDF digest mismatch: paper.pages.json has ${paperPages.pdfSha256}, actual PDF is ${digest}`,
      );
    }

    await assertManifestReferences(manifest, paperPages, packageDirectory);
    const knownSources = new Set([
      ...paperPages.pages.flatMap((page) => page.blocks.map((block) => block.id)),
      ...manifest.mappings.flatMap((mapping) => mapping.lean.map((source) => source.sourceId)),
    ]);
    const knownMappings = new Set(manifest.mappings.map((mapping) => mapping.id));
    for (const entry of instructorEntries) {
      if (entry.sourceIds.some((id) => !knownSources.has(id))) throw new InvalidProofPackageError(`Instructor entry ${entry.id} references an unknown source`);
      if (entry.mappingIds.some((id) => !knownMappings.has(id))) throw new InvalidProofPackageError(`Instructor entry ${entry.id} references an unknown mapping`);
    }
    return { directory: path.resolve(packageDirectory), manifest, paperPages, verification, instructorEntries };
  } catch (error) {
    if (error instanceof InvalidProofPackageError) throw error;
    throw new InvalidProofPackageError(`Invalid proof package at ${packageDirectory}`, error);
  }
}
