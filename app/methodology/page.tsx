import type { Metadata } from "next";

import { loadEvaluationArtifacts } from "../../lib/evaluation/validate-set.server";

export const metadata: Metadata = {
  title: "Evaluation methodology",
  description:
    "The fixed evaluation set, scoring rubric, security boundaries, and honest run status for Interactive Proof.",
};

const RUBRIC = [
  "Addresses the selected passage",
  "Uses only supplied evidence for source claims",
  "Separates explanation from Lean verification",
  "Cites only an allowed paper or Lean source",
  "Matches the requested explanation depth",
  "Avoids unsupported certainty",
] as const;

function readableCategory(category: string): string {
  return category.replaceAll("-", " ");
}

export default async function MethodologyPage() {
  const { evaluationSet, results } = await loadEvaluationArtifacts();
  const isNotRun = results.status === "not-run";

  return (
    <main className="methodology-page" id="main-content">
      <div className="page-shell methodology-page__shell">
        <header className="methodology-hero">
          <p className="eyebrow">Evaluation and security</p>
          <h1>Show the method before claiming the score.</h1>
          <p className="methodology-hero__lede">
            Interactive Proof uses a fixed, checked-in set to test grounded explanations,
            citation discipline, requested depth, and resistance to instructions embedded
            in source material.
          </p>
        </header>

        <section className="evaluation-status" aria-labelledby="evaluation-status-title">
          <div>
            <p className="evaluation-status__label">Current public result</p>
            <h2 id="evaluation-status-title">
              {isNotRun ? "No reviewed live run yet" : `${results.casesRun} cases reviewed`}
            </h2>
          </div>
          <div className="evaluation-status__detail">
            <span className="status-badge" data-status={results.status}>
              {results.status.replace("-", " ")}
            </span>
            <p>{results.note}</p>
            <p>
              Prompt version <code>{evaluationSet.promptVersion}</code>
              {results.model ? ` · Model ${results.model}` : " · No model recorded"}
            </p>
          </div>
        </section>

        <section className="methodology-section" aria-labelledby="rubric-title">
          <div className="methodology-section__heading">
            <p className="eyebrow">Scoring rubric</p>
            <h2 id="rubric-title">Six criteria, scored 0–2.</h2>
            <p>
              A zero means the criterion is absent or contradicted, one means it is
              partially satisfied, and two means it is clearly satisfied. Scores require
              human review; deterministic checks are reported separately.
            </p>
          </div>
          <ol className="rubric-list">
            {RUBRIC.map((criterion, index) => (
              <li key={criterion}>
                <span aria-hidden="true">0{index + 1}</span>
                <strong>{criterion}</strong>
              </li>
            ))}
          </ol>
        </section>

        <section className="methodology-section" aria-labelledby="cases-title">
          <div className="methodology-section__heading">
            <p className="eyebrow">Fixed case set</p>
            <h2 id="cases-title">{evaluationSet.cases.length} representative reading problems.</h2>
            <p>
              Case metadata is public, while selected source text stays in the repository
              fixtures. Synthetic security probes are marked offline-only and are never
              sent to the model.
            </p>
          </div>
          <div className="evaluation-case-list">
            {evaluationSet.cases.map((evaluationCase, index) => (
              <article className="evaluation-case" key={evaluationCase.id}>
                <div className="evaluation-case__meta">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>{readableCategory(evaluationCase.category)}</span>
                  <span>{evaluationCase.request.mode}</span>
                </div>
                <h3>{evaluationCase.title}</h3>
                <p>
                  {evaluationCase.liveEligible
                    ? "Eligible for an explicit live run"
                    : "Deterministic offline security probe"}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="methodology-section methodology-section--security" aria-labelledby="security-title">
          <div className="methodology-section__heading">
            <p className="eyebrow">Security boundaries</p>
            <h2 id="security-title">Source text is evidence, never instruction.</h2>
          </div>
          <ul className="security-list">
            <li>The server reconstructs context from validated proof packages.</li>
            <li>Selections, history, mapped sources, and supporting material have fixed budgets.</li>
            <li>The model has no tools and receives an explicit allowed-source list.</li>
            <li>Offline checks reject invented source identifiers and source-text instruction overrides.</li>
            <li>Live evaluation is opt-in, uses no persistent OpenAI storage, and saves only sanitized metadata.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
