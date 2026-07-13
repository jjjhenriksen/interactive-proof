#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile, rename, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { listProofIds, loadProofPackage } from "../lib/proof-packages/registry.server";
import { resolveExistingPackagePath, resolvePackagePath } from "../lib/proof-packages/locations";
import { VerificationRecordSchema, type VerificationRecord } from "../lib/verification/schema";

const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

type CommandResult = {
  exitCode: number;
  output: string;
};

export function countSorryTokens(source: string): number {
  const withoutComments = source
    .replace(/\/-[\s\S]*?-\//g, " ")
    .replace(/--.*$/gm, " ");
  return withoutComments.match(/\b(?:sorry|admit)\b/g)?.length ?? 0;
}

export function declaredAxiomAudits(source: string): string[] {
  return [...source.matchAll(/^\s*#print\s+axioms\s+([A-Za-z_][\w.]*)\s*$/gm)].map(
    (match) => match[1],
  );
}

export function parseAxiomOutput(
  output: string,
): Array<{ declaration: string; axioms: string[] }> {
  const records: Array<{ declaration: string; axioms: string[] }> = [];
  for (const match of output.matchAll(/'([^']+)' depends on axioms: \[([^\]]*)\]/g)) {
    records.push({
      declaration: match[1],
      axioms: match[2].split(",").map((axiom) => axiom.trim()).filter(Boolean),
    });
  }
  for (const match of output.matchAll(/'([^']+)' does not depend on any axioms/g)) {
    records.push({ declaration: match[1], axioms: [] });
  }
  return records;
}

async function runCommand(command: string, args: string[], cwd: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, LEAN_ABORT_ON_PANIC: "1" },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    let byteLength = 0;
    let exceededLimit = false;
    const collect = (chunk: Buffer) => {
      byteLength += chunk.byteLength;
      if (byteLength > MAX_OUTPUT_BYTES) {
        exceededLimit = true;
        child.kill("SIGTERM");
        return;
      }
      chunks.push(chunk);
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("error", (error) => {
      resolve({ exitCode: 127, output: `Could not execute ${command}: ${error.message}\n` });
    });
    child.on("close", (code) => {
      const output = Buffer.concat(chunks).toString("utf8");
      resolve({
        exitCode: exceededLimit ? 125 : (code ?? 1),
        output: exceededLimit ? `${output}\nVerification output exceeded ${MAX_OUTPUT_BYTES} bytes.\n` : output,
      });
    });
  });
}

async function verifyPackage(id: string): Promise<"passed" | "failed" | "skipped"> {
  const loaded = await loadProofPackage(id);
  if (!loaded) throw new Error(`Unknown proof package: ${id}`);
  if (loaded.manifest.lean.displayMode !== "full") {
    console.log(`↷ ${id}: not run (package contains display excerpts, not a local Lean project)`);
    return "skipped";
  }

  const toolchainPath = await resolveExistingPackagePath(loaded.directory, "lean-toolchain");
  const toolchain = (await readFile(toolchainPath, "utf8")).trim();
  const leanFiles = [...new Set(loaded.manifest.mappings.flatMap((mapping) => mapping.lean.map((source) => source.file)))].sort();
  if (leanFiles.length === 0) throw new Error(`${id} has no mapped Lean files`);

  const sources = await Promise.all(
    leanFiles.map(async (relativePath) => ({
      relativePath,
      text: await readFile(await resolveExistingPackagePath(loaded.directory, relativePath), "utf8"),
    })),
  );
  const sourceHash = createHash("sha256");
  sources.forEach(({ text }) => sourceHash.update(text));
  const revision = `sha256:${sourceHash.digest("hex")}`;
  const sorryCount = sources.reduce((count, source) => count + countSorryTokens(source.text), 0);
  const expectedAudits = [...new Set(sources.flatMap((source) => declaredAxiomAudits(source.text)))];

  const outputs: string[] = [];
  let exitCode = 0;
  for (const file of leanFiles) {
    const result = await runCommand("lean", [file], loaded.directory);
    outputs.push(result.output);
    if (result.exitCode !== 0) {
      exitCode = result.exitCode;
      break;
    }
  }
  const output = outputs.join("");
  const axioms = parseAxiomOutput(output);
  const auditedDeclarations = new Set(axioms.map(({ declaration }) => declaration));
  const auditComplete = expectedAudits.length > 0 && expectedAudits.every((name) => auditedDeclarations.has(name));
  const command = leanFiles.map((file) => `lean ${file}`).join(" && ");
  const passed =
    exitCode === 0 &&
    sorryCount === 0 &&
    auditComplete &&
    toolchain === loaded.manifest.lean.toolchain &&
    revision === loaded.manifest.lean.revision;

  const record: VerificationRecord = VerificationRecordSchema.parse({
    schemaVersion: 1,
    repository: loaded.manifest.lean.repository,
    revision,
    toolchain,
    command,
    checkedAt: new Date().toISOString(),
    build: passed ? "passed" : "failed",
    exitCode,
    sorryCount,
    axioms,
    outputDigest: createHash("sha256").update(output).digest("hex"),
  });

  const outputPath = resolvePackagePath(loaded.directory, "verification.json");
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
  await rename(temporaryPath, outputPath);

  if (passed) {
    console.log(`✓ ${id}: verified (${sorryCount} sorries, ${axioms.length} axiom audit${axioms.length === 1 ? "" : "s"})`);
    return "passed";
  }

  const reasons = [
    exitCode !== 0 && `Lean exited ${exitCode}`,
    sorryCount !== 0 && `${sorryCount} sorry/admit token(s)`,
    !auditComplete && "axiom audit missing or incomplete",
    toolchain !== loaded.manifest.lean.toolchain && "toolchain differs from manifest",
    revision !== loaded.manifest.lean.revision && "source revision differs from manifest",
  ].filter(Boolean);
  console.error(`✗ ${id}: verification failed (${reasons.join("; ")})`);
  return "failed";
}

async function main(): Promise<void> {
  const requestedIds = process.argv.slice(2);
  const ids = requestedIds.length > 0 ? requestedIds : listProofIds();
  let failed = false;
  for (const id of ids) {
    try {
      if ((await verifyPackage(id)) === "failed") failed = true;
    } catch (error) {
      failed = true;
      console.error(`✗ ${id}:`, error instanceof Error ? error.message : error);
    }
  }
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
