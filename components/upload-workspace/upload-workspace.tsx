"use client";

import dynamic from "next/dynamic";
import { type FormEvent, useEffect, useRef, useState } from "react";

import type { PaperTextSelection } from "../paper-reader/pdf-paper-reader";
import type { ExplanationDepth, ExplanationMode } from "../../lib/explanation/request-schema";
import type { PublicContext } from "../../lib/explanation/types";
import { streamUploadedExplanation } from "../../lib/uploads/client-transport";
import type { UploadedLeanFile } from "../../lib/uploads/lean-files";
import { readPaperUpload, type UploadedPaper } from "../../lib/uploads/paper-file";
import type { UploadedExplainRequest } from "../../lib/uploads/schema";
import { MarkdownContent } from "../explanation-panel/markdown-content";
import styles from "./upload-workspace.module.css";

const PdfPaperReader = dynamic(
  () => import("../paper-reader/pdf-paper-reader").then((module) => module.PdfPaperReader),
  { ssr: false, loading: () => <p className={styles.status}>Loading paper reader…</p> },
);

type Selection =
  | { source: "paper"; page: number; selectedText: string; surroundingText: string }
  | { source: "lean"; file: string; selectedText: string; surroundingText: string };

type ExplanationStatus = "idle" | "connecting" | "streaming" | "complete" | "error";

function boundedSelection(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 1_200);
}

export function UploadWorkspace() {
  const paperInput = useRef<HTMLInputElement>(null);
  const leanInput = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [paper, setPaper] = useState<UploadedPaper | null>(null);
  const [leanFiles, setLeanFiles] = useState<UploadedLeanFile[]>([]);
  const [activeTab, setActiveTab] = useState<"paper" | "lean">("paper");
  const [pageNumber, setPageNumber] = useState(1);
  const [activeLeanPath, setActiveLeanPath] = useState("");
  const [mappedLeanPath, setMappedLeanPath] = useState("");
  const [mappingNote, setMappingNote] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [setupStatus, setSetupStatus] = useState<"idle" | "loading" | "error">("idle");
  const [setupError, setSetupError] = useState("");
  const [mode, setMode] = useState<ExplanationMode>("details");
  const [depth, setDepth] = useState<ExplanationDepth>("foundational");
  const [question, setQuestion] = useState("");
  const [explanationStatus, setExplanationStatus] = useState<ExplanationStatus>("idle");
  const [explanation, setExplanation] = useState("");
  const [explanationError, setExplanationError] = useState("");
  const [publicContext, setPublicContext] = useState<PublicContext | null>(null);

  const activePage = paper?.pages[pageNumber - 1];
  const activeLean = leanFiles.find((file) => file.path === activeLeanPath) ?? leanFiles[0];

  useEffect(() => () => {
    abortRef.current?.abort();
    if (paper) URL.revokeObjectURL(paper.url);
  }, [paper]);

  async function prepareWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const paperFile = paperInput.current?.files?.[0];
    if (!paperFile || !rightsConfirmed) {
      setSetupStatus("error");
      setSetupError(!paperFile ? "Choose a PDF paper to continue." : "Confirm that you may use these files.");
      return;
    }
    setSetupStatus("loading");
    setSetupError("");
    let openedPaper: UploadedPaper | null = null;
    try {
      const [nextPaper, nextLean] = await Promise.all([
        readPaperUpload(paperFile).then((value) => {
          openedPaper = value;
          return value;
        }),
        leanInput.current?.files?.length
          ? import("../../lib/uploads/lean-files").then(({ readLeanUploads }) => readLeanUploads(leanInput.current!.files!))
          : Promise.resolve([]),
      ]);
      setPaper(nextPaper);
      setLeanFiles(nextLean);
      setActiveLeanPath(nextLean[0]?.path ?? "");
      setMappedLeanPath(nextLean[0]?.path ?? "");
      setSetupStatus("idle");
    } catch (error) {
      if (openedPaper) URL.revokeObjectURL((openedPaper as UploadedPaper).url);
      setSetupStatus("error");
      setSetupError(error instanceof Error ? error.message : "The files could not be opened.");
    }
  }

  function clearWorkspace() {
    abortRef.current?.abort();
    if (paper) URL.revokeObjectURL(paper.url);
    setPaper(null);
    setLeanFiles([]);
    setSelection(null);
    setExplanation("");
    setPublicContext(null);
    setExplanationStatus("idle");
    setPageNumber(1);
    setRightsConfirmed(false);
    if (paperInput.current) paperInput.current.value = "";
    if (leanInput.current) leanInput.current.value = "";
  }

  function selectPaper(value: PaperTextSelection) {
    if (!activePage) return;
    setSelection({
      source: "paper",
      page: pageNumber,
      selectedText: value.selectedText,
      surroundingText: activePage.text.slice(0, 12_000),
    });
    setExplanationStatus("idle");
  }

  function selectLeanText() {
    if (!activeLean) return;
    const browserSelection = window.getSelection()?.toString() ?? "";
    const selectedText = boundedSelection(browserSelection || activeLean.text);
    if (selectedText.length < 2) return;
    setSelection({
      source: "lean",
      file: activeLean.path,
      selectedText,
      surroundingText: activeLean.text.slice(0, 12_000),
    });
    setExplanationStatus("idle");
  }

  async function explain() {
    if (!paper || !selection) return;
    if (mode === "question" && !question.trim()) {
      setExplanationStatus("error");
      setExplanationError("Enter a question first.");
      return;
    }
    const mappedLean = selection.source === "paper"
      ? leanFiles.find((file) => file.path === mappedLeanPath)
      : undefined;
    const body: UploadedExplainRequest = {
      paperTitle: paper.title,
      selection,
      ...(mappedLean ? { mappedLean: { file: mappedLean.path, text: mappedLean.text.slice(0, 8_000) } } : {}),
      ...(selection.source === "lean" && activePage?.text
        ? { mappedPaper: { page: pageNumber, text: activePage.text.slice(0, 8_000) } }
        : {}),
      ...(mappingNote.trim() ? { mappingNote: mappingNote.trim() } : {}),
      mode,
      depth,
      ...(mode === "question" ? { question: question.trim() } : {}),
      history: [],
      rightsConfirmed: true,
    };
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setExplanation("");
    setExplanationError("");
    setPublicContext(null);
    setExplanationStatus("connecting");
    await streamUploadedExplanation(body, {
      onContext: (context) => {
        setPublicContext(context);
        setExplanationStatus("streaming");
      },
      onDelta: (text) => setExplanation((current) => current + text),
      onComplete: () => setExplanationStatus("complete"),
      onError: (message) => {
        setExplanationError(message);
        setExplanationStatus("error");
      },
    }, controller.signal);
  }

  if (!paper) {
    return (
      <form className={styles.setup} onSubmit={prepareWorkspace}>
        <div className={styles.setupHeader}>
          <p className="eyebrow">Temporary reading workspace</p>
          <h1>Bring a paper. Add Lean when you have it.</h1>
          <p>
            The browser opens your files in this tab. It sends only the passage you ask about
            and a bounded amount of nearby text when you request an AI explanation.
          </p>
        </div>
        <div className={styles.fileGrid}>
          <label className={styles.fileField}>
            <span><strong>Paper PDF</strong> · required</span>
            <input ref={paperInput} type="file" accept="application/pdf,.pdf" required />
            <small>Up to 20 MiB and 100 pages. Selectable text is required.</small>
          </label>
          <label className={styles.fileField}>
            <span><strong>Lean source</strong> · optional</span>
            <input ref={leanInput} type="file" accept=".lean,.zip" multiple />
            <small>Add .lean files or one or more ZIP archives. Sources are not verified.</small>
          </label>
        </div>
        <label className={styles.consent}>
          <input
            type="checkbox"
            checked={rightsConfirmed}
            onChange={(event) => setRightsConfirmed(event.target.checked)}
          />
          <span>I have permission to use these files and understand that selected text is sent to the AI service when I ask for an explanation.</span>
        </label>
        <div className={styles.setupActions}>
          <button className="button button--primary" type="submit" disabled={setupStatus === "loading"}>
            {setupStatus === "loading" ? "Opening files…" : "Open temporary workspace"}
          </button>
          <p>Nothing is added to the proof library or saved by this site.</p>
        </div>
        {setupStatus === "error" ? <p className={styles.error} role="alert">{setupError}</p> : null}
      </form>
    );
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.workspaceHeader}>
        <div>
          <p className="eyebrow">Temporary workspace</p>
          <h1>{paper.title}</h1>
          <p>Files live only in this tab. Uploaded Lean is source text, not a verification result.</p>
        </div>
        <button className="button button--secondary" type="button" onClick={clearWorkspace}>Clear workspace</button>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Uploaded sources">
        <button type="button" role="tab" aria-selected={activeTab === "paper"} onClick={() => setActiveTab("paper")}>Paper</button>
        {leanFiles.length ? <button type="button" role="tab" aria-selected={activeTab === "lean"} onClick={() => setActiveTab("lean")}>Uploaded Lean <span>Unverified</span></button> : null}
      </div>

      <div className={styles.readerGrid}>
        <section className={styles.sourcePane}>
          {activeTab === "paper" && activePage ? (
            <>
              <div className={styles.sourceToolbar}>
                <button type="button" disabled={pageNumber === 1} onClick={() => setPageNumber((page) => page - 1)}>← Previous</button>
                <span>Page {pageNumber} of {paper.pages.length}</span>
                <button type="button" disabled={pageNumber === paper.pages.length} onClick={() => setPageNumber((page) => page + 1)}>Next →</button>
              </div>
              <p className={styles.help}>Highlight text on the PDF, then use the explanation panel.</p>
              <PdfPaperReader pdfUrl={paper.url} pageNumber={pageNumber} pageBlocks={activePage.blocks} title={paper.title} onSelection={selectPaper} />
            </>
          ) : activeLean ? (
            <>
              <div className={styles.sourceToolbar}>
                <label>File <select value={activeLean.path} onChange={(event) => setActiveLeanPath(event.target.value)}>{leanFiles.map((file) => <option key={file.path}>{file.path}</option>)}</select></label>
                <span className={styles.unverified}>Not verified</span>
              </div>
              <p className={styles.help}>Highlight Lean text, or explain the beginning of the file.</p>
              <pre className={styles.leanSource} onPointerUp={selectLeanText} data-testid="uploaded-lean-source"><code>{activeLean.text}</code></pre>
              <button className="button button--secondary" type="button" onClick={selectLeanText}>Explain this Lean file</button>
            </>
          ) : null}
        </section>

        <aside className={styles.sidePanel} aria-label="AI explanation">
          <p className="eyebrow">Explanation</p>
          {leanFiles.length ? (
            <div className={styles.mapping}>
              <p><strong>Connect an optional Lean source</strong></p>
              <label>Lean file <select value={mappedLeanPath} onChange={(event) => setMappedLeanPath(event.target.value)}>{leanFiles.map((file) => <option key={file.path}>{file.path}</option>)}</select></label>
              <label>Optional note <input value={mappingNote} maxLength={500} onChange={(event) => setMappingNote(event.target.value)} placeholder="How these sources connect" /></label>
            </div>
          ) : null}
          {selection ? (
            <>
              <blockquote className={styles.selectionQuote}>{selection.selectedText}</blockquote>
              <div className={styles.controls}>
                <label>What do you want help with? <select value={mode} onChange={(event) => setMode(event.target.value as ExplanationMode)}><option value="details">Explain this step</option><option value="simpler">Make it simpler</option><option value="lean">Connect the sources</option><option value="usage">Where is this used?</option><option value="question">Ask a question</option></select></label>
                <label>How much background? <select value={depth} onChange={(event) => setDepth(event.target.value as ExplanationDepth)}><option value="concise">Quick</option><option value="standard">Step by step</option><option value="foundational">Start from basics</option></select></label>
              </div>
              {mode === "question" ? <label className={styles.question}>Question <textarea value={question} maxLength={800} onChange={(event) => setQuestion(event.target.value)} /></label> : null}
              <div className={styles.explainActions}>
                <button className="button button--primary" type="button" onClick={() => void explain()} disabled={explanationStatus === "connecting" || explanationStatus === "streaming"}>Explain selection</button>
                {explanationStatus === "connecting" || explanationStatus === "streaming" ? <button className="button button--secondary" type="button" onClick={() => { abortRef.current?.abort(); setExplanationStatus("idle"); }}>Stop</button> : null}
              </div>
            </>
          ) : <p className={styles.empty}>Select a passage in the paper or Lean source to begin.</p>}

          {explanationStatus === "connecting" ? <p className={styles.status} role="status">Gathering the selected context…</p> : null}
          {publicContext ? <details className={styles.sourceDetails}><summary>Sources used for this explanation</summary><div className={styles.evidence}>{publicContext.sources.map((source) => <span key={source.id}>{source.type === "lean" ? "Uploaded Lean · not verified" : "Uploaded paper"}</span>)}</div></details> : null}
          {explanation ? <div className={styles.answer} aria-live="polite"><MarkdownContent>{explanation}</MarkdownContent></div> : null}
          {explanationStatus === "error" ? <p className={styles.error} role="alert">{explanationError}</p> : null}
        </aside>
      </div>
    </div>
  );
}
