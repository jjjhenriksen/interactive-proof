import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createExplanationStream } from "../lib/explanation/openai-response.server";
import { buildExplanationContext } from "../lib/explanation/serialize-context.server";
import { validateResponseCitations } from "../lib/evaluation/citations";
import { loadEvaluationArtifacts, validateEvaluationSet } from "../lib/evaluation/validate-set.server";

type SanitizedRun = {
  caseId: string;
  completed: boolean;
  responseSha256: string;
  responseCharacters: number;
  citations: string[];
  invalidCitationIds: string[];
  usage?: { inputTokens: number; outputTokens: number };
};

async function main() {
  const args = new Set(process.argv.slice(2));
  if (!args.has("--confirm-live")) {
    throw new Error("Live evaluation is opt-in. Re-run with --confirm-live after reviewing cost and data handling.");
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for an explicit live evaluation");

  const caseArgumentIndex = process.argv.indexOf("--case");
  const requestedCase = caseArgumentIndex >= 0 ? process.argv[caseArgumentIndex + 1] : undefined;
  const { evaluationSet } = await loadEvaluationArtifacts();
  await validateEvaluationSet(evaluationSet);
  const cases = evaluationSet.cases.filter(
    (evaluationCase) =>
      evaluationCase.liveEligible && (!requestedCase || evaluationCase.id === requestedCase),
  );
  if (cases.length === 0) throw new Error("No matching live-eligible evaluation case");

  const model = process.env.OPENAI_MODEL ?? "gpt-5.6";
  const startedAt = new Date().toISOString();
  const runs: SanitizedRun[] = [];

  for (const evaluationCase of cases) {
    const { context, publicContext } = await buildExplanationContext(evaluationCase.request);
    const stream = createExplanationStream({
      request: evaluationCase.request,
      context,
      publicContext,
      apiKey,
      model,
      requestId: `eval-${evaluationCase.id}`,
      signal: new AbortController().signal,
    });
    const events = parseServerEvents(await readStream(stream));
    const response = events
      .filter((event) => event.type === "delta")
      .map((event) => String(event.text ?? ""))
      .join("");
    const completed = events.find((event) => event.type === "completed");
    const citations = validateResponseCitations(response, context.allowedSourceIds);

    process.stdout.write(`\n--- ${evaluationCase.id} ---\n${response}\n`);
    runs.push({
      caseId: evaluationCase.id,
      completed: Boolean(completed),
      responseSha256: createHash("sha256").update(response).digest("hex"),
      responseCharacters: response.length,
      citations: citations.citations,
      invalidCitationIds: citations.invalidCitationIds,
      usage: isUsage(completed?.usage) ? completed.usage : undefined,
    });
  }

  const outputDirectory = path.join(process.cwd(), "output", "evals");
  await mkdir(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, `live-summary-${startedAt.replaceAll(":", "-")}.json`);
  await writeFile(
    outputPath,
    `${JSON.stringify({ schemaVersion: 1, promptVersion: evaluationSet.promptVersion, model, startedAt, runs }, null, 2)}\n`,
    "utf8",
  );
  console.log(`\nWrote sanitized metadata only to ${outputPath}. Responses and source text were not stored.`);
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

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
