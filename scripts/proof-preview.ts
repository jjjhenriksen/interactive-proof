#!/usr/bin/env node
import { spawn } from "node:child_process";
import { assertProofId } from "../lib/proof-packages/authoring";

const id = process.argv[2];
if (!id) throw new Error("Usage: npm run proof:preview -- <proof-id>");
assertProofId(id);
console.log(`Preview URL: http://localhost:3000/proofs/${id}`);
const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev"], { stdio: "inherit", shell: false });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
