#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function run(command: string, args: string[]): string {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.error) fail(`${command} could not run: ${result.error.message}`);
  if (result.status !== 0) fail(`${command} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

function normalizeBlock(block: string): string {
  return block
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join("\n");
}

let [, , pdfArgument, outputArgument] = process.argv;
if (pdfArgument && !outputArgument && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pdfArgument)) {
  const packageDirectory = path.resolve("proofs", pdfArgument);
  const manifest = JSON.parse(readFileSync(path.join(packageDirectory, "proof.json"), "utf8")) as {
    paper?: { pdf?: string; pages?: string };
  };
  if (!manifest.paper?.pdf || !manifest.paper.pages) fail("proof.json must declare paper.pdf and paper.pages");
  pdfArgument = path.join(packageDirectory, manifest.paper.pdf);
  outputArgument = path.join(packageDirectory, manifest.paper.pages);
}
if (!pdfArgument || !outputArgument) {
  fail("Usage: npm run proof:extract -- <proof-id> (or provide explicit input and output paths)");
}

const pdf = path.resolve(pdfArgument);
const output = path.resolve(outputArgument);
const pageCountMatch = run("pdfinfo", [pdf]).match(/^Pages:\s+(\d+)$/m);
if (!pageCountMatch) fail("Could not determine PDF page count with pdfinfo");
const pageCount = Number(pageCountMatch[1]);

const pages = Array.from({ length: pageCount }, (_, index) => {
  const number = index + 1;
  const extracted = run("pdftotext", ["-f", String(number), "-l", String(number), "-layout", pdf, "-"])
    .replace(/\f/g, "")
    .trim();
  const blocks = extracted
    .split(/\n\s*\n+/)
    .map(normalizeBlock)
    .filter(Boolean)
    .map((text, blockIndex) => ({ id: `page-${number}-block-${blockIndex + 1}`, text }));
  return { number, text: blocks.map(({ text }) => text).join("\n\n"), blocks };
});

const result = {
  schemaVersion: 1,
  pdfSha256: createHash("sha256").update(readFileSync(pdf)).digest("hex"),
  pages,
};
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Extracted ${pages.length} pages and ${pages.reduce((sum, page) => sum + page.blocks.length, 0)} blocks to ${output}`);
