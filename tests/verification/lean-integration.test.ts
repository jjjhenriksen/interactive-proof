import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { countSorryTokens, declaredAxiomAudits, parseAxiomOutput, runCommand, verifyPackage } from "../../scripts/verify-proof-packages";
import { leanNameKey } from "../../lib/verification/lean-lexer";

const fixtures = path.resolve("tests/verification/fixtures");
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

async function fixturePackage(file: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), "proof-audit-"));
  roots.push(root);
  const directory = path.join(root, "proofs", "odd-sum-square");
  await cp(path.resolve("proofs/odd-sum-square"), directory, { recursive: true });
  const source = await readFile(path.join(fixtures, file), "utf8");
  await writeFile(path.join(directory, "lean/Main.lean"), source);
  const manifest = JSON.parse(await readFile(path.join(directory, "proof.json"), "utf8"));
  delete manifest.instructor;
  delete manifest.recorded;
  manifest.lean.revision = `sha256:${createHash("sha256").update(source).digest("hex")}`;
  for (const mapping of manifest.mappings) for (const lean of mapping.lean) {
    lean.startLine = 1;
    lean.endLine = source.split("\n").length - 1;
  }
  await writeFile(path.join(directory, "proof.json"), JSON.stringify(manifest));
  return { root, directory, source };
}

describe("real Lean verification", () => {
  it("fails an imported admitted lemma despite a clean mapped source and exit 0", async () => {
    const { root, directory, source } = await fixturePackage("Imported.lean");
    expect(countSorryTokens(source)).toBe(0);
    await cp(path.join(fixtures, "Admitted.lean"), path.join(directory, "Admitted.lean"));
    const compiled = await runCommand("lean", ["-o", "Admitted.olean", "Admitted.lean"], directory);
    expect(compiled.exitCode, compiled.output).toBe(0);
    // Lean resolves imports through LEAN_PATH, not the mapped file's directory.
    const cli = spawnSync(process.execPath, ["--import", path.resolve("node_modules/tsx/dist/loader.mjs"), path.resolve("scripts/verify-proof-packages.ts"), "odd-sum-square"], {
      cwd: root, env: { ...process.env, LEAN_PATH: directory }, encoding: "utf8", timeout: 20_000,
    });
    const output = cli.stdout + cli.stderr;
    expect(cli.status, output).toBe(1);
    const record = JSON.parse(await readFile(path.join(directory, "verification.json"), "utf8"));
    expect(record).toMatchObject({ build: "failed", exitCode: 0, sorryCount: 0 });
    expect(record.axioms).toContainEqual({ declaration: "mappedProof", axioms: ["sorryAx"] });
    expect(output).toContain("sorryAx dependency in mappedProof");
  }, 30_000);

  it.each(["Names.lean", "Literals.lean", "Foundations.lean"])("passes %s through the compiler and package gate", async (file) => {
    const { root, directory, source } = await fixturePackage(file);
    const compiled = await runCommand("lean", ["lean/Main.lean"], directory);
    expect(compiled.exitCode, compiled.output).toBe(0);
    expect(countSorryTokens(source)).toBe(0);
    const records = parseAxiomOutput(compiled.output);
    if (file === "Names.lean") {
      expect(declaredAxiomAudits(source)).toEqual([
        "ascii", "α₁", "℀", "prime'", "«quoted name»", "«ordinary»",
        "Namespace.β₂'", "Namespace.«dots.and'apostrophe»",
      ]);
      expect(records.map((record) => record.declaration)).toEqual([
        "ascii", "α₁", "℀", "prime'", "«quoted name»", "ordinary",
        "Namespace.β₂'", "Namespace.«dots.and'apostrophe»",
      ]);
      expect(leanNameKey("Namespace.«a.b»")).not.toBe(leanNameKey("Namespace.a.b"));
    }
    expect(declaredAxiomAudits(source).map(leanNameKey).sort()).toEqual(records.map((record) => leanNameKey(record.declaration)).sort());
    expect(await verifyPackage("odd-sum-square", root)).toBe("passed");
    if (file === "Foundations.lean") expect(records).toEqual([
      { declaration: "extensionality", axioms: ["propext"] },
      { declaration: "chosen", axioms: ["Classical.choice"] },
      { declaration: "quotientEquality", axioms: ["Quot.sound"] },
    ]);
  }, 30_000);

  it("detects real sorry and admit despite Lean's successful exit", async () => {
    const { root, directory, source } = await fixturePackage("Admissions.lean");
    expect(countSorryTokens(source)).toBe(2);
    const compiled = await runCommand("lean", ["lean/Main.lean"], directory);
    expect(compiled.exitCode, compiled.output).toBe(0);
    expect(parseAxiomOutput(compiled.output)).toHaveLength(2);
    expect(await verifyPackage("odd-sum-square", root)).toBe("failed");
  }, 30_000);
});
