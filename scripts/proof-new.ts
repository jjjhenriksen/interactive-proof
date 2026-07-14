#!/usr/bin/env node
import { scaffoldProofPackage } from "../lib/proof-packages/authoring";

const id = process.argv[2];
if (!id) throw new Error("Usage: npm run proof:new -- <proof-id>");
const title = process.argv.slice(3).join(" ") || id.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
const destination = await scaffoldProofPackage(process.cwd(), id, title);
console.log(`Created ${destination}. Supply paper.pdf, then complete the deliberate placeholders.`);
