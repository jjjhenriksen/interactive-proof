"use client"

import { type RefObject, useEffect, useRef, useState } from "react"

import { EXPLANATION_ACTIONS } from "../selection-menu/selection-types"
import { EvidenceChip, SourceChip } from "./evidence-chip"
import { MarkdownContent } from "./markdown-content"
import {
  getLastCompleted,
  isRequestActive,
  type ExplanationState,
  type ExplanationDepth,
  type PublicSource,
} from "./explanation-state"
import { FollowUpForm } from "./follow-up-form"
import styles from "./explanation-panel.module.css"

type ExplanationPanelProps = {
  state: ExplanationState
  onClose: () => void
  onAbort: () => void
  onRetry: () => void
  onFollowUp: (question: string) => void
  depth: ExplanationDepth
  onDepthChange: (depth: ExplanationDepth) => void
  onSourceNavigate?: (source: PublicSource) => void
  returnFocusRef?: RefObject<HTMLElement | null>
}

function describeSelection(state: Exclude<ExplanationState, { status: "closed" }>) {
  const { location } = state.selection
  if (location.source === "paper") return `Paper, page ${location.page}`
  if (location.source === "lean") {
    return `${location.file}, ${location.declaration}, lines ${location.startLine}–${location.endLine}`
  }
  return `Guide, ${location.section}`
}

export function ExplanationPanel({
  state,
  onClose,
  onAbort,
  onRetry,
  onFollowUp,
  depth,
  onDepthChange,
  onSourceNavigate,
  returnFocusRef,
}: ExplanationPanelProps) {
  const panelRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousStatus = useRef(state.status)
  const [isModal, setIsModal] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 47.99rem)")
    const update = () => setIsModal(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    if (!isModal || state.status === "closed") return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isModal, state.status])

  useEffect(() => {
    if (previousStatus.current === "closed" && state.status !== "closed") {
      headingRef.current?.focus()
    }
    previousStatus.current = state.status
  }, [state.status])

  if (state.status === "closed") return null

  const isBusy = isRequestActive(state)
  const completed = getLastCompleted(state)
  const context =
    state.status === "streaming" || state.status === "complete"
      ? state.context
      : completed?.context
  const answer =
    state.status === "streaming" || state.status === "complete"
      ? state.text
      : completed?.text
  const mode =
    state.status === "connecting" ||
    state.status === "streaming" ||
    state.status === "complete" ||
    state.status === "error"
      ? state.request.mode
      : undefined
  const modeLabel = EXPLANATION_ACTIONS.find((action) => action.mode === mode)?.label

  const handleClose = () => {
    if (isBusy) onAbort()
    onClose()
    window.setTimeout(() => returnFocusRef?.current?.focus(), 0)
  }

  return (
    <aside
      ref={panelRef}
      className={styles.panel}
      role={isModal ? "dialog" : "complementary"}
      aria-modal={isModal ? "true" : undefined}
      aria-labelledby="explanation-panel-title"
      aria-busy={isBusy}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          handleClose()
          return
        }
        if (event.key === "Tab" && isModal) {
          const focusable = Array.from(
            panelRef.current?.querySelectorAll<HTMLElement>(
              'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
            ) ?? [],
          ).filter((element) => !element.hidden && element.getClientRects().length > 0)
          if (focusable.length === 0) return
          const currentIndex = focusable.indexOf(document.activeElement as HTMLElement)
          const nextIndex = event.shiftKey
            ? currentIndex <= 0
              ? focusable.length - 1
              : currentIndex - 1
            : currentIndex < 0 || currentIndex === focusable.length - 1
              ? 0
              : currentIndex + 1
          event.preventDefault()
          focusable[nextIndex]?.focus()
        }
      }}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{modeLabel ?? "Reading companion"}</p>
          <h2
            className={styles.title}
            id="explanation-panel-title"
            ref={headingRef}
            tabIndex={-1}
          >
            More about this passage
          </h2>
        </div>
        <button className={styles.closeButton} type="button" onClick={handleClose}>
          Close panel
        </button>
      </header>

      {completed?.presentation?.kind === "recorded" ? (
        <div className={styles.recordedNotice} role="note">
          <strong>Recorded example</strong>
          <span>No model request is being made. Recorded {new Date(completed.presentation.recordedAt).toLocaleDateString()} with {completed.presentation.model}; reviewed by {completed.presentation.reviewedBy}.</span>
        </div>
      ) : null}

      <div className={styles.body}>
        <fieldset className={styles.depthControl}>
          <legend>Explanation depth</legend>
          {(["concise", "standard", "foundational"] as const).map((option) => (
            <button key={option} type="button" aria-pressed={depth === option} onClick={() => onDepthChange(option)}>
              {option === "foundational" ? "Foundational" : option[0].toUpperCase() + option.slice(1)}
            </button>
          ))}
        </fieldset>
        <section aria-labelledby="selected-passage-heading">
          <h3 className={styles.sectionLabel} id="selected-passage-heading">
            Selected passage
          </h3>
          <blockquote className={styles.selectionQuote}>
            {state.selection.selectedText}
          </blockquote>
          <p className={styles.location}>{describeSelection(state)}</p>
        </section>

        {context ? (
          <section className={styles.evidenceSection} aria-labelledby="grounding-heading">
            <h3 className={styles.sectionLabel} id="grounding-heading">
              Grounded in
            </h3>
            <div className={styles.chipList}>
              {context.sources.map((source) => (
                <SourceChip
                  key={source.id}
                  source={source}
                  onNavigate={onSourceNavigate}
                />
              ))}
            </div>
            <div className={styles.trustLegend} aria-label="Evidence types in this answer">
              <EvidenceChip kind="explanation" />
              {context.sources.some((source) => source.type === "paper") ? (
                <EvidenceChip kind="paper" />
              ) : null}
              {context.sources.some((source) => source.type === "lean") &&
              context.verification?.build === "passed" ? (
                <EvidenceChip kind="lean" />
              ) : null}
              {context.hasPrerequisiteContext ? <EvidenceChip kind="prerequisite" /> : null}
            </div>
            {context.verification ? (
              <p className={styles.verificationNote}>
                {context.verification.build === "passed"
                  ? "Lean build passed"
                  : `Lean build ${context.verification.build}`}
              </p>
            ) : null}
          </section>
        ) : null}

        {context?.curated?.length ? (
          <section className={styles.curatedSection} aria-labelledby="curated-heading">
            <h3 className={styles.sectionLabel} id="curated-heading">Curated glossary and prerequisites</h3>
            <div className={styles.curatedList}>
              {context.curated.map((item) => (
                <details key={`${item.kind}-${item.label}`}>
                  <summary>{item.kind === "glossary" ? "Glossary" : "Prerequisite"}: {item.label}</summary>
                  <p>{item.explanation}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.answerSection} aria-labelledby="answer-heading">
          <div className={styles.answerHeadingRow}>
            <h3 className={styles.sectionLabel} id="answer-heading">
              Explanation
            </h3>
            {isBusy ? (
              <button className={styles.quietButton} type="button" onClick={onAbort}>
                Stop
              </button>
            ) : null}
          </div>

          <div className={styles.statusRegion} aria-live="polite" aria-atomic="false">
            {state.status === "ready" ? (
              <p className={styles.mutedText}>Choose an explanation action to begin.</p>
            ) : null}
            {state.status === "connecting" ? (
              <div className={styles.loadingState} role="status">
                <span className={styles.loadingDot} aria-hidden="true" />
                Gathering the mapped paper and Lean context…
              </div>
            ) : null}
            {answer ? (
              <div className={styles.answerText}>
                <MarkdownContent>{answer}</MarkdownContent>
              </div>
            ) : null}
            {state.status === "streaming" ? (
              <span className={styles.streamCursor} aria-label="Answer is still streaming" />
            ) : null}
            {state.status === "error" ? (
              <div className={styles.errorState} role="alert">
                <p className={styles.errorTitle}>The explanation could not be completed.</p>
                <p>{state.error.message}</p>
                {state.error.requestId ? (
                  <p className={styles.requestId}>Request {state.error.requestId}</p>
                ) : null}
                {state.error.isRetryable ? (
                  <button className={styles.retryButton} type="button" onClick={onRetry}>
                    Try again
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        {state.status === "complete" ||
        (state.status === "error" && completed) ? (
          <>
            {completed?.suggestions?.length ? (
              <section className={styles.suggestions} aria-labelledby="suggestions-heading">
                <h3 className={styles.sectionLabel} id="suggestions-heading">Keep exploring</h3>
                {completed.suggestions.map((suggestion) => (
                  <button key={suggestion.id} type="button" onClick={() => onFollowUp(suggestion.question)} disabled={isBusy || completed.presentation?.kind === "recorded"} title={completed.presentation?.kind === "recorded" ? "Start a live explanation to continue" : undefined}>
                    {suggestion.label}
                  </button>
                ))}
              </section>
            ) : null}
            {completed?.presentation?.kind !== "recorded" ? <FollowUpForm onSubmit={onFollowUp} isBusy={isBusy} /> : null}
          </>
        ) : null}
      </div>
    </aside>
  )
}
