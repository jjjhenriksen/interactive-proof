import { describe, expect, it } from "vitest";

import { buildExplanationInstructions } from "../../lib/explanation/build-instructions.server";
import { serializeContextForModel } from "../../lib/explanation/serialize-context.server";
import { loadEvaluationArtifacts, validateEvaluationSet } from "../../lib/evaluation/validate-set.server";

describe("fixed evaluation set", () => {
  it("validates authoritative locations, coverage, allowed sources, and budgets", async () => {
    const { evaluationSet, results } = await loadEvaluationArtifacts();
    const report = await validateEvaluationSet(evaluationSet);

    expect(report.caseCount).toBeGreaterThanOrEqual(12);
    expect(report.liveEligibleCount).toBeGreaterThanOrEqual(11);
    expect(report.categories).toContain("adversarial-source");
    expect(report.categories).toContain("two-turn-follow-up");
    expect(results).toMatchObject({
      status: "not-run",
      casesRun: 0,
      aggregateScores: null,
    });
  });

  it("keeps adversarial source text in serialized data and out of instructions", async () => {
    const { evaluationSet } = await loadEvaluationArtifacts();
    const evaluationCase = evaluationSet.cases.find(
      ({ category }) => category === "adversarial-source",
    );
    expect(evaluationCase?.syntheticSourceInstruction).toBeTruthy();

    const instructions = buildExplanationInstructions(evaluationCase!.request.mode);
    expect(instructions).toContain("quoted data");
    expect(instructions).not.toContain(evaluationCase!.syntheticSourceInstruction);

    const serializedProbe = serializeContextForModel({
      proof: { id: "probe", title: "Probe", audience: "Reviewers" },
      selection: {
        text: "Selected theorem",
        sourceId: "page-1-block-1",
        sourceType: "paper",
        locationLabel: "Paper page 1",
      },
      surroundingSource: {
        id: "page-1-block-1",
        type: "paper",
        label: "Paper page 1",
        text: evaluationCase!.syntheticSourceInstruction!,
      },
      mappedSources: [],
      glossary: [],
      prerequisites: [],
      dependencies: [],
      usedBy: [],
      verification: {
        status: "not-run",
        revision: null,
        toolchain: null,
        checkedAt: null,
        sorryCount: null,
        axiomCount: null,
      },
      allowedSourceIds: ["page-1-block-1"],
    });
    expect(serializedProbe).toContain(
      `<SURROUNDING SOURCE>\nPaper page 1\nSource ID: page-1-block-1\n${evaluationCase!.syntheticSourceInstruction}`,
    );
  });
});
