import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const exec = promisify(execFile);
const complete = { type: "response.completed", response: { id: "fake" } };

describe("live CLI exit status", () => {
  it.each([
    ["provider error", [{ type: "error", message: "private upstream details" }], 1],
    ["missing completion", [{ type: "response.output_text.delta", delta: "private response text" }], 1],
    ["invalid citation", [{ type: "response.output_text.delta", delta: "private response text [lean-invented]" }, complete], 1],
    ["valid completion", [{ type: "response.output_text.delta", delta: "private response text [page-1-block-6]" }, complete], 0],
  ])("returns the correct command status for %s", async (_label, events, expectedCode) => {
    // A loopback-only fake provider: exercise the unchanged SDK and actual CLI
    // without contacting OpenAI or needing a real credential.
    const server = createServer((request, response) => {
      request.resume();
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      for (const event of events as Array<{ type: string }>) response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      response.end("data: [DONE]\n\n");
    });
    const root = await mkdtemp(path.join(os.tmpdir(), "live-command-"));
    try {
      await cp(path.resolve("evals"), path.join(root, "evals"), { recursive: true });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing fake provider port");
      let code = 0;
      try {
        await exec(process.execPath, ["--import", path.resolve("node_modules/tsx/dist/loader.mjs"), path.resolve("scripts/run-live-evaluations.ts"), "--confirm-live", "--case", "paper-unfamiliar-recursive-definition"], {
          cwd: root,
          env: { ...process.env, OPENAI_API_KEY: "fake-key-never-sent-remotely", OPENAI_BASE_URL: `http://127.0.0.1:${address.port}/v1` },
          timeout: 20_000,
        });
      } catch (error) {
        code = Number((error as { code: number }).code);
      }
      expect(code).toBe(expectedCode);
      const directory = path.join(root, "output/evals");
      const files = await readdir(directory);
      expect(files).toHaveLength(1);
      const saved = await readFile(path.join(directory, files[0]), "utf8");
      expect(JSON.parse(saved).runs[0].passed).toBe(expectedCode === 0);
      expect(saved).not.toContain("private response text");
      expect(saved).not.toContain("private upstream details");
      expect(saved).not.toContain("fake-key-never-sent-remotely");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  }, 30_000);
});
