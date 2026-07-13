import { loadEvaluationArtifacts, validateEvaluationSet } from "../lib/evaluation/validate-set.server";

async function main() {
  const { evaluationSet, results } = await loadEvaluationArtifacts();
  const report = await validateEvaluationSet(evaluationSet);

  if (results.promptVersion !== evaluationSet.promptVersion) {
    throw new Error("Evaluation results and cases use different prompt versions");
  }
  if (results.status === "not-run" && (results.casesRun !== 0 || results.aggregateScores)) {
    throw new Error("Not-run evaluation results cannot contain cases or aggregate scores");
  }

  console.log(
    `Validated ${report.caseCount} evaluation cases (${report.liveEligibleCount} live-eligible) for prompt ${report.promptVersion}.`,
  );
  console.log(`Checked categories: ${report.categories.join(", ")}.`);
  console.log(`Public result status: ${results.status}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
