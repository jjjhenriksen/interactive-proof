import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ResponseStreamEvent } from "openai/resources/responses/responses";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createExplanationStream } from "../../lib/explanation/openai-response.server";
import { loadEvaluationArtifacts } from "../../lib/evaluation/validate-set.server";
import { runEvaluationCases } from "../../scripts/run-live-evaluations";

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
const completed = { type: "response.completed", response: { id: "fake", usage: { input_tokens: 5, output_tokens: 3 } } };
const delta = (text: string) => ({ type: "response.output_text.delta", delta: text });

async function run(events: unknown[][], throws = false) {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  const { evaluationSet } = await loadEvaluationArtifacts();
  const cases = evaluationSet.cases.filter((item) => item.liveEligible).slice(0, events.length);
  const outputDirectory = await mkdtemp(path.join(os.tmpdir(), "live-gate-"));
  roots.push(outputDirectory);
  let index = 0;
  const result = await runEvaluationCases({
    cases, model: "fake-model", apiKey: "never-send-this-key", promptVersion: evaluationSet.promptVersion, outputDirectory,
    writeResponse: () => undefined,
    createStream: (options) => {
      const selected = events[index++] as ResponseStreamEvent[];
      return createExplanationStream({ ...options, createProviderStream: async () => {
        if (throws) throw new Error("private upstream exception");
        return (async function* () { yield* selected; })();
      } });
    },
  });
  const saved = await readFile(result.outputPath, "utf8");
  expect(JSON.parse(saved).runs).toEqual(result.runs);
  expect(saved).not.toContain("never-send-this-key");
  expect(saved).not.toContain("private upstream exception");
  expect(saved).not.toContain(cases[0].request.selectedText);
  expect(saved).not.toContain("unretained response text");
  return result;
}

describe("live evaluation command gate with fake providers", () => {
  it.each([
    ["provider error", [delta("unretained response text"), { type: "error", message: "private upstream exception" }]],
    ["provider failed response", [{ type: "response.failed", response: { error: { message: "private upstream exception" } } }]],
    ["provider incomplete response", [{ type: "response.incomplete", response: {} }]],
    ["missing completion", [delta("unretained response text")]],
    ["invalid citation", [delta("unretained response text [lean-invented-source]"), completed]],
    ["error after completion", [completed, { type: "error", message: "private upstream exception" }]],
  ])("fails %s and retains a sanitized summary", async (_label, events) => {
    const result = await run([events as unknown[]]);
    expect(result.exitCode).toBe(1);
    expect(result.runs[0].passed).toBe(false);
    if (_label === "invalid citation") expect(result.runs[0].invalidCitationIds).toEqual(["lean-invented-source"]);
  });

  it("retains metadata even if every provider request throws", async () => {
    const result = await run([[], []], true);
    expect(result.exitCode).toBe(1);
    expect(result.runs).toHaveLength(2);
    expect(result.runs.every((item) => item.streamFailed && !item.completed && !item.passed)).toBe(true);
  });

  it("continues after a failed case and fails the selected set", async () => {
    const result = await run([[], [delta("unretained response text [page-1-block-10]"), completed]]);
    expect(result.exitCode).toBe(1);
    expect(result.runs.map((item) => item.passed)).toEqual([false, true]);
  });

  it("passes completed responses with valid citations", async () => {
    const result = await run([[delta("unretained response text [page-1-block-6]"), completed]]);
    expect(result.exitCode).toBe(0);
    expect(result.runs[0]).toMatchObject({ completed: true, streamFailed: false, passed: true, usage: { inputTokens: 5, outputTokens: 3 } });
  });
});
