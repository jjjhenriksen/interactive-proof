"use client";

import { useMemo, useReducer, useRef, useState } from "react";

import {
  ExplanationPanel,
  explanationReducer,
  initialExplanationState,
  type ConversationTurn,
  type ExplanationRequest,
  type PublicContext,
} from "../explanation-panel";
import {
  SelectionMenu,
  type ExplanationMode,
  type SupportedSelection,
  validateSelectedText,
} from "../selection-menu";
import styles from "./proof-reader.module.css";

type LeanExcerpt = {
  sourceId: string;
  file: string;
  declaration: string;
  startLine: number;
  endLine: number;
  code: string;
};

type Mapping = {
  id: string;
  label: string;
  paper: {
    sourceId: string;
    pages: number[];
    heading?: string;
    quote?: string;
  };
  lean: LeanExcerpt[];
  prerequisites: string[];
  correspondence: "direct" | "partial" | "supporting";
  correspondenceNote: string;
};

export type ProofReaderViewModel = {
  id: string;
  title: string;
  summary: string;
  audience: string;
  paperTitle: string;
  paperHref: string;
  licenseStatus: "cleared" | "review-required" | "link-only";
  leanRevision: string;
  verification: {
    build: "passed" | "failed" | "not-run";
    revision?: string;
    checkedAt?: string;
    sorryCount?: number | null;
  };
  pages: Array<{
    number: number;
    blocks: Array<{ id: string; text: string }>;
  }>;
  mappings: Mapping[];
};

type ProofReaderProps = {
  proof: ProofReaderViewModel;
};

export function ProofReader({ proof }: ProofReaderProps) {
  const [sourceMode, setSourceMode] = useState<"paper" | "lean">("paper");
  const [pageNumber, setPageNumber] = useState(1);
  const [mappingId, setMappingId] = useState(proof.mappings[0]?.id ?? "");
  const [selection, setSelection] = useState<SupportedSelection | null>(null);
  const [explanationState, dispatch] = useReducer(
    explanationReducer,
    initialExplanationState,
  );
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const page = proof.pages.find((candidate) => candidate.number === pageNumber) ?? proof.pages[0];
  const mapping =
    proof.mappings.find((candidate) => candidate.id === mappingId) ?? proof.mappings[0];

  const blockMapping = useMemo(
    () => new Map(proof.mappings.map((candidate) => [candidate.paper.sourceId, candidate])),
    [proof.mappings],
  );

  const mappingForSelection = (activeSelection: SupportedSelection) => {
    const location = activeSelection.location;
    if (location.source === "paper") {
      return blockMapping.get(location.blockIds[0]);
    }
    if (location.source === "lean") {
      return proof.mappings.find((candidate) =>
        candidate.lean.some(
          (source) => source.declaration === location.declaration,
        ),
      );
    }
    return undefined;
  };

  const captureSelection = (
    source: "paper" | "lean",
    location:
      | { source: "paper"; page: number; blockIds: string[] }
      | {
          source: "lean";
          file: string;
          declaration: string;
          startLine: number;
          endLine: number;
        },
    element: HTMLElement,
  ) => {
    const browserSelection = window.getSelection();
    if (!browserSelection || browserSelection.rangeCount === 0) return;
    const validated = validateSelectedText(browserSelection.toString());
    if (!validated.isValid) {
      setSelection(null);
      return;
    }

    const rect = browserSelection.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    returnFocusRef.current = element;
    setSelection({
      proofId: proof.id,
      source,
      selectedText: validated.selectedText,
      location,
      clientRect: {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
      },
    });
  };

  const contextForSelection = (activeSelection: SupportedSelection): PublicContext => {
    const activeMapping = mappingForSelection(activeSelection);

    const sources: PublicContext["sources"] = [];
    if (activeMapping) {
      sources.push({
        id: activeMapping.paper.sourceId,
        type: "paper",
        label: activeMapping.paper.heading ?? `Paper page ${activeMapping.paper.pages[0]}`,
        page: activeMapping.paper.pages[0],
      });
      sources.push(
        ...activeMapping.lean.map((source) => ({
          id: source.sourceId,
          type: "lean" as const,
          label: source.declaration,
          file: source.file,
          declaration: source.declaration,
          revision: proof.leanRevision,
        })),
      );
    }

    return {
      sources,
      verification: proof.verification,
      hasPrerequisiteContext: Boolean(activeMapping?.prerequisites.length),
    };
  };

  const runFixtureExplanation = (
    request: ExplanationRequest,
    activeMapping: Mapping | undefined,
  ) => {
    dispatch({ type: "start", request });
    const context = contextForSelection(request.selection);
    window.setTimeout(() => {
      dispatch({ type: "context", context });
      const mappingSentence = activeMapping
        ? `This selection is mapped to “${activeMapping.label}.” The recorded correspondence is ${activeMapping.correspondence}: ${activeMapping.correspondenceNote}`
        : "This selection does not yet have a curated paper-to-Lean mapping.";
      const response =
        `The source-selection and grounding path is working. ${mappingSentence}\n\n` +
        "This is a deterministic integration preview, not an AI-generated explanation. Connecting the GPT-5.6 streaming endpoint is the next implementation slice.";
      dispatch({ type: "delta", text: response });
      dispatch({ type: "complete" });
    }, 220);
  };

  const handleAction = (mode: ExplanationMode, activeSelection: SupportedSelection) => {
    setSelection(null);
    const activeMapping = mappingForSelection(activeSelection);
    runFixtureExplanation(
      { selection: activeSelection, mode, history: [] },
      activeMapping,
    );
  };

  const handleFollowUp = (question: string) => {
    if (explanationState.status !== "complete") return;
    const history: ConversationTurn[] = [
      ...explanationState.history,
      { role: "assistant" as const, text: explanationState.text },
      { role: "user" as const, text: question },
    ].slice(-6);
    const request: ExplanationRequest = {
      selection: explanationState.selection,
      mode: "question",
      question,
      history,
    };
    const activeMapping = mappingForSelection(request.selection);
    runFixtureExplanation(request, activeMapping);
  };

  return (
    <div className={styles.reader}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Interactive proof package</p>
          <h1>{proof.title}</h1>
          <p className={styles.summary}>{proof.summary}</p>
        </div>
        <div className={styles.packageMeta}>
          <span>Audience: {proof.audience}</span>
          <span>Lean build: {proof.verification.build}</span>
          <span>Paper license: {proof.licenseStatus}</span>
        </div>
      </header>

      <div className={styles.sourceSwitch} role="group" aria-label="Choose source view">
        <button
          type="button"
          aria-pressed={sourceMode === "paper"}
          onClick={() => setSourceMode("paper")}
        >
          Paper
        </button>
        <button
          type="button"
          aria-pressed={sourceMode === "lean"}
          onClick={() => setSourceMode("lean")}
        >
          Lean
        </button>
        <a href={proof.paperHref} target="_blank" rel="noreferrer">
          Open original PDF
        </a>
      </div>

      <div
        className={`${styles.workspace} ${
          explanationState.status === "closed" ? "" : styles.workspaceWithPanel
        }`}
      >
        <aside className={styles.navigator} aria-label={`${sourceMode} navigation`}>
          {sourceMode === "paper"
            ? proof.pages.map((candidate) => (
                <button
                  key={candidate.number}
                  type="button"
                  aria-pressed={candidate.number === pageNumber}
                  onClick={() => setPageNumber(candidate.number)}
                >
                  Page {candidate.number}
                </button>
              ))
            : proof.mappings.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  aria-pressed={candidate.id === mapping?.id}
                  onClick={() => setMappingId(candidate.id)}
                >
                  {candidate.label}
                </button>
              ))}
        </aside>

        <main className={styles.sourcePane} aria-label={`${sourceMode} source`}>
          <p className={styles.sourceLabel}>
            {sourceMode === "paper"
              ? `${proof.paperTitle} · page ${page?.number}`
              : mapping?.label}
          </p>
          <p className={styles.selectionHint}>
            Select a phrase to open the contextual explanation actions.
          </p>

          {sourceMode === "paper" ? (
            <article className={styles.paperText}>
              {page?.blocks.map((block) => (
                <p
                  key={block.id}
                  data-source-block={block.id}
                  tabIndex={0}
                  onMouseUp={(event) =>
                    captureSelection(
                      "paper",
                      { source: "paper", page: page.number, blockIds: [block.id] },
                      event.currentTarget,
                    )
                  }
                >
                  {block.text}
                </p>
              ))}
            </article>
          ) : (
            <section className={styles.leanStack}>
              {mapping?.lean.map((source) => (
                <article key={source.sourceId} className={styles.leanExcerpt}>
                  <header>
                    <strong>{source.declaration}</strong>
                    <span>
                      {source.file}:{source.startLine}
                    </span>
                  </header>
                  <pre
                    tabIndex={0}
                    onMouseUp={(event) =>
                      captureSelection(
                        "lean",
                        {
                          source: "lean",
                          file: source.file,
                          declaration: source.declaration,
                          startLine: source.startLine,
                          endLine: source.endLine,
                        },
                        event.currentTarget,
                      )
                    }
                  >
                    <code>{source.code}</code>
                  </pre>
                </article>
              ))}
              {mapping ? (
                <aside className={styles.correspondence}>
                  <strong>{mapping.correspondence} correspondence</strong>
                  <p>{mapping.correspondenceNote}</p>
                </aside>
              ) : null}
            </section>
          )}
        </main>

        <ExplanationPanel
          state={explanationState}
          onClose={() => dispatch({ type: "close" })}
          onAbort={() => dispatch({ type: "close" })}
          onRetry={() => dispatch({ type: "retry" })}
          onFollowUp={handleFollowUp}
          onSourceNavigate={(source) => {
            if (source.type === "paper") {
              setSourceMode("paper");
              setPageNumber(source.page);
            } else if (source.type === "lean") {
              setSourceMode("lean");
              const target = proof.mappings.find((candidate) =>
                candidate.lean.some((item) => item.declaration === source.declaration),
              );
              if (target) setMappingId(target.id);
            }
          }}
          returnFocusRef={returnFocusRef}
        />
      </div>

      {selection ? (
        <SelectionMenu
          selection={selection}
          onAction={handleAction}
          onDismiss={() => setSelection(null)}
        />
      ) : null}
    </div>
  );
}
