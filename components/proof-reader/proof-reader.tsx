"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import dynamic from "next/dynamic";

import {
  ExplanationPanel,
  createFetchExplanationTransport,
  explanationReducer,
  initialExplanationState,
  type ExplanationRequest,
} from "../explanation-panel";
import {
  SelectionMenu,
  type ExplanationMode,
  type SupportedSelection,
  validateSelectedText,
} from "../selection-menu";
import type { PaperTextSelection } from "../paper-reader";
import styles from "./proof-reader.module.css";

const PdfPaperReader = dynamic(
  () => import("../paper-reader").then((module) => module.PdfPaperReader),
  {
    ssr: false,
    loading: () => (
      <div className={styles.paperRendererLoading} role="status">
        Loading paper renderer…
      </div>
    ),
  },
);

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
    blocks: Array<{
      id: string;
      kind: "heading" | "body" | "equation" | "caption" | "metadata";
      text: string;
    }>;
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
  const requestControllerRef = useRef<AbortController | null>(null);
  const explanationTransport = useMemo(() => createFetchExplanationTransport(), []);

  useEffect(
    () => () => {
      requestControllerRef.current?.abort();
    },
    [],
  );

  const page = proof.pages.find((candidate) => candidate.number === pageNumber) ?? proof.pages[0];
  const mapping =
    proof.mappings.find((candidate) => candidate.id === mappingId) ?? proof.mappings[0];

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

  const runExplanation = useCallback((request: ExplanationRequest) => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    dispatch({ type: "start", request });
    void explanationTransport.run(
      request,
      {
        onContext: (context) => dispatch({ type: "context", context }),
        onDelta: (text) => dispatch({ type: "delta", text }),
        onComplete: () => dispatch({ type: "complete" }),
        onError: (error) => dispatch({ type: "fail", error }),
      },
      controller.signal,
    );
  }, [explanationTransport]);

  const abortExplanation = useCallback(() => {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    dispatch({ type: "cancel" });
  }, []);

  const handleAction = (mode: ExplanationMode, activeSelection: SupportedSelection) => {
    setSelection(null);
    runExplanation({ selection: activeSelection, mode, history: [] });
  };

  const handlePaperSelection = (paperSelection: PaperTextSelection) => {
    if (!page) return;
    returnFocusRef.current = paperSelection.anchor;
    setSelection({
      proofId: proof.id,
      source: "paper",
      selectedText: paperSelection.selectedText,
      location: {
        source: "paper",
        page: page.number,
        blockIds: paperSelection.blockIds,
      },
      clientRect: paperSelection.clientRect,
    });
  };

  const handleFollowUp = (question: string) => {
    if (explanationState.status !== "complete") return;
    const request: ExplanationRequest = {
      selection: explanationState.selection,
      mode: "question",
      question,
      history: explanationState.history.slice(-6),
    };
    runExplanation(request);
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
            page ? (
              <PdfPaperReader
                pdfUrl={proof.paperHref}
                pageNumber={page.number}
                pageBlocks={page.blocks}
                title={proof.paperTitle}
                onSelection={handlePaperSelection}
              />
            ) : null
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
          onClose={() => {
            requestControllerRef.current?.abort();
            requestControllerRef.current = null;
            dispatch({ type: "close" });
          }}
          onAbort={abortExplanation}
          onRetry={() => {
            if (explanationState.status === "error") {
              runExplanation(explanationState.request);
            }
          }}
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
