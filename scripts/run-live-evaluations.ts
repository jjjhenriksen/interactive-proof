import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createExplanationStream } from "../lib/explanation/openai-response.server";
import { buildExplanationContext } from "../lib/explanation/serialize-context.server";
import { validateResponseCitations } from "../lib/evaluation/citations";
import { loadEvaluationArtifacts, validateEvaluationSet } from "../lib/evaluation/validate-set.server";
import type { EvaluationCase } from "../lib/evaluation/schema";

export type SanitizedRun = {
  caseId: string;
  completed: boolean;
  streamFailed: boolean;
  passed: boolean;
  responseSha256: string;
  responseCharacters: number;
  citations: string[];
  invalidCitationIds: string[];
  usage?: { inputTokens: number; outputTokens: number };
};

async function main() {
  const rawArgs = process.argv.slice(2);
  const args = new Set(rawArgs);
  if (!args.has("--confirm-live")) {
    throw new Error("Live evaluation is opt-in. Re-run with --confirm-live after reviewing cost and data handling.");
  }
  const requestedCase = parseRequestedCase(rawArgs);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for an explicit live evaluation");

  const { evaluationSet } = await loadEvaluationArtifacts();
  await validateEvaluationSet(evaluationSet);
  const cases = evaluationSet.cases.filter(
    (evaluationCase) =>
      evaluationCase.liveEligible && (!requestedCase || evaluationCase.id === requestedCase),
  );
  if (cases.length === 0) throw new Error("No matching live-eligible evaluation case");

  const model = process.env.OPENAI_MODEL ?? "gpt-5.6";
  const result = await runEvaluationCases({
    cases, model, apiKey, promptVersion: evaluationSet.promptVersion,
    outputDirectory: path.join(process.cwd(), "output", "evals"),
  });
  process.exitCode = result.exitCode;
}

export async function runEvaluationCases({
  cases, model, apiKey, promptVersion, outputDirectory,
  createStream = createExplanationStream,
  writeResponse = (caseId, response) => process.stdout.write(`\n--- ${caseId} ---\n${response}\n`),
}: {
  cases: EvaluationCase[];
  model: string;
  apiKey: string;
  promptVersion: string;
  outputDirectory: string;
  createStream?: typeof createExplanationStream;
  writeResponse?: (caseId: string, response: string) => void;
}): Promise<{ exitCode: 0 | 1; outputPath: string; runs: SanitizedRun[] }> {
  if (cases.length === 0) throw new Error("No evaluation cases selected");
  const startedAt = new Date().toISOString();
  const runs: SanitizedRun[] = [];

  for (const evaluationCase of cases) {
    let events: Array<Record<string, unknown>> = [];
    let allowedSourceIds: string[] = [];
    let streamFailed = false;
    try {
      const { context, publicContext } = await buildExplanationContext(evaluationCase.request);
      allowedSourceIds = context.allowedSourceIds;
      const stream = createStream({
        request: evaluationCase.request,
        context,
        publicContext,
        apiKey,
        model,
        requestId: `eval-${evaluationCase.id}`,
        signal: new AbortController().signal,
      });
      events = parseServerEvents(await readStream(stream));
      streamFailed = events.some((event) => event.type === "error");
    } catch {
      // Provider/context/read failures must not prevent other cases or the summary.
      // Deliberately retain no exception text, which may contain provider secrets.
      streamFailed = true;
    }
    const response = events
      .filter((event) => event.type === "delta")
      .map((event) => String(event.text ?? ""))
      .join("");
    const completed = events.find((event) => event.type === "completed");
    const citations = validateResponseCitations(response, allowedSourceIds);

    writeResponse(evaluationCase.id, response);
    runs.push({
      caseId: evaluationCase.id,
      completed: Boolean(completed),
      streamFailed,
      passed: Boolean(completed) && !streamFailed && citations.isValid,
      responseSha256: createHash("sha256").update(response).digest("hex"),
      responseCharacters: response.length,
      citations: citations.citations,
      invalidCitationIds: citations.invalidCitationIds,
      usage: isUsage(completed?.usage) ? completed.usage : undefined,
    });
  }

  await mkdir(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, `live-summary-${startedAt.replaceAll(":", "-")}.json`);
  await writeFile(
    outputPath,
    `${JSON.stringify({ schemaVersion: 1, promptVersion, model, startedAt, runs }, null, 2)}\n`,
    "utf8",
  );
  console.log(`\nWrote sanitized metadata only to ${outputPath}. Responses and source text were not stored.`);
  return { exitCode: runs.every((run) => run.passed) ? 0 : 1, outputPath, runs };
}

export function parseRequestedCase(args: string[]): string | undefined {
  const indexes = args.flatMap((value, index) => value === "--case" ? [index] : []);
  if (indexes.length === 0) return undefined;
  if (indexes.length > 1) throw new Error("--case may be provided only once");
  const value = args[indexes[0] + 1];
  if (!value || value.startsWith("--")) {
    throw new Error("--case requires a live-eligible evaluation case id");
  }
  return value;
}

async function readStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let value = "";
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) return value;
    value += decoder.decode(chunk.value, { stream: true });
  }
}

function parseServerEvents(value: string): Array<Record<string, unknown>> {
  return value
    .split("\n\n")
    .map((block) => block.split("\n").find((line) => line.startsWith("data: "))?.slice(6))
    .filter((line): line is string => Boolean(line))
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function isUsage(value: unknown): value is { inputTokens: number; outputTokens: number } {
  if (!value || typeof value !== "object") return false;
  const usage = value as Record<string, unknown>;
  return typeof usage.inputTokens === "number" && typeof usage.outputTokens === "number";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
