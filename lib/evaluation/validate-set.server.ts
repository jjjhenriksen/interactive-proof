import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildExplanationInstructions,
  EXPLANATION_PROMPT_VERSION,
} from "../explanation/build-instructions.server";
import { contextIsWithinBudget } from "../explanation/context-budgets";
import { buildExplanationContext, serializeContextForModel } from "../explanation/serialize-context.server";
import { validateResponseCitations } from "./citations";
import {
  evaluationCategories,
  evaluationResultsSchema,
  evaluationSetSchema,
  type EvaluationResults,
  type EvaluationSet,
} from "./schema";

export type EvaluationValidationReport = {
  caseCount: number;
  liveEligibleCount: number;
  categories: string[];
  promptVersion: string;
};

export async function loadEvaluationArtifacts(repositoryRoot = process.cwd()): Promise<{
  evaluationSet: EvaluationSet;
  results: EvaluationResults;
}> {
  const [casesJson, resultsJson] = await Promise.all([
    readFile(path.join(repositoryRoot, "evals", "cases.json"), "utf8"),
    readFile(path.join(repositoryRoot, "evals", "results.json"), "utf8"),
  ]);
  return {
    evaluationSet: evaluationSetSchema.parse(JSON.parse(casesJson)),
    results: evaluationResultsSchema.parse(JSON.parse(resultsJson)),
  };
}

export async function validateEvaluationSet(
  evaluationSet: EvaluationSet,
): Promise<EvaluationValidationReport> {
  if (evaluationSet.promptVersion !== EXPLANATION_PROMPT_VERSION) {
    throw new Error(
      `Evaluation prompt ${evaluationSet.promptVersion} does not match application prompt ${EXPLANATION_PROMPT_VERSION}`,
    );
  }
  const categories = new Set(evaluationSet.cases.map(({ category }) => category));
  const missingCategories = evaluationCategories.filter((category) => !categories.has(category));
  if (missingCategories.length > 0) {
    throw new Error(`Evaluation coverage is missing: ${missingCategories.join(", ")}`);
  }

  const modes = new Set(evaluationSet.cases.map(({ request }) => request.mode));
  const missingModes = ["details", "simpler", "lean", "usage", "question"].filter(
    (mode) => !modes.has(mode as never),
  );
  if (missingModes.length > 0) {
    throw new Error(`Evaluation depth modes are missing: ${missingModes.join(", ")}`);
  }

  for (const evaluationCase of evaluationSet.cases) {
    const { context } = await buildExplanationContext(evaluationCase.request);
    if (!sameMembers(context.allowedSourceIds, evaluationCase.expected.allowedSourceIds)) {
      throw new Error(
        `${evaluationCase.id}: expected allowed source IDs do not match authoritative context`,
      );
    }
    if (!contextIsWithinBudget(context)) {
      throw new Error(`${evaluationCase.id}: constructed context exceeds a documented budget`);
    }

    const instructions = buildExplanationInstructions(evaluationCase.request.mode);
    if (!instructions.includes("quoted data") || !instructions.includes("ALLOWED SOURCE IDS")) {
      throw new Error(`${evaluationCase.id}: prompt-injection or citation boundary is missing`);
    }

    if (evaluationCase.syntheticSourceInstruction) {
      if (instructions.includes(evaluationCase.syntheticSourceInstruction)) {
        throw new Error(`${evaluationCase.id}: adversarial source text escaped into instructions`);
      }
      const serialized = serializeContextForModel({
        ...context,
        surroundingSource: {
          ...context.surroundingSource,
          text: `${context.surroundingSource.text}\n${evaluationCase.syntheticSourceInstruction}`,
        },
      });
      if (!serialized.includes(evaluationCase.syntheticSourceInstruction)) {
        throw new Error(`${evaluationCase.id}: synthetic source boundary probe was not serialized`);
      }
    }

    if (evaluationCase.citationProbe) {
      const assessment = validateResponseCitations(
        evaluationCase.citationProbe.response,
        context.allowedSourceIds,
      );
      if (assessment.isValid !== evaluationCase.citationProbe.shouldPass) {
        throw new Error(`${evaluationCase.id}: citation boundary probe produced the wrong result`);
      }
    }
  }

  return {
    caseCount: evaluationSet.cases.length,
    liveEligibleCount: evaluationSet.cases.filter(({ liveEligible }) => liveEligible).length,
    categories: [...categories].sort(),
    promptVersion: evaluationSet.promptVersion,
  };
}

function sameMembers(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    [...left].sort().every((value, index) => value === [...right].sort()[index])
  );
}
