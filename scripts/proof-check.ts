#!/usr/bin/env node
import { buildAuthoringReport } from "../lib/proof-packages/authoring";

const id = process.argv[2];
if (!id) throw new Error("Usage: npm run proof:check -- <proof-id>");
const report = await buildAuthoringReport(process.cwd(), id);
console.log(JSON.stringify(report, null, 2));
if (!report.releaseReady) process.exitCode = 1;
