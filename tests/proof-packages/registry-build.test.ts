import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("proof registry generation", () => {
  it("fails when an explicitly included package is missing required assets", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "interactive-proof-registry-"));
    temporaryDirectories.push(root);
    await mkdir(path.join(root, "proofs", "broken"), { recursive: true });
    const result = spawnSync(
      process.execPath,
      [path.resolve("node_modules/tsx/dist/cli.mjs"), path.resolve("scripts/build-proof-registry.ts")],
      {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, PUBLIC_PROOF_IDS: "broken" },
      },
    );

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/ENOENT|no such file/i);
  });
});
