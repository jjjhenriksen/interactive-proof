#!/usr/bin/env node
import { readdir } from "node:fs/promises";
import path from "node:path";

import { loadProofPackageFromDirectory } from "../lib/proof-packages/load-package.server";
import { verificationStatus } from "../lib/verification/audit";

async function main() {
  const root = process.cwd();
  const proofsDirectory = path.join(root, "proofs");
  const entries = (await readdir(proofsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));

  let failures = 0;
  for (const entry of entries) {
    try {
      const loaded = await loadProofPackageFromDirectory(path.join(proofsDirectory, entry.name));
      console.log(`✓ ${loaded.manifest.id} (${verificationStatus(loaded.manifest, loaded.verification)})`);
    } catch (error) {
      failures += 1;
      console.error(`✗ ${entry.name}:`, error);
    }
  }

  if (failures > 0) process.exitCode = 1;
  else console.log(`Validated ${entries.length} proof package(s).`);
}

void main();
