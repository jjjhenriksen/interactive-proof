#!/usr/bin/env node
import path from "node:path";
import { readdir } from "node:fs/promises";

import { loadProofPackageFromDirectory } from "../lib/proof-packages/load-package.server";
import { parsePublicProofIds } from "../lib/proof-packages/public-allowlist";

async function main() {
  const proofsDirectory = path.join(process.cwd(), "proofs");
  const knownIds = (await readdir(proofsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (process.env.PUBLIC_PROOF_IDS === undefined) {
    throw new Error("PUBLIC_PROOF_IDS must be explicit for a production release");
  }
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY is not configured for the production release check");
  }
  if (process.env.OPENAI_MODEL !== "gpt-5.6") {
    throw new Error("OPENAI_MODEL must be gpt-5.6 for the hackathon release");
  }

  const publicIds = parsePublicProofIds(process.env.PUBLIC_PROOF_IDS, knownIds);
  for (const id of publicIds) {
    const proofPackage = await loadProofPackageFromDirectory(path.join(proofsDirectory, id));
    if (proofPackage.manifest.paper.license.status !== "cleared") {
      throw new Error(
        `${id} is not public-release ready: paper license is ${proofPackage.manifest.paper.license.status}`,
      );
    }
  }

  console.log(`Public release check passed for ${publicIds.join(", ")}.`);
}

void main();
