import type { PublicSource } from "./explanation-state"
import styles from "./explanation-panel.module.css"

export type EvidenceKind = "paper" | "lean" | "explanation" | "prerequisite"

const EVIDENCE_LABELS: Record<EvidenceKind, string> = {
  paper: "Paper states",
  lean: "Lean verifies",
  explanation: "Generated explanation",
  prerequisite: "Prerequisite",
}

const EVIDENCE_MARKS: Record<EvidenceKind, string> = {
  paper: "P",
  lean: "L",
  explanation: "E",
  prerequisite: "R",
}

type EvidenceChipProps = {
  kind: EvidenceKind
  label?: string
}

export function EvidenceChip({ kind, label }: EvidenceChipProps) {
  return (
    <span className={styles.evidenceChip} data-kind={kind}>
      <span className={styles.evidenceMark} aria-hidden="true">
        {EVIDENCE_MARKS[kind]}
      </span>
      {label ?? EVIDENCE_LABELS[kind]}
    </span>
  )
}

type SourceChipProps = {
  source: PublicSource
  onNavigate?: (source: PublicSource) => void
}

export function SourceChip({ source, onNavigate }: SourceChipProps) {
  const kind = source.type === "guide" ? "prerequisite" : source.type
  const content = (
    <>
      <span className={styles.evidenceMark} aria-hidden="true">
        {EVIDENCE_MARKS[kind]}
      </span>
      {source.label}
    </>
  )

  if (!onNavigate) {
    return (
      <span className={styles.sourceChip} data-kind={kind}>
        {content}
      </span>
    )
  }

  return (
    <button
      className={styles.sourceChip}
      data-kind={kind}
      type="button"
      onClick={() => onNavigate(source)}
      aria-label={`Open source: ${source.label}`}
    >
      {content}
    </button>
  )
}
