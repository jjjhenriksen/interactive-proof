"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import dynamic from "next/dynamic";

import {
  ExplanationPanel,
  createFetchExplanationTransport,
  explanationReducer,
  initialExplanationState,
  type ExplanationRequest,
  type ExplanationDepth,
} from "../explanation-panel";
import {
  SelectionMenu,
  type ExplanationMode,
  type SupportedSelection,
  validateSelectedText,
} from "../selection-menu";
import type { PaperTextSelection } from "../paper-reader";
import {
  parseReaderLocation,
  serializeReaderLocation,
  type ReaderLocation,
} from "../../lib/reader/location";
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
    revision: string;
    toolchain: string;
    command: string;
    checkedAt: string;
    exitCode: number | null;
    sorryCount: number | null;
    axioms: Array<{ declaration: string; axioms: string[] }>;
    outputDigest: string | null;
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
  instructorEntries: Array<{ id: string; kind: "objective" | "hint" | "misconception" | "explanation"; title: string; body: string; sourceIds: string[]; mappingIds: string[]; author: string; license: string; reviewedAt: string }>;
};

type ProofReaderProps = {
  proof: ProofReaderViewModel;
};

export function ProofReader({ proof }: ProofReaderProps) {
  const [sourceMode, setSourceMode] = useState<"paper" | "lean">("paper");
  const [pageNumber, setPageNumber] = useState(1);
  const [mappingId, setMappingId] = useState(proof.mappings[0]?.id ?? "");
  const [selection, setSelection] = useState<SupportedSelection | null>(null);
  const [locationNotice, setLocationNotice] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [explanationDepth, setExplanationDepth] = useState<ExplanationDepth>("standard");
  const [selectedInstructorIds, setSelectedInstructorIds] = useState<string[]>([]);
  const [explanationState, dispatch] = useReducer(
    explanationReducer,
    initialExplanationState,
  );
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const explanationTransport = useMemo(() => createFetchExplanationTransport(), []);
  const isLocationReadyRef = useRef(false);
  const skipNextLocationWriteRef = useRef(false);
  const locationIndex = useMemo(() => ({
    pages: proof.pages.map((item) => item.number),
    mappings: proof.mappings.map((item) => ({
      id: item.id,
      paperSourceId: item.paper.sourceId,
      declarations: item.lean.map((source) => source.declaration),
    })),
  }), [proof.mappings, proof.pages]);
  const page = proof.pages.find((candidate) => candidate.number === pageNumber) ?? proof.pages[0];
  const mapping =
    proof.mappings.find((candidate) => candidate.id === mappingId) ?? proof.mappings[0];
  const visibleInstructorEntries = proof.instructorEntries.filter((entry) =>
    entry.mappingIds.includes(mapping?.id ?? "") ||
    (sourceMode === "paper" ? entry.sourceIds.includes(mapping?.paper.sourceId ?? "") : mapping?.lean.some((source) => entry.sourceIds.includes(source.sourceId))),
  );

  const applyLocation = useCallback((location: ReaderLocation | null) => {
    if (!location) return;
    if (location.source === "paper") {
      setSourceMode("paper");
      setPageNumber(location.page);
      if (location.mappingId) setMappingId(location.mappingId);
    } else {
      setSourceMode("lean");
      setMappingId(location.mappingId);
    }
  }, []);

  const writeLocation = useCallback((location: ReaderLocation, mode: "push" | "replace") => {
    const { search, hash } = serializeReaderLocation(location);
    window.history[mode === "push" ? "pushState" : "replaceState"]({}, "", `${window.location.pathname}${search}${hash}`);
  }, []);

  useEffect(() => {
    const restore = () => {
      const parsed = parseReaderLocation(window.location.search, window.location.hash, locationIndex);
      skipNextLocationWriteRef.current = true;
      applyLocation(parsed.location);
      setLocationNotice(parsed.hadInvalidParameters ? "That saved location is no longer available. The proof opened at its default location." : "");
      if (parsed.hadInvalidParameters) window.history.replaceState({}, "", window.location.pathname);
    };
    restore();
    isLocationReadyRef.current = true;
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [applyLocation, locationIndex]);

  useEffect(() => {
    if (!isLocationReadyRef.current) return;
    if (skipNextLocationWriteRef.current) {
      skipNextLocationWriteRef.current = false;
      return;
    }
    if (sourceMode === "paper") writeLocation({ source: "paper", page: pageNumber, ...(mappingId ? { mappingId } : {}) }, "replace");
    else if (mapping?.lean[0]) writeLocation({ source: "lean", declaration: mapping.lean[0].declaration, mappingId: mapping.id }, "replace");
  }, [mapping, mappingId, pageNumber, sourceMode, writeLocation]);

  const copyLocation = async (location: ReaderLocation, label: string) => {
    const { search, hash } = serializeReaderLocation(location);
    const url = `${window.location.origin}${window.location.pathname}${search}${hash}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus(`${label} copied.`);
    } catch {
      setCopyStatus(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  useEffect(
    () => () => {
      requestControllerRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const stored = window.sessionStorage.getItem("interactive-proof-depth");
    if (stored === "concise" || stored === "standard" || stored === "foundational") {
      const timer = window.setTimeout(() => setExplanationDepth(stored), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const changeExplanationDepth = (depth: ExplanationDepth) => {
    setExplanationDepth(depth);
    window.sessionStorage.setItem("interactive-proof-depth", depth);
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
        onComplete: (suggestions) => dispatch({ type: "complete", suggestions }),
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
    runExplanation({
      selection: activeSelection,
      mode,
      depth: mode === "simpler" ? "foundational" : explanationDepth,
      history: [],
      instructorEntryIds: selectedInstructorIds,
    });
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

  const openLeanExcerptActions = (source: LeanExcerpt, anchor: HTMLElement) => {
    const selectedText = source.code.trim().slice(0, 1_200);
    const rect = anchor.getBoundingClientRect();
    returnFocusRef.current = anchor;
    setSelection({
      proofId: proof.id,
      source: "lean",
      selectedText,
      location: {
        source: "lean",
        file: source.file,
        declaration: source.declaration,
        startLine: source.startLine,
        endLine: source.endLine,
      },
      clientRect: {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
      },
    });
  };

  const dismissSelection = () => {
    setSelection(null);
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  };

  const handleFollowUp = (question: string) => {
    if (explanationState.status !== "complete") return;
    const request: ExplanationRequest = {
      selection: explanationState.selection,
      mode: "question",
      question,
      history: explanationState.history.slice(-6),
      depth: explanationDepth,
      instructorEntryIds: selectedInstructorIds,
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

      <details className={styles.verificationEvidence}>
        <summary>Verification evidence</summary>
        <div className={styles.verificationEvidenceBody}>
          <dl>
            <div><dt>Build</dt><dd>{proof.verification.build}</dd></div>
            <div><dt>Revision</dt><dd><code>{proof.verification.revision}</code></dd></div>
            <div><dt>Toolchain</dt><dd><code>{proof.verification.toolchain}</code></dd></div>
            <div><dt>Command</dt><dd><code>{proof.verification.command}</code></dd></div>
            <div><dt>Checked</dt><dd>{proof.verification.checkedAt}</dd></div>
            <div><dt>Exit code</dt><dd>{proof.verification.exitCode ?? "not run"}</dd></div>
            <div><dt>Sorry count</dt><dd>{proof.verification.sorryCount ?? "not audited"}</dd></div>
            <div><dt>Output digest</dt><dd>{proof.verification.outputDigest ? <code>{proof.verification.outputDigest}</code> : "not recorded"}</dd></div>
          </dl>
          <div>
            <h2>Axiom audit</h2>
            {proof.verification.axioms.length > 0 ? (
              <ul>
                {proof.verification.axioms.map((audit) => (
                  <li key={audit.declaration}>
                    <code>{audit.declaration}</code>: {audit.axioms.length > 0 ? audit.axioms.join(", ") : "no axioms reported"}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No axiom audit was recorded.</p>
            )}
          </div>
        </div>
      </details>

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
        <button
          type="button"
          onClick={() => void copyLocation(
            sourceMode === "paper"
              ? { source: "paper", page: pageNumber, ...(mapping ? { mappingId: mapping.id } : {}) }
              : { source: "lean", declaration: mapping?.lean[0]?.declaration ?? "", mappingId: mapping?.id ?? "" },
            "Source link",
          )}
          disabled={sourceMode === "lean" && !mapping?.lean[0]}
        >
          Copy source link
        </button>
        {mapping ? (
          <button type="button" onClick={() => void copyLocation({ source: "mapping", mappingId: mapping.id }, "Mapping link")}>
            Copy mapping link
          </button>
        ) : null}
      </div>

      <div className={styles.readerStatus} aria-live="polite">
        {locationNotice || copyStatus}
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

          {visibleInstructorEntries.length ? (
            <section className={styles.instructorGuidance} aria-labelledby="instructor-guidance-heading">
              <div><p className={styles.sourceLabel}>Curated guidance</p><h2 id="instructor-guidance-heading">Notes from the proof curator</h2></div>
              {visibleInstructorEntries.map((entry) => (
                <details key={entry.id} open={entry.kind !== "hint"}>
                  <summary>{entry.kind}: {entry.title}</summary>
                  <p>{entry.body}</p>
                  <p className={styles.instructorAttribution}>By {entry.author} · {entry.license} · reviewed {new Date(entry.reviewedAt).toLocaleDateString()}</p>
                  <label><input type="checkbox" checked={selectedInstructorIds.includes(entry.id)} onChange={(event) => setSelectedInstructorIds((current) => event.target.checked ? [...new Set([...current, entry.id])] : current.filter((id) => id !== entry.id))} /> Include in the next AI explanation</label>
                </details>
              ))}
            </section>
          ) : null}

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
                <article
                  key={source.sourceId}
                  className={styles.leanExcerpt}
                  aria-label={`Curated Lean excerpt: ${source.declaration}`}
                >
                  <header>
                    <div className={styles.excerptIdentity}>
                      <strong>{source.declaration}</strong>
                      <span className={styles.excerptBadge}>Curated excerpt</span>
                    </div>
                    <div className={styles.excerptTools}>
                      <span>
                        {source.file}:{source.startLine}
                      </span>
                      <button
                        type="button"
                        onClick={(event) =>
                          openLeanExcerptActions(source, event.currentTarget)
                        }
                      >
                        Explain excerpt
                      </button>
                    </div>
                  </header>
                  <pre
                    tabIndex={0}
                    onPointerUp={(event) =>
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
          depth={explanationDepth}
          onDepthChange={changeExplanationDepth}
          onSourceNavigate={(source) => {
            if (source.type === "paper") {
              setSourceMode("paper");
              setPageNumber(source.page);
              writeLocation({ source: "paper", page: source.page }, "push");
            } else if (source.type === "lean") {
              setSourceMode("lean");
              const target = proof.mappings.find((candidate) =>
                candidate.lean.some((item) => item.declaration === source.declaration),
              );
              if (target) {
                setMappingId(target.id);
                writeLocation({ source: "lean", declaration: source.declaration, mappingId: target.id }, "push");
              }
            }
          }}
          returnFocusRef={returnFocusRef}
        />
      </div>

      {selection ? (
        <SelectionMenu
          selection={selection}
          onAction={handleAction}
          onDismiss={dismissSelection}
        />
      ) : null}
    </div>
  );
}
